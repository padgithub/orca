export const EMULATOR_BUILD_SPECS = [
  {
    path: ['emulator', 'build-and-run'],
    summary: 'Build project and run on target device',
    usage: 'orca emulator build-and-run [--worktree <selector>] [--device <id>] [--platform ios|android] [--json]',
    allowedFlags: ['device', 'platform', 'worktree', 'json'],
    positionalArgs: [] as string[]
  }
]
