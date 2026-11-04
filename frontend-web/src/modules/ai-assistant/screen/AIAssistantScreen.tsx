import { useState, type FormEvent } from 'react'
import { FinanceIcon } from '../../core/components/FinanceIcon'
import { sendChatMessage } from '../api/aiApi'

type Message = { id: number; author: 'assistant' | 'user'; text: string; kind?: 'analysis' | 'success' }

const starterMessage: Message = {
  id: 1,
  author: 'assistant',
  text: 'Chào bạn! Tôi là FinAI Copilot - Trợ lý tài chính thông minh của bạn. Tôi đã được kết nối với dữ liệu thu chi, số dư và ngân sách. Bạn cần tôi hỗ trợ phân tích hay giải đáp điều gì hôm nay?',
}

const initialMessages: Message[] = [
  starterMessage,
]

const history = [
  { title: 'Tối ưu ngân sách tháng & Mua sắm', date: 'Đang hội thoại' },
  { title: 'Kế hoạch trả nợ thẻ & Quỹ khẩn cấp', date: '2 ngày trước' },
  { title: 'Phân tích các khoản chi tiêu ăn uống', date: 'Tuần trước' },
  { title: 'Tư vấn tiết kiệm 50/30/20', date: '15 ngày trước' },
]

const topics = [
  'Đánh giá tổng quan chi tiêu tháng này',
  'Cắt giảm 15% chi phí ăn ngoài',
  'Dự báo số dư tài khoản đến cuối tháng',
  'Kiểm tra các khoản chi tiêu bất thường',
]

const smartQuestions = [
  'Tháng này tôi đã chi tiêu bao nhiêu tiền?',
  'Dự báo cuối tháng số dư của tôi còn bao nhiêu?',
  'Có giao dịch nào bất thường trong thời gian gần đây không?',
  'Tôi nên tiết kiệm bao nhiêu tiền theo quy tắc 50/30/20?',
]

function makeAssistantReply(prompt: string): Message {
  const lowerPrompt = prompt.toLowerCase()
  const answer = lowerPrompt.includes('ăn') || lowerPrompt.includes('chi')
    ? 'Trong tháng này, nhóm ăn uống chiếm tỷ trọng lớn trong tổng chi tiêu. Bạn có thể đặt hạn mức ăn ngoài theo tuần để kiểm soát đều hơn.'
    : lowerPrompt.includes('tiết kiệm') || lowerPrompt.includes('quỹ')
      ? 'Theo quy tắc 50/30/20: 50% cho nhu cầu thiết yếu, 30% cho sở thích cá nhân và 20% cho quỹ tích lũy/dự phòng.'
      : 'Tôi đã ghi nhận câu hỏi của bạn. Hệ thống đang sẵn sàng phân tích sâu hơn theo danh mục, tài khoản hoặc dự báo tương lai.'

  return { id: Date.now() + 1, author: 'assistant', kind: 'analysis', text: answer }
}

