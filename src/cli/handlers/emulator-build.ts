import type { CommandHandler } from '../dispatch'
import {
  getOptionalStringFlag,
  getRequiredStringFlag
} from '../flags'
import { getEmulatorCommandTarget } from '../selectors'
import { printResult } from '../format'

export const EMULATOR_BUILD_HANDLERS: Record<string, CommandHandler> = {
  'emulator build-and-run': async ({ flags, client, cwd, json }) => {
    const target = await getEmulatorCommandTarget(flags, cwd, client)
    const platform = getOptionalStringFlag(flags, 'platform') || 'android'

    if (!['ios', 'android'].includes(platform)) {
      throw new Error('Invalid platform. Must be "ios" or "android"')
    }

    const res = await client.call('emulator.build-and-run', {
      worktreeId: target.worktree,
      deviceId: target.device,
      platform: platform as 'ios' | 'android'
    })

    printResult(res, json, () => {
      if (res && typeof res === 'object') {
        const result = res as { message?: string }
        return result.message || 'Build and run complete'
      }
      return 'Build and run complete'
    })
  }
}
