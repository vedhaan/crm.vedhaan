const express = require('express')
const cors = require('cors')
require('dotenv').config()

const app = express()

app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
}))
app.use(express.json())

app.use('/api/auth', require('./src/routes/auth.routes'))
app.use('/api/clients', require('./src/routes/client.routes'))
app.use('/api/invoices', require('./src/routes/invoice.routes'))
app.use('/api/leads', require('./src/routes/lead.routes'))
app.use('/api/tasks', require('./src/routes/task.routes'))
app.use('/api/users', require('./src/routes/user.routes'))
app.use('/api/notifications', require('./src/routes/notification.routes'))
app.use('/api/profile', require('./src/routes/profile.routes'))
app.use('/api', require('./src/routes/file.routes'))

require('./src/utils/cron')

const PORT = process.env.PORT || 5000

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})