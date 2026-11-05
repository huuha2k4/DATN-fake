import React, { useState, useEffect, useRef, type FormEvent } from 'react'
import { FinanceIcon } from '../../core/components/FinanceIcon'
import { FormattedMarkdown } from '../components/FormattedMarkdown'
import {
  sendChatMessage,
  getChatSessions,
  getSessionMessages,
  deleteChatSession,
  type ChatSessionItem,
} from '../api/aiApi'
import './AIAssistantScreen.css'

interface Message {
  id: string | number
  author: 'assistant' | 'user'
  text: string
}

const quickQuestions = [
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
  {
    title: 'Kiểm tra chi tiêu bất thường',
    subtitle: 'Phát hiện khoản chi đột biến gần đây',
    prompt: 'Kiểm tra xem gần đây tôi có khoản chi tiêu nào bất thường không?',
  },
  {
    title: 'Lời khuyên quy tắc 50/30/20',
    subtitle: 'Đánh giá thói quen tài chính & tiết kiệm',
    prompt: 'Đánh giá chi tiêu của tôi theo quy tắc 50/30/20 và cho lời khuyên tiết kiệm.',
  },
]

export function AIAssistantScreen({ onNotify }: { onNotify: (message: string) => void }) {
  const [query, setQuery] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [sessions, setSessions] = useState<ChatSessionItem[]>([])
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, isLoading])

  // Tải danh sách cuộc trò chuyện từ DB
  const loadSessions = async () => {
    try {
      const data = await getChatSessions()
      setSessions(data)
    } catch {
      // Bỏ qua lỗi kết nối
    }
  }

  useEffect(() => {
    loadSessions()

    // Lắng nghe sự kiện cập nhật session từ MiniAIChatWidget hoặc các tab khác
    const handleSessionUpdated = () => {
      loadSessions()
    }
    window.addEventListener('ai:session_updated', handleSessionUpdated)
    return () => {
      window.removeEventListener('ai:session_updated', handleSessionUpdated)
    }
  }, [])

  // Bắt đầu cuộc trò chuyện mới
  const handleNewChat = () => {
    setCurrentSessionId(null)
    setMessages([])
  }

  // Chọn một cuộc trò chuyện cũ từ Sidebar
  const handleSelectSession = async (session: ChatSessionItem) => {
    setCurrentSessionId(session.id)
    try {
      const msgs = await getSessionMessages(session.id)
      setMessages(
        msgs.map((m) => ({
          id: m.id,
          author: m.author,
          text: m.text,
        }))
      )
    } catch {
      onNotify('Không thể tải lịch sử cuộc trò chuyện này.')
    }
  }

  // Xóa cuộc trò chuyện
  const handleDeleteSession = async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation()
    const success = await deleteChatSession(sessionId)
    if (success) {
      setSessions((prev) => prev.filter((s) => s.id !== sessionId))
      if (currentSessionId === sessionId) {
        handleNewChat()
      }
      onNotify('Đã xóa cuộc trò chuyện.')
    }
  }

  // Gửi tin nhắn
  const handleSubmit = async (e?: FormEvent) => {
    if (e) e.preventDefault()
    const prompt = query.trim()
    if (!prompt || isLoading) return

    const userMsg: Message = { id: Date.now(), author: 'user', text: prompt }
    setMessages((prev) => [...prev, userMsg])
    setQuery('')
    setIsLoading(true)

    try {
      const res = await sendChatMessage(prompt, undefined, currentSessionId || undefined)
      if (res.sessionId && res.sessionId !== currentSessionId) {
        setCurrentSessionId(res.sessionId)
        loadSessions()
      }
      setMessages((prev) => [...prev, { id: Date.now() + 1, author: 'assistant', text: res.answer }])
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          author: 'assistant',
          text: 'Xin lỗi bạn, kết nối đến Trợ lý AI đang gián đoạn. Vui lòng kiểm tra lại AI Service.',
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelectQuickPrompt = (promptText: string) => {
    setQuery(promptText)
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
          {sessions.length > 0 ? (
            sessions.map((item) => {
              const isActive = currentSessionId === item.id
              return (
                <div
                  key={item.id}
                  onClick={() => handleSelectSession(item)}
                  className={`session-item-row ${isActive ? 'active' : ''}`}
                >
                  <div className="session-title-wrap">
                    <span className="session-icon">💬</span>
                    <div className="session-info">
                      <span className="session-title-text">{item.title}</span>
                      <span className="session-time-text">
                        {item.updated_at
                          ? new Date(item.updated_at).toLocaleDateString('vi-VN', {
                              hour: '2-digit',
                              minute: '2-digit',
                              day: '2-digit',
                              month: '2-digit',
                            })
                          : 'Vừa xong'}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => handleDeleteSession(e, item.id)}
                    className="btn-delete-session"
                    title="Xóa cuộc trò chuyện này"
                  >
                    ✕
                  </button>
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
          <span>Lưu trữ an toàn tại PostgreSQL</span>
        </div>
      </aside>

      {/* KHUNG TRÒ CHUYỆN TRUNG TÂM (MAIN CHAT AREA) */}
      <main className="ai-main-chat-area">
        {/* Header trên cùng */}
        <header className="ai-chat-header">
          <div className="ai-chat-header-left">
            <div className="ai-avatar-badge">
              <img src="/finai-avatar.png" alt="FinAI" className="ai-avatar-img" />
            </div>
            <div>
              <h2 className="ai-header-title">Trợ lý Tài chính FinAI</h2>
              <div className="ai-header-status">
                <span className="status-dot" />
                <span>Trực tuyến · Dữ liệu thời gian thực</span>
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
                <img src="/finai-avatar.png" alt="FinAI" className="ai-avatar-img" />
              </div>
              <h1 className="welcome-title">Xin chào! Tôi có thể giúp gì cho bạn hôm nay?</h1>
              <p className="welcome-desc">
                FinAI được kết nối trực tiếp với dòng tiền, ngân sách và các mục tiêu tài chính của bạn để đưa ra phân tích chính xác nhất.
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
                      <img src="/finai-avatar.png" alt="FinAI" className="ai-avatar-img" />
                    </div>
                  )}
                  <div className="message-bubble">
                    {isAssistant ? <FormattedMarkdown content={msg.text} /> : msg.text}
                  </div>
                </div>
              )
            })
          )}

          {isLoading && (
            <div className="chat-row assistant-row typing-row">
              <div className="message-avatar assistant-avatar">
                <img src="/finai-avatar.png" alt="FinAI" className="ai-avatar-img" />
              </div>
              <div className="ai-typing-indicator">
                <div className="typing-dot" />
                <div className="typing-dot" />
                <div className="typing-dot" />
                <span>FinAI đang suy luận dữ liệu...</span>
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
              placeholder="Hỏi FinAI về chi tiêu, ngân sách, số dư, dự báo tương lai hoặc lời khuyên..."
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
            Nhấn Enter để gửi, Shift + Enter để xuống dòng. Toàn bộ hội thoại được lưu trữ bảo mật.
          </p>
        </div>
      </main>
    </div>
  )
}
