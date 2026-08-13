// src/pages/configurador/StepCard.jsx
import { useState } from 'react'

export default function StepCard({ number, title, value, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className={`cfg2-step ${open ? 'cfg2-open' : ''}`}>
      <div className="cfg2-step-head" onClick={() => setOpen(o => !o)}>
        <div className="cfg2-step-num">{number}</div>
        <div className="cfg2-step-title">{title}</div>
        {value && <div className="cfg2-step-value">{value}</div>}
        <div className="cfg2-step-edit">✎</div>
      </div>
      {open && <div className="cfg2-step-body">{children}</div>}
    </div>
  )
}
