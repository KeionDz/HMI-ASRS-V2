
import { useMemo, useState } from 'react'
import {
  Archive,
  Check,
  ClipboardCheck,
  Download,
  Layers3,
  Lock,
  LockOpen,
  ShieldAlert,
  X,
} from 'lucide-react'
import './EventsView.css'

type EventStatus = 'completed' | 'scheduled'

type EventRecord = {
  id: string
  title: string
  date: string
  time: string
  venue: string
  floor: number
  guests: number
  type: string
  status: EventStatus
  pallets: string[]
}

type SlotStatus = 'available' | 'occupied' | 'post-event'

type Slot = {
  id: string
  level: number
  row: number
  slot: number
  status: SlotStatus
  items?: number
  weight?: number
  eventId?: string
}

const initialEvents: EventRecord[] = [
  {
    id: 'EVT-000',
    title: 'Board Retreat',
    date: '2026-07-03',
    time: '14:00',
    venue: 'Ballroom A',
    floor: 3,
    guests: 40,
    type: 'Corporate',
    status: 'completed',
    pallets: ['L1-R3-S1', 'L1-R3-S2'],
  },
  {
    id: 'EVT-001',
    title: 'Grand Ballroom Gala',
    date: '2026-07-05',
    time: '18:00',
    venue: 'Ballroom A',
    floor: 3,
    guests: 120,
    type: 'Gala',
    status: 'scheduled',
    pallets: ['L1-R1-S1', 'L1-R1-S2'],
  },
  {
    id: 'EVT-002',
    title: 'Corporate Summit',
    date: '2026-07-06',
    time: '09:00',
    venue: 'Ballroom B',
    floor: 2,
    guests: 80,
    type: 'Corporate',
    status: 'scheduled',
    pallets: ['L1-R2-S1'],
  },
  {
    id: 'EVT-003',
    title: 'Wedding Reception',
    date: '2026-07-08',
    time: '16:00',
    venue: 'Ballroom A',
    floor: 3,
    guests: 150,
    type: 'Wedding',
    status: 'scheduled',
    pallets: ['L2-R1-S1', 'L2-R1-S2', 'L2-R1-S3'],
  },
  {
    id: 'EVT-004',
    title: 'Product Launch',
    date: '2026-07-10',
    time: '14:00',
    venue: 'Ballroom B',
    floor: 2,
    guests: 60,
    type: 'Corporate',
    status: 'scheduled',
    pallets: ['L2-R2-S1'],
  },
  {
    id: 'EVT-005',
    title: 'Annual Gala Dinner',
    date: '2026-07-12',
    time: '19:00',
    venue: 'Ballroom A',
    floor: 3,
    guests: 200,
    type: 'Gala',
    status: 'scheduled',
    pallets: [],
  },
]

const checklistLabels = [
  'Conference tables',
  'Chairs',
  'Projector & screen',
  'Podium',
  'Banners & signage',
  'Bottled water service',
]

const initialSlotData: Record<string, Partial<Slot>> = {
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
    items: 10,
    weight: 97,
    eventId: 'EVT-003',
  },
  'L2-R1-S2': {
    status: 'occupied',
    items: 10,
    weight: 105,
    eventId: 'EVT-003',
  },
  'L2-R1-S3': {
    status: 'occupied',
    items: 10,
    weight: 92,
    eventId: 'EVT-003',
  },
  'L2-R2-S1': {
    status: 'occupied',
    items: 12,
    weight: 112,
    eventId: 'EVT-004',
  },
}

const initialSlots: Slot[] = Array.from(
  { length: 96 },
  (_, index): Slot => {
    const level = Math.floor(index / 32) + 1
    const row = Math.floor((index % 32) / 8) + 1
    const slot = (index % 8) + 1
    const id = `L${level}-R${row}-S${slot}`

    return {
      id,
      level,
      row,
      slot,
      status: 'available',
      ...initialSlotData[id],
    }
  },
)

