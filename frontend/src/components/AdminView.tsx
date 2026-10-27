import { useState } from 'react'
import { Archive, Box, Plus, Settings2, Trash2, X } from 'lucide-react'

import './AdminView.css'

type AdminViewProps = {
  onClose: () => void
}

const initialEventTypes = ['Corporate', 'Gala', 'Wedding']
const initialItems = [
  'Banquet table',
  'Stacking chair',
  'Stage riser',
  'AV equipment',
  'Linen cart',
]

function AdminView({ onClose }: AdminViewProps) {
  const [eventTypes, setEventTypes] = useState(initialEventTypes)
  const [items, setItems] = useState(initialItems)
  const [checklists, setChecklists] = useState<Record<string, string[]>>({
    Corporate: ['Banquet table', 'Stacking chair', 'AV equipment'],
    Gala: ['Banquet table', 'Stacking chair', 'Linen cart'],
    Wedding: ['Stacking chair', 'Stage riser', 'Linen cart'],
  })
  const [eventTypeInput, setEventTypeInput] = useState('')
  const [itemInput, setItemInput] = useState('')
  const [storage, setStorage] = useState({
    levels: 3,
    palletsPerLevel: 32,
    cameras: 4,
    trackingThreshold: 65,
  })

  const addEventType = () => {
    const name = eventTypeInput.trim()
    if (!name || eventTypes.some((type) => type.toLowerCase() === name.toLowerCase())) return
    setEventTypes((types) => [...types, name])
    setChecklists((templates) => ({ ...templates, [name]: [] }))
    setEventTypeInput('')
  }

  const addItem = () => {
    const name = itemInput.trim()
    if (!name || items.some((item) => item.toLowerCase() === name.toLowerCase())) return
    setItems((currentItems) => [...currentItems, name])
    setItemInput('')
  }

  const removeItem = (itemToRemove: string) => {
    setItems((currentItems) => currentItems.filter((item) => item !== itemToRemove))
    setChecklists((templates) =>
      Object.fromEntries(
        Object.entries(templates).map(([type, template]) => [
          type,
          template.filter((item) => item !== itemToRemove),
        ]),
      ),
    )
  }

  const toggleChecklistItem = (eventType: string, item: string) => {
    setChecklists((templates) => {
      const currentItems = templates[eventType] ?? []
      return {
        ...templates,
        [eventType]: currentItems.includes(item)
          ? currentItems.filter((selectedItem) => selectedItem !== item)
          : [...currentItems, item],
      }
    })
  }

  return (
    <section className="admin-screen" aria-labelledby="admin-title">
      <header className="admin-page-heading">
        <div className="admin-title-copy">
          <span className="admin-eyebrow"><Settings2 size={14} /> SYSTEM CONFIGURATION</span>
          <h1 id="admin-title">Admin</h1>
          <p>Manage event templates, inventory, and facility settings.</p>
        </div>
        <button className="admin-close" type="button" onClick={onClose} aria-label="Close admin">
          <X size={20} />
          <span>Close</span>
        </button>
      </header>

      <div className="admin-content">
        <section className="admin-card">
          <div className="admin-card-heading">
            <span className="admin-card-icon"><Archive size={19} /></span>
            <div>
              <h2>Event types</h2>
              <p>Event types define the checklist template used during planning.</p>
            </div>
          </div>
          <form
            className="admin-add-row"
            onSubmit={(event) => {
              event.preventDefault()
              addEventType()
            }}
          >
            <input
              aria-label="New event type"
              placeholder="Add an event type"
              value={eventTypeInput}
              onChange={(event) => setEventTypeInput(event.target.value)}
            />
            <button type="submit" className="admin-primary-button"><Plus size={17} /> Add type</button>
          </form>
          <div className="admin-type-list">
            {eventTypes.map((type) => (
              <div className="admin-type-row" key={type}>
                <span><i />{type}</span>
                <button
                  type="button"
                  className="admin-remove-button"
                  aria-label={`Remove ${type} event type`}
                  onClick={() => {
                    setEventTypes((types) => types.filter((existingType) => existingType !== type))
                    setChecklists((templates) => {
                      const { [type]: removed, ...remaining } = templates
                      void removed
                      return remaining
                    })
                  }}
                >
                  <Trash2 size={16} /><span>Remove</span>
                </button>
              </div>
            ))}
            {eventTypes.length === 0 && <p className="admin-empty">No event types configured.</p>}
          </div>
        </section>

        <section className="admin-card">
          <div className="admin-card-heading">
            <span className="admin-card-icon"><Box size={19} /></span>
            <div>
              <h2>Inventory items</h2>
              <p>Items can be included in one or more event checklists.</p>
            </div>
          </div>
          <form
            className="admin-add-row"
            onSubmit={(event) => {
              event.preventDefault()
              addItem()
            }}
          >
            <input
              aria-label="New inventory item"
              placeholder="Add an inventory item"
              value={itemInput}
              onChange={(event) => setItemInput(event.target.value)}
            />
            <button type="submit" className="admin-primary-button"><Plus size={17} /> Add item</button>
          </form>
          <div className="admin-item-list">
            {items.map((item) => (
              <div className="admin-item-chip" key={item}>
                <span>{item}</span>
                <button
                  type="button"
                  aria-label={`Remove ${item}`}
                  onClick={() => removeItem(item)}
                >
                  <X size={15} />
                </button>
              </div>
            ))}
            {items.length === 0 && <p className="admin-empty">No inventory items configured.</p>}
          </div>
        </section>

        <section className="admin-card admin-template-card">
          <div className="admin-card-heading">
            <span className="admin-card-icon"><Archive size={19} /></span>
            <div>
              <h2>Default checklist templates</h2>
              <p>Choose the items automatically added for each event type.</p>
            </div>
          </div>
          {eventTypes.length > 0 && items.length > 0 ? (
            <div className="admin-template-list">
              {eventTypes.map((type) => (
                <fieldset className="admin-template" key={type}>
                  <legend>{type}</legend>
                  <div className="admin-checkbox-grid">
                    {items.map((item) => (
                      <label key={item}>
                        <input
                          type="checkbox"
                          checked={(checklists[type] ?? []).includes(item)}
                          onChange={() => toggleChecklistItem(type, item)}
                        />
                        <span>{item}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              ))}
            </div>
          ) : (
            <p className="admin-empty">Add an event type and inventory item to create a template.</p>
          )}
        </section>

        <section className="admin-card admin-storage-card">
          <div className="admin-card-heading">
            <span className="admin-card-icon"><Settings2 size={19} /></span>
            <div>
              <h2>Storage configuration</h2>
              <p>Set facility capacity and the asset tracking alert threshold.</p>
            </div>
          </div>
          <div className="admin-config-grid">
            <label>
              <span>Storage levels</span>
              <div className="admin-number-control">
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={storage.levels}
                  onChange={(event) => setStorage({ ...storage, levels: Number(event.target.value) })}
                />
                <small>levels</small>
              </div>
            </label>
            <label>
              <span>Pallets per level</span>
              <div className="admin-number-control">
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={storage.palletsPerLevel}
                  onChange={(event) => setStorage({ ...storage, palletsPerLevel: Number(event.target.value) })}
                />
                <small>pallets</small>
              </div>
            </label>
            <label>
              <span>Camera feeds</span>
              <div className="admin-number-control">
                <input
                  type="number"
                  min="0"
                  max="64"
                  value={storage.cameras}
                  onChange={(event) => setStorage({ ...storage, cameras: Number(event.target.value) })}
                />
                <small>cameras</small>
              </div>
            </label>
            <label>
              <span>Asset tracking threshold</span>
              <div className="admin-number-control">
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={storage.trackingThreshold}
                  onChange={(event) => setStorage({ ...storage, trackingThreshold: Number(event.target.value) })}
                />
                <small>% confidence</small>
              </div>
            </label>
          </div>
        </section>
      </div>
    </section>
  )
}

export default AdminView
