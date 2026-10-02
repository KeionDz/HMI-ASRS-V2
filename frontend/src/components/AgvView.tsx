import { useState } from 'react'
import { BatteryCharging, Bot, MapPin, Shuffle, Zap } from 'lucide-react'

type Robot = {
  id: string
  name: string
  battery: number
  charging: boolean
  inProgress: boolean
  task: string | null
}

const initialRobots: Robot[] = [
  { id: 'agv-a1', name: 'Robot A', battery: 87, charging: false, inProgress: false, task: null },
  { id: 'agv-a2', name: 'Robot B', battery: 54, charging: true, inProgress: false, task: null },
]

export default function AgvView() {
  const [robots, setRobots] = useState(initialRobots)
  const [dispatchMode, setDispatchMode] = useState<'auto' | 'specify'>('auto')
  const [selectedBallroom, setSelectedBallroom] = useState<string | null>(null)
  const [selectedRobotId, setSelectedRobotId] = useState<string | null>(null)
  const [dispatchMessage, setDispatchMessage] = useState('')

  const dispatchRobot = () => {
    const robot = dispatchMode === 'auto'
      ? robots.find((item) => !item.charging && !item.inProgress)
      : robots.find((item) => item.id === selectedRobotId && !item.charging && !item.inProgress)

    if (!robot || !selectedBallroom) return

    setRobots((current) => current.map((item) => item.id === robot.id
      ? { ...item, charging: false, inProgress: true, task: `1 pallet to ${selectedBallroom}` }
      : item))
    setDispatchMessage(`${robot.name} assigned · 1 pallet to ${selectedBallroom}`)
  }

  const updateRobotStatus = (robotId: string) => {
    setRobots((current) => current.map((robot) => {
      if (robot.id !== robotId) return robot
      if (robot.inProgress) return { ...robot, inProgress: false, charging: false, task: null }
      return { ...robot, charging: !robot.charging, task: null }
    }))
  }

  return (
    <section className="agv-workspace" aria-label="AGV fleet and dispatch">
      {robots.map((robot, index) => (
        <article className={`robot-panel${selectedRobotId === robot.id && dispatchMode === 'specify' ? ' robot-selected' : ''}`} key={robot.id}>
          <div className="robot-heading">
            <div className="robot-identity">
              <span className={`robot-icon robot-icon-${index}`}><Bot size={25} /></span>
              <span><span className="eyebrow">{robot.id.toUpperCase()} · AUTONOMOUS TRANSPORT</span><strong>{robot.name}</strong><small>{robot.task ?? 'No active task'}</small></span>
            </div>
            <span className={`robot-state ${robot.inProgress ? 'state-progress' : robot.charging ? 'state-charging' : 'state-idle'}`}>
              {robot.inProgress ? 'IN PROGRESS' : robot.charging ? 'CHARGING' : 'IDLE'}
            </span>
          </div>

          <div className="robot-details">
            <section className="battery-card">
              <div className="battery-heading"><span className="eyebrow">BATTERY</span><strong>{robot.battery}%</strong></div>
              <div className="battery-track"><span style={{ width: `${robot.battery}%` }} /></div>
              <div className="battery-scale"><span>0%</span><span>100%</span></div>
            </section>
            <div className="robot-status-grid">
              <div className={`robot-status-card${robot.charging ? ' is-charging' : ''}`}><i /><span><small>Charging</small><strong>{robot.charging ? 'Yes' : 'No'}</strong></span></div>
              <div className={`robot-status-card${robot.inProgress ? ' is-progress' : ''}`}><i /><span><small>In Progress</small><strong>{robot.inProgress ? 'Yes' : 'No'}</strong></span></div>
              <div className={`robot-status-card${!robot.charging && !robot.inProgress ? ' is-idle' : ''}`}><i /><span><small>Idle</small><strong>{!robot.charging && !robot.inProgress ? 'Yes' : 'No'}</strong></span></div>
            </div>
          </div>

          <div className="robot-actions">
            <button className="robot-command" type="button" onClick={() => updateRobotStatus(robot.id)} disabled={robot.inProgress && !robot.task}>
              {robot.inProgress ? 'Complete Pallet Run' : robot.charging ? 'Release to Standby' : <><BatteryCharging size={15} /> Send to Charger</>}
            </button>
          </div>
        </article>
      ))}

      <aside className="dispatch-sidebar">
        <section className="dispatch-section">
          <span className="eyebrow">DISPATCH MODE</span>
          <div className="dispatch-modes" role="group" aria-label="Dispatch mode">
            <button className={dispatchMode === 'auto' ? 'mode-active' : ''} type="button" onClick={() => { setDispatchMode('auto'); setSelectedRobotId(null); setDispatchMessage('') }}><Shuffle size={15} /><span>Auto-Dispatch</span></button>
            <button className={dispatchMode === 'specify' ? 'mode-active' : ''} type="button" onClick={() => { setDispatchMode('specify'); setSelectedRobotId(null); setDispatchMessage('') }}><Bot size={15} /><span>Specify Robot</span></button>
          </div>
        </section>

        {dispatchMode === 'specify' && <section className="dispatch-section robot-picker">
          <span className="eyebrow">SELECT ROBOT</span>
          <div className="picker-robots">
            {robots.map((robot) => <button type="button" key={robot.id} className={selectedRobotId === robot.id ? 'picked' : ''} onClick={() => setSelectedRobotId(robot.id)} disabled={robot.charging || robot.inProgress}><Bot size={14} />{robot.name}<small>{robot.charging ? 'Charging' : robot.inProgress ? 'Busy' : 'Idle'}</small></button>)}
          </div>
        </section>}

        <section className="dispatch-section ballroom-picker">
          <span className="eyebrow">SELECT BALLROOM</span>
          {['Ballroom A', 'Ballroom B'].map((ballroom) => <button className={`ballroom-option${selectedBallroom === ballroom ? ' picked' : ''}`} type="button" key={ballroom} onClick={() => { setSelectedBallroom(ballroom); setDispatchMessage('') }}><MapPin size={15} /><span>{ballroom}</span></button>)}
        </section>

        <button className="dispatch-submit" type="button" disabled={!selectedBallroom || (dispatchMode === 'specify' && (!selectedRobotId || !robots.some((robot) => robot.id === selectedRobotId && !robot.charging && !robot.inProgress))) || !robots.some((robot) => !robot.charging && !robot.inProgress)} onClick={dispatchRobot}><Zap size={16} />Dispatch Robot</button>
        <p className={`dispatch-message${dispatchMessage ? ' visible' : ''}`} aria-live="polite">{dispatchMessage || 'One pallet per run · storage to ballroom and back'}</p>

        <section className="subsystem-health">
          <strong>Subsystem Health</strong>
          {['ASRS', 'Scissor Lift', 'AGV'].map((system) => <div className="health-row" key={system}><span><i />{system}</span><b>OK</b></div>)}
        </section>
      </aside>
    </section>
  )
}
