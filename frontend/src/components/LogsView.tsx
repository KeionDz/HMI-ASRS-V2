import { Fragment, useEffect, useMemo, useState } from 'react'
import { Activity, FileJson2, FileSpreadsheet, Radio, X } from 'lucide-react'

import './LogsView.css'

type LogLevel = 'debug' | 'info' | 'warn' | 'error'
type LogCategory = 'audit' | 'process' | 'device' | 'ingestion' | 'system'
type LogEntry = {
  id: string
  timestamp: string
  level: LogLevel
  category: LogCategory
  source: string
  actor: string
  message: string
  details: Record<string, unknown>
}

type LogsViewProps = {
  onClose: () => void
}

const levels: LogLevel[] = ['debug', 'info', 'warn', 'error']
const categories: LogCategory[] = ['audit', 'process', 'device', 'ingestion', 'system']

function localDateInput(date: Date) {
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return offsetDate.toISOString().slice(0, 10)
}

function createMockLogs(): LogEntry[] {
  const now = Date.now()
  const entry = (
    id: string,
    daysAgo: number,
    level: LogLevel,
    category: LogCategory,
    source: string,
    actor: string,
    message: string,
    details: Record<string, unknown>,
  ): LogEntry => ({
    id,
    timestamp: new Date(now - daysAgo * 86_400_000).toISOString(),
    level,
    category,
    source,
    actor,
    message,
    details,
  })

  return [
    entry('LOG-012', 0, 'info', 'system', 'HMI', 'system', 'Operator console initialized; all services responding.', { services: ['asrs-api', 'asset-gateway', 'camera-proxy'], startupMs: 842 }),
    entry('LOG-011', 0, 'debug', 'device', 'ASRS PLC', 'system', 'Heartbeat received from controller.', { controllerId: 'PLC-ASRS-01', sequence: 184203, latencyMs: 18 }),
    entry('LOG-010', 1, 'warn', 'ingestion', 'Asset Gateway', 'ingestion-worker', 'Asset signal confidence below configured threshold.', { assetId: 'AST-2048', observedConfidence: 0.58, configuredThreshold: 0.65 }),
    entry('LOG-009', 2, 'error', 'process', 'Pallet Service', 'scheduler', 'Pallet retrieval request timed out; request remains queued.', { requestId: 'RET-2026-041', palletId: 'PLT-L2-R04-S08', retryCount: 3, error: 'Controller response timeout after 5000ms' }),
    entry('LOG-008', 4, 'info', 'audit', 'Admin Console', 'operator.mlee', 'Updated the asset tracking threshold.', { previousValue: 60, newValue: 65, changeId: 'CFG-00182' }),
    entry('LOG-007', 8, 'debug', 'ingestion', 'Event Connector', 'ingestion-worker', 'Inbound event payload validated.', { eventId: 'EVT-4821', fieldsValidated: 14 }),
    entry('LOG-006', 13, 'warn', 'device', 'Camera Gateway', 'system', 'Camera feed reconnecting after packet loss.', { cameraId: 'CAM-04', packetLossPercent: 8.4, retryInSeconds: 10 }),
    entry('LOG-005', 21, 'error', 'system', 'Database Monitor', 'health-check', 'Readiness check failed on first attempt.', { check: 'database-readiness', durationMs: 3000, recovered: true }),
    entry('LOG-004', 32, 'info', 'process', 'Schedule Engine', 'scheduler', 'Event checklist generated from the default template.', { eventId: 'EVT-4809', eventType: 'Gala', itemCount: 12 }),
    entry('LOG-003', 46, 'debug', 'audit', 'Admin Console', 'operator.jtan', 'Viewed the storage configuration page.', { section: 'storage-configuration', sessionId: 'SES-83b0' }),
    entry('LOG-002', 68, 'warn', 'system', 'ASRS PLC', 'system', 'Controller clock drift exceeded the advisory limit.', { driftMs: 1240, limitMs: 1000 }),
    entry('LOG-001', 88, 'error', 'ingestion', 'Event Connector', 'ingestion-worker', 'Event import rejected due to invalid date value.', {
      eventId: 'EVT-4760',
      field: 'scheduledAt',
      receivedValue: '2026-02-31T18:00:00+08:00',
      validationErrors: [
        { code: 'DATE_OUT_OF_RANGE', path: 'scheduledAt', message: 'Date must be a valid calendar date.' },
        { code: 'IMPORT_REJECTED', path: 'event', message: 'No event record was created.' },
      ],
      sourcePayload: {
        externalSystem: 'ParkRoyal Event Planner',
        receivedAt: '2026-07-31T11:24:08.331Z',
        venue: { id: 'BALLROOM-A', name: 'Grand Ballroom A', floor: 3 },
        equipment: ['banquet-table', 'stacking-chair', 'stage-riser'],
        retryable: false,
      },
    }),
  ]
}

