import { Clock, Zap } from 'lucide-react'
import { useState, type FormEvent } from 'react'

import './ScheduleView.css'

export type ScheduleRoutine =
  | 'maintenance'
  | 'home'
  | 'calibration'

export type ScheduleTask = {
  id: string
  title: string
  scheduledAt: string
  status: 'pending' | 'done'
}

export type NewScheduleTask = {
  routine: ScheduleRoutine
  scheduledAt: string
}

type ScheduleViewProps = {
  tasks: ScheduleTask[]
  onExecuteTask: (taskId: string) => void
  onAddTask: (task: NewScheduleTask) => void
}

const routineOptions = [
  { id: 'maintenance', label: 'Maintenance Run' },
  { id: 'home', label: 'Return to Home Position' },
  { id: 'calibration', label: 'Scissor Lift Calibration' },
] satisfies { id: ScheduleRoutine; label: string }[]

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Manila',
  month: 'short',
  day: '2-digit',
})

const timeFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Manila',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

export default function ScheduleView({
  tasks,
  onExecuteTask,
  onAddTask,
}: ScheduleViewProps) {
  const [routine, setRoutine] = useState<ScheduleRoutine>('maintenance')
  const [scheduledAt, setScheduledAt] = useState('')
  const queuedCount = tasks.filter((task) => task.status === 'pending').length

  const submitTask = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!scheduledAt) return

    onAddTask({
      routine,
      scheduledAt: new Date(`${scheduledAt}:00+08:00`).toISOString(),
    })
    setScheduledAt('')
  }

  return (
    <section className="schedule-workspace" aria-label="Operations schedule">
      <section className="schedule-queue">
        <header className="schedule-heading">
          <div>
            <span className="eyebrow">SCHEDULED WORK</span>
            <h1>Upcoming Tasks</h1>
          </div>
          <strong>{queuedCount} QUEUED</strong>
        </header>

        <div className="schedule-task-list">
          {tasks.map((task) => {
            const date = new Date(task.scheduledAt)
            return (
              <article className={`schedule-task ${task.status}`} key={task.id}>
                <time dateTime={task.scheduledAt}>
                  <span>{dateFormatter.format(date)}</span>
                  <strong>{timeFormatter.format(date)}</strong>
                </time>

                <i aria-hidden="true" />

                <div className="schedule-task-copy">
                  <h2>{task.title}</h2>
                  <small>{task.id}</small>
                </div>

                <span className={`schedule-status ${task.status}`}>
                  {task.status}
                </span>

                {task.status === 'pending' && (
                  <button type="button" onClick={() => onExecuteTask(task.id)}>
                    <Zap size={16} />
                    Execute
                  </button>
                )}
              </article>
            )
          })}
        </div>
      </section>

      <form className="schedule-form" onSubmit={submitTask}>
        <header className="schedule-heading">
          <div>
            <span className="eyebrow">NEW TASK</span>
            <h1>Schedule a Task</h1>
          </div>
        </header>

        <div className="schedule-form-content">
          <p>Schedule maintenance and positioning routines for the AGV system.</p>

          <fieldset>
            <legend>Routine Type</legend>
            <div className="schedule-routines">
              {routineOptions.map(({ id, label }) => (
                <button
                  className={routine === id ? 'selected' : ''}
                  type="button"
                  key={id}
                  aria-pressed={routine === id}
                  onClick={() => setRoutine(id)}
                >
                  <span className="schedule-radio" aria-hidden="true">
                    {routine === id && <i />}
                  </span>
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </fieldset>

          <label className="schedule-time">
            <span>Execution Time</span>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(event) => setScheduledAt(event.target.value)}
            />
          </label>

          <button
            className="schedule-submit"
            type="submit"
            disabled={!scheduledAt}
          >
            <Clock size={22} />
            Add to Schedule
          </button>
        </div>
      </form>
    </section>
  )
}
