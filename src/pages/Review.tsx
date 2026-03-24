import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthContext } from '@/contexts/AuthContext'
import { useFormData } from '@/hooks/useFormData'
import {
  MILITARY_BRANCHES,
  RETIREMENT_TYPES,
  COMBAT_RELATED_CODES,
  US_STATES,
} from '@/lib/constants'
import { maskSSN } from '@/lib/validation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import {
  PersonalInfoForm,
  MilitaryServiceForm,
  VADisabilityForm,
  DisabilityClaimForm,
  DocumentUpload,
  SecondaryConditionsForm,
} from '@/components/forms'
import {
  Shield,
  ArrowLeft,
  ArrowRight,
  Edit,
  User,
  Briefcase,
  FileText,
  Upload,
  CheckCircle,
  AlertCircle,
  Loader2,
  Trash2,
  Plus,
  Eye,
  Sparkles,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { generatePDF, sendChatMessage } from '@/lib/api'

type EditSection = 'personal' | 'military' | 'va' | 'claim' | 'documents' | null

export default function Review() {
  const navigate = useNavigate()
  const { user } = useAuthContext()
  const {
    personalInfo,
    militaryService,
    vaDisabilityInfo,
    disabilityClaims,
    documents,
    loading,
    savePersonalInfo,
    saveMilitaryService,
    saveVADisabilityInfo,
    addDisabilityClaim,
    editDisabilityClaim,
    removeDisabilityClaim,
    uploadAndAddDocument,
    removeDocument,
    calculateProgress,
    isSectionComplete,
  } = useFormData(user?.id)

  const [editSection, setEditSection] = useState<EditSection>(null)
  const [editingClaimId, setEditingClaimId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [previewPdf, setPreviewPdf] = useState<string | null>(null)
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false)
  const [aiReviewResult, setAiReviewResult] = useState<string | null>(null)
  const [isRunningAiReview, setIsRunningAiReview] = useState(false)

  const progress = calculateProgress()

  const handlePreviewDD2860 = async () => {
    if (!user?.id) return
    setIsGeneratingPreview(true)
    const result = await generatePDF(user.id, 'dd2860')
    setIsGeneratingPreview(false)
    if (result.error) {
      toast.error(result.error)
      return
    }
    if (result.data?.pdf) {
      setPreviewPdf(result.data.pdf)
    }
  }

  const handleAiReview = async () => {
    if (!user?.id) return
    setIsRunningAiReview(true)
    setAiReviewResult(null)

    const reviewPrompt = `Please review the following CRSC application data for completeness and accuracy. Identify any issues, missing information, weak descriptions, or missing evidence. Provide specific, actionable suggestions.

Personal Information: ${personalInfo ? `${personalInfo.first_name} ${personalInfo.last_name}, SSN: provided, DOB: ${personalInfo.date_of_birth}, Address: ${personalInfo.address_line1}, ${personalInfo.city}, ${personalInfo.state} ${personalInfo.zip_code}` : 'NOT PROVIDED'}

Military Service: ${militaryService ? `${militaryService.branch}, Rank: ${militaryService.retired_rank}, Retirement: ${militaryService.retirement_date}, Type: ${militaryService.retirement_type}, Years: ${militaryService.years_of_service}` : 'NOT PROVIDED'}

VA Disability: ${vaDisabilityInfo ? `File #: ${vaDisabilityInfo.va_file_number}, Combined Rating: ${vaDisabilityInfo.current_va_rating}%, Decision Date: ${vaDisabilityInfo.va_decision_date}` : 'NOT PROVIDED'}

Disability Claims (${disabilityClaims.length} total):
${disabilityClaims.map((c, i) => `${i + 1}. ${c.disability_title} (${c.combat_related_code}) - ${c.current_rating_percentage}% - Body: ${c.body_part_affected} - Location: ${c.location_of_injury} - Unit: ${c.unit_of_assignment} - Description: ${c.description_of_event?.substring(0, 200)}`).join('\n')}

Documents uploaded: ${documents.length} (${documents.map(d => d.document_type).join(', ')})

Please provide your review as a structured list with sections: Completeness Issues, Description Quality, Evidence Gaps, and Recommendations.`

    const result = await sendChatMessage(user.id, reviewPrompt, [
      { role: 'user', content: reviewPrompt }
    ])
    setIsRunningAiReview(false)

    if (result.error) {
      toast.error('AI review failed: ' + result.error)
      return
    }
    setAiReviewResult(result.data?.reply || 'No review generated')
  }

  const getBranchLabel = (value: string) =>
    MILITARY_BRANCHES.find((b) => b.value === value)?.label || value

  const getRetirementTypeLabel = (value: string) =>
    RETIREMENT_TYPES.find((t) => t.value === value)?.label || value

  const getStateLabel = (value: string) =>
    US_STATES.find((s) => s.value === value)?.label || value

  const getCombatCodeLabel = (code: string) =>
    COMBAT_RELATED_CODES[code as keyof typeof COMBAT_RELATED_CODES]?.name || code

  const handleSavePersonalInfo = async (data: any) => {
    setIsSaving(true)
    const result = await savePersonalInfo({
      first_name: data.firstName,
      middle_initial: data.middleInitial,
      last_name: data.lastName,
      ssn_encrypted: data.ssn,
      date_of_birth: data.dateOfBirth,
      email: data.email,
      phone: data.phone,
      address_line1: data.addressLine1,
      address_line2: data.addressLine2,
      city: data.city,
      state: data.state,
      zip_code: data.zipCode,
    })
    setIsSaving(false)
    if (result.success) {
      toast.success('Personal information saved')
      setEditSection(null)
    } else {
      toast.error(result.error || 'Failed to save')
    }
  }

  const handleSaveMilitaryService = async (data: any) => {
    setIsSaving(true)
    const result = await saveMilitaryService({
      branch: data.branch,
      service_number: data.serviceNumber,
      retired_rank: data.retiredRank,
      retirement_date: data.retirementDate,
      years_of_service: data.yearsOfService,
      retirement_type: data.retirementType,
    })
    setIsSaving(false)
    if (result.success) {
      toast.success('Military service information saved')
      setEditSection(null)
    } else {
      toast.error(result.error || 'Failed to save')
    }
  }

  const handleSaveVADisability = async (data: any) => {
    setIsSaving(true)
    const result = await saveVADisabilityInfo({
      va_file_number: data.vaFileNumber,
      current_va_rating: data.currentVaRating,
      va_decision_date: data.vaDecisionDate,
      has_va_waiver: data.hasVaWaiver,
      receives_crdp: data.receivesCrdp,
    })
    setIsSaving(false)
    if (result.success) {
      toast.success('VA disability information saved')
      setEditSection(null)
    } else {
      toast.error(result.error || 'Failed to save')
    }
  }

  const handleSaveClaim = async (data: any) => {
    setIsSaving(true)
    const claimData = {
      disability_title: data.disabilityTitle,
      disability_code: data.disabilityCode,
      body_part_affected: data.bodyPartAffected,
      date_awarded_by_va: data.dateAwardedByVa,
      initial_rating_percentage: data.initialRatingPercentage,
      current_rating_percentage: data.currentRatingPercentage,
      combat_related_code: data.combatRelatedCode,
      unit_of_assignment: data.unitOfAssignment,
      location_of_injury: data.locationOfInjury,
      description_of_event: data.descriptionOfEvent,
      received_purple_heart: data.receivedPurpleHeart,
      has_secondary_conditions: data.hasSecondaryConditions,
    }

    let result
    if (editingClaimId) {
      result = await editDisabilityClaim(editingClaimId, claimData)
    } else {
      result = await addDisabilityClaim(claimData)
    }
    setIsSaving(false)

    if (result.success) {
      toast.success(editingClaimId ? 'Claim updated' : 'Claim added')
      setEditSection(null)
      setEditingClaimId(null)
    } else {
      toast.error(result.error || 'Failed to save claim')
    }
  }

  const handleDeleteClaim = async (claimId: string) => {
    const result = await removeDisabilityClaim(claimId)
    if (result.success) {
      toast.success('Claim removed')
    } else {
      toast.error(result.error || 'Failed to remove claim')
    }
  }

  const handleDocumentUpload = async (file: File, documentType: string) => {
    const result = await uploadAndAddDocument(file, documentType)
    return result
  }

  const handleDocumentDelete = async (docId: string) => {
    return await removeDocument(docId)
  }

  const isReadyForPayment = () => {
    return (
      isSectionComplete('personal_info') &&
      isSectionComplete('military_service') &&
      isSectionComplete('va_disability') &&
      isSectionComplete('disability_claims') &&
      isSectionComplete('documents')
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const editingClaim = editingClaimId
    ? disabilityClaims.find((c) => c.id === editingClaimId)
    : null

  return (
    <div className="min-h-screen bg-muted/50">
      {/* Header */}
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
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Review Progress:</span>
              <Progress value={progress.percentage} className="w-24 h-2" />
              <span className="text-sm font-medium">{progress.percentage}%</span>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Review Your Application</h1>
          <p className="text-muted-foreground mt-2">
            Review and verify all information before proceeding to payment
          </p>
        </div>

        {/* Completion Status */}
        {!isReadyForPayment() && (
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Incomplete Application</AlertTitle>
            <AlertDescription>
              Please complete all required sections before proceeding to payment.
              Missing sections are highlighted below.
            </AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="personal" className="space-y-6">
          <TabsList className="grid grid-cols-5 w-full">
            <TabsTrigger value="personal" className="gap-2">
              <User className="h-4 w-4 hidden sm:block" />
              <span className="hidden sm:inline">Personal</span>
              {isSectionComplete('personal_info') ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <AlertCircle className="h-4 w-4 text-amber-500" />
              )}
            </TabsTrigger>
            <TabsTrigger value="military" className="gap-2">
              <Briefcase className="h-4 w-4 hidden sm:block" />
              <span className="hidden sm:inline">Military</span>
              {isSectionComplete('military_service') ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <AlertCircle className="h-4 w-4 text-amber-500" />
              )}
            </TabsTrigger>
            <TabsTrigger value="va" className="gap-2">
              <FileText className="h-4 w-4 hidden sm:block" />
              <span className="hidden sm:inline">VA</span>
              {isSectionComplete('va_disability') ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <AlertCircle className="h-4 w-4 text-amber-500" />
              )}
            </TabsTrigger>
            <TabsTrigger value="claims" className="gap-2">
              <FileText className="h-4 w-4 hidden sm:block" />
              <span className="hidden sm:inline">Claims</span>
              {isSectionComplete('disability_claims') ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <AlertCircle className="h-4 w-4 text-amber-500" />
              )}
            </TabsTrigger>
            <TabsTrigger value="documents" className="gap-2">
              <Upload className="h-4 w-4 hidden sm:block" />
              <span className="hidden sm:inline">Documents</span>
              {isSectionComplete('documents') ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <AlertCircle className="h-4 w-4 text-amber-500" />
              )}
            </TabsTrigger>
          </TabsList>

          {/* Personal Information Tab */}
          <TabsContent value="personal">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Personal Information</CardTitle>
                  <CardDescription>Your contact and identification details</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => setEditSection('personal')}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              </CardHeader>
              <CardContent>
                {personalInfo ? (
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Full Name</p>
                      <p className="font-medium">
                        {personalInfo.first_name} {personalInfo.middle_initial}{' '}
                        {personalInfo.last_name}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">SSN</p>
                      <p className="font-medium font-mono">
                        {personalInfo.ssn_encrypted
                          ? maskSSN(personalInfo.ssn_encrypted)
                          : 'Not provided'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Date of Birth</p>
                      <p className="font-medium">{personalInfo.date_of_birth || 'Not provided'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="font-medium">{personalInfo.email || 'Not provided'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Phone</p>
                      <p className="font-medium">{personalInfo.phone || 'Not provided'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Address</p>
                      <p className="font-medium">
                        {personalInfo.address_line1}
                        {personalInfo.address_line2 && <>, {personalInfo.address_line2}</>}
                        <br />
                        {personalInfo.city}, {getStateLabel(personalInfo.state || '')}{' '}
                        {personalInfo.zip_code}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No personal information provided yet.</p>
                    <Button className="mt-4" onClick={() => setEditSection('personal')}>
                      Add Information
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Military Service Tab */}
          <TabsContent value="military">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Military Service</CardTitle>
                  <CardDescription>Your service history and retirement details</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => setEditSection('military')}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              </CardHeader>
              <CardContent>
                {militaryService ? (
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Branch of Service</p>
                      <p className="font-medium">{getBranchLabel(militaryService.branch || '')}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Retired Rank</p>
                      <p className="font-medium">{militaryService.retired_rank || 'Not provided'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Retirement Date</p>
                      <p className="font-medium">
                        {militaryService.retirement_date || 'Not provided'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Years of Service</p>
                      <p className="font-medium">
                        {militaryService.years_of_service || 'Not provided'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Retirement Type</p>
                      <p className="font-medium">
                        {getRetirementTypeLabel(militaryService.retirement_type || '')}
                      </p>
                    </div>
                    {militaryService.service_number && (
                      <div>
                        <p className="text-sm text-muted-foreground">Service Number</p>
                        <p className="font-medium">{militaryService.service_number}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Briefcase className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No military service information provided yet.</p>
                    <Button className="mt-4" onClick={() => setEditSection('military')}>
                      Add Information
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* VA Disability Tab */}
          <TabsContent value="va">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>VA Disability Information</CardTitle>
                  <CardDescription>Your VA rating and file details</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => setEditSection('va')}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              </CardHeader>
              <CardContent>
                {vaDisabilityInfo ? (
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">VA File Number</p>
                      <p className="font-medium font-mono">
                        {vaDisabilityInfo.va_file_number || 'Not provided'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Current VA Rating</p>
                      <p className="font-medium">{vaDisabilityInfo.current_va_rating}%</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">VA Decision Date</p>
                      <p className="font-medium">
                        {vaDisabilityInfo.va_decision_date || 'Not provided'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Status</p>
                      <div className="flex gap-2 mt-1">
                        {vaDisabilityInfo.has_va_waiver && (
                          <Badge variant="secondary">VA Waiver</Badge>
                        )}
                        {vaDisabilityInfo.receives_crdp && (
                          <Badge variant="secondary">CRDP Recipient</Badge>
                        )}
                        {!vaDisabilityInfo.has_va_waiver && !vaDisabilityInfo.receives_crdp && (
                          <span className="text-muted-foreground">None selected</span>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No VA disability information provided yet.</p>
                    <Button className="mt-4" onClick={() => setEditSection('va')}>
                      Add Information
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Disability Claims Tab */}
          <TabsContent value="claims">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Disability Claims</CardTitle>
                  <CardDescription>
                    Combat-related disabilities you are claiming ({disabilityClaims.length} total)
                  </CardDescription>
                </div>
                <Button onClick={() => setEditSection('claim')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Claim
                </Button>
              </CardHeader>
              <CardContent>
                {disabilityClaims.length > 0 ? (
                  <div className="space-y-4">
                    {disabilityClaims.map((claim) => (
                      <div key={claim.id} className="space-y-3">
                        <Card className="bg-muted/50">
                          <CardContent className="pt-4">
                            <div className="flex justify-between items-start">
                              <div className="space-y-2 flex-1">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-semibold">{claim.disability_title}</h4>
                                  <Badge>
                                    {getCombatCodeLabel(claim.combat_related_code || '')}
                                  </Badge>
                                  {claim.received_purple_heart && (
                                    <Badge variant="secondary">Purple Heart</Badge>
                                  )}
                                </div>
                                <div className="grid sm:grid-cols-3 gap-4 text-sm">
                                  <div>
                                    <span className="text-muted-foreground">Body Part:</span>{' '}
                                    {claim.body_part_affected}
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Current Rating:</span>{' '}
                                    {claim.current_rating_percentage}%
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Location:</span>{' '}
                                    {claim.location_of_injury}
                                  </div>
                                </div>
                                <p className="text-sm text-muted-foreground line-clamp-2">
                                  {claim.description_of_event}
                                </p>
                              </div>
                              <div className="flex gap-2 ml-4">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    setEditingClaimId(claim.id)
                                    setEditSection('claim')
                                  }}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteClaim(claim.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                        {claim.has_secondary_conditions && (
                          <div className="ml-6">
                            <SecondaryConditionsForm
                              claimId={claim.id}
                              claimTitle={claim.disability_title || 'Unnamed Claim'}
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No disability claims added yet.</p>
                    <p className="text-sm mt-1">
                      Add at least one combat-related disability claim
                    </p>
                    <Button className="mt-4" onClick={() => setEditSection('claim')}>
                      Add Your First Claim
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents">
            <DocumentUpload
              documents={documents}
              onUpload={handleDocumentUpload}
              onDelete={handleDocumentDelete}
            />
          </TabsContent>
        </Tabs>

        {/* AI Review Result */}
        {aiReviewResult && (
          <Card className="mt-6 border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">AI Review Results</CardTitle>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setAiReviewResult(null)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none whitespace-pre-wrap text-sm">
                {aiReviewResult}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 mt-6">
          <Button variant="outline" onClick={handlePreviewDD2860} disabled={isGeneratingPreview}>
            {isGeneratingPreview ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Eye className="mr-2 h-4 w-4" />
            )}
            Preview DD Form 2860
          </Button>
          <Button variant="outline" onClick={handleAiReview} disabled={isRunningAiReview}>
            {isRunningAiReview ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            AI Review
          </Button>
        </div>

        {/* Navigation Buttons */}
        <Separator className="my-8" />
        <div className="flex justify-between">
          <Button variant="outline" onClick={() => navigate('/chat')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Chat
          </Button>
          <Button
            onClick={() => navigate('/payment')}
            disabled={!isReadyForPayment()}
          >
            Proceed to Payment
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </main>

      {/* Edit Dialogs */}
      <Dialog open={editSection === 'personal'} onOpenChange={() => setEditSection(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Personal Information</DialogTitle>
            <DialogDescription>Update your contact and identification details</DialogDescription>
          </DialogHeader>
          <PersonalInfoForm
            defaultValues={
              personalInfo
                ? {
                    firstName: personalInfo.first_name || '',
                    middleInitial: personalInfo.middle_initial || '',
                    lastName: personalInfo.last_name || '',
                    ssn: personalInfo.ssn_encrypted || '',
                    dateOfBirth: personalInfo.date_of_birth || '',
                    email: personalInfo.email || '',
                    phone: personalInfo.phone || '',
                    addressLine1: personalInfo.address_line1 || '',
                    addressLine2: personalInfo.address_line2 || '',
                    city: personalInfo.city || '',
                    state: personalInfo.state || '',
                    zipCode: personalInfo.zip_code || '',
                  }
                : undefined
            }
            onSubmit={handleSavePersonalInfo}
            isLoading={isSaving}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={editSection === 'military'} onOpenChange={() => setEditSection(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Military Service</DialogTitle>
            <DialogDescription>Update your service history and retirement details</DialogDescription>
          </DialogHeader>
          <MilitaryServiceForm
            defaultValues={
              militaryService
                ? {
                    branch: militaryService.branch || '',
                    serviceNumber: militaryService.service_number || '',
                    retiredRank: militaryService.retired_rank || '',
                    retirementDate: militaryService.retirement_date || '',
                    yearsOfService: militaryService.years_of_service || undefined,
                    retirementType: militaryService.retirement_type || '',
                  }
                : undefined
            }
            onSubmit={handleSaveMilitaryService}
            isLoading={isSaving}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={editSection === 'va'} onOpenChange={() => setEditSection(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit VA Disability Information</DialogTitle>
            <DialogDescription>Update your VA rating and file details</DialogDescription>
          </DialogHeader>
          <VADisabilityForm
            defaultValues={
              vaDisabilityInfo
                ? {
                    vaFileNumber: vaDisabilityInfo.va_file_number || '',
                    currentVaRating: vaDisabilityInfo.current_va_rating || 10,
                    vaDecisionDate: vaDisabilityInfo.va_decision_date || '',
                    hasVaWaiver: vaDisabilityInfo.has_va_waiver || false,
                    receivesCrdp: vaDisabilityInfo.receives_crdp || false,
                  }
                : undefined
            }
            onSubmit={handleSaveVADisability}
            isLoading={isSaving}
          />
        </DialogContent>
      </Dialog>

      <Dialog
        open={editSection === 'claim'}
        onOpenChange={() => {
          setEditSection(null)
          setEditingClaimId(null)
        }}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingClaimId ? 'Edit Disability Claim' : 'Add Disability Claim'}</DialogTitle>
            <DialogDescription>
              {editingClaimId
                ? 'Update the details of this disability claim'
                : 'Add a new combat-related disability claim'}
            </DialogDescription>
          </DialogHeader>
          <DisabilityClaimForm
            defaultValues={
              editingClaim
                ? {
                    disabilityTitle: editingClaim.disability_title || '',
                    disabilityCode: editingClaim.disability_code || '',
                    bodyPartAffected: editingClaim.body_part_affected || '',
                    dateAwardedByVa: editingClaim.date_awarded_by_va || '',
                    initialRatingPercentage: editingClaim.initial_rating_percentage || 0,
                    currentRatingPercentage: editingClaim.current_rating_percentage || 0,
                    combatRelatedCode: editingClaim.combat_related_code || '',
                    unitOfAssignment: editingClaim.unit_of_assignment || '',
                    locationOfInjury: editingClaim.location_of_injury || '',
                    descriptionOfEvent: editingClaim.description_of_event || '',
                    receivedPurpleHeart: editingClaim.received_purple_heart || false,
                    hasSecondaryConditions: editingClaim.has_secondary_conditions || false,
                  }
                : undefined
            }
            onSubmit={handleSaveClaim}
            onCancel={() => {
              setEditSection(null)
              setEditingClaimId(null)
            }}
            isLoading={isSaving}
            isEditing={!!editingClaimId}
          />
        </DialogContent>
      </Dialog>

      {/* DD Form 2860 Preview Dialog */}
      <Dialog open={!!previewPdf} onOpenChange={() => setPreviewPdf(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>DD Form 2860 Preview</DialogTitle>
            <DialogDescription>
              Preview your completed DD Form 2860. This is a read-only preview.
            </DialogDescription>
          </DialogHeader>
          {previewPdf && (
            <iframe
              src={`data:application/pdf;base64,${previewPdf}`}
              className="w-full h-[70vh] border rounded"
              title="DD Form 2860 Preview"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
