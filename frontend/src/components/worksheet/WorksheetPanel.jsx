import { useState } from 'react'
import DaySheet from './DaySheet'
import MonthView from './MonthView'
import HolidayManager from './HolidayManager'
import './worksheet.css'

export default function WorksheetPanel({ isAdmin }) {
  const [tab, setTab] = useState('day')
  const [date, setDate] = useState('') // empty string means "today" on the server
  const [selectedId, setSelectedId] = useState(null)

  const openDay = (d, userId) => {
    setDate(d)
    if (userId) setSelectedId(userId)
    setTab('day')
  }

  return (
    <div className='ws-root'>
      <div className='ws-tabs'>
        <button className={`ws-tab ${tab === 'day' ? 'on' : ''}`} onClick={() => setTab('day')}>Day Sheet</button>
        <button className={`ws-tab ${tab === 'month' ? 'on' : ''}`} onClick={() => setTab('month')}>Month Overview</button>
        {isAdmin && (
          <button className={`ws-tab ${tab === 'holidays' ? 'on' : ''}`} onClick={() => setTab('holidays')}>Holidays</button>
        )}
      </div>

      {tab === 'day' && (
        <DaySheet
          isAdmin={isAdmin}
          date={date}
          setDate={setDate}
          selectedId={selectedId}
          setSelectedId={setSelectedId}
        />
      )}
      {tab === 'month' && <MonthView isAdmin={isAdmin} onPick={openDay} />}
      {tab === 'holidays' && isAdmin && <HolidayManager />}
    </div>
  )
}