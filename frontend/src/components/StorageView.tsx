
import { useMemo, useState } from 'react'
import {
  Check,
  ClipboardList,
  Package,
  Upload,
  X,
} from 'lucide-react'
import './StorageView.css'

type SlotStatus = 'available' | 'occupied' | 'post-event' | 'retrieved'

type StorageSlot = {
  id: string
  level: number
  row: number
  slot: number
  status: SlotStatus
  items: number
  weight: number
  eventId: string | null
  description: string
}

type EventOption = {
  id: string
  title: string
}

const events: EventOption[] = [
  { id: 'EVT-000', title: 'Board Retreat' },
  { id: 'EVT-001', title: 'Grand Ballroom Gala' },
  { id: 'EVT-002', title: 'Corporate Summit' },
  { id: 'EVT-003', title: 'Wedding Reception' },
  { id: 'EVT-004', title: 'Product Launch' },
  { id: 'EVT-005', title: 'Annual Gala Dinner' },
]

const seeded: Record<
  string,
  Partial<StorageSlot>
> = {
  'L1-R1-S1': {
    status: 'occupied',
    items: 24,
    weight: 183,
    eventId: 'EVT-001',
  },
  'L1-R1-S2': {
    status: 'occupied',
    items: 18,
    weight: 148,
    eventId: 'EVT-001',
  },
  'L1-R2-S1': {
    status: 'occupied',
    items: 14,
    weight: 122,
    eventId: 'EVT-002',
  },
  'L1-R2-S2': {
    status: 'occupied',
    items: 16,
    weight: 166,
    eventId: 'EVT-002',
  },
  'L1-R2-S3': {
    status: 'occupied',
    items: 10,
    weight: 97,
    eventId: 'EVT-002',
  },
  'L1-R3-S1': {
    status: 'post-event',
    items: 12,
    weight: 88,
    eventId: 'EVT-000',
  },
  'L1-R3-S2': {
    status: 'post-event',
    items: 8,
    weight: 67,
    eventId: 'EVT-000',
  },
  'L2-R1-S1': {
    status: 'occupied',
    items: 20,
    weight: 221,
    eventId: 'EVT-003',
  },
  'L2-R2-S1': {
    status: 'occupied',
    items: 18,
    weight: 202,
    eventId: 'EVT-003',
  },
  'L2-R2-S2': {
    status: 'occupied',
    items: 16,
    weight: 178,
    eventId: 'EVT-003',
  },
  'L3-R1-S1': {
    status: 'occupied',
    items: 30,
    weight: 315,
    eventId: 'EVT-004',
  },
}

const initialSlots: StorageSlot[] = Array.from(
  { length: 96 },
  (_, index) => {
    const level = Math.floor(index / 32) + 1
    const row = Math.floor((index % 32) / 8) + 1
    const slot = (index % 8) + 1
    const id = `L${level}-R${row}-S${slot}`

    return {
      id,
      level,
      row,
      slot,
      status: 'available' as SlotStatus,
      items: 0,
      weight: 0,
      eventId: null,
      description: '',
      ...seeded[id],
    }
  },
)

