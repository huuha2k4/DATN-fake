import React, { useState, useEffect, useRef, type FormEvent } from 'react'
import { FinanceIcon } from '../../core/components/FinanceIcon'
import { sendChatMessage } from '../api/aiApi'
import './MiniAIChatWidget.css'

interface Message {
  id: string | number
  author: 'assistant' | 'user'
  text: string
}

interface MiniAIChatWidgetProps {
  isOpen: boolean
  onClose: () => void
  onOpenFullPage: () => void
}

const quickChips = [
  'Tháng này tôi chi bao nhiêu?',
  'Dự báo số dư cuối tháng',
  'Có khoản chi nào bất thường?',
]

export function MiniAIChatWidget({ isOpen, onClose, onOpenFullPage }: MiniAIChatWidgetProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      author: 'assistant',
      text: 'Chào bạn! Tôi là FinAI. Bạn cần kiểm tra chi tiêu, số dư hay lời khuyên tài chính nhanh nào không?',
    },
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isOpen, isLoading])

  if (!isOpen) return null

  const handleSend = async (textToSend?: string) => {
    const prompt = (textToSend || input).trim()
    if (!prompt || isLoading) return

    const userMsg: Message = { id: Date.now(), author: 'user', text: prompt }
    setMessages((prev) => [...prev, userMsg])
    if (!textToSend) setInput('')
    setIsLoading(true)

    try {
      const res = await sendChatMessage(prompt, undefined, sessionId || undefined)
      if (res.sessionId) setSessionId(res.sessionId)
      setMessages((prev) => [...prev, { id: Date.now() + 1, author: 'assistant', text: res.answer }])
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
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
            <FinanceIcon name="spark" size={16} />
          </span>
          <div>
            <h4 className="mini-ai-title">FinAI Copilot</h4>
            <span className="mini-ai-badge">Trợ lý trực tuyến</span>
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
                  <FinanceIcon name="spark" size={13} />
                </div>
              )}
              <div className="mini-msg-bubble">{m.text}</div>
            </div>
          )
        })}

        {isLoading && (
          <div className="mini-msg-row assistant">
            <div className="mini-msg-avatar">
              <FinanceIcon name="spark" size={13} />
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

      {/* Quick question chips */}
      <div className="mini-ai-chips">
        {quickChips.map((chip, i) => (
          <button key={i} type="button" className="mini-chip-btn" onClick={() => handleSend(chip)}>
            {chip}
          </button>
        ))}
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
          placeholder="Hỏi nhanh FinAI..."
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

