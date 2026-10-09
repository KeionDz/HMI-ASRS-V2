
import { useEffect, useState } from 'react'
import {
  Activity,
  Archive,
  Box,
  Boxes,
  Camera,
  ChevronDown,
  ChevronRight,
  Clock3,
  Layers3,
  Moon,
  Settings,
  Sun,
  Wifi,
  X,
  Zap,
} from 'lucide-react'

import AgvView from './components/AgvView'
import AssetsView from './components/AssetsView'
import EventsView from './components/EventsView'
import StorageView from './components/StorageView'

import mheLogoDark from './logos/mhe-logo-darkmode.png'
import mheLogoLight from './logos/mhe-logo-lightmode.png'
import ewaLogo from './logos/ewa-no-bg.png'

import './App.css'

const events = [
  {
    day: '1',
    month: 'OCT',
    title: 'GE Customer Innovation Days',
    time: '08:00',
    room: 'Ballroom A',
  },
  {
    day: '5',
    month: 'OCT',
    title: 'Northeast AI Conference',
    time: '09:00',
    room: 'Ballroom B',
  },
  {
    day: '3',
    month: 'NOV',
    title: 'Platinum Industries Annual Meeting',
    time: '18:00',
    room: 'Ballroom A',
  },
  {
    day: '10',
    month: 'NOV',
    title: 'Fiat Panda Incentive Group and Awards',
    time: '07:00',
    room: 'Ballroom A',
  },
  {
    day: '10',
    month: 'NOV',
    title: 'Stable Flooring Conference',
    time: '07:00',
    room: 'Ballroom B',
  },
  {
    day: '14',
    month: 'NOV',
    title: 'Regional Logistics Summit',
    time: '10:30',
    room: 'Grand Hall',
  },
  {
    day: '18',
    month: 'NOV',
    title: 'ParkRoyal Partner Showcase',
    time: '13:00',
    room: 'Ballroom C',
  },
]

const navigation = [
  { label: 'Events', icon: Activity },
  { label: 'Storage', icon: Box },
  { label: 'Scissor Lift', icon: Layers3 },
  { label: 'AGV', icon: Zap },
  { label: 'Assets', icon: Wifi },
  { label: 'Schedule', icon: Clock3 },
]

const sectionCopy: Record<
  string,
  { title: string; description: string }
> = {
  Events: {
    title: 'Select an Event',
    description:
      'Choose an event from the list to review equipment, assign pallets, and arrange delivery.',
  },
  Storage: {
    title: 'Storage Overview',
    description:
      'Live pallet locations and available rack positions will appear here.',
  },
  'Scissor Lift': {
    title: 'Scissor Lift',
    description:
      'Lift status, assignment, and service information will appear here.',
  },
  AGV: {
    title: 'AGV Fleet',
    description:
      'Vehicle availability, routes, and task progress will appear here.',
  },
  Assets: {
    title: 'Asset Monitor',
    description:
      'Connected equipment and asset health will appear here.',
  },
  Schedule: {
    title: 'Operations Schedule',
    description:
      'Upcoming warehouse movements and delivery windows will appear here.',
  },
}

const cameraFeeds = [
  'Hallway',
  'Storeroom L1',
  'Storeroom L2',
  'Ballroom',
]

const shiftActivity = [
  {
    time: '10:13:46',
    message: 'Event sync complete. Schedule up to date.',
    failed: false,
  },
  {
    time: '10:13:09',
    message: 'Event sync complete. Schedule up to date.',
    failed: false,
  },
  {
    time: '10:11:32',
    message: 'Event sync FAILED - showing last known schedule.',
    failed: true,
  },
  {
    time: '10:10:46',
    message: 'Event sync complete. Schedule up to date.',
    failed: false,
  },
  {
    time: '10:10:01',
    message: 'Event sync complete. Schedule up to date.',
    failed: false,
  },
  {
    time: '10:09:16',
    message: 'Event sync complete. Schedule up to date.',
    failed: false,
  },
  {
    time: '10:08:31',
    message: 'Event sync FAILED - showing last known schedule.',
    failed: true,
  },
  {
    time: '10:07:46',
    message: 'Event sync complete. Schedule up to date.',
    failed: false,
  },
  {
    time: '10:06:12',
    message: 'Asset gateway connection restored.',
    failed: false,
  },
]

