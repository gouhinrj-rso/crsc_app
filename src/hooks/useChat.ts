import { useState, useCallback, useRef, useEffect } from 'react'

export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  metadata?: {
    step?: string
    action?: string
    requires_input?: boolean
  }
}

interface ChatState {
  messages: Message[]
  currentStep: string
  isLoading: boolean
  error: string | null
  historyLoaded: boolean
  streamingMessageId: string | null
}

export function useChat() {
  const [state, setState] = useState<ChatState>({
    messages: [],
    currentStep: 'eligibility',
    isLoading: false,
    error: null,
    historyLoaded: false,
    streamingMessageId: null,
  })

  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Load chat history on mount
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const data = await window.electronAPI.chat.history()
        if (data && data.length > 0) {
          const messages: Message[] = data.map((m) => ({
            id: m.id,
            role: m.role as 'user' | 'assistant',
            content: m.message,
            timestamp: new Date(m.created_at),
          }))
          setState((prev) => ({ ...prev, messages, historyLoaded: true }))
        } else {
          setState((prev) => ({ ...prev, historyLoaded: true }))
        }
      } catch (err) {
        console.error('[useChat] Error loading chat history:', err)
        setState((prev) => ({ ...prev, historyLoaded: true }))
      }
    }

    loadHistory()
  }, [])

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [state.messages])

  const sendMessage = useCallback(
    async (content: string, options?: { hidden?: boolean; displayContent?: string }) => {
      if (!content.trim()) return

      const isHidden = options?.hidden ?? false
      const displayContent = options?.displayContent

      setState((prev) => ({ ...prev, isLoading: true, error: null }))

      // Add user message to state (unless hidden)
      if (!isHidden) {
        const userMessage: Message = {
          id: crypto.randomUUID(),
          role: 'user',
          content: displayContent || content,
          timestamp: new Date(),
        }

        setState((prev) => ({
          ...prev,
          messages: [...prev.messages, userMessage],
        }))
      }

      // Prepare conversation history for API
      const conversationHistory = state.messages.map((m) => ({
        role: m.role,
        content: m.content,
      }))
      conversationHistory.push({ role: 'user', content })

      // Create a placeholder message for streaming
      const streamingMessageId = crypto.randomUUID()
      const assistantMessage: Message = {
        id: streamingMessageId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
      }

      // Add the empty assistant message that will be filled with streamed content
      setState((prev) => ({
        ...prev,
        messages: [...prev.messages, assistantMessage],
        streamingMessageId,
      }))

      // Set up stream listener BEFORE calling send
      const removeListener = window.electronAPI.chat.onStreamChunk((text) => {
        setState((prev) => ({
          ...prev,
          messages: prev.messages.map((msg) =>
            msg.id === streamingMessageId ? { ...msg, content: msg.content + text } : msg
          ),
        }))
      })

      try {
        const result = await window.electronAPI.chat.send(content, conversationHistory)
        if (!result.success) {
          setState((prev) => ({
            ...prev,
            error: result.error || 'Unknown error',
            messages: prev.messages.map((msg) =>
              msg.id === streamingMessageId && !msg.content
                ? { ...msg, content: 'I apologize, but I encountered an issue. Please try again.' }
                : msg
            ),
          }))
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error'
        setState((prev) => ({
          ...prev,
          error: errorMsg,
          messages: prev.messages.map((msg) =>
            msg.id === streamingMessageId && !msg.content
              ? { ...msg, content: 'I apologize, but I encountered an issue. Please try again.' }
              : msg
          ),
        }))
      } finally {
        removeListener()
        setState((prev) => ({ ...prev, isLoading: false, streamingMessageId: null }))
      }
    },
    [state.messages]
  )

  const addSystemMessage = useCallback((content: string, metadata?: Message['metadata']) => {
    const systemMessage: Message = {
      id: crypto.randomUUID(),
      role: 'system',
      content,
      timestamp: new Date(),
      metadata,
    }

    setState((prev) => ({
      ...prev,
      messages: [...prev.messages, systemMessage],
    }))
  }, [])

  const setCurrentStep = useCallback((step: string) => {
    setState((prev) => ({ ...prev, currentStep: step }))
  }, [])

  const clearMessages = useCallback(async () => {
    await window.electronAPI.chat.clear()
    setState((prev) => ({ ...prev, messages: [] }))
  }, [])

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }))
  }, [])

  return {
    ...state,
    sendMessage,
    addSystemMessage,
    setCurrentStep,
    clearMessages,
    clearError,
    messagesEndRef,
  }
}
