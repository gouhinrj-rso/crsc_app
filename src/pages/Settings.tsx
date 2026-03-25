import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export default function Settings() {
  const navigate = useNavigate()
  const [apiKey, setApiKey] = useState('')
  const [storagePath, setStoragePath] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function loadSettings() {
      try {
        const settings = await window.electronAPI.settings.getAll()
        if (settings.apiKey) setApiKey(settings.apiKey)
        if (settings.storagePath) setStoragePath(settings.storagePath)
      } catch (err) {
        console.error('Failed to load settings:', err)
        toast.error('Failed to load settings')
      }
    }
    loadSettings()
  }, [])

  async function handleSave() {
    setSaving(true)
    try {
      await window.electronAPI.settings.set('apiKey', apiKey)
      await window.electronAPI.settings.set('storagePath', storagePath)
      toast.success('Settings saved successfully')
    } catch (err) {
      console.error('Failed to save settings:', err)
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-2xl space-y-6">
        <Button variant="ghost" onClick={() => navigate('/dashboard')}>
          &larr; Back to Dashboard
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Settings</CardTitle>
            <CardDescription>
              Configure your API key and storage preferences.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="apiKey">Anthropic API Key</Label>
              <Input
                id="apiKey"
                type="password"
                placeholder="sk-ant-..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                Your API key is stored locally and never sent to any server other than Anthropic.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="storagePath">Storage Path</Label>
              <Input
                id="storagePath"
                type="text"
                placeholder="Leave blank to use default location"
                value={storagePath}
                onChange={(e) => setStoragePath(e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                Optional. The default storage path is your system's application data directory.
              </p>
            </div>

            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Settings'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
