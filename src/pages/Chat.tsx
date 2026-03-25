import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import { Link, useNavigate } from 'react-router-dom'
import { useChat, type Message } from '@/hooks/useChat'
import { useFormData } from '@/hooks/useFormData'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Shield,
  Send,
  Loader2,
  User,
  Bot,
  Menu,
  FileText,
  Upload,
  ArrowLeft,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react'
import { APPLICATION_STEPS } from '@/lib/constants'
import ChatDropzone, { type DocumentType, type ExtractedDocumentData } from '@/components/chat/ChatDropzone'

// Regex to detect upload request markers in assistant messages
const UPLOAD_REQUEST_REGEX = /\[UPLOAD_REQUEST:(va_decision_letter|dd214|medical_records)\]/g

// Parse message content to extract upload requests and clean content
function parseMessageContent(content: string): {
  cleanContent: string
  uploadRequests: DocumentType[]
} {
  const uploadRequests: DocumentType[] = []
  let match

  // Find all upload request markers
  while ((match = UPLOAD_REQUEST_REGEX.exec(content)) !== null) {
    uploadRequests.push(match[1] as DocumentType)
  }

  // Reset regex lastIndex for next use
  UPLOAD_REQUEST_REGEX.lastIndex = 0

  // Remove markers from content
  const cleanContent = content.replace(UPLOAD_REQUEST_REGEX, '').trim()

  return { cleanContent, uploadRequests }
}

interface MessageBubbleProps {
  message: Message
  userId?: string
  onExtractionComplete?: (data: ExtractedDocumentData, documentType: DocumentType) => void
  uploadCompleted?: Set<string>
  showDropzone?: boolean // Only true for the most recent message with upload request
}

