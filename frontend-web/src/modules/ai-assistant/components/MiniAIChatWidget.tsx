import { useState, useEffect, useRef, type FormEvent } from 'react'
import { FinanceIcon } from '../../core/components/FinanceIcon'
import { FinAiClientError, finAiAgentApi, type FinAiActionResponse, type FinAiClarification, type FinAiSelection } from '../api/finAiAgentApi'
import { FinAiActionCard } from './FinAiActionCard'
import { FinAiChoices } from './FinAiChoices'
import { FormattedMarkdown } from './FormattedMarkdown'
import { notifyFinAiActionCompleted } from '../../core/utils/finaiSyncEvents'
import './MiniAIChatWidget.css'

interface Message {
  id: string | number
  author: 'assistant' | 'user'
  text: string
  actions?: FinAiActionResponse[]
  clarification?: FinAiClarification | null
}

interface MiniAIChatWidgetProps {
  isOpen: boolean
  onClose: () => void
  onOpenFullPage: () => void
}

interface QuickQuestion {
  title: string
  desc: string
  prompt: string
  icon: string
}

const QUICK_QUESTIONS: QuickQuestion[] = [
  {
    title: 'Tổng chi tiêu tháng này',
    desc: 'Đã tiêu bao nhiêu tiền và mục nào nhiều nhất?',
    prompt: 'Tháng này tôi đã chi tiêu hết bao nhiêu tiền? Danh mục nào chiếm nhiều nhất?',
    icon: 'wallet',
  },
  {
    title: 'Dự báo số dư tài khoản',
    desc: 'Dự đoán số dư cuối tháng bằng mô hình AI',
    prompt: 'Dự báo số dư tài khoản của tôi đến cuối tháng còn lại bao nhiêu?',
    icon: 'trend',
  },
  {
    title: 'Ghi chi tiêu ăn uống 50k',
    desc: 'Đề xuất tạo giao dịch ăn trưa hôm nay',
    prompt: 'Tạo giúp tôi giao dịch vừa ăn trưa hết 50000 tiền mặt',
    icon: 'receipt',
  },
  {
    title: 'Lời khuyên 50/30/20',
    desc: 'Đánh giá thói quen tài chính & tiết kiệm',
    prompt: 'Đánh giá chi tiêu của tôi theo quy tắc 50/30/20 và cho lời khuyên tiết kiệm.',
    icon: 'check',
  },
]

