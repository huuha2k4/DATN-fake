import { useState, type FormEvent } from 'react'
import { FinanceIcon } from '../../core/components/FinanceIcon'

type Message = { id: number; author: 'assistant' | 'user'; text: string; kind?: 'analysis' | 'success' }

const starterMessage: Message = {
  id: 1,
  author: 'assistant',
  text: 'Chào Văn A! Tôi là FinAI Copilot. Tôi đã nạp dữ liệu giao dịch tháng 9 và tình hình tài chính của bạn. Hôm nay tôi có thể hỗ trợ gì?',
}

const initialMessages: Message[] = [
  starterMessage,
  { id: 2, author: 'user', text: 'Tháng này tiền ăn uống tăng khá nhiều. FinAI phân tích giúp tôi các khoản nào đang chi nhiều và cách cân đối lại nhé.' },
  { id: 3, author: 'assistant', kind: 'analysis', text: 'Dựa trên 48 giao dịch ẩm thực trong tháng 9, tổng chi ăn uống là 2.100.000 đ. Ăn ngoài cuối tuần chiếm phần lớn; dưới đây là phân tích chi tiết.' },
  { id: 4, author: 'user', text: 'Giúp tôi thiết lập hạn mức ăn ngoài 800.000 đ cho tháng tới nhé.' },
  { id: 5, author: 'assistant', kind: 'success', text: 'Đã cập nhật hạn mức ăn ngoài tháng 10 là 800.000 đ. Mình cũng đã bật cảnh báo khi chi tiêu chạm 80% hạn mức.' },
]

const history = [
  { title: 'Tối ưu ngân sách tháng 10 & Mua sắm', date: 'Đang hội thoại' },
  { title: 'Kế hoạch trả nợ thẻ & Quỹ khẩn cấp', date: '2 ngày trước' },
  { title: 'Phân tích hóa đơn du lịch Phú Quốc', date: 'Tuần trước' },
  { title: 'Tư vấn lãi suất gửi tiết kiệm', date: '15 ngày trước' },
]

const topics = ['Cắt giảm 15% chi phí ăn ngoài', 'So sánh gói gửi tích lũy linh hoạt', 'Kiểm tra mức độ an toàn tài chính']
const smartQuestions = [
  'Tháng này tôi còn bao nhiêu tiền có thể chi thoải mái?',
  'Nếu mua điện thoại trả góp thì có ảnh hưởng quỹ tiết kiệm không?',
  'So sánh chi phí sinh hoạt tháng này với tháng trước?',
]
const expenseItems = [
  { title: 'Ăn ngoài cuối tuần', detail: '4 lần · trung bình 312.500 đ/lần', amount: '1.250.000 đ', badge: 'Tăng 42%', color: 'bg-[#fff0e9] text-[#ad5947]', icon: 'receipt' as const },
  { title: 'Cà phê & Đồ uống', detail: '18 lần · khoảng 29.000 đ/ngày', amount: '520.000 đ', badge: '29.000 đ/ngày', color: 'bg-[#fff4e6] text-[#916024]', icon: 'coffee' as const },
  { title: 'Tự nấu & Thực phẩm', detail: 'Chi tiêu cân đối tốt', amount: '330.000 đ', badge: 'Tối ưu tốt', color: 'bg-[#e3f4e9] text-[#17794f]', icon: 'wallet' as const },
]

function makeAssistantReply(prompt: string): Message {
  const lowerPrompt = prompt.toLowerCase()
  const answer = lowerPrompt.includes('ăn') || lowerPrompt.includes('chi')
    ? 'Trong tháng 9, nhóm ăn uống đã chi 2.100.000 đ. Ăn ngoài cuối tuần chiếm phần lớn (1.250.000 đ), tiếp theo là cà phê và đồ uống (520.000 đ). Bạn có thể đặt hạn mức ăn ngoài theo tuần để kiểm soát đều hơn.'
    : lowerPrompt.includes('tiết kiệm') || lowerPrompt.includes('quỹ')
      ? 'Tỷ lệ tiết kiệm hiện tại là 69,5%, cao hơn mục tiêu 50%. Sau các khoản cố định, hãy giữ quỹ dự phòng trước khi tăng khoản đầu tư định kỳ.'
      : 'Dựa trên dữ liệu tháng 9, thu nhập là 18.500.000 đ, chi tiêu 5.650.000 đ và dòng tiền ròng +12.850.000 đ. Bạn muốn xem sâu hơn theo danh mục, tài khoản hay kỳ báo cáo?'

  return { id: Date.now() + 1, author: 'assistant', kind: 'analysis', text: answer }
}

