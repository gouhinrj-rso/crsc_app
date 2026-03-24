import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { useAuthContext } from '@/contexts/AuthContext'
import { registerSchema, type RegisterFormData } from '@/lib/validation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Checkbox } from '@/components/ui/checkbox'
import { Shield, Loader2, AlertCircle, CheckCircle } from 'lucide-react'

export default function Register() {
  const { signUp, loading, error, clearError } = useAuthContext()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  })

  const password = watch('password', '')

  const passwordRequirements = [
    { met: password.length >= 12, text: 'At least 12 characters' },
    { met: /[A-Z]/.test(password), text: 'One uppercase letter' },
    { met: /[a-z]/.test(password), text: 'One lowercase letter' },
    { met: /[0-9]/.test(password), text: 'One number' },
    { met: /[^A-Za-z0-9]/.test(password), text: 'One special character' },
  ]

  const onSubmit = async (data: RegisterFormData) => {
    if (!acceptedTerms) {
      toast.error('Please accept the terms and conditions')
      return
    }

    setIsSubmitting(true)
    clearError()

    const result = await signUp(data.email, data.password)

    if (result.success) {
      setEmailSent(true)
      toast.success('Check your email to verify your account')
    } else {
      toast.error(result.error || 'Failed to create account')
    }

    setIsSubmitting(false)
  }

  if (emailSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/50 px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Link to="/" className="inline-flex items-center gap-2 text-primary hover:opacity-80">
              <Shield className="h-8 w-8" />
              <span className="text-xl font-bold">CRSC Filing Assistant</span>
            </Link>
          </div>

          <Card>
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <CardTitle className="text-2xl">Check Your Email</CardTitle>
              <CardDescription>
                We've sent a verification link to your email address.
                Click the link to activate your account.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-sm text-muted-foreground mb-4">
                Didn't receive the email? Check your spam folder or try again.
              </p>
              <Button
                variant="outline"
                onClick={() => setEmailSent(false)}
              >
                Try Again
              </Button>
            </CardContent>
            <CardFooter className="justify-center">
              <Link to="/login" className="text-sm text-primary hover:underline">
                Back to Sign In
              </Link>
            </CardFooter>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/50 px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 text-primary hover:opacity-80">
            <Shield className="h-8 w-8" />
            <span className="text-xl font-bold">CRSC Filing Assistant</span>
          </Link>
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Create Your Account</CardTitle>
            <CardDescription>
              Start your CRSC application today
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  {...register('email')}
                  disabled={isSubmitting || loading}
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Create a secure password"
                  {...register('password')}
                  disabled={isSubmitting || loading}
                />
                {errors.password && (
                  <p className="text-sm text-destructive">{errors.password.message}</p>
                )}
                <div className="space-y-1 mt-2">
                  {passwordRequirements.map((req, index) => (
                    <div
                      key={index}
                      className={`flex items-center gap-2 text-xs ${
                        req.met ? 'text-green-600' : 'text-muted-foreground'
                      }`}
                    >
                      <CheckCircle className={`h-3 w-3 ${req.met ? 'opacity-100' : 'opacity-30'}`} />
                      <span>{req.text}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm your password"
                  {...register('confirmPassword')}
                  disabled={isSubmitting || loading}
                />
                {errors.confirmPassword && (
                  <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
                )}
              </div>

              <div className="flex items-start space-x-2">
                <Checkbox
                  id="terms"
                  checked={acceptedTerms}
                  onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
                  disabled={isSubmitting || loading}
                />
                <label
                  htmlFor="terms"
                  className="text-sm text-muted-foreground leading-tight cursor-pointer"
                >
                  I agree to the{' '}
                  <Link to="/terms" className="text-primary hover:underline">
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link to="/privacy" className="text-primary hover:underline">
                    Privacy Policy
                  </Link>
                  , including HIPAA acknowledgment for handling of protected health information.
                </label>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting || loading || !acceptedTerms}
              >
                {(isSubmitting || loading) ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  'Create Account'
                )}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <div className="text-center text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link to="/login" className="text-primary hover:underline font-medium">
                Sign in
              </Link>
            </div>
          </CardFooter>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-8">
          Your information is protected with HIPAA-compliant security measures.
        </p>
      </div>
    </div>
  )
}
