import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useFormData } from '@/hooks/useFormData'
import { generatePDF } from '@/lib/api'
import {
  MILITARY_BRANCHES,
  BRANCH_MAILING_ADDRESSES,
} from '@/lib/constants'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  Shield,
  Download,
  FileText,
  Mail,
  CheckCircle,
  AlertCircle,
  Loader2,
  Package,
  Printer,
  ExternalLink,
  Copy,
  Info,
  Clock,
} from 'lucide-react'
import { toast } from 'sonner'

// Local user ID (single-user desktop app)
const LOCAL_USER_ID = 'local-user'

export default function DownloadPage() {
  const navigate = useNavigate()
  const { personalInfo, militaryService, loading } = useFormData(LOCAL_USER_ID)

  const [isGenerating, setIsGenerating] = useState(false)
  const [checklist, setChecklist] = useState<Record<string, boolean>>({})

  const getBranchMailingInfo = () => {
    if (!militaryService?.branch) return null
    return BRANCH_MAILING_ADDRESSES[militaryService.branch as keyof typeof BRANCH_MAILING_ADDRESSES]
  }

  const mailingInfo = getBranchMailingInfo()
  const branchLabel = MILITARY_BRANCHES.find((b) => b.value === militaryService?.branch)?.label

  const handleGeneratePDF = async (documentType: 'dd2860' | 'cover-letter' | 'package') => {
    if (!LOCAL_USER_ID) return

    setIsGenerating(true)
    try {
      const result = await generatePDF(LOCAL_USER_ID, documentType)
      if (result.data?.pdf) {
        // Convert base64 to blob and download
        const byteCharacters = atob(result.data.pdf)
        const byteNumbers = new Array(byteCharacters.length)
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i)
        }
        const byteArray = new Uint8Array(byteNumbers)
        const blob = new Blob([byteArray], { type: 'application/pdf' })

        // Create download link
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `CRSC_${documentType}_${personalInfo?.last_name || 'Application'}.pdf`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)

        toast.success('Document downloaded successfully')
      } else {
        toast.error(result.error || 'Failed to generate PDF')
      }
    } catch (error) {
      toast.error('Failed to generate PDF')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleDownloadPackage = async () => {
    await handleGeneratePDF('package')
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard')
  }

  const getMailingAddress = () => {
    if (!mailingInfo) return ''
    return `${mailingInfo.name}\n${mailingInfo.address.join('\n')}`
  }

  const toggleChecklist = (item: string) => {
    setChecklist((prev) => ({ ...prev, [item]: !prev[item] }))
  }

  const checklistItems = [
    { id: 'dd2860', label: 'DD Form 2860 (signed and dated)' },
    { id: 'dd214', label: 'Copy of DD214/DD215' },
    { id: 'retirement_orders', label: 'Copy of Retirement Orders' },
    { id: 'va_decision', label: 'Copy of VA Rating Decision Letter' },
    { id: 'va_code_sheet', label: 'Copy of VA Code Sheet' },
    { id: 'medical_records', label: 'Supporting medical records (if applicable)' },
    { id: 'awards', label: 'Award citations/certificates (if applicable)' },
    { id: 'cover_letter', label: 'Cover letter' },
  ]

  const completedItems = Object.values(checklist).filter(Boolean).length

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
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            <span className="font-bold text-primary">CRSC Assistant</span>
          </Link>
          <Button variant="outline" onClick={() => navigate('/dashboard')}>
            Back to Dashboard
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Success Banner */}
        <Card className="mb-8 border-green-500 bg-green-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-green-800">
                  Your CRSC Package is Ready!
                </h1>
                <p className="text-green-700 mt-1">
                  Download your completed application package and follow the submission
                  instructions below.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Download Section */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  Download Documents
                </CardTitle>
                <CardDescription>
                  Download your completed CRSC application documents
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleDownloadPackage}
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating Package...
                    </>
                  ) : (
                    <>
                      <Package className="mr-2 h-5 w-5" />
                      Download Complete Package (ZIP)
                    </>
                  )}
                </Button>

                <Separator />

                <p className="text-sm text-muted-foreground">
                  Or download individual documents:
                </p>

                <div className="space-y-2">
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => handleGeneratePDF('dd2860')}
                    disabled={isGenerating}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    DD Form 2860
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => handleGeneratePDF('cover-letter')}
                    disabled={isGenerating}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Cover Letter
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Submission Checklist */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  Submission Checklist
                </CardTitle>
                <CardDescription>
                  Ensure your packet includes all required documents ({completedItems}/
                  {checklistItems.length} checked)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {checklistItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center space-x-3 cursor-pointer"
                      onClick={() => toggleChecklist(item.id)}
                    >
                      <Checkbox
                        checked={checklist[item.id] || false}
                        onCheckedChange={() => toggleChecklist(item.id)}
                      />
                      <span
                        className={
                          checklist[item.id] ? 'text-muted-foreground line-through' : ''
                        }
                      >
                        {item.label}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Submission Instructions */}
          <div className="space-y-6">
            {/* Mailing Address */}
            {mailingInfo && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    Mailing Address
                  </CardTitle>
                  <CardDescription>
                    Mail your completed packet to {branchLabel}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="bg-muted p-4 rounded-lg relative">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2"
                      onClick={() => copyToClipboard(getMailingAddress())}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <p className="font-medium">{mailingInfo.name}</p>
                    {mailingInfo.address.map((line, i) => (
                      <p key={i} className="text-muted-foreground">
                        {line}
                      </p>
                    ))}
                  </div>

                  {('email' in mailingInfo || 'phone' in mailingInfo) && (
                    <div className="mt-4 space-y-2">
                      {'email' in mailingInfo && mailingInfo.email && (
                        <div className="flex items-center gap-2 text-sm">
                          <Badge variant="outline">Email</Badge>
                          <a
                            href={`mailto:${mailingInfo.email}`}
                            className="text-primary hover:underline"
                          >
                            {mailingInfo.email}
                          </a>
                        </div>
                      )}
                      {'phone' in mailingInfo && mailingInfo.phone && (
                        <div className="flex items-center gap-2 text-sm">
                          <Badge variant="outline">Phone</Badge>
                          <span>{mailingInfo.phone}</span>
                        </div>
                      )}
                      {'fax' in mailingInfo && mailingInfo.fax && (
                        <div className="flex items-center gap-2 text-sm">
                          <Badge variant="outline">Fax</Badge>
                          <span>{mailingInfo.fax}</span>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Important Reminders */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  Important Reminders
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>Do NOT Send Originals</AlertTitle>
                    <AlertDescription>
                      Send copies of all documents. Never send original documents as they
                      may not be returned.
                    </AlertDescription>
                  </Alert>

                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>Sign and Date DD Form 2860</AlertTitle>
                    <AlertDescription>
                      Make sure to sign and date your DD Form 2860 before mailing.
                      Unsigned forms will be returned.
                    </AlertDescription>
                  </Alert>

                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>Use Certified Mail</AlertTitle>
                    <AlertDescription>
                      We recommend sending your packet via certified mail with return
                      receipt requested for tracking purposes.
                    </AlertDescription>
                  </Alert>
                </div>
              </CardContent>
            </Card>

            {/* FAQ */}
            <Card>
              <CardHeader>
                <CardTitle>Frequently Asked Questions</CardTitle>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="timeline">
                    <AccordionTrigger>How long does processing take?</AccordionTrigger>
                    <AccordionContent>
                      Processing times vary by branch but typically range from 4-6 months.
                      Some branches may take longer depending on workload.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="denied">
                    <AccordionTrigger>What if my claim is denied?</AccordionTrigger>
                    <AccordionContent>
                      If your claim is denied, you can request reconsideration within one
                      year of the decision. You may provide additional evidence to support
                      your claim.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="backpay">
                    <AccordionTrigger>How far back can I receive compensation?</AccordionTrigger>
                    <AccordionContent>
                      Following the Supreme Court's June 2025 ruling in Soto v. United States,
                      the previous 6-year back pay limit has been eliminated. Eligible veterans
                      may now receive full retroactive payments to their initial eligibility date.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="status">
                    <AccordionTrigger>How do I check my application status?</AccordionTrigger>
                    <AccordionContent>
                      Contact your branch's CRSC office directly using the contact
                      information provided above. Be sure to have your claim number ready.
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>

            {/* External Resources */}
            <Card>
              <CardHeader>
                <CardTitle>Additional Resources</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="link" className="h-auto p-0" asChild>
                  <a
                    href="https://www.va.gov/disability/combat-related-special-compensation/"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    VA CRSC Information
                  </a>
                </Button>
                <br />
                <Button variant="link" className="h-auto p-0" asChild>
                  <a
                    href="https://www.esd.whs.mil/Portals/54/Documents/DD/forms/dd/dd2860.pdf"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    DD Form 2860 (Blank Form)
                  </a>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Print Instructions */}
        <Card className="mt-8">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <Printer className="h-8 w-8 text-muted-foreground" />
              <div>
                <h3 className="font-semibold">Ready to Print?</h3>
                <p className="text-muted-foreground">
                  Print your documents, sign the DD Form 2860, gather your supporting
                  documents, and mail your complete packet using certified mail.
                </p>
              </div>
              <Button className="ml-auto" onClick={() => window.print()}>
                <Printer className="mr-2 h-4 w-4" />
                Print Instructions
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Status Tracking */}
        <Card className="mt-8 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <Clock className="h-8 w-8 text-primary" />
              <div>
                <h3 className="font-semibold">Track Your Submission</h3>
                <p className="text-muted-foreground">
                  After mailing your packet, track its status and get help with reconsideration
                  if needed.
                </p>
              </div>
              <Button className="ml-auto" variant="outline" onClick={() => navigate('/status')}>
                Track Status
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