export function AIAssistantScreen({ onNotify }: { onNotify: (message: string) => void }) {
  const [query, setQuery] = useState('')
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [activeHistory, setActiveHistory] = useState(0)
  const [personality, setPersonality] = useState<'Cân bằng' | 'Ngắn gọn'>('Cân bằng')
  const [isLoading, setIsLoading] = useState(false)

  const submitMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const prompt = query.trim()
    if (!prompt || isLoading) return

    const userMessage: Message = { id: Date.now(), author: 'user', text: prompt }
    setMessages((current) => [...current, userMessage])
    setQuery('')
    setIsLoading(true)

    try {
      // Gọi trực tiếp đến Python AI Service
      const aiReply = await sendChatMessage(prompt)
      setMessages((current) => [
        ...current,
        { id: Date.now() + 1, author: 'assistant', kind: 'analysis', text: aiReply }
      ])
    } catch {
      // Fallback thông minh nếu AI Service đang tắt
      setMessages((current) => [
        ...current,
        makeAssistantReply(prompt)
      ])
      onNotify('Đang phản hồi ở chế độ ngoại tuyến (AI Service chưa bật).')
    } finally {
      setIsLoading(false)
    }
  }

  const startConversation = () => {
    setMessages([{ ...starterMessage, id: Date.now() }])
    setActiveHistory(0)
  }

  const selectTopic = (text: string) => setQuery(text)

  return (
    <main className="mx-auto flex min-h-[calc(100vh-64px)] w-full max-w-[1560px] flex-col gap-5 bg-[#f6f8f6] px-3 pb-24 pt-5 text-[#14251f] sm:px-[22px] lg:px-[34px] lg:pb-8 lg:pt-6" aria-label="Trợ lý tài chính FinAI">
      <header className="flex flex-col justify-between gap-3 xl:flex-row xl:items-end">
        <div>
          <p className="mb-1 flex items-center gap-2 text-[10px] font-bold tracking-[.8px] text-[#087557]">
            <span className="size-2 rounded-full bg-[#36a77a] animate-pulse" />
            FINAI COPILOT · ĐANG HOẠT ĐỘNG
          </p>
          <h1 className="text-2xl font-semibold leading-tight text-[#17261f] sm:text-[28px]">Trợ lý Tài chính FinAI</h1>
          <p className="mt-1 text-xs text-[#718078]">Phân tích chi tiêu thực tế, dự báo dòng tiền bằng AI (Gemini / Prophet / Isolation Forest).</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-[#e3f4e9] px-3 text-[9px] font-medium text-[#17794f]">
            <i className="size-1.5 rounded-full bg-[#36a77a]" />LangChain &amp; Gemini AI
          </span>
          <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-[#eaf0fb] px-3 text-[9px] text-[#53677d]">
            <FinanceIcon name="shield" size={13} />Dữ liệu nội bộ an toàn
          </span>
          <button type="button" onClick={() => setPersonality((value) => value === 'Cân bằng' ? 'Ngắn gọn' : 'Cân bằng')} className="h-8 rounded-lg border border-[#e3e9e5] bg-white px-3 text-[10px] text-[#526159]">
            Phong cách: {personality}
          </button>
          <button type="button" onClick={startConversation} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#07543f] px-3 text-[10px] font-semibold text-white">
            <FinanceIcon name="plus" size={14} />Cuộc trò chuyện mới
          </button>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 items-start gap-4 xl:grid-cols-[minmax(210px,.72fr)_minmax(420px,1.65fr)_minmax(230px,.78fr)]">
        <aside className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
          <button type="button" onClick={startConversation} className="flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[#07543f] px-4 py-3 text-xs font-semibold text-white shadow-sm">
            <FinanceIcon name="plus" size={16} />Cuộc trò chuyện mới
          </button>
          <section className="rounded-xl border border-[#e7ece8] bg-white p-3 shadow-sm">
            <header className="mb-2 flex items-center justify-between px-1">
              <h2 className="text-[9px] font-bold tracking-[.8px] text-[#77837b]">LỊCH SỬ TRÒ CHUYỆN</h2>
              <FinanceIcon name="clock" size={14} />
            </header>
            <nav aria-label="Lịch sử trò chuyện" className="grid gap-1">
              {history.map((item, index) => (
                <button
                  key={item.title}
                  type="button"
                  onClick={() => {
                    setActiveHistory(index);
                    setMessages([{ ...starterMessage, id: Date.now(), text: index === 0 ? starterMessage.text : `Mình đã mở lại cuộc trò chuyện “${item.title}”. Bạn muốn tiếp tục nội dung nào?` }])
                  }}
                  className={`rounded-lg p-2.5 text-left transition ${activeHistory === index ? 'bg-[#eaf4ed]' : 'hover:bg-[#f5f8f6]'}`}
                >
                  <span className="flex items-start gap-2">
                    <span className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-md ${activeHistory === index ? 'bg-[#07543f] text-white' : 'bg-[#f1f5f2] text-[#77837b]'}`}>
                      <FinanceIcon name="receipt" size={12} />
                    </span>
                    <span className="min-w-0">
                      <span className="block line-clamp-2 text-[10px] font-medium leading-4 text-[#3b4a41]">{item.title}</span>
                      <span className={`mt-1 block text-[9px] ${activeHistory === index ? 'text-[#087557]' : 'text-[#929d96]'}`}>{item.date}</span>
                    </span>
                  </span>
                </button>
              ))}
            </nav>
          </section>
          <section className="rounded-xl border border-[#e7ece8] bg-white p-3 shadow-sm">
            <header className="mb-2 flex items-center justify-between px-1">
              <h2 className="text-[9px] font-bold tracking-[.8px] text-[#77837b]">CHỦ ĐỀ GỢI Ý</h2>
              <FinanceIcon name="spark" size={14} />
            </header>
            <div className="grid gap-1">
              {topics.map((topic) => (
                <button key={topic} type="button" onClick={() => selectTopic(topic)} className="flex items-center gap-2 rounded-lg p-2 text-left text-[10px] leading-4 text-[#3b4a41] hover:bg-[#f5f8f6]">
                  <FinanceIcon name="arrow" size={13} />
                  {topic}
                </button>
              ))}
            </div>
          </section>
        </aside>

        <section className="flex min-h-[650px] flex-col overflow-hidden rounded-xl border border-[#e5ebe7] bg-white shadow-sm xl:h-[calc(100vh-190px)] xl:min-h-[700px]" aria-label="Cuộc trò chuyện với FinAI">
          <header className="flex items-center justify-between border-b border-[#e9eeea] bg-[#f7faf8] px-4 py-3 sm:px-5">
            <div className="flex items-center gap-2.5">
              <span className="relative grid size-9 place-items-center rounded-full bg-[#07543f] text-[#c4f0d7]">
                <FinanceIcon name="spark" size={17} />
                <i className="absolute bottom-0 right-0 size-2.5 rounded-full border-2 border-white bg-[#45a67b]" />
              </span>
              <span>
                <strong className="block text-[11px] font-semibold text-[#2f4036]">FinAI Copilot</strong>
                <small className="mt-0.5 block text-[9px] text-[#718078]">Kết nối trực tiếp mô hình phân tích AI</small>
              </span>
            </div>
            <button type="button" aria-label="Tùy chọn hội thoại" onClick={() => onNotify('Tùy chọn hội thoại FinAI')} className="grid size-8 place-items-center rounded-lg text-[#718078] hover:bg-[#edf3ef]">
              <FinanceIcon name="more" size={17} />
            </button>
          </header>

          <div className="flex-1 space-y-5 overflow-y-auto px-3 py-5 sm:px-5">
            {messages.map((message) => (
              <article key={message.id} className={`flex items-start gap-2.5 ${message.author === 'user' ? 'justify-end' : ''}`}>
                {message.author === 'assistant' && (
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[#07543f] text-[#b5efd3]">
                    <FinanceIcon name="spark" size={14} />
                  </span>
                )}
                <div className={`max-w-[92%] rounded-xl p-3 text-[11px] leading-[1.65] shadow-sm sm:max-w-[88%] sm:p-4 ${message.author === 'user' ? 'rounded-tr-sm bg-[#07543f] text-white' : 'rounded-tl-sm bg-[#f1f5f2] text-[#33443a]'}`}>
                  <p className="whitespace-pre-line">{message.text}</p>
                </div>
                {message.author === 'user' && (
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[#dcece2] text-[9px] font-bold text-[#07543f]">
                    BẠN
                  </span>
                )}
              </article>
            ))}

            {isLoading && (
              <article className="flex items-start gap-2.5">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[#07543f] text-[#b5efd3]">
                  <FinanceIcon name="spark" size={14} />
                </span>
                <div className="rounded-xl rounded-tl-sm bg-[#f1f5f2] p-3 text-[11px] text-[#55695d] flex items-center gap-2">
                  <span className="size-2 rounded-full bg-[#07543f] animate-ping" />
                  <span>FinAI đang truy vấn dữ liệu và suy nghĩ câu trả lời...</span>
                </div>
              </article>
            )}
          </div>

          <form onSubmit={submitMessage} className="border-t border-[#e9eeea] bg-white p-3 sm:p-4">
            <div className="rounded-xl border border-[#e3eae5] bg-[#f7faf8] p-2.5 focus-within:border-[#a8cdb6]">
              <label htmlFor="finai-message" className="sr-only">Nội dung câu hỏi</label>
              <div className="flex items-end gap-2">
                <textarea
                  id="finai-message"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      submitMessage(e as unknown as FormEvent<HTMLFormElement>);
                    }
                  }}
                  rows={2}
                  placeholder="Hỏi FinAI về chi tiêu, ngân sách, giao dịch bất thường hoặc dự báo..."
                  className="min-h-11 flex-1 resize-none bg-transparent px-1.5 py-1 text-[11px] leading-5 text-[#34443b] outline-none placeholder:text-[#89958d]"
                />
                <button
                  type="submit"
                  aria-label="Gửi tin nhắn"
                  disabled={!query.trim() || isLoading}
                  className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#07543f] text-white disabled:cursor-not-allowed disabled:opacity-40 transition"
                >
                  <FinanceIcon name="arrow" size={17} />
                </button>
              </div>
              <p className="mt-1 flex items-center gap-1 px-1.5 text-[8px] text-[#89958d]">
                <FinanceIcon name="shield" size={10} />
                Nhấn Enter để gửi. FinAI gọi các công cụ AI phân tích dữ liệu thực tế.
              </p>
            </div>
          </form>
        </section>

        <aside className="grid content-start gap-3 sm:grid-cols-2 xl:grid-cols-1">
          <section className="rounded-xl border border-[#e7ece8] bg-white p-3.5 shadow-sm">
            <header className="mb-2 flex items-center justify-between">
              <h2 className="text-[9px] font-bold tracking-[.7px] text-[#77837b]">CÂU HỎI THƯỜNG GẶP</h2>
              <FinanceIcon name="spark" size={14} />
            </header>
            <div className="grid gap-1.5">
              {smartQuestions.map((question) => (
                <button key={question} type="button" onClick={() => setQuery(question)} className="flex items-start gap-2 rounded-lg bg-[#f3f7f4] p-2.5 text-left text-[9px] leading-4 text-[#4d5e53] hover:bg-[#eaf3ed] transition">
                  <FinanceIcon name="arrow" size={12} />
                  {question}
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-[#e7ece8] bg-[#f5f8f5] p-3.5 sm:col-span-2 xl:col-span-1">
            <div className="flex items-center gap-2">
              <span className="grid size-7 place-items-center rounded-lg bg-white text-[#087557]">
                <FinanceIcon name="shield" size={14} />
              </span>
              <strong className="text-[10px] text-[#3b4d40]">Bảo mật &amp; Quyền riêng tư</strong>
            </div>
            <p className="mt-2 text-[9px] leading-4 text-[#718078]">
              Dữ liệu tài chính chỉ được phân tích trực tiếp cho phiên làm việc của bạn và không chia sẻ ra ngoài.
            </p>
          </section>
        </aside>
      </div>
    </main>
  )
}
