import { existsSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

export type ProjectBuildType = 'android' | 'ios' | 'react-native' | 'flutter' | 'unknown'

export interface ProjectBuildConfig {
  type: ProjectBuildType
  buildCommand: string
  outputPath: string
  appId?: string
  activity?: string
  workspaceRoot: string
}

export async function detectProjectBuild(workspaceRoot: string): Promise<ProjectBuildConfig | null> {
  const resolved = resolve(workspaceRoot)

  // Check Android first
  const androidConfig = detectAndroidProject(resolved)
  if (androidConfig) return androidConfig

  // Check iOS
  const iosConfig = detectIosProject(resolved)
  if (iosConfig) return iosConfig

  // Check React Native
  const rnConfig = detectReactNativeProject(resolved)
  if (rnConfig) return rnConfig

  // Check Flutter
  const flutterConfig = detectFlutterProject(resolved)
  if (flutterConfig) return flutterConfig

  return null
}

function detectAndroidProject(root: string): ProjectBuildConfig | null {
  const buildGradle = join(root, 'build.gradle')
  const buildGradleKts = join(root, 'build.gradle.kts')
  const gradleWrapper = join(root, 'gradlew')

  if (!existsSync(buildGradle) && !existsSync(buildGradleKts)) {
    return null
  }

  const appModuleGradle = join(root, 'app', 'build.gradle')
  const appModuleGradleKts = join(root, 'app', 'build.gradle.kts')

  if (!existsSync(appModuleGradle) && !existsSync(appModuleGradleKts)) {
    return {
      type: 'android',
      buildCommand: existsSync(gradleWrapper)
        ? process.platform === 'win32'
          ? '.\\gradlew.bat assembleDebug'
          : './gradlew assembleDebug'
        : 'gradle assembleDebug',
      outputPath: 'build/outputs/apk/debug/app-debug.apk',
      appId: extractAndroidPackageName(join(root, 'AndroidManifest.xml')) || undefined,
      workspaceRoot: root
    }
  }

  return {
    type: 'android',
    buildCommand: existsSync(gradleWrapper)
      ? process.platform === 'win32'
        ? '.\\gradlew.bat app:assembleDebug'
        : './gradlew app:assembleDebug'
      : 'gradle app:assembleDebug',
    outputPath: 'app/build/outputs/apk/debug/app-debug.apk',
    appId: extractAndroidPackageName(join(root, 'app', 'AndroidManifest.xml')) || undefined,
    workspaceRoot: root
  }
}

function detectIosProject(root: string): ProjectBuildConfig | null {
  const xcodeproj = findFileWithExtension(root, '.xcodeproj')
  const xcworkspace = findFileWithExtension(root, '.xcworkspace')

  if (!xcodeproj && !xcworkspace) {
    return null
  }

  const infoPlist = findFile(root, 'Info.plist')
  const bundleId = infoPlist ? extractBundleId(infoPlist) : undefined
  const scheme = extractXcodeScheme(xcworkspace || xcodeproj)

  return {
    type: 'ios',
    buildCommand: `xcodebuild -scheme ${scheme || 'App'} -configuration Debug -derivedDataPath build -arch arm64 -sdk iphonesimulator`,
    outputPath: 'build/Build/Products/Debug-iphonesimulator/App.app',
    appId: bundleId,
    workspaceRoot: root
  }
}

function detectReactNativeProject(root: string): ProjectBuildConfig | null {
  const packageJson = join(root, 'package.json')
  if (!existsSync(packageJson)) return null

  try {
    const content = readFileSync(packageJson, 'utf-8')
    const pkg = JSON.parse(content)
    const hasReactNative = pkg.dependencies?.['react-native'] || pkg.devDependencies?.['react-native']

    if (!hasReactNative) return null

    const androidPath = join(root, 'android')
    const iosPath = join(root, 'ios')

    if (existsSync(androidPath)) {
      return {
        type: 'react-native',
        buildCommand: 'npx react-native run-android --no-packager',
        outputPath: 'android/app/build/outputs/apk/debug/app-debug.apk',
        workspaceRoot: root
      }
    }

    if (existsSync(iosPath)) {
      return {
        type: 'react-native',
        buildCommand: 'npx react-native run-ios --simulator="iPhone 16 Pro"',
        outputPath: 'ios/build/Release-iphonesimulator/App.app',
        workspaceRoot: root
      }
    }
  } catch {
    // Invalid package.json
  }

  return null
}

function detectFlutterProject(root: string): ProjectBuildConfig | null {
  const pubspecYaml = join(root, 'pubspec.yaml')
  if (!existsSync(pubspecYaml)) return null

  try {
    const content = readFileSync(pubspecYaml, 'utf-8')
    if (!content.includes('flutter:')) return null

    const androidPath = join(root, 'android')
    const iosPath = join(root, 'ios')

    if (existsSync(androidPath)) {
      return {
        type: 'flutter',
        buildCommand: 'flutter build apk --debug',
        outputPath: 'build/app/outputs/flutter-apk/app-debug.apk',
        workspaceRoot: root
      }
    }

    if (existsSync(iosPath)) {
      return {
        type: 'flutter',
        buildCommand: 'flutter build ios --debug --simulator',
        outputPath: 'build/ios/Debug-iphonesimulator/App.app',
        workspaceRoot: root
      }
    }
  } catch {
    // Invalid YAML
  }

  return null
}

function extractAndroidPackageName(manifestPath: string): string | null {
  if (!existsSync(manifestPath)) return null
  try {
    const content = readFileSync(manifestPath, 'utf-8')
    const match = content.match(/package="([^"]+)"/)
    return match?.[1] || null
  } catch {
    return null
  }
}

function extractBundleId(infoPlistPath: string): string | null {
  if (!existsSync(infoPlistPath)) return null
  try {
    const content = readFileSync(infoPlistPath, 'utf-8')
    const match = content.match(/<key>CFBundleIdentifier<\/key>\s*<string>([^<]+)<\/string>/)
    return match?.[1] || null
  } catch {
    return null
  }
}

function extractXcodeScheme(projectPath: string): string | null {
  const name = projectPath.split('/').pop()?.replace('.xcodeproj', '').replace('.xcworkspace', '')
  return name || null
}

function findFileWithExtension(dir: string, ext: string): string | null {
  if (!existsSync(dir)) return null
  try {
    const files = require('node:fs').readdirSync(dir)
    const found = files.find((f: string) => f.endsWith(ext))
    return found ? join(dir, found) : null
  } catch {
    return null
  }
}

function findFile(dir: string, filename: string): string | null {
  const path = join(dir, filename)
  return existsSync(path) ? path : null
}