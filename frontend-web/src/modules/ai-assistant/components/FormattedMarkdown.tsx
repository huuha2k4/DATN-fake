import React from 'react'

interface FormattedMarkdownProps {
  content: string
}

/**
 * Phân tích và render các cú pháp Markdown phổ biến mà AI Gemini hay trả về:
 * - ### Tiêu đề / ## Tiêu đề -> Thẻ heading nhỏ gọn, in đậm trang nhã
 * - **nội dung in đậm** -> <strong>
 * - * hoặc - đầu dòng -> Bullet points có chấm tròn đẹp mắt
 * - 1. 2. 3. -> Danh sách số thứ tự
 * - --- -> Kẻ ngang phân cách
 * - `code inline` -> Khối mã nhỏ
 */
export const FormattedMarkdown: React.FC<FormattedMarkdownProps> = ({ content }) => {
  if (!content) return null

  // Chia nhỏ thành các dòng
  const lines = content.split('\n')
  const elements: React.ReactNode[] = []

  let listBuffer: { type: 'ul' | 'ol'; items: React.ReactNode[] } | null = null

  const flushList = () => {
    if (listBuffer) {
      if (listBuffer.type === 'ul') {
        elements.push(
          <ul key={`ul-${elements.length}`} style={{ margin: '6px 0', paddingLeft: '20px' }}>
            {listBuffer.items.map((it, idx) => (
              <li key={idx} style={{ marginBottom: '4px' }}>
                {it}
              </li>
            ))}
          </ul>
        )
      } else {
        elements.push(
          <ol key={`ol-${elements.length}`} style={{ margin: '6px 0', paddingLeft: '20px' }}>
            {listBuffer.items.map((it, idx) => (
              <li key={idx} style={{ marginBottom: '4px' }}>
                {it}
              </li>
            ))}
          </ol>
        )
      }
      listBuffer = null
    }
  }

  // Parse inline text: **bold**, `code`, etc.
  const parseInline = (text: string): React.ReactNode[] => {
    // Regex chia text theo **bold** hoặc `code`
    const regex = /(\*\*[^*]+\*\*|`[^`]+`)/g
    const parts = text.split(regex)

    return parts.map((part, idx) => {
      if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
        return <strong key={idx}>{part.slice(2, -2)}</strong>
      }
      if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
        return (
          <code
            key={idx}
            style={{
              background: 'rgba(0, 0, 0, 0.06)',
              padding: '2px 5px',
              borderRadius: '4px',
              fontSize: '0.9em',
              fontFamily: 'monospace',
            }}
          >
            {part.slice(1, -1)}
          </code>
        )
      }
      return part
    })
  }

  lines.forEach((line, index) => {
    const trimmed = line.trim()

    // 1. Dòng kẻ ngang --- hoặc ***
    if (/^(-{3,}|\*{3,})$/.test(trimmed)) {
      flushList()
      elements.push(
        <hr
          key={`hr-${index}`}
          style={{
            border: 'none',
            borderTop: '1px solid rgba(0, 0, 0, 0.1)',
            margin: '10px 0',
          }}
        />
      )
      return
    }

    // 2. Heading ### hoặc ## hoặc #
    const headingMatch = trimmed.match(/^(#{1,4})\s+(.+)$/)
    if (headingMatch) {
      flushList()
      const headingText = headingMatch[2]
      elements.push(
        <div
          key={`h-${index}`}
          style={{
            fontWeight: 700,
            fontSize: '1.05rem',
            margin: '10px 0 4px 0',
            color: 'inherit',
          }}
        >
          {parseInline(headingText)}
        </div>
      )
      return
    }

    // 3. Bullet points (* text hoặc - text)
    const bulletMatch = line.match(/^(\s*)[\*\-]\s+(.+)$/)
    if (bulletMatch) {
      const itemText = bulletMatch[2]
      if (!listBuffer || listBuffer.type !== 'ul') {
        flushList()
        listBuffer = { type: 'ul', items: [] }
      }
      listBuffer.items.push(parseInline(itemText))
      return
    }

    // 4. Numbered list (1. text, 2. text)
    const numberedMatch = line.match(/^(\s*)\d+\.\s+(.+)$/)
    if (numberedMatch) {
      const itemText = numberedMatch[2]
      if (!listBuffer || listBuffer.type !== 'ol') {
        flushList()
        listBuffer = { type: 'ol', items: [] }
      }
      listBuffer.items.push(parseInline(itemText))
      return
    }

    // 5. Nếu là dòng trống hoặc đoạn văn thường
    flushList()
    if (trimmed === '') {
      elements.push(<div key={`br-${index}`} style={{ height: '6px' }} />)
    } else {
      elements.push(
        <div key={`p-${index}`} style={{ margin: '3px 0', lineHeight: 1.55 }}>
          {parseInline(line)}
        </div>
      )
    }
  })

  // Flush list còn sót lại cuối tin nhắn
  flushList()

  return <div className="formatted-markdown-wrapper">{elements}</div>
}

