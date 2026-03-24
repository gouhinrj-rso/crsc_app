import { Link, useNavigate } from 'react-router-dom'
import { useAuthContext } from '@/contexts/AuthContext'
import { useDevMode } from '@/contexts/DevModeContext'
import { useFormData } from '@/hooks/useFormData'
import { APPLICATION_STEPS } from '@/lib/constants'
import { MfaSetup } from '@/components/MfaSetup'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Switch } from '@/components/ui/switch'
import {
  Shield,
  User,
  LogOut,
  CheckCircle,
  Circle,
  Clock,
  ArrowRight,
  FileText,
  MessageSquare,
  Upload,
  CreditCard,
  Download,
  AlertCircle,
  Loader2,
  AlertTriangle,
  Code,
} from 'lucide-react'

const stepIcons: Record<string, typeof CheckCircle> = {
  eligibility: CheckCircle,
  personal_info: User,
  military_service: Shield,
  va_disability: FileText,
  disability_claims: FileText,
  documents: Upload,
  review: FileText,
  payment: CreditCard,
  download: Download,
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { user, signOut, isVeteranVerified, isAdmin } = useAuthContext()
  const { devMode, toggleDevMode } = useDevMode()
  const { packetStatus, loading, calculateProgress } = useFormData(user?.id)

  const progress = calculateProgress()

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  const getStepStatus = (stepId: string) => {
    const status = packetStatus.find((s) => s.step_name === stepId)
    return status?.step_status || 'not_started'
  }

  const getNextStep = () => {
    for (const step of APPLICATION_STEPS) {
      const status = getStepStatus(step.id)
      if (status !== 'completed') {
        return step.id
      }
    }
    return 'download'
  }

  const getStepLink = (stepId: string) => {
    switch (stepId) {
      case 'eligibility':
      case 'personal_info':
      case 'military_service':
      case 'va_disability':
      case 'disability_claims':
      case 'documents':
        return '/chat'
      case 'review':
        return '/review'
      case 'payment':
        return '/payment'
      case 'download':
        return '/download'
      default:
        return '/chat'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-muted/50">
      {/* Header */}
      <header className="border-b bg-white sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold text-primary">CRSC Filing Assistant</span>
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2">
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">{user?.email}</span>
                {isVeteranVerified && (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem disabled>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">{user?.email}</span>
                  {isVeteranVerified && (
                    <Badge variant="outline" className="text-green-600 border-green-600 text-xs">
                      Verified
                    </Badge>
                  )}
                </div>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {isAdmin && (
                <>
                  <div
                    className="flex items-center justify-between px-2 py-1.5 text-sm cursor-pointer hover:bg-accent rounded-sm"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      toggleDevMode()
                    }}
                  >
                    <div className="flex items-center">
                      <Code className="mr-2 h-4 w-4" />
                      Dev Mode
                    </div>
                    <Switch
                      checked={devMode}
                      onCheckedChange={() => toggleDevMode()}
                      onClick={(e) => e.stopPropagation()}
                      className="ml-2"
                    />
                  </div>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Veteran Verification Banner */}
        {!isVeteranVerified && (
          <Alert className="mb-6 border-amber-200 bg-amber-50">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertTitle className="text-amber-800">Verify Your Veteran Status</AlertTitle>
            <AlertDescription className="text-amber-700">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-2">
                <span>
                  Verify your veteran status with ID.me to generate your CRSC filing packet.
                  You can still fill out your application, but verification is required before payment and download.
                </span>
                <Button
                  size="sm"
                  className="bg-amber-600 hover:bg-amber-700 whitespace-nowrap"
                  onClick={() => navigate('/verify-veteran')}
                >
                  Verify Now
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Welcome Card */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <CardTitle className="text-2xl">Welcome to Your CRSC Application</CardTitle>
                <CardDescription className="mt-2">
                  Complete each step to generate your filing package
                </CardDescription>
              </div>
              <Link to={getStepLink(getNextStep())}>
                <Button className="gap-2">
                  Continue Application <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Overall Progress</span>
                <span className="font-medium">{progress.percentage}% Complete</span>
              </div>
              <Progress value={progress.percentage} className="h-2" />
              <p className="text-sm text-muted-foreground">
                {progress.completedSteps} of {progress.totalSteps} steps completed
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Steps Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {APPLICATION_STEPS.map((step, index) => {
            const status = getStepStatus(step.id)
            const Icon = stepIcons[step.id] || Circle
            const isComplete = status === 'completed'
            const isInProgress = status === 'in_progress'
            // A step is locked only if it's not complete AND the previous step isn't complete
            const isLocked = !isComplete && index > 0 && getStepStatus(APPLICATION_STEPS[index - 1].id) !== 'completed'

            return (
              <Card
                key={step.id}
                className={`relative transition-all ${
                  isComplete
                    ? 'border-green-500 bg-green-50/50'
                    : isInProgress
                    ? 'border-primary bg-primary/5'
                    : isLocked
                    ? 'opacity-60'
                    : ''
                }`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          isComplete
                            ? 'bg-green-500 text-white'
                            : isInProgress
                            ? 'bg-primary text-white'
                            : 'bg-muted'
                        }`}
                      >
                        {isComplete ? (
                          <CheckCircle className="h-5 w-5" />
                        ) : (
                          <Icon className="h-5 w-5" />
                        )}
                      </div>
                      <div>
                        <CardTitle className="text-base">{step.name}</CardTitle>
                        <CardDescription className="text-xs mt-0.5">
                          {step.description}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge
                      variant={
                        isComplete ? 'default' : isInProgress ? 'secondary' : 'outline'
                      }
                      className={isComplete ? 'bg-green-500' : ''}
                    >
                      {isComplete ? 'Complete' : isInProgress ? 'In Progress' : 'Not Started'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {!isLocked ? (
                    <Link to={getStepLink(step.id)}>
                      <Button
                        variant={isComplete ? 'outline' : 'default'}
                        size="sm"
                        className="w-full"
                      >
                        {isComplete ? 'Review' : isInProgress ? 'Continue' : 'Start'}
                      </Button>
                    </Link>
                  ) : (
                    <Button variant="outline" size="sm" className="w-full" disabled>
                      <Clock className="mr-2 h-4 w-4" />
                      Complete previous steps
                    </Button>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 gap-4 mt-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                AI Assistant
              </CardTitle>
              <CardDescription>
                Get help filling out your application with our AI-powered assistant
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/chat">
                <Button variant="outline" className="w-full">
                  Open Chat Assistant
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-primary" />
                Need Help?
              </CardTitle>
              <CardDescription>
                Have questions about CRSC or the filing process?
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full" asChild>
                <a
                  href="https://www.va.gov/resources/combat-related-special-compensation-crsc/#:~:text=Combat%2DRelated%20Special%20Compensation%20provides%20tax%2Dfree%20payments%20to,apply%20for%20CRSC%20through%20your%20uniformed%20service."
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Visit VA CRSC Resources
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Security Settings */}
        <div className="mt-8">
          <MfaSetup />
        </div>

        {/* Important Notice */}
        <Card className="mt-8 border-amber-500 bg-amber-50">
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <AlertCircle className="h-6 w-6 text-amber-600 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-amber-800">Important Reminder</h4>
                <p className="text-sm text-amber-700 mt-1">
                  Following the Supreme Court's June 2025 ruling in Soto v. United States, the previous
                  6-year back pay limit has been eliminated. Eligible veterans may now receive full
                  retroactive payments to their initial eligibility date. Remember: Do NOT send original
                  documents with your application - always send copies.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
