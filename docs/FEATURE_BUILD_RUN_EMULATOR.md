# Build & Run to Emulator/Simulator Feature

## Overview

This feature adds a convenient "Build & Run" button to the emulator pane toolbar, allowing developers to build their project and automatically run it on a selected emulator/simulator with a single click.

## Supported Project Types

- **Android**: Gradle-based projects (single-module and multi-module)
- **iOS**: Xcode projects and workspaces
- **React Native**: Projects with Android or iOS native modules
- **Flutter**: Projects with Android or iOS support

## Usage

### UI Button

1. Open an emulator/simulator in Orca
2. Select a target device
3. Click the **Build & Run** button in the emulator pane toolbar
4. Monitor progress in the build status message
5. App automatically installs and launches on the device

### CLI Command

Agents can trigger builds via CLI:

```bash
orca emulator build-and-run --worktree <worktree> --device <device-id> --platform <ios|android>
```

## Architecture

### Components

1. **Project Build Detector** (`project-build-detector.ts`)
   - Analyzes workspace to detect project type
   - Extracts build configuration (commands, output paths, app IDs)
   - Supports Android, iOS, React Native, Flutter

2. **Project Builder** (`project-builder.ts`)
   - Executes build commands
   - Tracks progress and outputs
   - Returns built artifact path

3. **RPC Handler** (`emulator.build-and-run`)
   - Bridges UI with build orchestration
   - Handles device targeting
   - Coordinates install/launch via existing emulator bridge

4. **UI Component** (`emulator-pane-build-button.tsx`)
   - Renders button with loading state
   - Displays build progress messages
   - Calls RPC method and handles responses

## Implementation Details

### Detection Logic

The detector checks in this order:
1. Android: `build.gradle[.kts]` in root or `app/build.gradle[.kts]`
2. iOS: `.xcodeproj` or `.xcworkspace` directories
3. React Native: `package.json` with `react-native` dependency
4. Flutter: `pubspec.yaml` with `flutter:` section

### Build Commands

**Android**:
```bash
./gradlew app:assembleDebug  # Multi-module
./gradlew assembleDebug       # Single module
```

**iOS**:
```bash
xcodebuild -scheme App -configuration Debug -derivedDataPath build -arch arm64 -sdk iphonesimulator
```

**React Native**:
```bash
npx react-native run-android --no-packager  # Android
npx react-native run-ios --simulator="iPhone 16 Pro"  # iOS
```

**Flutter**:
```bash
flutter build apk --debug    # Android
flutter build ios --debug --simulator  # iOS
```

## Error Handling

- **Project not detected**: Clear error message with supported types
- **Platform mismatch**: Error if selected device platform doesn't match project type
- **Build failure**: Build output streamed to UI; user can retry
- **Artifact not found**: Error if build succeeded but output file missing

## Future Enhancements

- [ ] Support for additional project types (Xamarin, NativeScript)
- [ ] Configurable build variants/flavors
- [ ] Build caching for faster rebuilds
- [ ] Device-specific optimizations
- [ ] Build logs persistence
- [ ] Support for release builds

## Testing

Test the feature with:

1. Android Gradle project
2. iOS Xcode project
3. React Native project
4. Flutter project

Verify:
- Correct detection of project type
- Build command execution and output
- Artifact generation
- Installation to device
- App launch on device
