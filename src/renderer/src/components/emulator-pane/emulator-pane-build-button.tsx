import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, Zap } from 'lucide-react'
import { translate } from '@/i18n/i18n'
import { cn } from '@/lib/utils'

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

  const handleBuildAndRun = async () => {
    if (!deviceId) {
      setBuildMessage('No device selected')
      return
    }

    setIsBuilding(true)
    setBuildMessage('Starting build...')
    onBuildStart?.()

    try {
      // Call RPC to build and run
      const response = await fetch('/api/rpc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'emulator.build-and-run',
          params: {
            worktreeId,
            deviceId,
            platform: devicePlatform
          }
        })
      })

      if (!response.ok) {
        const error = await response.json()
        setBuildMessage(`Error: ${error.error || 'Build failed'}`)
        return
      }

      const result = await response.json()
      setBuildMessage(result.message || 'Build complete!')
      onBuildComplete?.()

      // Auto-dismiss after 3 seconds
      setTimeout(() => {
        setBuildMessage(null)
      }, 3000)
    } catch (error) {
      setBuildMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsBuilding(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        size="sm"
        variant={isBuilding ? 'secondary' : 'default'}
        disabled={disabled || isBuilding || !deviceId}
        onClick={handleBuildAndRun}
        className="gap-2"
      >
        {isBuilding ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <Zap className="size-3.5" />
        )}
        {isBuilding
          ? translate('auto.components.emulator.pane.build.building', 'Building…')
          : translate('auto.components.emulator.pane.build.button', 'Build & Run')}
      </Button>
      {buildMessage && (
        <p className={cn(
          'text-xs',
          buildMessage.startsWith('Error') ? 'text-destructive' : 'text-muted-foreground'
        )}>
          {buildMessage}
        </p>
      )}
    </div>
  )
}