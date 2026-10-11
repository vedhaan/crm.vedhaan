import Sidebar from '../../components/Sidebar'
import PageWrapper from '../../components/PageWrapper'
import WorksheetPanel from '../../components/worksheet/WorksheetPanel'

const Worksheet = () => (
  <div className='ws-layout'>
    <Sidebar />
    <main className='ws-main'>
      <PageWrapper>
        <div className='ws-pagehead'>
          <h1 className='ws-pagetitle'>Daily Work Sheet</h1>
          <p className='ws-pagesub'>Plan by 11:45 AM, update by 6:00 PM. Past days are locked for staff.</p>
        </div>
        <WorksheetPanel isAdmin={true} />
      </PageWrapper>
    </main>
  </div>
)

export default Worksheet