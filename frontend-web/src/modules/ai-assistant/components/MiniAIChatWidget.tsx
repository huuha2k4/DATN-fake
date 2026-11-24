import { useState, useEffect, useRef, type FormEvent } from 'react'
import { FinanceIcon } from '../../core/components/FinanceIcon'
import { finAiAgentApi, type FinAiActionResponse } from '../api/finAiAgentApi'
import { FinAiActionCard } from './FinAiActionCard'
import { FormattedMarkdown } from './FormattedMarkdown'
import { notifyFinAiActionCompleted } from '../../core/utils/finaiSyncEvents'
import './MiniAIChatWidget.css'

interface Message {
  id: string | number
  author: 'assistant' | 'user'
  text: string
  actions?: FinAiActionResponse[]
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
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [actionProcessingId, setActionProcessingId] = useState<string | null>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const pollingRef = useRef<Record<string, NodeJS.Timeout>>({})

  useEffect(() => {
    if (isOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isOpen, isLoading])

  // Clear timers on unmount
  useEffect(() => {
    return () => {
      Object.values(pollingRef.current).forEach((t) => clearInterval(t))
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

  const handleSend = async (textToSend?: string) => {
    const prompt = (textToSend || input).trim()
    if (!prompt || isLoading) return

    const userMsg: Message = { id: `user-${Date.now()}`, author: 'user', text: prompt }
    setMessages((prev) => [...prev, userMsg])
    if (!textToSend) setInput('')
    setIsLoading(true)

    try {
      const res = await finAiAgentApi.sendMessage(prompt, conversationId || undefined)
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
      }
      setMessages((prev) => [...prev, assistantMsg])

      if (res.actions) {
        res.actions.forEach((act) => {
          if (act.status === 'EXECUTING' || act.status === 'CONFIRMED') {
            startPollingAction(act.actionId)
          }
        })
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          author: 'assistant',
          text: 'Xin lỗi bạn, kết nối đến Trợ lý AI đang gián đoạn. Vui lòng thử lại sau!',
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="mini-ai-chat-window" onClick={(e) => e.stopPropagation()}>
      {/* Header */}
      <div className="mini-ai-header">
        <div className="mini-ai-header-info">
          <span className="mini-ai-avatar">
            <img src="/finai-avatar.png" alt="FinAI" className="mini-ai-avatar-img" />
          </span>
          <div>
            <h4 className="mini-ai-title">FinAI Copilot</h4>
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
                  <img src="/finai-avatar.png" alt="FinAI" className="mini-ai-avatar-img" />
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
              <img src="/finai-avatar.png" alt="FinAI" className="mini-ai-avatar-img" />
            </div>
            <div className="mini-typing-bubble">
              <span className="mini-dot" />
              <span className="mini-dot" />
              <span className="mini-dot" />
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
        <button type="submit" disabled={!input.trim() || isLoading} className="mini-ai-btn-send">
          <FinanceIcon name="arrow" size={15} />
        </button>
      </form>
    </div>
  )
}