export function AIAssistantScreen({ onNotify }: { onNotify: (message: string) => void }) {
  const [query, setQuery] = useState('')
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [activeHistory, setActiveHistory] = useState(0)
  const [personality, setPersonality] = useState<'Cân bằng' | 'Ngắn gọn'>('Cân bằng')

  const submitMessage = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const prompt = query.trim()
    if (!prompt) return
    setMessages((current) => [...current, { id: Date.now(), author: 'user', text: prompt }, makeAssistantReply(prompt)])
    setQuery('')
  }

  const startConversation = () => {
    setMessages([{ ...starterMessage, id: Date.now() }])
    setActiveHistory(0)
  }

  const selectTopic = (text: string) => setQuery(text)

  return <main className="mx-auto flex min-h-[calc(100vh-64px)] w-full max-w-[1560px] flex-col gap-5 bg-[#f6f8f6] px-3 pb-24 pt-5 text-[#14251f] sm:px-[22px] lg:px-[34px] lg:pb-8 lg:pt-6" aria-label="Trợ lý tài chính FinAI">
    <header className="flex flex-col justify-between gap-3 xl:flex-row xl:items-end"><div><p className="mb-1 flex items-center gap-2 text-[10px] font-bold tracking-[.8px] text-[#087557]"><span className="size-2 rounded-full bg-[#36a77a]" />FINAI COPILOT · ĐANG TRỰC TUYẾN</p><h1 className="text-2xl font-semibold leading-tight text-[#17261f] sm:text-[28px]">Trợ lý Tài chính FinAI</h1><p className="mt-1 text-xs text-[#718078]">Phân tích chi tiêu, tối ưu ngân sách và lập kế hoạch tài chính cá nhân.</p></div><div className="flex flex-wrap items-center gap-2"><span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-[#e3f4e9] px-3 text-[9px] font-medium text-[#17794f]"><i className="size-1.5 rounded-full bg-[#36a77a]" />Neural Copilot v4.5</span><span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-[#eaf0fb] px-3 text-[9px] text-[#53677d]"><FinanceIcon name="shield" size={13} />Dữ liệu được mã hóa</span><button type="button" onClick={() => setPersonality((value) => value === 'Cân bằng' ? 'Ngắn gọn' : 'Cân bằng')} className="h-8 rounded-lg border border-[#e3e9e5] bg-white px-3 text-[10px] text-[#526159]">Phong cách: {personality}</button><button type="button" onClick={startConversation} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#07543f] px-3 text-[10px] font-semibold text-white"><FinanceIcon name="plus" size={14} />Cuộc trò chuyện mới</button></div></header>

    <div className="grid min-h-0 flex-1 items-start gap-4 xl:grid-cols-[minmax(210px,.72fr)_minmax(420px,1.65fr)_minmax(230px,.78fr)]">
      <aside className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
        <button type="button" onClick={startConversation} className="flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[#07543f] px-4 py-3 text-xs font-semibold text-white shadow-sm"><FinanceIcon name="plus" size={16} />Cuộc trò chuyện mới</button>
        <section className="rounded-xl border border-[#e7ece8] bg-white p-3 shadow-sm"><header className="mb-2 flex items-center justify-between px-1"><h2 className="text-[9px] font-bold tracking-[.8px] text-[#77837b]">LỊCH SỬ TRÒ CHUYỆN</h2><FinanceIcon name="clock" size={14} /></header><nav aria-label="Lịch sử trò chuyện" className="grid gap-1">{history.map((item, index) => <button key={item.title} type="button" onClick={() => { setActiveHistory(index); setMessages([{ ...starterMessage, id: Date.now(), text: index === 0 ? starterMessage.text : `Mình đã mở lại cuộc trò chuyện “${item.title}”. Bạn muốn tiếp tục nội dung nào?` }]) }} className={`rounded-lg p-2.5 text-left transition ${activeHistory === index ? 'bg-[#eaf4ed]' : 'hover:bg-[#f5f8f6]'}`}><span className="flex items-start gap-2"><span className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-md ${activeHistory === index ? 'bg-[#07543f] text-white' : 'bg-[#f1f5f2] text-[#77837b]'}`}><FinanceIcon name="receipt" size={12} /></span><span className="min-w-0"><span className="block line-clamp-2 text-[10px] font-medium leading-4 text-[#3b4a41]">{item.title}</span><span className={`mt-1 block text-[9px] ${activeHistory === index ? 'text-[#087557]' : 'text-[#929d96]'}`}>{item.date}</span></span></span></button>)}</nav></section>
        <section className="rounded-xl border border-[#e7ece8] bg-white p-3 shadow-sm"><header className="mb-2 flex items-center justify-between px-1"><h2 className="text-[9px] font-bold tracking-[.8px] text-[#77837b]">CHỦ ĐỀ GỢI Ý</h2><FinanceIcon name="spark" size={14} /></header><div className="grid gap-1">{topics.map((topic) => <button key={topic} type="button" onClick={() => selectTopic(topic)} className="flex items-center gap-2 rounded-lg p-2 text-left text-[10px] leading-4 text-[#3b4a41] hover:bg-[#f5f8f6]"><FinanceIcon name="arrow" size={13} />{topic}</button>)}</div></section>
        <section className="rounded-xl border border-[#e4ebe6] bg-[#edf5f0] p-3 sm:col-span-2 xl:col-span-1"><div className="flex items-center justify-between"><span className="flex items-center gap-1.5 text-[10px] font-semibold text-[#344c3e]"><FinanceIcon name="spark" size={14} />Trí nhớ ngữ cảnh</span><span className="text-[9px] font-semibold text-[#087557]">Hoạt động</span></div><p className="mt-2 text-[10px] leading-4 text-[#65756a]">8/10 danh mục, 4 tài khoản kết nối đã sẵn sàng phân tích.</p><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#d6e5da]"><span className="block h-full w-[80%] rounded-full bg-[#087557]" /></div></section>
      </aside>

      <section className="flex min-h-[650px] flex-col overflow-hidden rounded-xl border border-[#e5ebe7] bg-white shadow-sm xl:h-[calc(100vh-190px)] xl:min-h-[700px]" aria-label="Cuộc trò chuyện với FinAI"><header className="flex items-center justify-between border-b border-[#e9eeea] bg-[#f7faf8] px-4 py-3 sm:px-5"><div className="flex items-center gap-2.5"><span className="relative grid size-9 place-items-center rounded-full bg-[#07543f] text-[#c4f0d7]"><FinanceIcon name="spark" size={17} /><i className="absolute bottom-0 right-0 size-2.5 rounded-full border-2 border-white bg-[#45a67b]" /></span><span><strong className="block text-[11px] font-semibold text-[#2f4036]">FinAI Copilot</strong><small className="mt-0.5 block text-[9px] text-[#718078]">Ngữ cảnh tài chính cá nhân · Tháng 09/2025</small></span></div><button type="button" aria-label="Tùy chọn hội thoại" onClick={() => onNotify('Tùy chọn hội thoại FinAI')} className="grid size-8 place-items-center rounded-lg text-[#718078] hover:bg-[#edf3ef]"><FinanceIcon name="more" size={17} /></button></header>
        <div className="flex-1 space-y-5 overflow-y-auto px-3 py-5 sm:px-5">{messages.map((message) => <article key={message.id} className={`flex items-start gap-2.5 ${message.author === 'user' ? 'justify-end' : ''}`}>
          {message.author === 'assistant' && <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[#07543f] text-[#b5efd3]"><FinanceIcon name="spark" size={14} /></span>}
          <div className={`max-w-[92%] rounded-xl p-3 text-[11px] leading-[1.65] shadow-sm sm:max-w-[88%] sm:p-4 ${message.author === 'user' ? 'rounded-tr-sm bg-[#07543f] text-white' : 'rounded-tl-sm bg-[#f1f5f2] text-[#33443a]'}`}><p className="whitespace-pre-line">{message.text}</p>
            {message.id === 1 && message.author === 'assistant' && <div className="mt-3 flex flex-wrap gap-1.5">{['Đánh giá tổng quan chi tiêu tháng 9', 'Gợi ý tiết kiệm 2.000.000 đ', 'Kế hoạch mua laptop cuối năm', 'Phân tích giao dịch bất thường'].map((suggestion) => <button key={suggestion} type="button" onClick={() => setQuery(suggestion)} className="rounded-full border border-[#dce8df] bg-white px-2.5 py-1.5 text-left text-[9px] text-[#4f6858] hover:border-[#a9cfb5]">{suggestion}</button>)}</div>}
            {message.kind === 'analysis' && <div className="mt-3 grid gap-2">{expenseItems.map((item) => <div key={item.title} className="flex items-center justify-between gap-3 rounded-lg border border-[#e7ece8] bg-white p-2.5"><div className="flex min-w-0 items-center gap-2"><span className={`grid size-8 shrink-0 place-items-center rounded-lg ${item.color}`}><FinanceIcon name={item.icon} size={15} /></span><span className="min-w-0"><strong className="block text-[10px] font-semibold text-[#34443b]">{item.title}</strong><small className="mt-0.5 block text-[9px] text-[#829087]">{item.detail}</small></span></div><span className="shrink-0 text-right"><strong className="block whitespace-nowrap text-[10px] text-[#34443b]">{item.amount}</strong><small className="mt-1 inline-block rounded bg-[#f1f5f2] px-1.5 py-0.5 text-[8px] text-[#66746b]">{item.badge}</small></span></div>)}<div className="rounded-lg border border-[#dce8df] bg-white p-3"><strong className="text-[10px] text-[#07543f]">Đề xuất tối ưu</strong><p className="mt-1 text-[10px] leading-4">Giới hạn cà phê ngoài 2 lần/tuần có thể tiết kiệm khoảng <b>300.000 đ/tháng</b>.</p><button type="button" onClick={() => onNotify('Đã áp dụng hạn mức ăn uống mới')} className="mt-2 rounded-md bg-[#07543f] px-2.5 py-1.5 text-[9px] font-medium text-white">Áp dụng hạn mức ăn uống</button></div></div>}
          </div>
          {message.author === 'user' && <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[#dcece2] text-[9px] font-bold text-[#07543f]">NA</span>}
        </article>)}</div>
        <form onSubmit={submitMessage} className="border-t border-[#e9eeea] bg-white p-3 sm:p-4"><div className="rounded-xl border border-[#e3eae5] bg-[#f7faf8] p-2.5 focus-within:border-[#a8cdb6]"><label htmlFor="finai-message" className="sr-only">Nội dung câu hỏi</label><div className="flex items-end gap-2"><textarea id="finai-message" value={query} onChange={(event) => setQuery(event.target.value)} rows={2} placeholder="Hỏi FinAI về chi tiêu, ngân sách hoặc kế hoạch tài chính..." className="min-h-11 flex-1 resize-none bg-transparent px-1.5 py-1 text-[11px] leading-5 text-[#34443b] outline-none placeholder:text-[#89958d]" /><button type="submit" aria-label="Gửi tin nhắn" disabled={!query.trim()} className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#07543f] text-white disabled:cursor-not-allowed disabled:opacity-40"><FinanceIcon name="arrow" size={17} /></button></div><p className="mt-1 flex items-center gap-1 px-1.5 text-[8px] text-[#89958d]"><FinanceIcon name="shield" size={10} />FinAI phân tích dữ liệu tài chính đã kết nối của bạn.</p></div></form>
      </section>

      <aside className="grid content-start gap-3 sm:grid-cols-2 xl:grid-cols-1"><section className="rounded-xl border border-[#e7ece8] bg-white p-3.5 shadow-sm"><header className="mb-3 flex items-center justify-between"><h2 className="text-[9px] font-bold tracking-[.7px] text-[#77837b]">HỒ SƠ ĐANG PHÂN TÍCH</h2><FinanceIcon name="chart" size={15} /></header><div className="grid gap-2">{[{ label: 'Thu nhập tháng', value: '18.500.000 đ', icon: 'income' as const }, { label: 'Tỷ lệ tiết kiệm', value: '69,5%', icon: 'trend' as const }, { label: 'Dòng tiền', value: 'Tích cực · +12,85M', icon: 'wallet' as const }].map((item) => <div key={item.label} className="flex items-center justify-between gap-2 rounded-lg bg-[#f3f7f4] p-2.5"><span className="flex items-center gap-2 text-[9px] text-[#68766e]"><FinanceIcon name={item.icon} size={13} />{item.label}</span><strong className="text-right text-[10px] font-semibold text-[#345342]">{item.value}</strong></div>)}</div></section>
        <section className="rounded-xl border border-[#e7ece8] bg-white p-3.5 shadow-sm"><header className="mb-2 flex items-center justify-between"><h2 className="text-[9px] font-bold tracking-[.7px] text-[#77837b]">CÂU HỎI THÔNG MINH</h2><FinanceIcon name="spark" size={14} /></header><div className="grid gap-1.5">{smartQuestions.map((question) => <button key={question} type="button" onClick={() => setQuery(question)} className="flex items-start gap-2 rounded-lg bg-[#f3f7f4] p-2.5 text-left text-[9px] leading-4 text-[#4d5e53] hover:bg-[#eaf3ed]"><FinanceIcon name="arrow" size={12} />{question}</button>)}</div></section>
        <section className="rounded-xl border border-[#e7ece8] bg-[#f5f8f5] p-3.5 sm:col-span-2 xl:col-span-1"><div className="flex items-center gap-2"><span className="grid size-7 place-items-center rounded-lg bg-white text-[#087557]"><FinanceIcon name="shield" size={14} /></span><strong className="text-[10px] text-[#3b4d40]">Quyền riêng tư</strong></div><p className="mt-2 text-[9px] leading-4 text-[#718078]">Thông tin chỉ dùng để trả lời trong phiên trợ lý này.</p></section></aside>
    </div>
  </main>
}