function MessageBubble({ message, userId, onExtractionComplete, uploadCompleted, showDropzone = false }: MessageBubbleProps) {
  const isUser = message.role === 'user'
  const isSystem = message.role === 'system'

  // Parse message for upload requests if it's an assistant message
  const { cleanContent, uploadRequests } = useMemo(() => {
    if (isUser || isSystem) {
      return { cleanContent: message.content, uploadRequests: [] }
    }
    return parseMessageContent(message.content)
  }, [message.content, isUser, isSystem])

  if (isSystem) {
    return (
      <div className="flex justify-center my-4">
        <div className="bg-muted px-4 py-2 rounded-full text-sm text-muted-foreground">
          {message.content}
        </div>
      </div>
    )
  }

  // Check if uploads for this message have been completed
  const hasCompletedUploads = uploadRequests.length > 0 && uploadRequests.every(
    (type) => uploadCompleted?.has(`${message.id}-${type}`)
  )

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
          isUser ? 'bg-primary text-white' : 'bg-muted'
        }`}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>
      <div className="max-w-[80%] min-w-0 flex flex-col">
        <div
          className={`rounded-lg px-4 py-3 ${
            isUser
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted'
          }`}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap break-words">{message.content}</p>
          ) : (
            <div className="chat-prose prose prose-sm max-w-none overflow-hidden break-words prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5">
              <ReactMarkdown>{cleanContent}</ReactMarkdown>
            </div>
          )}
          <p className={`text-xs mt-1 ${isUser ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>

        {/* Render dropzones only for the most recent message with upload request and not completed */}
        {showDropzone && !isUser && uploadRequests.length > 0 && !hasCompletedUploads && userId && onExtractionComplete && (
          <div className="mt-2">
            {uploadRequests.map((docType) => (
              <ChatDropzone
                key={`${message.id}-${docType}`}
                documentType={docType}
                userId={userId}
                onExtractionComplete={(data, type) => {
                  onExtractionComplete(data, type)
                }}
                onError={(error) => {
                  console.error('Extraction error:', error)
                }}
                disabled={uploadCompleted?.has(`${message.id}-${docType}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function QuickResponses({ onSelect }: { onSelect: (response: string) => void }) {
  const quickResponses = [
    'Yes',
    'No',
    "I'm not sure",
    'Can you explain?',
    'Skip this question',
  ]

  return (
    <div className="flex flex-wrap gap-2">
      {quickResponses.map((response) => (
        <Button
          key={response}
          variant="outline"
          size="sm"
          onClick={() => onSelect(response)}
        >
          {response}
        </Button>
      ))}
    </div>
  )
}

// Local user ID (single-user desktop app)
const LOCAL_USER_ID = 'local-user'

export default function Chat() {
  const navigate = useNavigate()
  const {
    messages,
    isLoading,
    error,
    sendMessage,
    clearMessages,
    clearError,
    messagesEndRef,
    historyLoaded,
  } = useChat()
  const { calculateProgress, packetStatus, resetProgress, loadAllData } = useFormData(LOCAL_USER_ID)

  const [inputValue, setInputValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const initialMessageSent = useRef(false)

  // Track which uploads have been completed to hide the dropzone
  const [completedUploads, setCompletedUploads] = useState<Set<string>>(new Set())

  const progress = calculateProgress()

  // Handle extraction completion - send extracted data to chat
  const handleExtractionComplete = useCallback(
    async (data: ExtractedDocumentData, documentType: DocumentType) => {
      // Find the message that requested this upload and mark it as completed
      const lastAssistantMessage = [...messages].reverse().find(
        (m) => m.role === 'assistant' && m.content.includes(`[UPLOAD_REQUEST:${documentType}]`)
      )

      if (lastAssistantMessage) {
        setCompletedUploads((prev) => new Set(prev).add(`${lastAssistantMessage.id}-${documentType}`))
      }

      // Send the extracted data to the chat handler as a hidden message
      // The JSON won't be shown to the user, but the AI will receive it and present it nicely
      const extractedDataMessage = `[EXTRACTED_DATA:${documentType}]${JSON.stringify(data)}`
      await sendMessage(extractedDataMessage, { hidden: true })
    },
    [messages, sendMessage]
  )

  useEffect(() => {
    // Focus input on mount
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    // Send initial greeting only after history has been loaded and if no messages exist
    // This ensures we don't send "Hello" when user already has conversation history
    if (historyLoaded && messages.length === 0 && LOCAL_USER_ID && !initialMessageSent.current) {
      initialMessageSent.current = true
      sendMessage('Hello, I need help filing for CRSC benefits.')
    }
  }, [historyLoaded, messages.length, sendMessage])

  // Refresh form data (and progress) when a new assistant message is received
  // This ensures the progress bar updates after the AI saves data via tool calls
  const lastMessageCount = useRef(messages.length)
  useEffect(() => {
    // Only refresh if messages increased (new message added) and last message is from assistant
    if (messages.length > lastMessageCount.current) {
      const lastMessage = messages[messages.length - 1]
      if (lastMessage?.role === 'assistant') {
        // Refresh data to get updated packet status
        loadAllData()
      }
    }
    lastMessageCount.current = messages.length
  }, [messages.length, messages, loadAllData])

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return

    const message = inputValue.trim()
    setInputValue('')
    await sendMessage(message)
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const getStepStatus = (stepId: string) => {
    const status = packetStatus.find((s) => s.step_name === stepId)
    return status?.step_status || 'not_started'
  }

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <header className="border-b bg-white flex-shrink-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
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
              <span className="text-sm text-muted-foreground">Progress:</span>
              <Progress value={progress.percentage} className="w-24 h-2" />
              <span className="text-sm font-medium">{progress.percentage}%</span>
            </div>

            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Application Progress</SheetTitle>
                  <SheetDescription>
                    Track your progress through the CRSC filing process
                  </SheetDescription>
                </SheetHeader>
                <div className="mt-6 space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Overall Progress</span>
                      <span className="font-medium">{progress.percentage}%</span>
                    </div>
                    <Progress value={progress.percentage} />
                  </div>

                  <div className="space-y-2 mt-6">
                    {APPLICATION_STEPS.slice(0, -1).map((step) => {
                      const status = getStepStatus(step.id)
                      const isComplete = status === 'completed'
                      const isInProgress = status === 'in_progress'

                      return (
                        <div
                          key={step.id}
                          className={`flex items-center gap-3 p-2 rounded-lg ${
                            isComplete
                              ? 'bg-green-50'
                              : isInProgress
                              ? 'bg-primary/5'
                              : ''
                          }`}
                        >
                          <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center ${
                              isComplete
                                ? 'bg-green-500 text-white'
                                : isInProgress
                                ? 'bg-primary text-white'
                                : 'bg-muted'
                            }`}
                          >
                            {isComplete ? (
                              <CheckCircle className="h-4 w-4" />
                            ) : (
                              <span className="text-xs">
                                {APPLICATION_STEPS.findIndex((s) => s.id === step.id) + 1}
                              </span>
                            )}
                          </div>
                          <span className="text-sm">{step.name}</span>
                        </div>
                      )
                    })}
                  </div>

                  <div className="pt-4 space-y-2">
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => navigate('/review')}
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      Review Application
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" className="w-full">
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Restart Conversation
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-amber-500" />
                            Restart Conversation?
                          </AlertDialogTitle>
                          <AlertDialogDescription className="text-left space-y-2">
                            <p>
                              Are you sure you want to restart the conversation? This will:
                            </p>
                            <ul className="list-disc list-inside space-y-1 text-sm">
                              <li>Delete your entire chat history with the AI assistant</li>
                              <li>Reset your application progress to 0%</li>
                              <li>Start a new conversation from the beginning</li>
                              <li>Require you to re-verify eligibility and re-answer questions</li>
                            </ul>
                            <p className="font-medium text-foreground pt-2">
                              Note: Your saved form data (personal info, military service, VA disability info, etc.) will NOT be deleted - only your progress tracking and chat history will be reset.
                            </p>
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={async () => {
                              initialMessageSent.current = false
                              await clearMessages()
                              await resetProgress()
                            }}
                            className="bg-amber-600 hover:bg-amber-700"
                          >
                            Yes, Restart
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* Chat Area */}
      <main className="flex-1 flex flex-col min-h-0 max-w-4xl w-full mx-auto">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <div className="space-y-4">
            {messages.map((message) => {
              // Find the most recent assistant message with an upload request that hasn't been completed
              const lastUploadRequestIndex = [...messages].reverse().findIndex(
                (m) => m.role === 'assistant' && UPLOAD_REQUEST_REGEX.test(m.content) &&
                  !Array.from(completedUploads).some(id => id.startsWith(`${m.id}-`))
              )
              // Reset regex lastIndex
              UPLOAD_REQUEST_REGEX.lastIndex = 0
              const showDropzoneForThisMessage = lastUploadRequestIndex !== -1 &&
                messages[messages.length - 1 - lastUploadRequestIndex]?.id === message.id

              return (
                <MessageBubble
                  key={message.id}
                  message={message}
                  userId={LOCAL_USER_ID}
                  onExtractionComplete={handleExtractionComplete}
                  uploadCompleted={completedUploads}
                  showDropzone={showDropzoneForThisMessage}
                />
              )
            })}

            {isLoading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="bg-muted rounded-lg px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm text-muted-foreground">Thinking...</span>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <p className="text-red-700 text-sm">{error}</p>
                  <Button variant="ghost" size="sm" onClick={clearError} className="text-red-700">
                    Dismiss
                  </Button>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Quick Responses */}
        {!isLoading && messages.length > 0 && (
          <div className="flex-shrink-0 px-4 pb-2">
            <QuickResponses onSelect={sendMessage} />
          </div>
        )}

        {/* Input Area */}
        <div className="flex-shrink-0 border-t bg-white p-4">
          <div className="flex gap-2">
            <Button variant="outline" size="icon" asChild>
              <Link to="/review">
                <Upload className="h-4 w-4" />
              </Link>
            </Button>
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button
              onClick={handleSend}
              disabled={!inputValue.trim() || isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Your conversation is encrypted and secure. Never share sensitive information like full SSN in chat.
          </p>
        </div>
      </main>
    </div>
  )
}