export function MiniAIChatWidget({ isOpen, onClose, onOpenFullPage }: MiniAIChatWidgetProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      author: 'assistant',
      text: 'Chào bạn! Mình là FinAI. Bạn cần tra cứu chi tiêu, phân tích tài chính hay thực hiện giao dịch nhanh nào không?',
    },
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isTakingLong, setIsTakingLong] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [actionProcessingId, setActionProcessingId] = useState<string | null>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const pollingRef = useRef<Record<string, ReturnType<typeof setInterval>>>({})
  const requestAbortRef = useRef<AbortController | null>(null)
  const slowTimerRef = useRef<number | null>(null)
  const isSendingRef = useRef(false)
  const retryKeyRef = useRef<{ prompt: string; key: string } | null>(null)

  useEffect(() => {
    if (isOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isOpen, isLoading])

  // Clear timers on unmount
  useEffect(() => {
    return () => {
      Object.values(pollingRef.current).forEach((t) => clearInterval(t))
      requestAbortRef.current?.abort()
      if (slowTimerRef.current) window.clearTimeout(slowTimerRef.current)
    }
  }, [])

  if (!isOpen) return null

  const updateActionState = (updatedAction: FinAiActionResponse) => {
    setMessages((prev) =>
      prev.map((msg) => {
        if (!msg.actions) return msg
        return {
          ...msg,
          actions: msg.actions.map((act) =>
            act.actionId === updatedAction.actionId ? updatedAction : act
          ),
        }
      })
    )
  }

  const startPollingAction = (actionId: string) => {
    if (pollingRef.current[actionId]) return

    let pollCount = 0
    const maxPolls = 15 // 30s
    const timer = setInterval(async () => {
      pollCount++
      try {
        const updated = await finAiAgentApi.getAction(actionId)
        updateActionState(updated)

        if (updated.status !== 'EXECUTING' && updated.status !== 'CONFIRMED') {
          clearInterval(timer)
          delete pollingRef.current[actionId]

          if (updated.status === 'COMPLETED') {
            notifyFinAiActionCompleted({
              toolName: updated.toolName,
              actionId: updated.actionId,
              result: updated.result,
            })
          }
        }
      } catch {
        // Continue
      }

      if (pollCount >= maxPolls) {
        clearInterval(timer)
        delete pollingRef.current[actionId]
      }
    }, 2000)

    pollingRef.current[actionId] = timer
  }

  const handleConfirmAction = async (actionId: string) => {
    setActionProcessingId(actionId)
    try {
      const res = await finAiAgentApi.confirmAction(actionId)
      updateActionState(res)

      if (res.status === 'COMPLETED') {
        notifyFinAiActionCompleted({
          toolName: res.toolName,
          actionId: res.actionId,
          result: res.result,
        })
      } else if (res.status === 'EXECUTING' || res.status === 'CONFIRMED') {
        startPollingAction(actionId)
      }
    } catch {
      try {
        const recovered = await finAiAgentApi.getAction(actionId)
        updateActionState(recovered)
        if (recovered.status === 'COMPLETED') {
          notifyFinAiActionCompleted({
            toolName: recovered.toolName,
            actionId: recovered.actionId,
            result: recovered.result,
          })
        }
      } catch {}
    } finally {
      setActionProcessingId(null)
    }
  }

  const handleCancelAction = async (actionId: string) => {
    setActionProcessingId(actionId)
    try {
      const res = await finAiAgentApi.cancelAction(actionId)
      updateActionState(res)
    } catch {
      // Ignored
    } finally {
      setActionProcessingId(null)
    }
  }

  const handleSend = async (textToSend?: string, selection?: FinAiSelection) => {
    const prompt = (textToSend || input).trim()
    if (!prompt || isLoading || isSendingRef.current) return
    isSendingRef.current = true

    const userMsg: Message = { id: `user-${Date.now()}`, author: 'user', text: prompt }
    setMessages((prev) => [...prev, userMsg])
    if (!textToSend) setInput('')
    setIsLoading(true)
    setIsTakingLong(false)
    const controller = new AbortController()
    const retryTag = selection ? JSON.stringify(selection) : prompt
    const idempotencyKey = retryKeyRef.current?.prompt === retryTag
      ? retryKeyRef.current.key
      : (globalThis.crypto?.randomUUID?.() || `finai-${Date.now()}-${Math.random().toString(36).slice(2)}`)
    retryKeyRef.current = { prompt: retryTag, key: idempotencyKey }
    requestAbortRef.current = controller
    slowTimerRef.current = window.setTimeout(() => setIsTakingLong(true), 10000)

    try {
      const res = await finAiAgentApi.sendMessage(prompt, conversationId || undefined, controller.signal, idempotencyKey, selection)
      retryKeyRef.current = null
      if (res.conversationId) {
        setConversationId(res.conversationId)
        // Đồng bộ danh sách hội thoại nếu trang toàn màn hình đang mở
        window.dispatchEvent(new CustomEvent('ai:session_updated', { detail: { sessionId: res.conversationId } }))
      }

      const assistantMsg: Message = {
        id: `assistant-${Date.now()}`,
        author: 'assistant',
        text: res.message || 'Mình đã xử lý yêu cầu của bạn.',
        actions: res.actions && res.actions.length > 0 ? res.actions : undefined,
        clarification: res.clarification,
      }
      setMessages((prev) => [...prev, assistantMsg])

      if (res.actions) {
        res.actions.forEach((act) => {
          if (act.status === 'EXECUTING' || act.status === 'CONFIRMED') {
            startPollingAction(act.actionId)
          }
        })
      }
    } catch (error) {
      if (error instanceof FinAiClientError && error.errorCode === 'REQUEST_CANCELLED') {
        setMessages((prev) => prev.filter((item) => item.id !== userMsg.id))
        if (!selection) setInput((draft) => draft || prompt)
        return
      }
      if (error instanceof FinAiClientError && error.errorCode === 'AI_DRAFT_STALE') {
        setMessages((prev) => prev.map((item) => ({ ...item, clarification: null })))
      }
      const isBusinessNotice = error instanceof FinAiClientError && (error.errorCode === 'BUSINESS_CONFLICT' || error.errorCode === 'INVALID_REQUEST')
      if (isBusinessNotice) {
        retryKeyRef.current = null
      }
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          author: 'assistant',
          text: error instanceof FinAiClientError
            ? [error.message, !isBusinessNotice && error.requestId && `Mã yêu cầu: ${error.requestId}`].filter(Boolean).join(' ')
            : 'FinAI đang tạm gián đoạn. Vui lòng thử lại sau.',
        },
      ])
    } finally {
      if (slowTimerRef.current) window.clearTimeout(slowTimerRef.current)
      slowTimerRef.current = null
      requestAbortRef.current = null
      isSendingRef.current = false
      setIsTakingLong(false)
      setIsLoading(false)
    }
  }

  return (
    <div className="mini-ai-chat-window" onClick={(e) => e.stopPropagation()}>
      {/* Header */}
      <div className="mini-ai-header">
        <div className="mini-ai-header-info">
          <span className="mini-ai-avatar">
            <img src="/finai-avatar.jpg" alt="FinAI" className="mini-ai-avatar-img" />
          </span>
          <div>
            <h4 className="mini-ai-title">FinAI Agent</h4>
            <span className="mini-ai-badge">Trợ lý tài chính thông minh</span>
          </div>
        </div>
        <div className="mini-ai-actions">
          <button
            type="button"
            className="mini-ai-btn-icon"
            onClick={onOpenFullPage}
            title="Mở toàn màn hình"
          >
            ↗
          </button>
          <button
            type="button"
            className="mini-ai-btn-icon"
            onClick={onClose}
            title="Đóng cửa sổ"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Body messages */}
      <div className="mini-ai-body">
        {messages.map((m) => {
          const isAssistant = m.author === 'assistant'
          return (
            <div key={m.id} className={`mini-msg-row ${isAssistant ? 'assistant' : 'user'}`}>
              {isAssistant && (
                <div className="mini-msg-avatar">
                  <img src="/finai-avatar.jpg" alt="FinAI" className="mini-ai-avatar-img" />
                </div>
              )}
              <div className="mini-msg-content-col">
                <div className="mini-msg-bubble">
                  {isAssistant ? <FormattedMarkdown content={m.text} /> : m.text}
                </div>

                {/* Gợi ý câu hỏi nhanh dạng thẻ chuyên nghiệp như bản App, tự động ẩn khi người dùng đã gửi tin nhắn */}
                {m.id === 'welcome' && messages.length === 1 && (
                  <div className="mini-quick-grid">
                    {QUICK_QUESTIONS.map((q, idx) => (
                      <button
                        key={idx}
                        type="button"
                        className="mini-quick-card"
                        onClick={() => handleSend(q.prompt)}
                      >
                        <div className="mini-quick-header">
                          <div className="mini-quick-icon-wrap">
                            <FinanceIcon name={q.icon as any} size={15} color="#059669" />
                          </div>
                          <span className="mini-quick-title">{q.title}</span>
                          <span className="mini-quick-arrow">›</span>
                        </div>
                        <p className="mini-quick-desc">{q.desc}</p>
                      </button>
                    ))}
                  </div>
                )}

                {m.clarification && (
                  <FinAiChoices key={m.clarification.draftId} clarification={m.clarification}
                    disabled={isLoading || messages.filter((item) => !String(item.id).startsWith('err-')).at(-1)?.id !== m.id}
                    onSelect={handleSend} />
                )}
                {/* Các thẻ đề xuất hành động nếu có */}
                {isAssistant && m.actions && m.actions.length > 0 && (
                  <div className="mini-actions-container">
                    {m.actions.map((act) => (
                      <FinAiActionCard
                        key={act.actionId}
                        action={act}
                        isProcessing={actionProcessingId === act.actionId}
                        onConfirm={handleConfirmAction}
                        onCancel={handleCancelAction}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )
        })}

        {isLoading && (
          <div className="mini-msg-row assistant typing-row">
            <div className="mini-msg-avatar">
              <img src="/finai-avatar.jpg" alt="FinAI" className="mini-ai-avatar-img" />
            </div>
            <div className="mini-typing-bubble">
              <span className="mini-dot" />
              <span className="mini-dot" />
              <span className="mini-dot" />
              <span role="status" className="mini-typing-label">{isTakingLong ? 'FinAI vẫn đang xử lý...' : 'FinAI đang suy nghĩ...'}</span>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input footer */}
      <form
        className="mini-ai-footer"
        onSubmit={(e: FormEvent) => {
          e.preventDefault()
          handleSend()
        }}
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Hỏi hoặc bảo FinAI làm việc..."
          className="mini-ai-input"
          autoFocus
        />
        {isLoading && requestAbortRef.current ? (
          <button
            type="button"
            onClick={() => requestAbortRef.current?.abort()}
            className="mini-ai-btn-send mini-ai-btn-stop"
            title="Dừng phản hồi"
            aria-label="Dừng phản hồi"
          >
            <span className="mini-stop-square" aria-hidden="true" />
          </button>
        ) : (
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="mini-ai-btn-send"
            title="Gửi tin nhắn"
            aria-label="Gửi tin nhắn"
          >
            <FinanceIcon name="arrow" size={15} />
          </button>
        )}
      </form>
    </div>
  )
}

