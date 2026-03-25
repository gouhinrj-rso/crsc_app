import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BRANCH_MAILING_ADDRESSES } from '@/lib/constants'
import { useFormData } from '@/hooks/useFormData'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  Shield,
  ArrowLeft,
  CheckCircle,
  Clock,
  AlertCircle,
  Loader2,
  Calendar,
  Send,
  FileText,
  HelpCircle,
} from 'lucide-react'
import { toast } from 'sonner'

interface StatusUpdate {
  date: string
  status: string
  notes: string
}

export default function StatusTracking() {
  const navigate = useNavigate()
  const { militaryService, packetStatus, setStepStatus, loading: formLoading } = useFormData()
  const [loading, setLoading] = useState(true)
  const [submissionDate, setSubmissionDate] = useState('')
  const [trackingNumber, setTrackingNumber] = useState('')
  const [currentStatus, setCurrentStatus] = useState('submitted')
  const [statusNotes, setStatusNotes] = useState('')
  const [statusHistory, setStatusHistory] = useState<StatusUpdate[]>([])
  const [isSaving, setIsSaving] = useState(false)

  const loadStatus = useCallback(() => {
    const submissionStep = packetStatus.find((s) => s.step_name === 'submission_date')
    const trackingStep = packetStatus.find((s) => s.step_name === 'tracking_number')
    const statusStep = packetStatus.find((s) => s.step_name === 'post_submission_status')

    if (submissionStep?.step_status) setSubmissionDate(submissionStep.step_status)
    if (trackingStep?.step_status) setTrackingNumber(trackingStep.step_status)
    if (statusStep?.step_status) {
      try {
        const parsed = JSON.parse(statusStep.step_status)
        if (parsed.current) setCurrentStatus(parsed.current)
        if (parsed.history) setStatusHistory(parsed.history)
      } catch {
        setCurrentStatus(statusStep.step_status)
      }
    }
    setLoading(false)
  }, [packetStatus])

  useEffect(() => {
    if (!formLoading) {
      loadStatus()
    }
  }, [formLoading, loadStatus])

  const handleSaveSubmissionInfo = async () => {
    setIsSaving(true)
    await Promise.all([
      setStepStatus('submission_date', submissionDate),
      setStepStatus('tracking_number', trackingNumber),
    ])
    setIsSaving(false)
    toast.success('Submission information saved')
  }

  const handleAddStatusUpdate = async () => {
    if (!statusNotes.trim()) return
    setIsSaving(true)

    const newUpdate: StatusUpdate = {
      date: new Date().toISOString().split('T')[0],
      status: currentStatus,
      notes: statusNotes,
    }
    const updatedHistory = [...statusHistory, newUpdate]
    setStatusHistory(updatedHistory)

    await setStepStatus('post_submission_status', JSON.stringify({
      current: currentStatus,
      history: updatedHistory,
    }))

    setStatusNotes('')
    setIsSaving(false)
    toast.success('Status update saved')
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'submitted':
        return <Badge variant="secondary"><Send className="h-3 w-3 mr-1" /> Submitted</Badge>
      case 'received':
        return <Badge className="bg-blue-100 text-blue-700"><CheckCircle className="h-3 w-3 mr-1" /> Received</Badge>
      case 'under_review':
        return <Badge className="bg-amber-100 text-amber-700"><Clock className="h-3 w-3 mr-1" /> Under Review</Badge>
      case 'approved':
        return <Badge className="bg-green-100 text-green-700"><CheckCircle className="h-3 w-3 mr-1" /> Approved</Badge>
      case 'denied':
        return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" /> Denied</Badge>
      case 'reconsideration':
        return <Badge className="bg-purple-100 text-purple-700"><HelpCircle className="h-3 w-3 mr-1" /> Reconsideration</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const branch = militaryService?.branch || ''
  const branchAddress = BRANCH_MAILING_ADDRESSES[branch as keyof typeof BRANCH_MAILING_ADDRESSES]

  // Expected timeline based on branch
  const getExpectedTimeline = () => {
    return 'Most branches process CRSC claims within 3-6 months, though some cases may take longer depending on complexity and evidence review.'
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
      <header className="border-b bg-white sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Link to="/" className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              <span className="font-bold text-primary hidden sm:inline">CRSC Assistant</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Submission Status Tracking</h1>
          <p className="text-muted-foreground mt-2">
            Track your CRSC application after mailing
          </p>
        </div>

        {/* Submission Information */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Submission Details
            </CardTitle>
            <CardDescription>Record when you mailed your CRSC packet</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date Mailed</Label>
                <Input
                  type="date"
                  value={submissionDate}
                  onChange={(e) => setSubmissionDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Tracking Number (Certified Mail)</Label>
                <Input
                  placeholder="USPS tracking number"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                />
              </div>
            </div>
            <Button onClick={handleSaveSubmissionInfo} disabled={isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save Submission Info
            </Button>
          </CardContent>
        </Card>

        {/* Expected Timeline */}
        <Alert className="mb-6">
          <Clock className="h-4 w-4" />
          <AlertTitle>Expected Processing Time</AlertTitle>
          <AlertDescription>{getExpectedTimeline()}</AlertDescription>
        </Alert>

        {/* Status Updates */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Status Updates</CardTitle>
            <CardDescription>Track the progress of your application</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Current Status</Label>
                  <Select value={currentStatus} onValueChange={setCurrentStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="submitted">Submitted / Mailed</SelectItem>
                      <SelectItem value="received">Received by Branch</SelectItem>
                      <SelectItem value="under_review">Under Review</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="denied">Denied</SelectItem>
                      <SelectItem value="reconsideration">Reconsideration Filed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  placeholder="Add notes about this status update..."
                  value={statusNotes}
                  onChange={(e) => setStatusNotes(e.target.value)}
                />
              </div>
              <Button onClick={handleAddStatusUpdate} disabled={isSaving || !statusNotes.trim()}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Add Status Update
              </Button>
            </div>

            {statusHistory.length > 0 && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h4 className="font-medium text-sm text-muted-foreground">Status History</h4>
                  {statusHistory.map((update, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {getStatusBadge(update.status)}
                          <span className="text-xs text-muted-foreground">{update.date}</span>
                        </div>
                        <p className="text-sm">{update.notes}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Reconsideration Assistance (Phase 9) */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5" />
              Reconsideration Assistance
            </CardTitle>
            <CardDescription>
              If your CRSC application was denied, you may request reconsideration
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible>
              <AccordionItem value="when">
                <AccordionTrigger>When should I request reconsideration?</AccordionTrigger>
                <AccordionContent>
                  <p className="text-sm text-muted-foreground">
                    You should request reconsideration if your CRSC claim was denied and you have:
                  </p>
                  <ul className="list-disc list-inside text-sm text-muted-foreground mt-2 space-y-1">
                    <li>New evidence that supports your claim</li>
                    <li>Medical records that were not previously submitted</li>
                    <li>Buddy statements or additional documentation</li>
                    <li>A belief that the review board did not properly consider your evidence</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="how">
                <AccordionTrigger>How do I request reconsideration?</AccordionTrigger>
                <AccordionContent>
                  <div className="text-sm text-muted-foreground space-y-3">
                    <p>To request reconsideration:</p>
                    <ol className="list-decimal list-inside space-y-2">
                      <li>Write a letter to your branch's CRSC board requesting reconsideration</li>
                      <li>Clearly state which disabilities you are reconsidering</li>
                      <li>Include any new evidence or documentation</li>
                      <li>Reference the original denial letter and date</li>
                      <li>Explain why you believe the decision should be reconsidered</li>
                    </ol>
                    {branchAddress && (
                      <div className="mt-4 p-3 bg-muted rounded-lg">
                        <p className="font-medium text-foreground mb-1">Send reconsideration to:</p>
                        <p className="whitespace-pre-line">{Array.isArray(branchAddress.address) ? branchAddress.address.join('\n') : branchAddress.address}</p>
                        {('email' in branchAddress && branchAddress.email) && <p className="mt-1">Email: {('email' in branchAddress && branchAddress.email)}</p>}
                        {('phone' in branchAddress && branchAddress.phone) && <p>Phone: {('phone' in branchAddress && branchAddress.phone)}</p>}
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="evidence">
                <AccordionTrigger>What additional evidence should I gather?</AccordionTrigger>
                <AccordionContent>
                  <div className="text-sm text-muted-foreground space-y-2">
                    <p>Consider gathering the following to strengthen your reconsideration:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li><strong>Buddy statements</strong> from service members who witnessed the event</li>
                      <li><strong>Medical records</strong> from the time of injury</li>
                      <li><strong>After-action reports</strong> or combat logs</li>
                      <li><strong>Award citations</strong> or commendation letters</li>
                      <li><strong>VA treatment records</strong> showing connection to combat</li>
                      <li><strong>Independent medical opinions</strong> linking disability to combat</li>
                      <li><strong>Personnel records</strong> showing deployment to combat zones</li>
                    </ul>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="timeline">
                <AccordionTrigger>What is the timeline for reconsideration?</AccordionTrigger>
                <AccordionContent>
                  <p className="text-sm text-muted-foreground">
                    There is no specific deadline to request reconsideration. However, it is
                    recommended to submit your request as soon as possible after receiving a denial.
                    Reconsideration reviews typically take 3-6 months, similar to the original
                    application. Following the Supreme Court's June 2025 ruling in Soto v. United States,
                    the previous 6-year back pay limit has been eliminated, so eligible veterans
                    may receive full retroactive payments to their initial eligibility date.
                  </p>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        {/* Branch Contact Information */}
        {branchAddress && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Branch Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <p className="font-medium">{branchAddress.name}</p>
                <p className="text-sm whitespace-pre-line">{Array.isArray(branchAddress.address) ? branchAddress.address.join('\n') : branchAddress.address}</p>
                {('email' in branchAddress && branchAddress.email) && (
                  <p className="text-sm">Email: <a href={`mailto:${('email' in branchAddress && branchAddress.email)}`} className="text-primary hover:underline">{('email' in branchAddress && branchAddress.email)}</a></p>
                )}
                {('phone' in branchAddress && branchAddress.phone) && (
                  <p className="text-sm">Phone: {('phone' in branchAddress && branchAddress.phone)}</p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex gap-3">
          <Button variant="outline" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <Button variant="outline" onClick={() => navigate('/download')}>
            <FileText className="h-4 w-4 mr-2" />
            Download Page
          </Button>
        </div>
      </main>
    </div>
  )
}
