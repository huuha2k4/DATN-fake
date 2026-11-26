import React, { useState, useEffect, useRef, type FormEvent } from 'react'
import { FinanceIcon } from '../../core/components/FinanceIcon'
import { FormattedMarkdown } from '../components/FormattedMarkdown'
import { FinAiActionCard } from '../components/FinAiActionCard'
import {
  finAiAgentApi,
  FinAiClientError,
  type FinAiActionResponse,
  type FinAiConversationSummary,
} from '../api/finAiAgentApi'
import { notifyFinAiActionCompleted } from '../../core/utils/finaiSyncEvents'
import './AIAssistantScreen.css'

interface Message {
  id: string | number
  author: 'assistant' | 'user'
  text: string
  actions?: FinAiActionResponse[]
}

const quickQuestions = [
  {
    title: 'Thêm giao dịch nhanh',
    subtitle: 'Tạo giao dịch chi tiêu hoặc thu nhập',
    prompt: 'Tôi vừa chi 50.000đ ăn sáng bằng tiền mặt, hãy tạo giao dịch này.',
  },
  {
    title: 'Thiết lập ngân sách',
    subtitle: 'Đề xuất hạn mức chi tiêu theo danh mục',
    prompt: 'Tạo ngân sách Ăn uống 2 triệu cho tháng này.',
  },
  {
    title: 'Tổng chi tiêu tháng này',
    subtitle: 'Đã tiêu bao nhiêu tiền và nhóm nào nhiều nhất?',
    prompt: 'Tháng này tôi đã chi tiêu hết bao nhiêu tiền? Danh mục nào chiếm nhiều nhất?',
  },
  {
    title: 'Dự báo số dư tài khoản',
    subtitle: 'Dự đoán số dư cuối tháng bằng mô hình AI',
    prompt: 'Dự báo số dư tài khoản của tôi đến cuối tháng còn lại bao nhiêu?',
  },
]