export default function EventsView() {
  const [events, setEvents] = useState<EventRecord[]>(initialEvents)
  const [slots, setSlots] = useState<Slot[]>(initialSlots)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedPalletId, setSelectedPalletId] = useState<string | null>(null)

  const [showChecklist, setShowChecklist] = useState(false)
  const [showMap, setShowMap] = useState(false)

  const [checked, setChecked] = useState<Record<string, string[]>>({})
  const [locked, setLocked] = useState<Record<string, boolean>>({})

  const [pinDialog, setPinDialog] = useState(false)
  const [pin, setPin] = useState('')
  const [pinError, setPinError] = useState('')

  const [retrieveDialog, setRetrieveDialog] = useState(false)

  const [activity, setActivity] = useState<string[]>([
    'Event sync complete. Schedule up to date.',
  ])

  const selected =
    events.find((event) => event.id === selectedId) ?? null

  const selectedChecked = selected
    ? checked[selected.id] ?? []
    : []

  const isLocked = selected
    ? locked[selected.id] ?? false
    : false

  const selectedPallet = selectedPalletId
    ? slots.find((slot) => slot.id === selectedPalletId) ?? null
    : null

  const totals = useMemo(
    () => ({
      available: slots.filter(
        (slot) => slot.status === 'available',
      ).length,
      occupied: slots.filter(
        (slot) => slot.status === 'occupied',
      ).length,
      postEvent: slots.filter(
        (slot) => slot.status === 'post-event',
      ).length,
    }),
    [slots],
  )

  function chooseEvent(id: string) {
    setSelectedId(id)
    setSelectedPalletId(null)
    setShowChecklist(false)
    setShowMap(false)
    setRetrieveDialog(false)
  }

  function toggleCheck(label: string) {
    if (!selected) return

    setChecked((previous) => {
      const current = previous[selected.id] ?? []

      const next = current.includes(label)
        ? current.filter((item) => item !== label)
        : [...current, label]

      return {
        ...previous,
        [selected.id]: next,
      }
    })
  }

  function assignSlot(slot: Slot) {
    if (!selected || isLocked || slot.status !== 'available') {
      return
    }

    setSlots((previous) =>
      previous.map((current) =>
        current.id === slot.id
          ? {
              ...current,
              status: 'occupied',
              eventId: selected.id,
              items: 0,
              weight: 0,
            }
          : current,
      ),
    )

    setEvents((previous) =>
      previous.map((event) =>
        event.id === selected.id
          ? {
              ...event,
              pallets: [...event.pallets, slot.id],
            }
          : event,
      ),
    )

    setActivity((previous) => [
      `DEMO: ${slot.id} assigned to ${selected.title}`,
      ...previous,
    ])
  }

  function selectPallet(id: string) {
    setSelectedPalletId(id)
  }

  function openLockDialog() {
    setPin('')
    setPinError('')
    setPinDialog(true)
  }

  function confirmLock() {
    if (!selected) return

    if (pin.length !== 4) {
      setPinError('Enter four digits to simulate confirmation.')
      return
    }

    const nextLocked = !isLocked

    setLocked((previous) => ({
      ...previous,
      [selected.id]: nextLocked,
    }))

    setActivity((previous) => [
      `DEMO: ${selected.title} retrieval ${
        nextLocked ? 'locked' : 'unlocked'
      }`,
      ...previous,
    ])

    setPinDialog(false)
    setPin('')
  }

  function confirmRetrieval() {
    if (!selected || !selectedPallet || isLocked) return
    if (!selected.pallets.includes(selectedPallet.id)) return

    setActivity((previous) => [
      `DEMO: Retrieval requested for ${selectedPallet.id} — no equipment command sent`,
      ...previous,
    ])

    setRetrieveDialog(false)
  }

  return (
    <div className="ev-layout">
      <aside className="ev-sidebar">
        <div className="ev-panel-title">
          <small>NEXT 14 DAYS · DEMO JUL 2026</small>
          <h2>Upcoming Events</h2>
        </div>

        <div className="ev-event-list">
          {events.map((event) => {
            const eventDate = new Date(`${event.date}T00:00:00`)

            const month = eventDate
              .toLocaleString('en-US', { month: 'short' })
              .toUpperCase()

            return (
              <button
                key={event.id}
                type="button"
                className={`ev-event ${
                  selectedId === event.id ? 'is-selected' : ''
                }`}
                onClick={() => chooseEvent(event.id)}
              >
                <span className="ev-date">
                  <strong>{eventDate.getDate()}</strong>
                  <small>{month}</small>
                </span>

                <span className="ev-event-text">
                  <strong>{event.title}</strong>

                  <span>
                    {event.time} · {event.venue}
                  </span>

                  <span className="ev-event-meta">
                    <b>{event.status.toUpperCase()}</b>
                    {event.pallets.length}p
                  </span>
                </span>
              </button>
            )
          })}
        </div>
      </aside>

      <section className="ev-center">
        {!selected ? (
          <div className="ev-empty">
            <div className="ev-empty-icon">
              <Archive size={30} />
            </div>

            <h2>Select an Event</h2>

            <p>
              Choose an event from the list to review equipment,
              assign pallets, and arrange delivery.
            </p>

            <div className="ev-hints">
              <span>1 Select event</span>
              <span>2 Review pallets</span>
              <span>3 Retrieve to venue</span>
            </div>
          </div>
        ) : (
          <div className="ev-workspace">
            <header className="ev-detail-header">
              <span className="ev-event-code">
                {selected.id} · {selected.type.toUpperCase()}
              </span>

              <span className="ev-status">
                {selected.status.toUpperCase()}
              </span>

              <h2>{selected.title}</h2>

              <p>
                {selected.venue} · Floor {selected.floor} ·{' '}
                {selected.guests} guests · {selected.date} at{' '}
                {selected.time}
              </p>

              <div className="ev-actions">
                <button
                  type="button"
                  className={showChecklist ? 'on' : ''}
                  onClick={() => setShowChecklist((value) => !value)}
                >
                  <ClipboardCheck size={16} />
                  {showChecklist
                    ? 'Hide Checklist'
                    : `Checklist (${selectedChecked.length}/6)`}
                </button>

                <button
                  type="button"
                  className={showMap ? 'on' : ''}
                  onClick={() => setShowMap((value) => !value)}
                >
                  <Layers3 size={16} />
                  {showMap ? 'Close Map' : 'Pallet Map'}
                </button>

                <button
                  type="button"
                  onClick={openLockDialog}
                >
                  {isLocked ? (
                    <Lock size={16} />
                  ) : (
                    <LockOpen size={16} />
                  )}
                  {isLocked ? 'Locked' : 'Unlocked'}
                </button>
              </div>
            </header>

            {showChecklist && (
              <section className="ev-checklist">
                {checklistLabels.map((label) => (
                  <label key={label} className="ev-check-row">
                    <input
                      type="checkbox"
                      checked={selectedChecked.includes(label)}
                      onChange={() => toggleCheck(label)}
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </section>
            )}

            {showMap && (
              <section className="ev-map">
                <p>
                  Tap an available slot to assign it to this
                  event. <strong>Simulation only.</strong>
                </p>

                {[1, 2, 3].map((level) => (
                  <div key={level} className="ev-map-level">
                    <small>LEVEL {level}</small>

                    <div className="ev-slot-grid">
                      {slots
                        .filter((slot) => slot.level === level)
                        .map((slot) => (
                          <button
                            key={slot.id}
                            type="button"
                            title={`${slot.id} · ${slot.status}`}
                            disabled={
                              slot.status !== 'available' ||
                              isLocked
                            }
                            onClick={() => assignSlot(slot)}
                            className={`ev-slot ${slot.status} ${
                              slot.eventId === selected.id
                                ? 'assigned'
                                : ''
                            }`}
                          >
                            R{slot.row}S{slot.slot}
                          </button>
                        ))}
                    </div>
                  </div>
                ))}
              </section>
            )}

            <section className="ev-assigned">
              <h3>
                ASSIGNED PALLETS ({selected.pallets.length})
              </h3>

              {selected.pallets.length > 0 ? (
                selected.pallets.map((id) => {
                  const slot = slots.find(
                    (item) => item.id === id,
                  )

                  const isSelected = selectedPalletId === id

                  return (
                    <button
                      key={id}
                      type="button"
                      className={`ev-pallet ${
                        isSelected ? 'is-selected' : ''
                      }`}
                      aria-pressed={isSelected}
                      onClick={() => selectPallet(id)}
                    >
                      <div>
                        <strong>{id}</strong>
                        <small>
                          {slot?.items ?? 0} items ·{' '}
                          {slot?.weight ?? 0} kg
                        </small>
                      </div>

                      <span
                        className={
                          slot?.status === 'post-event'
                            ? 'post'
                            : ''
                        }
                      >
                        {slot?.status === 'post-event'
                          ? 'POST EVENT'
                          : 'ASSIGNED'}
                      </span>
                    </button>
                  )
                })
              ) : (
                <p>
                  No pallets assigned. Open Pallet Map to
                  assign an available slot.
                </p>
              )}
            </section>
          </div>
        )}

        {selected &&
          selectedPallet &&
          selected.pallets.includes(selectedPallet.id) && (
            <div className="ev-retrieval-bar">
              <div>
                <small>SELECTED</small>
                <strong>{selectedPallet.id}</strong>
              </div>

              <button
                type="button"
                disabled={isLocked}
                onClick={() => setRetrieveDialog(true)}
              >
                <Download size={16} />
                Retrieve to Venue
              </button>
            </div>
          )}
      </section>

      <aside className="ev-summary">
        <div className="ev-panel-title">
          <small>STORAGE SUMMARY</small>
          <h2>Shift Overview</h2>
        </div>

        <div className="ev-summary-inner">
          {(
            [
              ['Available', totals.available, 'available'],
              ['Occupied', totals.occupied, 'occupied'],
              ['Reserved', 0, 'reserved'],
              ['Post-event', totals.postEvent, 'post'],
            ] as const
          ).map(([label, value, kind]) => (
            <div className={`ev-metric ${kind}`} key={label}>
              <div>
                <span>{label}</span>
                <strong>{value}</strong>
              </div>

              <div className="ev-track">
                <i
                  style={{
                    width: `${(value / 96) * 100}%`,
                  }}
                />
              </div>
            </div>
          ))}

          <div className="ev-warning">
            <h3>
              <ShieldAlert size={15} />
              Weight Exceptions
            </h3>

            <p>
              L1-R3-S1 <strong>88.0 kg</strong>
            </p>

            <p>
              L1-R3-S2 <strong>67.0 kg</strong>
            </p>
          </div>

          <div className="ev-log">
            <h3>RECENT LOG</h3>

            {activity.slice(0, 3).map((entry, index) => (
              <p key={index}>{entry}</p>
            ))}
          </div>

          <p className="ev-demo-label">
            DEMO DATA · NOT CONNECTED TO EQUIPMENT
          </p>
        </div>
      </aside>

      {retrieveDialog && selected && selectedPallet && (
        <div
          className="ev-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setRetrieveDialog(false)
            }
          }}
        >
          <section
            className="ev-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Demo retrieval confirmation"
          >
            <header>
              <h2>Retrieve to Venue — Demo</h2>

              <button
                type="button"
                aria-label="Close"
                onClick={() => setRetrieveDialog(false)}
              >
                <X size={20} />
              </button>
            </header>

            <div className="ev-modal-body">
              <p>
                Simulate retrieval of{' '}
                <strong>{selectedPallet.id}</strong> for{' '}
                <strong>{selected.title}</strong>?
              </p>

              <p>
                No equipment command will be sent.
              </p>

              <div className="ev-modal-actions">
                <button
                  type="button"
                  onClick={() => setRetrieveDialog(false)}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="ev-confirm"
                  onClick={confirmRetrieval}
                >
                  Confirm Demo
                </button>
              </div>
            </div>
          </section>
        </div>
      )}

      {pinDialog && (
        <div
          className="ev-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setPinDialog(false)
            }
          }}
        >
          <section
            className="ev-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Simulated retrieval lock"
          >
            <header>
              <h2>
                {isLocked
                  ? 'Unlock Retrieval'
                  : 'Lock Retrieval'}
              </h2>

              <button
                type="button"
                aria-label="Close"
                onClick={() => setPinDialog(false)}
              >
                <X size={20} />
              </button>
            </header>

            <div className="ev-modal-body">
              <p>
                This is a simulated lock for UI testing.
                It does not authorize or prevent real
                machine operations.
              </p>

              <label htmlFor="ev-demo-pin">
                Demo confirmation (any four digits)
              </label>

              <input
                id="ev-demo-pin"
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={pin}
                onChange={(event) => {
                  setPin(
                    event.target.value.replace(/\D/g, ''),
                  )
                  setPinError('')
                }}
                placeholder="Enter 4 digits"
              />

              <div className="ev-keypad">
                {[
                  '1', '2', '3',
                  '4', '5', '6',
                  '7', '8', '9',
                  '⌫', '0', '✓',
                ].map((key) => (
                  <button
                    type="button"
                    key={key}
                    onClick={() => {
                      if (key === '⌫') {
                        setPin((value) => value.slice(0, -1))
                      } else if (key === '✓') {
                        confirmLock()
                      } else {
                        setPin((value) =>
                          (value + key).slice(0, 4),
                        )
                      }
                    }}
                  >
                    {key}
                  </button>
                ))}
              </div>

              {pinError && (
                <p className="ev-pin-error">
                  {pinError}
                </p>
              )}

              <div className="ev-modal-actions">
                <button
                  type="button"
                  onClick={() => setPinDialog(false)}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="ev-confirm"
                  onClick={confirmLock}
                >
                  <Check size={16} />
                  {isLocked
                    ? 'Unlock (Demo)'
                    : 'Lock (Demo)'}
                </button>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
