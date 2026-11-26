import { useEffect, useRef, useState } from 'react'
import { Check, X } from 'lucide-react'

type TransactionDialogProps = {
  title: string
  description: string
  confirmLabel: string
  steps: string[]
  onComplete: () => void
  onClose: () => void
}

export default function TransactionDialog({
  title,
  description,
  confirmLabel,
  steps,
  onComplete,
  onClose,
}: TransactionDialogProps) {
  const [stepIndex, setStepIndex] = useState(-1)
  const onCompleteRef = useRef(onComplete)
  const isVerifying = stepIndex < 0
  const progress = isVerifying
    ? 0
    : steps.length === 0
      ? 100
      : (Math.min(stepIndex + 1, steps.length) / steps.length) * 100
  const isComplete = !isVerifying && stepIndex >= steps.length - 1

  useEffect(() => {
    onCompleteRef.current = onComplete
  }, [onComplete])

  useEffect(() => {
    if (isVerifying) return

    if (isComplete) return

    const timer = window.setTimeout(() => {
      setStepIndex((current) => Math.min(current + 1, steps.length - 1))
    }, 1100)

    return () => window.clearTimeout(timer)
  }, [isComplete, isVerifying, stepIndex, steps.length])

  return (
    <div
      className="transaction-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section
        className="transaction-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="transaction-title"
        aria-describedby="transaction-description"
      >
        <header>
          <span className={`transaction-status-icon${isComplete ? ' complete' : ''}`}>
            {isComplete ? <Check size={24} /> : <span />}
          </span>
          <button type="button" onClick={onClose} aria-label="Close transaction">
            <X size={20} />
          </button>
        </header>

        <span className="eyebrow">{isVerifying ? 'VERIFY ACTION' : isComplete ? 'TRANSACTION COMPLETE' : 'TRANSACTION PROGRESS'}</span>
        <h2 id="transaction-title">{title}</h2>
        <p id="transaction-description">{description}</p>

        {!isVerifying && (
          <div className="transaction-progress" aria-live="polite">
            <div className="transaction-progress-track">
              <span style={{ width: `${progress}%` }} />
            </div>
            <ol>
              {steps.map((step, index) => (
                <li className={index <= stepIndex ? 'reached' : ''} key={step}>
                  <span>{index < stepIndex ? <Check size={12} /> : index + 1}</span>
                  {step}
                </li>
              ))}
            </ol>
            <p className="transaction-auto-note">Progress updates automatically</p>
          </div>
        )}

        {isVerifying && (
          <div className="transaction-actions">
            <button type="button" className="transaction-secondary" onClick={onClose}>No</button>
            <button type="button" className="transaction-primary" onClick={() => setStepIndex(0)}>Yes, {confirmLabel}</button>
          </div>
        )}

        {!isVerifying && (
          <div className="transaction-actions">
            {isComplete ? (
              <button type="button" className="transaction-primary" onClick={() => onCompleteRef.current()}>Complete</button>
            ) : (
              <button type="button" className="transaction-primary" onClick={() => setStepIndex((current) => Math.min(current + 1, steps.length - 1))}>Continue</button>
            )}
          </div>
        )}
      </section>
    </div>
  )
}
