import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { detectProjectBuild, type ProjectBuildConfig } from './project-build-detector'

export interface BuildProgress {
  stage: 'detecting' | 'building' | 'installing' | 'launching' | 'complete' | 'error'
  message: string
  progress?: number
}

export interface BuildAndRunResult {
  success: boolean
  message: string
  error?: string
}

export async function buildAndRunProject(
  worktreeRoot: string,
  deviceId: string,
  devicePlatform: 'ios' | 'android',
  onProgress: (update: BuildProgress) => void
): Promise<BuildAndRunResult> {
  try {
    // Step 1: Detect project
    onProgress({ stage: 'detecting', message: 'Detecting project configuration...' })
    const config = await detectProjectBuild(worktreeRoot)

    if (!config) {
      return {
        success: false,
        message: 'Could not detect project type',
        error: 'No Android, iOS, React Native, or Flutter project found in this workspace'
      }
    }

    // Filter by device platform
    if (
      (devicePlatform === 'android' && !['android', 'react-native', 'flutter'].includes(config.type)) ||
      (devicePlatform === 'ios' && !['ios', 'react-native', 'flutter'].includes(config.type))
    ) {
      return {
        success: false,
        message: `Project type ${config.type} is not compatible with ${devicePlatform}`,
        error: `Selected device is ${devicePlatform}, but project is ${config.type}`
      }
    }

    // Step 2: Build
    onProgress({ stage: 'building', message: `Building ${config.type} project...`, progress: 10 })
    const buildResult = await runBuildCommand(config, worktreeRoot, onProgress)

    if (!buildResult.success) {
      return {
        success: false,
        message: 'Build failed',
        error: buildResult.error
      }
    }

    onProgress({ stage: 'building', message: 'Build complete!', progress: 60 })

    // Step 3: Get output artifact
    const artifactPath = join(config.workspaceRoot, config.outputPath)
    if (!existsSync(artifactPath)) {
      return {
        success: false,
        message: 'Build artifact not found',
        error: `Expected artifact at ${artifactPath}`
      }
    }

    // Step 4: Install (via separate RPC call)
    onProgress({ stage: 'installing', message: 'Installing to device...', progress: 70 })

    // Return success - installation will be handled by emulator bridge
    onProgress({
      stage: 'complete',
      message: 'Build successful! Ready to install.',
      progress: 100
    })

    return {
      success: true,
      message: `Built ${config.type} project successfully`
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    onProgress({ stage: 'error', message: 'Build failed', progress: 0 })

    return {
      success: false,
      message: 'Build failed',
      error: errorMessage
    }
  }
}

async function runBuildCommand(
  config: ProjectBuildConfig,
  worktreeRoot: string,
  onProgress: (update: BuildProgress) => void
): Promise<{ success: boolean; error?: string }> {
  return new Promise((resolve) => {
    const cwd = resolve(config.workspaceRoot)
    const command = config.buildCommand.split(' ')[0]
    const args = config.buildCommand.split(' ').slice(1)

    const child = spawn(command, args, {
      cwd,
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe']
    })

    let stdout = ''
    let stderr = ''

    child.stdout?.on('data', (data) => {
      const text = data.toString()
      stdout += text
      onProgress({ stage: 'building', message: text.trim() })
    })

    child.stderr?.on('data', (data) => {
      const text = data.toString()
      stderr += text
      onProgress({ stage: 'building', message: `[ERROR] ${text.trim()}` })
    })

    child.on('close', (code) => {
      if (code === 0) {
        resolve({ success: true })
      } else {
        resolve({
          success: false,
          error: `Build command exited with code ${code}\n${stderr}`
        })
      }
    })

    child.on('error', (error) => {
      resolve({
        success: false,
        error: error.message
      })
    })
  })
}