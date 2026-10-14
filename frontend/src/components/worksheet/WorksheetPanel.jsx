import { useState } from 'react'
import DaySheet from './DaySheet'
import MonthView from './MonthView'
import HolidayManager from './HolidayManager'
import Dashboard from './Dashboard'
import SharedByAdmin from './SharedByAdmin'
import WorksheetBoundary from './WorksheetBoundary'
import './worksheet.css'

export default function WorksheetPanel({ isAdmin }) {
  const [tab, setTab] = useState(isAdmin ? 'dashboard' : 'day')
  const [date, setDate] = useState('')
  const [selectedId, setSelectedId] = useState(null)

  const openDay = (d, userId) => {
    setDate(d)
    if (userId) setSelectedId(userId)
    setTab('day')
  }

  const tabs = isAdmin
    ? [['dashboard', 'Dashboard'], ['day', 'Day Sheet'], ['month', 'Month Overview'], ['holidays', 'Holidays']]
    : [['day', 'My Sheet'], ['shared', 'Shared by Admin'], ['month', 'My Month']]

  return (
    <div className='ws-root'>
      <div className='ws-tabs'>
        {tabs.map(([key, label]) => (
          <button key={key} className={`ws-tab ${tab === key ? 'on' : ''}`} onClick={() => setTab(key)}>{label}</button>
        ))}
      </div>
      <WorksheetBoundary>
        {tab === 'dashboard' && isAdmin && <Dashboard onOpen={openDay} />}
        {tab === 'day' && (
          <DaySheet isAdmin={isAdmin} date={date} setDate={setDate} selectedId={selectedId} setSelectedId={setSelectedId} />
        )}
        {tab === 'shared' && !isAdmin && <SharedByAdmin />}
        {tab === 'month' && <MonthView isAdmin={isAdmin} onPick={openDay} />}
        {tab === 'holidays' && isAdmin && <HolidayManager />}
      </WorksheetBoundary>
    </div>
  )
}