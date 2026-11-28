import React, { useState, useEffect, useRef, useMemo, type FormEvent } from 'react'
import {
  Zap,
  ShieldCheck,
  BarChart3,
  TrendingUp,
  Search,
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
  MessageSquare,
  Plus,
  ArrowRight,
  Clock,
} from 'lucide-react'
import { FormattedMarkdown } from '../components/FormattedMarkdown'
import { FinAiActionCard } from '../components/FinAiActionCard'
import { FinAiChoices } from '../components/FinAiChoices'
import {
  finAiAgentApi,
  FinAiClientError,
  type FinAiActionResponse,
  type FinAiConversationSummary,
  type FinAiClarification,
  type FinAiSelection,
} from '../api/finAiAgentApi'
import { notifyFinAiActionCompleted } from '../../core/utils/finaiSyncEvents'
import './AIAssistantScreen.css'

interface Message {
  id: string | number
  author: 'assistant' | 'user'
  text: string
  actions?: FinAiActionResponse[]
  clarification?: FinAiClarification | null
}

const quickQuestions = [
  {
    icon: Zap,
    title: 'Thêm giao dịch nhanh',
    subtitle: 'Tạo giao dịch chi tiêu hoặc thu nhập',
    prompt: 'Tôi vừa chi 50.000đ ăn sáng bằng tiền mặt, hãy tạo giao dịch này.',
  },
  {
    icon: ShieldCheck,
    title: 'Thiết lập ngân sách',
    subtitle: 'Đề xuất hạn mức chi tiêu theo danh mục',
    prompt: 'Tạo ngân sách Ăn uống 2 triệu cho tháng này.',
  },
  {
    icon: BarChart3,
    title: 'Tổng chi tiêu tháng này',
    subtitle: 'Đã tiêu bao nhiêu tiền và nhóm nào nhiều nhất?',
    prompt: 'Tháng này tôi đã chi tiêu hết bao nhiêu tiền? Danh mục nào chiếm nhiều nhất?',
  },
  {
    icon: TrendingUp,
    title: 'Dự báo số dư tài khoản',
    subtitle: 'Dự đoán số dư cuối tháng bằng mô hình AI',
    prompt: 'Dự báo số dư tài khoản của tôi đến cuối tháng còn lại bao nhiêu?',
  },
]

function isSameLocalDay(dateStr?: string): boolean {
  if (!dateStr) return true
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return true
  const now = new Date()
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  )
}

