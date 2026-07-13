import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, Zap } from 'lucide-react'
import { translate } from '@/i18n/i18n'
import { cn } from '@/lib/utils'
import { callRuntimeRpc } from '@/runtime/runtime-rpc-client'

interface EmulatorPaneBuildButtonProps {
  worktreeId: string
  deviceId?: string
  devicePlatform: 'ios' | 'android'
  disabled?: boolean
  onBuildStart?: () => void
  onBuildComplete?: () => void
}

export function EmulatorPaneBuildButton({
  worktreeId,
  deviceId,
  devicePlatform,
  disabled = false,
  onBuildStart,
  onBuildComplete
}: EmulatorPaneBuildButtonProps) {
  const [isBuilding, setIsBuilding] = useState(false)
  const [buildMessage, setBuildMessage] = useState<string | null>(null)

  const handleBuildAndRun = useCallback(async () => {
    if (!deviceId) {
      setBuildMessage('No device selected')
      return
    }

    setIsBuilding(true)
    setBuildMessage('Starting build...')
    onBuildStart?.()

    try {
      // Call RPC to build and run
      const result = await callRuntimeRpc('emulator.build-and-run', {
        worktreeId,
        deviceId,
        platform: devicePlatform
      })

      if (result && typeof result === 'object') {
        const buildResult = result as { success?: boolean; message?: string; error?: string }
        if (buildResult.success) {
          setBuildMessage(buildResult.message || 'Build complete!')
          onBuildComplete?.()
          // Auto-dismiss after 3 seconds
          setTimeout(() => {
            setBuildMessage(null)
          }, 3000)
        } else {
          setBuildMessage(`Error: ${buildResult.error || buildResult.message || 'Build failed'}`)
        }
      } else {
        setBuildMessage('Build complete!')
        onBuildComplete?.()
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      setBuildMessage(`Error: ${errorMsg}`)
      console.error('Build failed:', error)
    } finally {
      setIsBuilding(false)
    }
  }, [deviceId, devicePlatform, worktreeId, onBuildStart, onBuildComplete])

  return (
    <div className="flex flex-col gap-2">
      <Button
        size="sm"
        variant={isBuilding ? 'secondary' : 'default'}
        disabled={disabled || isBuilding || !deviceId}
        onClick={handleBuildAndRun}
        className="gap-2"
        title="Build project and run on selected device"
      >
        {isBuilding ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <Zap className="size-3.5" />
        )}
        <span className="hidden sm:inline">
          {isBuilding
            ? translate('auto.components.emulator.pane.build.building', 'Building…')
            : translate('auto.components.emulator.pane.build.button', 'Build & Run')}
        </span>
      </Button>
      {buildMessage && (
        <p className={cn(
          'text-xs px-1',
          buildMessage.startsWith('Error') ? 'text-destructive' : 'text-muted-foreground'
        )}>
          {buildMessage}
        </p>
      )}
    </div>
  )
}
