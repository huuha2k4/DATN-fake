import { useEffect, useState } from 'react'
import type { FinAiClarification, FinAiSelection } from '../api/finAiAgentApi'
import './FinAiChoices.css'

export function FinAiChoices({ clarification, disabled, onSelect }: {
  clarification: FinAiClarification
  disabled: boolean
  onSelect: (label: string, selection: FinAiSelection) => void
}) {
  const expiresAt = Date.parse(clarification.expiresAt)
  const [expired, setExpired] = useState(() => !(expiresAt > Date.now()))
  useEffect(() => {
    if (expired) return
    const timeout = window.setTimeout(() => setExpired(true), Math.max(0, expiresAt - Date.now()))
    return () => window.clearTimeout(timeout)
  }, [expired, expiresAt])
  if (!clarification.options?.length) return null

  return (
    <div className="finai-choices" role="group" aria-label="Lựa chọn cho FinAI">
      {clarification.options.map(({ id, label }) => (
        <button key={id} type="button" disabled={disabled || expired}
          onClick={() => {
            if (Date.now() < expiresAt) onSelect(label, { draftId: clarification.draftId, optionId: id })
          }}>
          {label}
        </button>
      ))}
      {expired && <span className="finai-choices-expired">Lựa chọn đã hết hạn.</span>}
    </div>
  )
}