function formatConversationTime(dateStr?: string, isToday = false): string {
  if (!dateStr) return 'Vừa xong'
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return 'Vừa xong'
  if (isToday) {
    return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
  }
  return d.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function AIAssistantScreen({ onNotify }: { onNotify: (message: string) => void }) {
  const [query, setQuery] = useState('')
  const [searchHistory, setSearchHistory] = useState('')
  const [earlierExpanded, setEarlierExpanded] = useState(true)
  const [messages, setMessages] = useState<Message[]>([])
  const [conversations, setConversations] = useState<FinAiConversationSummary[]>([])
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isTakingLong, setIsTakingLong] = useState(false)
  const [actionProcessingId, setActionProcessingId] = useState<string | null>(null)
  const [mobileHistoryOpen, setMobileHistoryOpen] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const pollingRef = useRef<{ [actionId: string]: any }>({})
  const requestAbortRef = useRef<AbortController | null>(null)
  const slowTimerRef = useRef<number | null>(null)
  const isSendingRef = useRef(false)
  const retryKeyRef = useRef<{ prompt: string; key: string } | null>(null)

  const { todayConversations, earlierConversations } = useMemo(() => {
    const keyword = searchHistory.trim().toLowerCase()
    const filtered = keyword
      ? conversations.filter((c) => (c.title || '').toLowerCase().includes(keyword))
      : conversations

    const today: FinAiConversationSummary[] = []
    const earlier: FinAiConversationSummary[] = []
    filtered.forEach((item) => {
      if (isSameLocalDay(item.updatedAt || item.createdAt)) {
        today.push(item)
      } else {
        earlier.push(item)
      }
    })
    return { todayConversations: today, earlierConversations: earlier }
  }, [conversations, searchHistory])

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
    Object.values(pollingRef.current).forEach((timer) => clearInterval(timer))
    pollingRef.current = {}

    setCurrentConversationId(null)
    setMessages([])
  }

  const handleCancelWait = () => {
    requestAbortRef.current?.abort()
  }

  // Khôi phục một cuộc trò chuyện cũ
  const handleSelectConversation = async (item: FinAiConversationSummary) => {
    if (isSendingRef.current || isLoading) return
    retryKeyRef.current = null
    setCurrentConversationId(item.conversationId)
    setIsLoading(true)
    try {
      const conv = await finAiAgentApi.getConversation(item.conversationId)
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
          clarification: m.clarification,
        }
      })

      setMessages(mappedMsgs)

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
    const maxPolls = 15
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

  const handleSendMessage = async (textToSend: string, selection?: FinAiSelection) => {
    const prompt = textToSend.trim()
    if (!prompt || isLoading || isSendingRef.current) return
    isSendingRef.current = true

    const userMsg: Message = { id: `user-${Date.now()}`, author: 'user', text: prompt }
    setMessages((prev) => [...prev, userMsg])
    setQuery('')
    setIsLoading(true)
    setIsTakingLong(false)
    const controller = new AbortController()
    const retryTag = selection ? JSON.stringify(selection) : prompt
    const idempotencyKey =
      retryKeyRef.current?.prompt === retryTag
        ? retryKeyRef.current.key
        : globalThis.crypto?.randomUUID?.() || `finai-${Date.now()}-${Math.random().toString(36).slice(2)}`
    retryKeyRef.current = { prompt: retryTag, key: idempotencyKey }
    requestAbortRef.current = controller
    slowTimerRef.current = window.setTimeout(() => setIsTakingLong(true), 10000)

    try {
      const res = await finAiAgentApi.sendMessage(
        prompt,
        currentConversationId || undefined,
        controller.signal,
        idempotencyKey,
        selection
      )
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
    } catch (err: unknown) {
      if (err instanceof FinAiClientError && err.errorCode === 'REQUEST_CANCELLED') {
        setMessages((prev) => prev.filter((item) => item.id !== userMsg.id))
        if (!selection) setQuery((draft) => draft || prompt)
        return
      }
      if (err instanceof FinAiClientError && err.errorCode === 'AI_DRAFT_STALE') {
        setMessages((prev) => prev.map((item) => ({ ...item, clarification: null })))
      }
      const isBusinessNotice =
        err instanceof FinAiClientError &&
        (err.errorCode === 'BUSINESS_CONFLICT' || err.errorCode === 'INVALID_REQUEST')
      if (isBusinessNotice) {
        retryKeyRef.current = null
      }
      const errMsg =
        err instanceof FinAiClientError
          ? [err.message, !isBusinessNotice && err.requestId && `Mã yêu cầu: ${err.requestId}`]
              .filter(Boolean)
              .join(' ')
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

  const handleSubmit = async (e?: FormEvent) => {
    if (e) e.preventDefault()
    await handleSendMessage(query)
  }

  const handleSelectQuickPrompt = (promptText: string) => {
    handleSendMessage(promptText)
  }

  const renderConversationItem = (item: FinAiConversationSummary, isToday: boolean) => {
    const isActive = currentConversationId === item.conversationId
    return (
      <div
        key={item.conversationId}
        onClick={() => {
          handleSelectConversation(item)
          setMobileHistoryOpen(false)
        }}
        className={`session-item-row ${isActive ? 'active' : ''}`}
      >
        <div className="session-title-wrap">
          <span className="session-icon-circle">
            <MessageSquare size={15} strokeWidth={2} />
          </span>
          <div className="session-info">
            <span className="session-title-text">{item.title || 'Cuộc trò chuyện mới'}</span>
            <span className="session-time-text">
              {formatConversationTime(item.updatedAt || item.createdAt, isToday)}
            </span>
          </div>
        </div>
        <span className="session-more-dots" aria-hidden="true">
          <MoreHorizontal size={16} />
        </span>
      </div>
    )
  }

  return (
    <div className="ai-copilot-container">
      {/* SIDEBAR BÊN TRÁI: QUẢN LÝ CUỘC TRÒ CHUYỆN */}
      {mobileHistoryOpen && (
        <div className="ai-sidebar-backdrop" onClick={() => setMobileHistoryOpen(false)} />
      )}
      <aside className={`ai-sidebar ${mobileHistoryOpen ? 'is-mobile-open' : ''}`}>
        <div className="ai-sidebar-header">
          <button
            type="button"
            onClick={() => {
              handleNewChat()
              setMobileHistoryOpen(false)
            }}
            className="btn-new-chat-prominent"
          >
            <Plus size={17} strokeWidth={2.4} />
            <span>Cuộc trò chuyện mới</span>
          </button>

          <div className="ai-sidebar-search">
            <Search size={15} className="ai-sidebar-search-icon" />
            <input
              type="text"
              value={searchHistory}
              onChange={(e) => setSearchHistory(e.target.value)}
              placeholder="Tìm trong hội thoại..."
              className="ai-sidebar-search-input"
            />
          </div>
        </div>

        <div className="ai-sidebar-body">
          {todayConversations.length === 0 && earlierConversations.length === 0 ? (
            <div className="ai-sidebar-empty">
              {searchHistory.trim()
                ? 'Không tìm thấy cuộc trò chuyện phù hợp.'
                : 'Chưa có lịch sử trò chuyện nào.'}
            </div>
          ) : (
            <>
              {todayConversations.length > 0 && (
                <div className="ai-history-group">
                  <div className="ai-section-title">Hôm nay</div>
                  <div className="ai-history-list">
                    {todayConversations.map((item) => renderConversationItem(item, true))}
                  </div>
                </div>
              )}

              {earlierConversations.length > 0 && (
                <div className="ai-history-group">
                  <button
                    type="button"
                    onClick={() => setEarlierExpanded((prev) => !prev)}
                    className="ai-section-toggle"
                  >
                    <span>Trước đó</span>
                    {earlierExpanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                  </button>
                  {earlierExpanded && (
                    <div className="ai-history-list">
                      {earlierConversations.map((item) => renderConversationItem(item, false))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </aside>

      {/* KHUNG TRÒ CHUYỆN TRUNG TÂM (MAIN CHAT AREA) */}
      <main className="ai-main-chat-area">
        {/* Mobile-only top toolbar to toggle conversation drawer */}
        <div className="ai-mobile-bar">
          <button
            type="button"
            onClick={() => setMobileHistoryOpen(true)}
            className="btn-mobile-history"
            title="Lịch sử hội thoại"
            aria-label="Mở lịch sử hội thoại"
          >
            <Clock size={15} />
            <span>Lịch sử</span>
          </button>
          <button
            type="button"
            onClick={handleNewChat}
            className="btn-mobile-new-chat"
          >
            <Plus size={14} />
            <span>Phiên mới</span>
          </button>
        </div>

        {/* Vùng hiển thị tin nhắn hoặc Màn hình chào mừng */}
        <div className={`ai-messages-scrollview ${messages.length === 0 ? 'is-empty' : ''}`}>
          {messages.length === 0 ? (
            <div className="welcome-hero-box">
              <div className="welcome-logo-badge">
                <img src="/finai-avatar.jpg" alt="FinAI" className="ai-avatar-img" />
              </div>
              <h1 className="welcome-title">Xin chào! Tôi có thể giúp gì cho bạn hôm nay?</h1>
              <p className="welcome-desc">
                FinAI có thể tra cứu chi tiêu, dự báo số dư và{' '}
                <strong>trực tiếp chuẩn bị giao dịch, ngân sách</strong> theo yêu cầu của bạn.
              </p>

              <div className="quick-prompts-grid">
                {quickQuestions.map((q, idx) => {
                  const IconComponent = q.icon
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectQuickPrompt(q.prompt)}
                      className="prompt-card-btn"
                    >
                      <span className="prompt-card-icon">
                        <IconComponent size={18} strokeWidth={2.1} />
                      </span>
                      <div className="prompt-card-copy">
                        <span className="prompt-card-title">{q.title}</span>
                        <span className="prompt-card-sub">{q.subtitle}</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="ai-messages-inner">
              {messages.map((msg) => {
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
                      {msg.clarification && (
                        <FinAiChoices
                          key={msg.clarification.draftId}
                          clarification={msg.clarification}
                          disabled={
                            isLoading ||
                            messages.filter((item) => !String(item.id).startsWith('err-')).at(-1)?.id !==
                              msg.id
                          }
                          onSelect={handleSendMessage}
                        />
                      )}

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
              })}

              {isLoading && requestAbortRef.current && (
                <div className="chat-row assistant-row typing-row">
                  <div className="message-avatar assistant-avatar">
                    <img src="/finai-avatar.jpg" alt="FinAI" className="ai-avatar-img" />
                  </div>
                  <div className="ai-typing-indicator">
                    <div className="typing-dot" />
                    <div className="typing-dot" />
                    <div className="typing-dot" />
                    <span role="status">
                      {isTakingLong ? 'FinAI vẫn đang xử lý yêu cầu của bạn...' : 'FinAI đang suy nghĩ...'}
                    </span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
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
              placeholder="Hỏi hoặc ra lệnh cho FinAI..."
              className="ai-textarea"
            />
            {isLoading && requestAbortRef.current ? (
              <button
                type="button"
                onClick={handleCancelWait}
                className="btn-send-message btn-stop-message"
                title="Dừng phản hồi"
                aria-label="Dừng phản hồi"
              >
                <span className="stop-square-icon" aria-hidden="true" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!query.trim() || isLoading}
                className="btn-send-message"
                title="Gửi tin nhắn (Enter)"
                aria-label="Gửi tin nhắn"
              >
                <ArrowRight size={18} strokeWidth={2.2} />
              </button>
            )}
          </form>
        </div>
      </main>
    </div>
  )
}