export default function StorageView() {
  const [slots, setSlots] = useState<StorageSlot[]>(initialSlots)
  const [level, setLevel] = useState(1)
  const [selectedId, setSelectedId] = useState<string | null>(
    'L1-R1-S1',
  )
  const [eventContext, setEventContext] = useState('')
  const [manageOpen, setManageOpen] = useState(false)
  const [loadItems, setLoadItems] = useState('')
  const [loadWeight, setLoadWeight] = useState('')
  const [loadDescription, setLoadDescription] = useState('')
  const [confirmUnassign, setConfirmUnassign] = useState(false)
  const [notice, setNotice] = useState('')

  const visibleSlots = useMemo(
    () => slots.filter((slot) => slot.level === level),
    [slots, level],
  )

  const selected = slots.find(
    (slot) => slot.id === selectedId,
  ) ?? null

  const selectedEvent = events.find(
    (event) => event.id === selected?.eventId,
  )

  function changeLevel(nextLevel: number) {
    setLevel(nextLevel)
    setSelectedId(null)
    setManageOpen(false)
    setConfirmUnassign(false)
    setNotice('')
  }

  function selectSlot(id: string) {
    setSelectedId(id)
    setManageOpen(false)
    setConfirmUnassign(false)
    setNotice('')
    setLoadItems('')
    setLoadWeight('')
    setLoadDescription('')
  }

  function updateSlot(
    id: string,
    changes: Partial<StorageSlot>,
  ) {
    setSlots((previous) =>
      previous.map((slot) =>
        slot.id === id ? { ...slot, ...changes } : slot,
      ),
    )
  }

  function loadPallet() {
    if (!selected || selected.status !== 'available') return

    const items = Number(loadItems)
    const weight = Number(loadWeight)

    if (
      !Number.isInteger(items) ||
      items <= 0 ||
      !Number.isFinite(weight) ||
      weight <= 0
    ) {
      setNotice('Enter a valid item count and weight.')
      return
    }

    updateSlot(selected.id, {
      status: 'occupied',
      items,
      weight,
      eventId: eventContext || null,
      description: loadDescription.trim(),
    })

    setManageOpen(false)
    setNotice('Demo pallet loaded. No hardware command sent.')
    setLoadItems('')
    setLoadWeight('')
    setLoadDescription('')
  }

  function unassignEvent() {
    if (!selected || !selected.eventId) return

    updateSlot(selected.id, { eventId: null })
    setConfirmUnassign(false)
    setNotice('Event unassigned in demo storage only.')
  }

  function assignContext() {
    if (!selected || !eventContext) return
    if (selected.status === 'available') return

    updateSlot(selected.id, { eventId: eventContext })
    setNotice('Demo event assignment updated.')
  }

  return (
    <div className="st-layout">
      <main className="st-main">
        <header className="st-heading">
          <div>
            <small>STORAGE LOCATIONS</small>
            <h2>Pallet Grid — Level {level}</h2>
          </div>

          <div className="st-levels">
            {[1, 2, 3].map((item) => (
              <button
                key={item}
                type="button"
                className={level === item ? 'active' : ''}
                onClick={() => changeLevel(item)}
              >
                L{item}
              </button>
            ))}
          </div>
        </header>

        <div className="st-legend">
          <span><i className="available" /> Available</span>
          <span><i className="reserved" /> Reserved</span>
          <span><i className="occupied" /> Occupied</span>
          <span><i className="attention" /> Attention</span>
          <span><i className="retrieved" /> Retrieved</span>
        </div>

        <div className="st-grid-area">
          {[1, 2, 3, 4].map((row) => (
            <section className="st-row" key={row}>
              <small>ROW {row}</small>

              <div className="st-slot-row">
                {visibleSlots
                  .filter((slot) => slot.row === row)
                  .map((slot) => {
                    const isSelected = selectedId === slot.id
                    const isEmpty = slot.status === 'available'
                    const isPostEvent = slot.status === 'post-event'

                    return (
                      <button
                        key={slot.id}
                        type="button"
                        title={slot.id}
                        className={[
                          'st-slot',
                          slot.status,
                          isSelected ? 'selected' : '',
                        ].join(' ')}
                        onClick={() => selectSlot(slot.id)}
                        aria-pressed={isSelected}
                      >
                        <i className="st-dot" />
                        <span>S{slot.slot}</span>
                        <strong>
                          {isEmpty
                            ? 'OPEN'
                            : isPostEvent || slot.weight > 0
                              ? `${slot.weight}kg`
                              : 'EMPTY'}
                        </strong>
                      </button>
                    )
                  })}
              </div>
            </section>
          ))}
        </div>
      </main>

      <aside className="st-side">
        <div className="st-context">
          <label htmlFor="st-event-context">
            ACTIVE EVENT CONTEXT
          </label>

          <select
            id="st-event-context"
            value={eventContext}
            onChange={(event) => {
              setEventContext(event.target.value)
              setNotice('')
            }}
          >
            <option value="">— No event selected —</option>
            {events.map((event) => (
              <option key={event.id} value={event.id}>
                {event.title}
              </option>
            ))}
          </select>
        </div>

        {!selected ? (
          <div className="st-empty-panel">
            <Package size={28} />
            <strong>Select a Cell</strong>
            <p>
              Tap any storage slot to view contents
              and available actions.
            </p>
          </div>
        ) : (
          <div className="st-control">
            <small className="st-eyebrow">SLOT CONTROL</small>
            <h2>{selected.id}</h2>

            <span className={`st-status ${selected.status}`}>
              {selected.status === 'available'
                ? 'EMPTY'
                : selected.status === 'post-event'
                  ? 'POST EVENT'
                  : selected.status.toUpperCase()}
            </span>

            <div className="st-stats">
              <div>
                <small>Level</small>
                <strong>{selected.level}</strong>
              </div>
              <div>
                <small>Row</small>
                <strong>{selected.row}</strong>
              </div>
              <div>
                <small>Slot</small>
                <strong>{selected.slot}</strong>
              </div>
              <div>
                <small>Sensor</small>
                <strong>
                  {selected.status === 'available'
                    ? 'Clear'
                    : `${selected.weight.toFixed(1)} kg`}
                </strong>
              </div>
              <div>
                <small>Items</small>
                <strong>{selected.items}</strong>
              </div>
              <div>
                <small>Sensor Status</small>
                <strong>
                  {selected.status === 'post-event'
                    ? 'warn'
                    : 'ok'}
                </strong>
              </div>
            </div>

            {selectedEvent && (
              <div className="st-event-tag">
                Reserved for {selectedEvent.title}
              </div>
            )}

            <button
              type="button"
              className="st-manage-btn"
              onClick={() => {
                setManageOpen((value) => !value)
                setNotice('')
              }}
            >
              <ClipboardList size={15} />
              Manage Contents
            </button>

            {manageOpen && (
              <div className="st-manage-panel">
                {selected.status === 'available' ? (
                  <>
                    <h3>LOAD PALLET</h3>

                    <label>
                      Items
                      <input
                        type="number"
                        min="1"
                        value={loadItems}
                        onChange={(event) =>
                          setLoadItems(event.target.value)
                        }
                      />
                    </label>

                    <label>
                      Weight (kg)
                      <input
                        type="number"
                        min="0.1"
                        step="0.1"
                        value={loadWeight}
                        onChange={(event) =>
                          setLoadWeight(event.target.value)
                        }
                      />
                    </label>

                    <label>
                      Description
                      <textarea
                        rows={2}
                        value={loadDescription}
                        onChange={(event) =>
                          setLoadDescription(event.target.value)
                        }
                      />
                    </label>

                    <button
                      type="button"
                      className="st-load-btn"
                      onClick={loadPallet}
                    >
                      <Upload size={15} />
                      Load Pallet
                    </button>
                  </>
                ) : (
                  <>
                    <h3>PALLET CONTENTS</h3>
                    <p>
                      <strong>{selected.items}</strong> items
                    </p>
                    <p>
                      Weight: <strong>{selected.weight} kg</strong>
                    </p>
                    <p>
                      {selected.description ||
                        'No item description available in demo data.'}
                    </p>

                    {eventContext &&
                      selected.eventId !== eventContext && (
                        <button
                          type="button"
                          className="st-load-btn"
                          onClick={assignContext}
                        >
                          <Check size={15} />
                          Assign Selected Event
                        </button>
                      )}
                  </>
                )}
              </div>
            )}

            {selected.eventId && (
              <button
                type="button"
                className="st-unassign-btn"
                onClick={() => setConfirmUnassign(true)}
              >
                <X size={15} />
                Unassign Event
              </button>
            )}

            {notice && (
              <p className="st-notice" role="status">
                {notice}
              </p>
            )}
          </div>
        )}
      </aside>

      {confirmUnassign && selected && (
        <div className="st-modal-backdrop">
          <section
            className="st-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Unassign event confirmation"
          >
            <div className="st-modal-header">
              <h3>Unassign Event?</h3>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setConfirmUnassign(false)}
              >
                <X size={18} />
              </button>
            </div>

            <p>
              Remove the event assignment from{' '}
              <strong>{selected.id}</strong>?
            </p>

            <p>
              This only updates the frontend demonstration.
            </p>

            <div className="st-modal-actions">
              <button
                type="button"
                onClick={() => setConfirmUnassign(false)}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={unassignEvent}
              >
                Confirm Demo
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
