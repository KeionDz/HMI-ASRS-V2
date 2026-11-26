import { useState } from 'react'
import { ArrowDown, ArrowUp, DoorClosed, DoorOpen } from 'lucide-react'
import TransactionDialog from './TransactionDialog'

export default function ShutterDoorView() {
  const [isOpen, setIsOpen] = useState(false)
  const [requestedState, setRequestedState] = useState<boolean | null>(null)

  const requestDoorState = (open: boolean) => {
    if (open !== isOpen) setRequestedState(open)
  }

  return (
    <section className="equipment-door-panel" aria-label="Shutter door controls">
      <header className="equipment-panel-heading">
        <span className="eyebrow">ACCESS CONTROL · DOOR-01</span>
        <h2>Shutter Door</h2>
        <span className={`equipment-state${isOpen ? ' open' : ''}`}>
          {isOpen ? <DoorOpen size={15} /> : <DoorClosed size={15} />}
          <i />{isOpen ? 'OPEN' : 'CLOSED'}
        </span>
      </header>

      <div className={`shutter-illustration${isOpen ? ' open' : ''}`} aria-hidden="true">
        <div className="shutter-frame">
          <div className="shutter-curtain">
            {Array.from({ length: 8 }, (_, index) => (
              <span key={index} />
            ))}
          </div>
          <div className="shutter-opening" />
        </div>
        <div className="shutter-floor" />
      </div>

      <p className="equipment-description">
        Verify the area is clear before moving the shutter door.
      </p>

      <div className="shutter-controls">
        <button type="button" disabled={isOpen} onClick={() => requestDoorState(true)}>
          <ArrowUp size={18} />
          Raise Door
        </button>
        <button type="button" disabled={!isOpen} onClick={() => requestDoorState(false)}>
          <ArrowDown size={18} />
          Lower Door
        </button>
      </div>

      <p className="equipment-demo-note">DEMO CONTROL · NOT CONNECTED TO HARDWARE</p>

      {requestedState !== null && (
        <TransactionDialog
          title={`${requestedState ? 'Open' : 'Close'} shutter door?`}
          description={`Confirm the doorway is clear before you ${requestedState ? 'raise' : 'lower'} the shutter door.`}
          confirmLabel={`${requestedState ? 'raise' : 'lower'} door`}
          steps={[
            'Safety check confirmed',
            requestedState ? 'Shutter door opening' : 'Shutter door closing',
            `Door is ${requestedState ? 'open' : 'closed'}`,
          ]}
          onComplete={() => {
            if (requestedState !== null) setIsOpen(requestedState)
            setRequestedState(null)
          }}
          onClose={() => setRequestedState(null)}
        />
      )}
    </section>
  )
}