function App() {
  const [clockTime, setClockTime] = useState(() => new Date())
  const [activeSection, setActiveSection] = useState('Events')
  const [selectedEvent, setSelectedEvent] = useState<
    (typeof events)[number] | null
  >(null)
  const [dialog, setDialog] = useState('')
  const [isDayMode, setIsDayMode] = useState(false)

  const currentContent = sectionCopy[activeSection]

  useEffect(() => {
    const timer = window.setInterval(() => {
      setClockTime(new Date())
    }, 1000)

    return () => window.clearInterval(timer)
  }, [])

  const clockFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })

  const dateFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })

  return (
    <main className={`dashboard${isDayMode ? ' day-mode' : ''}`}>
      {/* HEADER */}
      <header className="topbar">
        <div className="brand">
          <img
            className="brand-mark"
            src={isDayMode ? mheLogoLight : mheLogoDark}
            alt="MHE, a Jebsen & Jessen brand"
          />

          <span className="brand-copy">
            <strong>Hotel ASRS HMI</strong>
            <small>ParkRoyal Collection · Logistics Control</small>
          </span>
        </div>

        <div
          className="system-links"
          aria-label="System connectivity"
        >
          <span>
            <i /> ASRS <b>Online</b>
          </span>
          <span>
            <i /> Scissor Lift <b>Online</b>
          </span>
          <span>
            <i /> AGV <b>Online</b>
          </span>
        </div>

        <div className="top-actions">
          <div className="clock">
            <strong>{clockFormatter.format(clockTime)}</strong>
            <small>
              {dateFormatter.format(clockTime)} · UTC+8
            </small>
          </div>

          <button
            className="icon-button"
            type="button"
            onClick={() => setIsDayMode((mode) => !mode)}
            aria-label="Toggle display theme"
            title="Toggle display theme"
          >
            {isDayMode ? <Moon size={16} /> : <Sun size={16} />}
          </button>

          <button
            className="icon-button"
            type="button"
            onClick={() => setDialog('System Settings')}
            aria-label="System settings"
            title="System settings"
          >
            <Settings size={16} />
          </button>

          <button
            className="icon-button"
            type="button"
            onClick={() => setDialog('User Menu')}
            aria-label="Open user menu"
            title="User menu"
          >
            <ChevronDown size={16} />
          </button>
        </div>
      </header>

      {/* MAIN NAVIGATION */}
      <nav
        className="main-nav"
        aria-label="Main navigation"
      >
        {navigation.map(({ label, icon: Icon }) => (
          <button
            className={`nav-button${
              activeSection === label ? ' active' : ''
            }`}
            type="button"
            key={label}
            onClick={() => {
              setActiveSection(label)
              setSelectedEvent(null)
            }}
          >
            <Icon size={16} strokeWidth={2.2} />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      {/* ASSETS VIEW */}
      <div
        className="screen-host"
        hidden={activeSection !== 'Assets'}
      >
        <AssetsView />
      </div>

      {/* AGV VIEW */}
      <div
        className="screen-host"
        hidden={activeSection !== 'AGV'}
      >
        <AgvView />
      </div>

      {/* EVENTS VIEW - NEW */}
      <div
        className="screen-host"
        hidden={activeSection !== 'Events'}
      >
        <EventsView />
      </div>

      <div className="screen-host" hidden={activeSection !== 'Storage'}>
        <StorageView />
      </div>

      {/* EXISTING WORKSPACE FOR OTHER SECTIONS */}
      {activeSection !== 'Assets' &&
        activeSection !== 'AGV' &&
        activeSection !== 'Events' &&
        activeSection !== 'Storage' && (
          <section className="workspace">
            {/* EVENT SIDEBAR */}
            <aside className="event-rail">
              <div className="panel-heading">
                <span className="eyebrow">NEXT 14 DAYS</span>
                <h1>Upcoming Events</h1>
              </div>

              <div className="event-list">
                {events.map((event) => (
                  <button
                    className={`event-item${
                      selectedEvent?.title === event.title
                        ? ' selected'
                        : ''
                    }`}
                    type="button"
                    key={event.title}
                    onClick={() => {
                      setActiveSection('Events')
                      setSelectedEvent(event)
                    }}
                  >
                    <span className="date-tile">
                      <strong>{event.day}</strong>
                      <small>{event.month}</small>
                    </span>

                    <span className="event-details">
                      <strong className="event-name">
                        {event.title}
                      </strong>

                      <span>
                        {event.time} · {event.room}
                      </span>

                      <span className="event-meta">
                        <b>SCHEDULED</b>
                        <small>0p</small>
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </aside>

            {/* MAIN STAGE */}
            <section
              className="main-stage"
              aria-live="polite"
            >
              {selectedEvent && activeSection === 'Events' ? (
                <div className="event-focus">
                  <div className="stage-icon">
                    <Archive size={31} />
                  </div>

                  <span className="eyebrow">
                    EVENT WORKSPACE · {selectedEvent.day}{' '}
                    {selectedEvent.month}
                  </span>

                  <h2>{selectedEvent.title}</h2>

                  <p>
                    {selectedEvent.time} · {selectedEvent.room}
                  </p>

                  <div className="event-workflow">
                    <button
                      type="button"
                      onClick={() => setDialog('Pallet Review')}
                    >
                      <span>01</span>
                      Review pallets
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setDialog('Equipment Assignment')
                      }
                    >
                      <span>02</span>
                      Assign equipment
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setDialog('Delivery Arrangement')
                      }
                    >
                      <span>03</span>
                      Arrange delivery
                    </button>
                  </div>
                </div>
              ) : (
                <div className="empty-state">
                  <div className="stage-icon">
                    <Boxes size={31} />
                  </div>

                  <h2>{currentContent.title}</h2>
                  <p>{currentContent.description}</p>

                  {activeSection === 'Events' && (
                    <div className="workflow-hints">
                      <span>1 Select event</span>
                      <span>2 Review pallets</span>
                      <span>3 Retrieve to venue</span>
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* STORAGE SUMMARY */}
            <aside className="summary-rail">
              <div className="panel-heading">
                <span className="eyebrow">
                  STORAGE SUMMARY
                </span>
                <h2>Shift Overview</h2>
              </div>

              <div className="summary-content">
                <div className="metric-card available">
                  <div>
                    <span>Available</span>
                    <strong>96</strong>
                  </div>
                  <i>
                    <b />
                  </i>
                </div>

                <div className="metric-card occupied">
                  <div>
                    <span>Occupied</span>
                    <strong>0</strong>
                  </div>
                  <i>
                    <b />
                  </i>
                </div>

                <div className="metric-card reserved">
                  <div>
                    <span>Reserved</span>
                    <strong>0</strong>
                  </div>
                  <i>
                    <b />
                  </i>
                </div>

                <div className="metric-card post-event">
                  <div>
                    <span>Post-event</span>
                    <strong>0</strong>
                  </div>
                  <i>
                    <b />
                  </i>
                </div>

                <section className="recent-log">
                  <div className="recent-heading">
                    <strong>RECENT LOG</strong>
                    <button
                      type="button"
                      onClick={() => setDialog('Shift Log')}
                    >
                      View all (6)
                    </button>
                  </div>

                  <div className="log-entry">
                    <small>08:59:38</small>
                    <span>
                      Event sync complete. Schedule up to date.
                    </span>
                  </div>
                </section>
              </div>
            </aside>
          </section>
        )}

      {/* FOOTER */}
      <footer className="status-footer">
        <div className="status-main">
          <div className="facility-status">
            <i />
            <span>
              <small>SYSTEM STATUS</small>
              <strong>Facility Operational</strong>
            </span>
          </div>

          <div className="footer-metric available">
            <strong>96</strong>
            <span>Available</span>
          </div>

          <div className="footer-metric">
            <strong>0</strong>
            <span>Occupied</span>
          </div>

          <div className="footer-metric">
            <strong>0</strong>
            <span>Reserved</span>
          </div>

          <div className="footer-metric">
            <strong>0</strong>
            <span>Alerts</span>
          </div>

          <button
            className={`footer-action${
              dialog === 'Cameras' ? ' selected' : ''
            }`}
            type="button"
            onClick={() => setDialog('Cameras')}
          >
            <Camera size={15} />
            <span>Cameras</span>
            <small>4</small>
          </button>

          <button
            className={`footer-action${
              dialog === 'Shift Log' ? ' selected' : ''
            }`}
            type="button"
            onClick={() => setDialog('Shift Log')}
          >
            <Activity size={15} />
            <span>Shift Log</span>
            <small>31</small>
          </button>
        </div>

        <div className="footer-brand">
          <img
            className="footer-brand-logo"
            src={ewaLogo}
            alt="Eastwerks Automation logo"
          />
        </div>
      </footer>

      {/* DIALOGS */}
      {dialog && (
        <div
          className={`dialog-backdrop${
            dialog === 'Cameras' ? ' camera-backdrop' : ''
          }${
            dialog === 'Shift Log' ? ' activity-backdrop' : ''
          }`}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setDialog('')
            }
          }}
        >
          {dialog === 'Shift Log' ? (
            <section
              className="activity-panel"
              role="dialog"
              aria-modal="true"
              aria-labelledby="activity-title"
            >
              <header className="activity-heading">
                <h2 id="activity-title">Shift Activity</h2>

                <button
                  className="activity-close"
                  type="button"
                  onClick={() => setDialog('')}
                  aria-label="Close shift activity"
                >
                  <X size={20} />
                </button>
              </header>

              <div className="activity-list">
                {shiftActivity.map((entry) => (
                  <article
                    className={`activity-entry${
                      entry.failed ? ' failed' : ''
                    }`}
                    key={`${entry.time}-${entry.message}`}
                  >
                    <time>{entry.time}</time>
                    <p>{entry.message}</p>
                  </article>
                ))}
              </div>
            </section>
          ) : dialog === 'Cameras' ? (
            <section
              className="cctv-panel"
              role="dialog"
              aria-modal="true"
              aria-labelledby="cctv-title"
            >
              <header className="cctv-heading">
                <div className="cctv-title">
                  <Camera size={18} />
                  <h2 id="cctv-title">CCTV Feeds</h2>
                  <span>SIMULATED</span>
                </div>

                <button
                  className="cctv-close"
                  type="button"
                  onClick={() => setDialog('')}
                  aria-label="Close CCTV feeds"
                >
                  <X size={20} />
                </button>
              </header>

              <div className="cctv-grid">
                {cameraFeeds.map((feed) => (
                  <article
                    className="cctv-feed"
                    key={feed}
                    aria-label={`${feed} camera feed, no signal`}
                  >
                    <div className="feed-topline">
                      <span>
                        <i /> REC
                      </span>
                      <time>18:18:53</time>
                    </div>

                    <div className="feed-no-signal">
                      <Camera size={26} />
                      <span>NO SIGNAL</span>
                    </div>

                    <div className="feed-bottomline">
                      <span>{feed}</span>
                      <small>SIMULATED</small>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ) : (
            <section
              className="dialog-panel"
              role="dialog"
              aria-modal="true"
              aria-labelledby="dialog-title"
            >
              <div className="dialog-heading">
                <div>
                  <span className="eyebrow">
                    HOTEL ASRS HMI
                  </span>
                  <h2 id="dialog-title">{dialog}</h2>
                </div>

                <button
                  className="icon-button"
                  type="button"
                  onClick={() => setDialog('')}
                  aria-label="Close"
                >
                  <X size={16} />
                </button>
              </div>

              <p className="dialog-placeholder">
                Placeholder panel · Live{' '}
                {dialog.toLowerCase()} data and controls
                will be connected here.
              </p>

              <button
                className="dialog-close"
                type="button"
                onClick={() => setDialog('')}
              >
                Close panel
                <ChevronRight size={14} />
              </button>
            </section>
          )}
        </div>
      )}
    </main>
  )
}

export default App