function formatLogDate(timestamp: string) {
  const date = new Date(timestamp)
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getFullYear()).slice(-2)}`
}

function escapeCsv(value: string) {
  return `"${value.replaceAll('"', '""')}"`
}

function downloadFile(filename: string, content: string, mimeType: string) {
  const url = URL.createObjectURL(new Blob([content], { type: mimeType }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function LogsView({ onClose }: LogsViewProps) {
  const [entries, setEntries] = useState(createMockLogs)
  const [fromDate, setFromDate] = useState(() => localDateInput(new Date(Date.now() - 90 * 86_400_000)))
  const [toDate, setToDate] = useState(() => localDateInput(new Date()))
  const [level, setLevel] = useState('all')
  const [category, setCategory] = useState('all')
  const [source, setSource] = useState('all')
  const [search, setSearch] = useState('')
  const [isLive, setIsLive] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    if (!isLive) return
    const timer = window.setInterval(() => {
      const timestamp = new Date().toISOString()
      setEntries((currentEntries) => [
        {
          id: `LIVE-${Date.now()}`,
          timestamp,
          level: 'info',
          category: 'system',
          source: 'HMI Simulator',
          actor: 'simulation',
          message: 'Live simulation heartbeat received.',
          details: { simulator: 'HMI-SIM-01', timestamp, status: 'healthy' },
        },
        ...currentEntries,
      ])
    }, 15_000)
    return () => window.clearInterval(timer)
  }, [isLive])

  const sources = useMemo(() => [...new Set(entries.map((entry) => entry.source))].sort(), [entries])
  const filteredEntries = useMemo(() => {
    const start = fromDate ? new Date(`${fromDate}T00:00:00`).getTime() : Number.NEGATIVE_INFINITY
    const end = toDate ? new Date(`${toDate}T23:59:59.999`).getTime() : Number.POSITIVE_INFINITY
    const query = search.trim().toLowerCase()

    return entries
      .filter((entry) => {
        const time = new Date(entry.timestamp).getTime()
        if (time < start || time > end) return false
        if (level !== 'all' && entry.level !== level) return false
        if (category !== 'all' && entry.category !== category) return false
        if (source !== 'all' && entry.source !== source) return false
        if (query && !`${entry.message} ${entry.source} ${entry.actor} ${entry.category} ${JSON.stringify(entry.details)}`.toLowerCase().includes(query)) return false
        return true
      })
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  }, [entries, fromDate, toDate, level, category, source, search])

  const exportCsv = () => {
    const headers = ['time', 'level', 'category', 'source', 'actor', 'message', 'details']
    const rows = filteredEntries.map((entry) => [
      entry.timestamp,
      entry.level,
      entry.category,
      entry.source,
      entry.actor,
      entry.message,
      JSON.stringify(entry.details),
    ])
    downloadFile(
      'hmi-logs.csv',
      [headers, ...rows].map((row) => row.map((field) => escapeCsv(String(field))).join(',')).join('\r\n'),
      'text/csv;charset=utf-8',
    )
  }

  const exportJson = () => {
    downloadFile('hmi-logs.json', JSON.stringify(filteredEntries, null, 2), 'application/json;charset=utf-8')
  }

  return (
    <section className="logs-screen" aria-labelledby="logs-title">
      <header className="logs-page-heading">
        <div>
          <span className="logs-eyebrow"><Activity size={14} /> OPERATIONS MONITOR</span>
          <h1 id="logs-title">Logs &amp; Debug</h1>
          <p>System, device, ingestion, process, and audit activity.</p>
        </div>
        <div className="logs-heading-actions">
          <button
            type="button"
            className={`logs-live-button${isLive ? ' is-live' : ''}`}
            onClick={() => setIsLive((live) => !live)}
            aria-pressed={isLive}
          >
            <Radio size={17} /> {isLive ? 'Live on' : 'Live off'}
          </button>
          <button className="logs-close" type="button" onClick={onClose} aria-label="Close logs">
            <X size={20} /><span>Close</span>
          </button>
        </div>
      </header>

      <section className="logs-filter-panel" aria-label="Log filters">
        <label className="logs-filter-date">
          <span>Date from</span>
          <input type="date" value={fromDate} max={toDate || undefined} onChange={(event) => setFromDate(event.target.value)} />
        </label>
        <label className="logs-filter-date">
          <span>Date to</span>
          <input type="date" value={toDate} min={fromDate || undefined} onChange={(event) => setToDate(event.target.value)} />
        </label>
        <label>
          <span>Level</span>
          <select value={level} onChange={(event) => setLevel(event.target.value)}>
            <option value="all">All levels</option>
            {levels.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <label>
          <span>Category</span>
          <select value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="all">All categories</option>
            {categories.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <label>
          <span>Source</span>
          <select value={source} onChange={(event) => setSource(event.target.value)}>
            <option value="all">All sources</option>
            {sources.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <label className="logs-search">
          <span>Search</span>
          <input
            type="search"
            placeholder="Message, actor, details..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <div className="logs-export">
          <span>Export filtered</span>
          <div>
            <button type="button" onClick={exportCsv}><FileSpreadsheet size={16} /> CSV</button>
            <button type="button" onClick={exportJson}><FileJson2 size={16} /> JSON</button>
          </div>
        </div>
      </section>

      <div className="logs-table-summary">
        <span><strong>{filteredEntries.length}</strong> entries</span>
        <span className="logs-newest-label"><i /> Newest first</span>
      </div>

      <div className="logs-table-scroll">
        <table className="logs-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Level</th>
              <th>Category</th>
              <th>Source</th>
              <th>Actor</th>
              <th>Message</th>
              <th aria-label="Details" />
            </tr>
          </thead>
          <tbody>
            {filteredEntries.map((entry) => (
              <Fragment key={entry.id}>
                <tr
                  className={`logs-entry-row${expandedId === entry.id ? ' is-expanded' : ''}`}
                  onClick={() => setExpandedId((current) => current === entry.id ? null : entry.id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      setExpandedId((current) => current === entry.id ? null : entry.id)
                    }
                  }}
                  tabIndex={0}
                  aria-expanded={expandedId === entry.id}
                >
                  <td><time dateTime={entry.timestamp}>{formatLogDate(entry.timestamp)}<small>{new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}</small></time></td>
                  <td><span className={`logs-level level-${entry.level}`}>{entry.level}</span></td>
                  <td><span className="logs-category">{entry.category}</span></td>
                  <td className="logs-source">{entry.source}</td>
                  <td className="logs-actor">{entry.actor}</td>
                  <td className="logs-message">{entry.message}</td>
                  <td><span className={`logs-expand${expandedId === entry.id ? ' opened' : ''}`} aria-hidden="true">⌄</span></td>
                </tr>
                {expandedId === entry.id && (
                  <tr className="logs-details-row">
                    <td colSpan={7}>
                      <div className="logs-details-heading">DETAILS PAYLOAD <span>{entry.id}</span></div>
                      <pre>{JSON.stringify(entry.details, null, 2)}</pre>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
        {filteredEntries.length === 0 && (
          <div className="logs-empty-state">
            <Activity size={26} />
            <strong>No log entries found</strong>
            <span>Try adjusting the date range or filters.</span>
          </div>
        )}
      </div>
    </section>
  )
}

export default LogsView
