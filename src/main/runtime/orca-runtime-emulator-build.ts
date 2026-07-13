import type { RuntimeEmulatorCommandHost } from './orca-runtime-emulator'
import { buildAndRunProject, type BuildAndRunResult } from '@/main/emulator/project-builder'

export interface EmulatorBuildAndRunParams {
  worktreeId: string
  deviceId?: string
  platform: 'ios' | 'android'
}

export class RuntimeEmulatorBuildAndRun {
  constructor(private readonly host: RuntimeEmulatorCommandHost) {}

  async emulatorBuildAndRun(
    params: EmulatorBuildAndRunParams
  ): Promise<BuildAndRunResult> {
    const worktrees = this.host.getWorktrees?.()
    const worktree = worktrees?.find((w) => w.id === params.worktreeId)

    if (!worktree) {
      return {
        success: false,
        message: `Worktree ${params.worktreeId} not found`,
        error: 'Invalid worktree ID'
      }
    }

    // Build the project
    const result = await buildAndRunProject(
      worktree.path,
      params.deviceId || '',
      params.platform,
      (progress) => {
        // Could emit events here for UI updates
        console.log(`[${progress.stage}] ${progress.message}`)
      }
    )

    return result
  }
}
