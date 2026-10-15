import AppShell from '../../components/AppShell'
import PageHeader from '../../components/ui/PageHeader'
import WorksheetPanel from '../../components/worksheet/WorksheetPanel'

const Worksheet = () => (
  <AppShell>
    <PageHeader
      title='Daily Work Sheet'
      subtitle='Plan by 11:45 AM, update by 6:00 PM. Past days are locked for staff.'
    />
    <WorksheetPanel isAdmin={true} />
  </AppShell>
)

export default Worksheet