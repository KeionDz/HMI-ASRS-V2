import { useState } from 'react'
import { ChevronDown, ChevronUp, Layers3, OctagonAlert, Play, X } from 'lucide-react'

export type LiftLevel = {
  id: number
  name: string
}

export type ScissorLiftData = {
  unitId: string
  mode: string
  online: boolean
  maintenanceDue: boolean
  emergencyStopped: boolean
  currentLevelId: number
  positionLabel: string
  capacityKg: number
  heartbeat: string
  levels: LiftLevel[]
}

type ScissorLiftViewProps = {
  data: ScissorLiftData
  commandPending?: boolean
  movingToLevelId?: number | null
  onMoveToLevel: (levelId: number) => void
  onRunCalibration: () => void
  onEmergencyStop: () => void
  onResume: () => void
}

export default function ScissorLiftView({
  data,
  commandPending = false,
  movingToLevelId = null,
  onMoveToLevel,
  onRunCalibration,
  onEmergencyStop,
  onResume,
}: ScissorLiftViewProps) {
  const [confirmation, setConfirmation] = useState<'stop' | 'resume' | null>(null)
  const highestLevel = Math.max(...data.levels.map((level) => level.id))
  const controlsEnabled = data.online && !data.emergencyStopped && !commandPending
  const canMoveUp = controlsEnabled && data.currentLevelId < highestLevel
  const canMoveDown = controlsEnabled && data.currentLevelId > 0
  const visualLevelId = movingToLevelId ?? data.currentLevelId
  const platformPosition = highestLevel === 0 ? 0 : (visualLevelId / highestLevel) * 100
  const targetLevel = data.levels.find((level) => level.id === movingToLevelId)
  const movingDirection = movingToLevelId !== null && movingToLevelId > data.currentLevelId ? 'up' : 'down'
  const movementLabel = commandPending && targetLevel ? `Moving ${movingDirection} to ${targetLevel.name}…` : null

  const moveToLevel = (levelId: number) => {
    const level = data.levels.find((item) => item.id === levelId)
    if (level) onMoveToLevel(levelId)
  }

  const moveOneLevel = (direction: -1 | 1) => {
    moveToLevel(data.currentLevelId + direction)
  }

  return (
    <section className="lift-workspace" aria-label="Scissor lift controls">
      <section className="lift-stage" aria-live="polite">
        <header className="lift-stage-heading">
          <span className="eyebrow">SCISSOR LIFT · {data.unitId} · {data.mode}</span>
          <h1 className={movementLabel ? 'lift-moving-status' : ''}>{movementLabel ?? `At ${data.positionLabel}`}</h1>
          {data.emergencyStopped
            ? <strong className="lift-emergency-status">Emergency stop active</strong>
            : data.maintenanceDue && <strong>Maintenance due</strong>}
        </header>

        <div className="lift-visual">
          <button
            className="lift-direction lift-up"
            type="button"
            disabled={!canMoveUp}
            onClick={() => moveOneLevel(1)}
            aria-label="Move scissor lift up one level"
          >
            <ChevronUp size={30} strokeWidth={2.2} />
            <span>UP</span>
          </button>

          <div className="lift-shaft" aria-hidden="true">
            <span className={`lift-level-label lift-level-top${data.currentLevelId === highestLevel ? ' current' : ''}`}>STOREROOM <i /></span>
            <div className="shaft-track">
              <span className="shaft-line" />
              <span className={`lift-platform${movementLabel ? ' moving' : ''}`} style={{ bottom: `${platformPosition}%`, transform: `translateY(${platformPosition}%)` }}>
                <Layers3 size={25} />
              </span>
            </div>
            <span className={`lift-level-label lift-level-home${data.currentLevelId === 0 ? ' current' : ''}`}>HOME <i /></span>
          </div>

          <button
            className="lift-direction lift-down"
            type="button"
            disabled={!canMoveDown}
            onClick={() => moveOneLevel(-1)}
            aria-label="Move scissor lift down one level"
          >
            <ChevronDown size={30} strokeWidth={2.2} />
            <span>DOWN</span>
          </button>
        </div>

        <div className="lift-safety-controls" aria-label="Lift safety controls">
          <button
            className="lift-emergency-button"
            type="button"
            disabled={!data.online || data.emergencyStopped}
            onClick={() => setConfirmation('stop')}
          >
            <OctagonAlert size={22} />
            {data.emergencyStopped ? 'STOP ACTIVE' : 'EMERGENCY STOP'}
          </button>
          <button
            className="lift-resume-button"
            type="button"
            disabled={!data.online || !data.emergencyStopped}
            onClick={() => setConfirmation('resume')}
          >
            <Play size={21} />
            RESUME
          </button>
        </div>

        <dl className="lift-readings">
          <div><dt>Status</dt><dd className={data.online ? 'reading-online' : 'reading-offline'}>{data.online ? 'Online' : 'Offline'}</dd></div>
          <div><dt>Position</dt><dd className={movementLabel ? 'reading-moving' : ''}>{movementLabel ? `Moving ${movingDirection}` : data.currentLevelId === 0 ? 'Home' : `Level ${data.currentLevelId}`}</dd></div>
          <div><dt>Capacity</dt><dd>{data.capacityKg.toLocaleString()} kg</dd></div>
          <div><dt>Heartbeat</dt><dd>{data.heartbeat}</dd></div>
        </dl>
      </section>

      <aside className="lift-control-panel">
        <header className="lift-control-heading">
          <span className="eyebrow">LIFT CONTROL</span>
          <h2>Actions</h2>
        </header>

        <div className="lift-control-content">
          <section className="lift-card">
            <h3>Go to Level</h3>
            <p>Move the platform directly to a target level.</p>
            <div className="lift-level-options">
              {data.levels.map((level) => {
                const isCurrent = level.id === data.currentLevelId
                return (
                  <button
                    className={isCurrent ? 'current' : ''}
                    type="button"
                    key={level.id}
                    disabled={!controlsEnabled || isCurrent}
                    onClick={() => moveToLevel(level.id)}
                  >
                    <span>{level.id}</span>
                    <strong>{level.name}</strong>
                    {isCurrent && <small>HERE</small>}
                  </button>
                )
              })}
            </div>
          </section>

          <section className="lift-card calibration-card">
            <h3>Calibration Cycle</h3>
            <p>Full travel calibration — descends to Home then ascends to the highest configured level.</p>
            <button
              className="calibration-button"
              type="button"
              disabled={!controlsEnabled}
              onClick={onRunCalibration}
            >
              <Layers3 size={20} />
              Run Calibration
            </button>
          </section>

          <section className="lift-health-card">
            <h3>Subsystem Health</h3>
            {['ASRS', 'Scissor Lift', 'AGV'].map((system) => {
              const isStopped = system === 'Scissor Lift' && data.emergencyStopped
              return <div className={`lift-health-row${isStopped ? ' stopped' : ''}`} key={system}>
                <span><i />{system}</span>
                <b>{isStopped ? 'STOPPED' : 'ONLINE'}</b>
              </div>
            })}
          </section>
        </div>
      </aside>

      {confirmation && (
        <div className="lift-confirm-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setConfirmation(null) }}>
          <section className="lift-confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="lift-confirm-title" aria-describedby="lift-confirm-message">
            <header>
              <span className={`lift-confirm-icon ${confirmation}`}>
                {confirmation === 'stop' ? <OctagonAlert size={28} /> : <Play size={27} />}
              </span>
              <button type="button" onClick={() => setConfirmation(null)} aria-label="Close confirmation"><X size={22} /></button>
            </header>
            <h2 id="lift-confirm-title">{confirmation === 'stop' ? 'Activate Emergency Stop?' : 'Resume Lift Controls?'}</h2>
            <p id="lift-confirm-message">
              {confirmation === 'stop'
                ? 'This will immediately disable all scissor lift movement.'
                : 'Confirm the emergency condition is resolved and the lift area is clear.'}
            </p>
            <div className="lift-confirm-actions">
              <button type="button" className="lift-confirm-cancel" onClick={() => setConfirmation(null)}>Cancel</button>
              <button
                type="button"
                className={`lift-confirm-submit ${confirmation}`}
                onClick={() => {
                  if (confirmation === 'stop') onEmergencyStop()
                  else onResume()
                  setConfirmation(null)
                }}
              >
                {confirmation === 'stop' ? 'Emergency Stop' : 'Resume Lift'}
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  )
}
