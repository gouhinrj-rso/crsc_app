import { useState, useEffect } from 'react'
import { useAuthContext } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Loader2, Shield, ShieldCheck, ShieldOff, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

export function MfaSetup() {
  const { enrollMfa, verifyMfa, unenrollMfa, listMfaFactors } = useAuthContext()
  const [factors, setFactors] = useState<Array<{ id: string; friendly_name?: string; factor_type: string; status: string }>>([])
  const [loading, setLoading] = useState(true)
  const [enrolling, setEnrolling] = useState(false)
  const [enrollData, setEnrollData] = useState<{ id: string; qrCode: string; secret: string } | null>(null)
  const [verifyCode, setVerifyCode] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadFactors = async () => {
    setLoading(true)
    const result = await listMfaFactors()
    if (result.factors) {
      setFactors(result.factors)
    }
    setLoading(false)
  }

  useEffect(() => {
    loadFactors()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleEnroll = async () => {
    setEnrolling(true)
    setError(null)
    const result = await enrollMfa()
    setEnrolling(false)

    if (!result.success) {
      setError(result.error || 'Failed to start MFA enrollment')
      return
    }

    setEnrollData(result.data!)
  }

  const handleVerify = async () => {
    if (!enrollData || !verifyCode) return
    setVerifying(true)
    setError(null)

    const result = await verifyMfa(enrollData.id, verifyCode)
    setVerifying(false)

    if (!result.success) {
      setError(result.error || 'Invalid verification code')
      return
    }

    toast.success('MFA enabled successfully')
    setEnrollData(null)
    setVerifyCode('')
    loadFactors()
  }

  const handleUnenroll = async (factorId: string) => {
    const result = await unenrollMfa(factorId)
    if (!result.success) {
      toast.error(result.error || 'Failed to disable MFA')
      return
    }
    toast.success('MFA disabled')
    loadFactors()
  }

  const isEnabled = factors.some((f) => f.status === 'verified')

  if (loading) {
    return (
      <Card>
        <CardContent className="py-6 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Two-Factor Authentication
        </CardTitle>
        <CardDescription>
          Add an extra layer of security to your account with TOTP authentication
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {isEnabled ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-green-500" />
              <span className="font-medium text-green-700">MFA is enabled</span>
              <Badge className="bg-green-100 text-green-700">Active</Badge>
            </div>
            {factors.filter((f) => f.status === 'verified').map((factor) => (
              <div key={factor.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="text-sm font-medium">{factor.friendly_name || 'Authenticator App'}</p>
                  <p className="text-xs text-muted-foreground">TOTP</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleUnenroll(factor.id)}
                >
                  <ShieldOff className="h-4 w-4 mr-2" />
                  Disable
                </Button>
              </div>
            ))}
          </div>
        ) : enrollData ? (
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-3">
                Scan this QR code with your authenticator app (e.g., Google Authenticator, Authy)
              </p>
              <img
                src={enrollData.qrCode}
                alt="MFA QR Code"
                className="mx-auto border rounded-lg p-2"
                width={200}
                height={200}
              />
              <p className="text-xs text-muted-foreground mt-2">
                Or enter this secret manually: <code className="bg-muted px-1 py-0.5 rounded text-xs">{enrollData.secret}</code>
              </p>
            </div>
            <div className="space-y-2">
              <Label>Enter the 6-digit code from your authenticator app</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="000000"
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  maxLength={6}
                  className="font-mono text-center text-lg tracking-widest"
                />
                <Button onClick={handleVerify} disabled={verifying || verifyCode.length !== 6}>
                  {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Verify'}
                </Button>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => setEnrollData(null)}>
              Cancel
            </Button>
          </div>
        ) : (
          <div>
            <p className="text-sm text-muted-foreground mb-3">
              Protect your account by requiring a verification code in addition to your password.
              This is recommended for accounts with sensitive health information.
            </p>
            <Button onClick={handleEnroll} disabled={enrolling}>
              {enrolling ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Shield className="mr-2 h-4 w-4" />
              )}
              Enable MFA
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