export function AIAssistantScreen({ onNotify }: { onNotify: (message: string) => void }) {
  const [query, setQuery] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [conversations, setConversations] = useState<FinAiConversationSummary[]>([])
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isTakingLong, setIsTakingLong] = useState(false)
  const [actionProcessingId, setActionProcessingId] = useState<string | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const pollingRef = useRef<{ [actionId: string]: any }>({})
  const requestAbortRef = useRef<AbortController | null>(null)
  const slowTimerRef = useRef<number | null>(null)
  const isSendingRef = useRef(false)
  const retryKeyRef = useRef<{ prompt: string; key: string } | null>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, isLoading])

  // Clear any active polling on unmount
  useEffect(() => {
    return () => {
      Object.values(pollingRef.current).forEach((timer) => clearInterval(timer))
      requestAbortRef.current?.abort()
      if (slowTimerRef.current) window.clearTimeout(slowTimerRef.current)
    }
  }, [])

  // Tải danh sách conversations từ Backend
  const loadConversations = async () => {
    try {
      const data = await finAiAgentApi.getConversations()
      setConversations(data)
    } catch {
      // Bỏ qua lỗi kết nối ban đầu
    }
  }

  useEffect(() => {
    loadConversations()

    // Lắng nghe sự kiện cập nhật conversation từ component khác
    const handleConversationUpdated = () => {
      loadConversations()
    }
    window.addEventListener('ai:session_updated', handleConversationUpdated)
    return () => {
      window.removeEventListener('ai:session_updated', handleConversationUpdated)
    }
  }, [])

  // Bắt đầu cuộc trò chuyện mới
  const handleNewChat = () => {
    if (isSendingRef.current) return
    retryKeyRef.current = null
    // Clear active polling
    Object.values(pollingRef.current).forEach((timer) => clearInterval(timer))
    pollingRef.current = {}

    setCurrentConversationId(null)
    setMessages([])
  }

  const handleCancelWait = () => {
    requestAbortRef.current?.abort()
  }

  // Khôi phục một cuộc trò chuyện cũ (Recovery full messages & action states)
  const handleSelectConversation = async (item: FinAiConversationSummary) => {
    if (isSendingRef.current || isLoading) return
    retryKeyRef.current = null
    setCurrentConversationId(item.conversationId)
    setIsLoading(true)
    try {
      const conv = await finAiAgentApi.getConversation(item.conversationId)

      // Map messages and attach actions to assistant message
      const actionsMap = new Map<string, FinAiActionResponse>()
      ;(conv.actions || []).forEach((act) => {
        actionsMap.set(act.actionId, act)
      })

      const rawActions = conv.actions || []

      const actionMap = new Map<string, FinAiActionResponse>()
      rawActions.forEach((act) => actionMap.set(act.actionId, act))

      const mappedMsgs: Message[] = (conv.messages || []).map((m, idx) => {
        let msgActions: FinAiActionResponse[] | undefined = undefined
        if (m.actions && m.actions.length > 0) {
          msgActions = m.actions
        } else if (m.actionIds && m.actionIds.length > 0) {
          msgActions = m.actionIds.map((id) => actionMap.get(id)!).filter(Boolean)
        }

        return {
          id: m.id || `msg-${idx}`,
          author: m.author,
          text: m.text,
          actions: msgActions && msgActions.length > 0 ? msgActions : undefined,
        }
      })

      setMessages(mappedMsgs)

      // Check if any action is EXECUTING to restore polling
      rawActions.forEach((act) => {
        if (act.status === 'EXECUTING' || act.status === 'CONFIRMED') {
          startPollingAction(act.actionId)
        }
      })
    } catch {
      onNotify('Không thể tải lịch sử cuộc trò chuyện này.')
    } finally {
      setIsLoading(false)
    }
  }

  // Polling for an executing action (1-2s interval, cap at 30s)
  const startPollingAction = (actionId: string) => {
    if (pollingRef.current[actionId]) return

    let pollCount = 0
    const maxPolls = 15 // 15 * 2s = 30s
    const timer = setInterval(async () => {
      pollCount++
      try {
        const updated = await finAiAgentApi.getAction(actionId)
        updateActionState(updated)

        if (updated.status !== 'EXECUTING' && updated.status !== 'CONFIRMED') {
          clearInterval(timer)
          delete pollingRef.current[actionId]

          if (updated.status === 'COMPLETED') {
            onNotify('Hành động đã được thực hiện thành công!')
            notifyFinAiActionCompleted({
              toolName: updated.toolName,
              actionId: updated.actionId,
              result: updated.result,
            })
          }
        }
      } catch {
        // Continue polling
      }

      if (pollCount >= maxPolls) {
        clearInterval(timer)
        delete pollingRef.current[actionId]
      }
    }, 2000)

    pollingRef.current[actionId] = timer
  }

  // Update action state across local messages
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

  // Confirm Action
  const handleConfirmAction = async (actionId: string) => {
    setActionProcessingId(actionId)
    try {
      const res = await finAiAgentApi.confirmAction(actionId)
      updateActionState(res)

      if (res.status === 'COMPLETED') {
        onNotify('Xác nhận thành công! Đã thực hiện thay đổi dữ liệu.')
        notifyFinAiActionCompleted({
          toolName: res.toolName,
          actionId: res.actionId,
          result: res.result,
        })
      } else if (res.status === 'EXECUTING' || res.status === 'CONFIRMED') {
        startPollingAction(actionId)
      } else if (res.status === 'FAILED') {
        onNotify(res.error || 'Thực hiện hành động thất bại.')
      }
    } catch (err: any) {
      // Check status from backend instead of assuming complete failure
      try {
        const recovered = await finAiAgentApi.getAction(actionId)
        updateActionState(recovered)
        if (recovered.status === 'COMPLETED') {
          onNotify('Hành động đã hoàn thành.')
          notifyFinAiActionCompleted({
            toolName: recovered.toolName,
            actionId: recovered.actionId,
            result: recovered.result,
          })
          return
        }
      } catch {}

      const msg = err instanceof FinAiClientError ? err.message : 'Có lỗi xảy ra khi xác nhận hành động.'
      onNotify(msg)
    } finally {
      setActionProcessingId(null)
    }
  }

  // Cancel Action
  const handleCancelAction = async (actionId: string) => {
    setActionProcessingId(actionId)
    try {
      const res = await finAiAgentApi.cancelAction(actionId)
      updateActionState(res)
      onNotify('Đã hủy bỏ đề xuất hành động.')
    } catch (err: any) {
      const msg = err instanceof FinAiClientError ? err.message : 'Không thể hủy hành động này.'
      onNotify(msg)
    } finally {
      setActionProcessingId(null)
    }
  }

  const handleSendMessage = async (textToSend: string) => {
    const prompt = textToSend.trim()
    if (!prompt || isLoading || isSendingRef.current) return
    isSendingRef.current = true

    const userMsg: Message = { id: `user-${Date.now()}`, author: 'user', text: prompt }
    setMessages((prev) => [...prev, userMsg])
    setQuery('')
    setIsLoading(true)
    setIsTakingLong(false)
    const controller = new AbortController()
    const idempotencyKey = retryKeyRef.current?.prompt === prompt
      ? retryKeyRef.current.key
      : (globalThis.crypto?.randomUUID?.() || `finai-${Date.now()}-${Math.random().toString(36).slice(2)}`)
    retryKeyRef.current = { prompt, key: idempotencyKey }
    requestAbortRef.current = controller
    slowTimerRef.current = window.setTimeout(() => setIsTakingLong(true), 10000)

    try {
      const res = await finAiAgentApi.sendMessage(prompt, currentConversationId || undefined, controller.signal, idempotencyKey)
      retryKeyRef.current = null

      if (res.conversationId && res.conversationId !== currentConversationId) {
        setCurrentConversationId(res.conversationId)
        loadConversations()
      }

      const assistantMsg: Message = {
        id: `assistant-${Date.now()}`,
        author: 'assistant',
        text: res.message || 'Tôi đã xử lý yêu cầu của bạn.',
        actions: res.actions && res.actions.length > 0 ? res.actions : undefined,
      }
      setMessages((prev) => [...prev, assistantMsg])

      // If any returned action is executing immediately, poll it
      if (res.actions) {
        res.actions.forEach((act) => {
          if (act.status === 'EXECUTING' || act.status === 'CONFIRMED') {
            startPollingAction(act.actionId)
          }
        })
      }
    } catch (err: unknown) {
      setMessages((prev) => prev.filter((item) => item.id !== userMsg.id))
      setQuery((draft) => draft || prompt)
      if (err instanceof FinAiClientError && err.errorCode === 'REQUEST_CANCELLED') return
      const errMsg = err instanceof FinAiClientError
        ? [err.message, err.requestId && `Mã yêu cầu: ${err.requestId}`].filter(Boolean).join(' ')
        : 'FinAI đang tạm gián đoạn. Vui lòng thử lại sau.'
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          author: 'assistant',
          text: errMsg,
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

  // Gửi tin nhắn từ input form
  const handleSubmit = async (e?: FormEvent) => {
    if (e) e.preventDefault()
    await handleSendMessage(query)
  }

  const handleSelectQuickPrompt = (promptText: string) => {
    handleSendMessage(promptText)
  }

  return (
    <div className="ai-copilot-container">
      {/* SIDEBAR BÊN TRÁI: QUẢN LÝ CUỘC TRÒ CHUYỆN */}
      <aside className="ai-sidebar">
        <div className="ai-sidebar-header">
          <button type="button" onClick={handleNewChat} className="btn-new-chat-prominent">
            <FinanceIcon name="plus" size={17} />
            <span>Cuộc trò chuyện mới</span>
          </button>
        </div>

        <div className="ai-sidebar-body">
          <span className="ai-section-title">Lịch sử hội thoại</span>
          {conversations.length > 0 ? (
            conversations.map((item) => {
              const isActive = currentConversationId === item.conversationId
              return (
                <div
                  key={item.conversationId}
                  onClick={() => handleSelectConversation(item)}
                  className={`session-item-row ${isActive ? 'active' : ''}`}
                >
                  <div className="session-title-wrap">
                    <span className="session-icon text-emerald-600 dark:text-emerald-400">
                      <FinanceIcon name="message-square" size={16} />
                    </span>
                    <div className="session-info">
                      <span className="session-title-text">{item.title}</span>
                      <span className="session-time-text">
                        {item.updatedAt
                          ? new Date(item.updatedAt).toLocaleDateString('vi-VN', {
                              hour: '2-digit',
                              minute: '2-digit',
                              day: '2-digit',
                              month: '2-digit',
                            })
                          : 'Vừa xong'}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })
          ) : (
            <div style={{ padding: '20px 14px', textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem' }}>
              Chưa có lịch sử trò chuyện nào.
            </div>
          )}
        </div>

        <div className="ai-sidebar-footer">
          <FinanceIcon name="shield" size={15} />
          <span>FinAI Agent · An toàn bảo mật</span>
        </div>
      </aside>

      {/* KHUNG TRÒ CHUYỆN TRUNG TÂM (MAIN CHAT AREA) */}
      <main className="ai-main-chat-area">
        {/* Header trên cùng */}
        <header className="ai-chat-header">
          <div className="ai-chat-header-left">
            <div className="ai-avatar-badge">
              <img src="/finai-avatar.jpg" alt="FinAI" className="ai-avatar-img" />
            </div>
            <div>
              <h2 className="ai-header-title">FinAI Agent</h2>
              <div className="ai-header-status">
                <span className="status-dot" />
                <span>Trực tuyến · Trợ lý tài chính thông minh</span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleNewChat}
            className="btn-create-session"
          >
            <FinanceIcon name="plus" size={14} />
            <span>Tạo phiên mới</span>
          </button>
        </header>

        {/* Vùng hiển thị tin nhắn hoặc Màn hình chào mừng */}
        <div className="ai-messages-scrollview">
          {messages.length === 0 ? (
            <div className="welcome-hero-box">
              <div className="welcome-logo-badge">
                <img src="/finai-avatar.jpg" alt="FinAI" className="ai-avatar-img" />
              </div>
              <h1 className="welcome-title">Xin chào! Tôi có thể giúp gì cho bạn hôm nay?</h1>
              <p className="welcome-desc">
                FinAI có thể tra cứu chi tiêu, dự báo số dư và <strong>trực tiếp chuẩn bị giao dịch, ngân sách</strong> theo yêu cầu của bạn.
              </p>

              <div className="quick-prompts-grid">
                {quickQuestions.map((q, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectQuickPrompt(q.prompt)}
                    className="prompt-card-btn"
                  >
                    <span className="prompt-card-title">{q.title}</span>
                    <span className="prompt-card-sub">{q.subtitle}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg) => {
              const isAssistant = msg.author === 'assistant'
              return (
                <div
                  key={msg.id}
                  className={`chat-row ${isAssistant ? 'assistant-row' : 'user-row'}`}
                >
                  {isAssistant && (
                    <div className="message-avatar assistant-avatar">
                      <img src="/finai-avatar.jpg" alt="FinAI" className="ai-avatar-img" />
                    </div>
                  )}
                  <div className="message-bubble">
                    {isAssistant ? <FormattedMarkdown content={msg.text} /> : msg.text}

                    {/* Hiển thị danh sách Action Proposals nếu có */}
                    {msg.actions && msg.actions.length > 0 && (
                      <div className="action-cards-container">
                        {msg.actions.map((act) => (
                          <FinAiActionCard
                            key={act.actionId}
                            action={act}
                            onConfirm={handleConfirmAction}
                            onCancel={handleCancelAction}
                            isProcessing={actionProcessingId === act.actionId}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )
            })
          )}

          {isLoading && requestAbortRef.current && (
            <div className="chat-row assistant-row typing-row">
              <div className="message-avatar assistant-avatar">
                <img src="/finai-avatar.jpg" alt="FinAI" className="ai-avatar-img" />
              </div>
              <div className="ai-typing-indicator">
                <div className="typing-dot" />
                <div className="typing-dot" />
                <div className="typing-dot" />
                <span role="status">{isTakingLong ? 'FinAI vẫn đang xử lý yêu cầu của bạn...' : 'FinAI đang suy nghĩ...'}</span>
                <button type="button" className="btn-cancel-ai-wait" onClick={handleCancelWait}>
                  Hủy chờ
                </button>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Khung nhập liệu phía dưới */}
        <div className="ai-input-wrapper">
          <form onSubmit={handleSubmit} className="ai-input-card">
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSubmit()
                }
              }}
              rows={1}
              placeholder="Nhập câu hỏi hoặc ra lệnh (ví dụ: 'Ăn trưa 45k ví Momo', 'Tạo ngân sách 2 triệu')..."
              className="ai-textarea"
            />
            <button
              type="submit"
              disabled={!query.trim() || isLoading}
              className="btn-send-message"
              title="Gửi tin nhắn (Enter)"
            >
              <FinanceIcon name="arrow" size={18} />
            </button>
          </form>
          <p className="ai-input-hint">
            Nhấn Enter để gửi, Shift + Enter để xuống dòng. Các hành động ghi dữ liệu luôn cần bạn xác nhận trước khi thực hiện.
          </p>
        </div>
      </main>
    </div>
  )
}
