import { defineMethod, type RpcMethod } from '../core'
import { z } from 'zod'

const BuildAndRunParams = z.object({
  worktreeId: z.string(),
  deviceId: z.string().optional(),
  platform: z.enum(['ios', 'android'])
})

export const EMULATOR_BUILD_AND_RUN_METHOD: RpcMethod = defineMethod({
  name: 'emulator.build-and-run',
  params: BuildAndRunParams,
  handler: async (params, { runtime }) => {
    if (!runtime || typeof runtime.emulatorBuildAndRun !== 'function') {
      throw new Error('emulator.build-and-run not supported')
    }
    return runtime.emulatorBuildAndRun(params)
  }
})
