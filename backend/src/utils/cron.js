const cron = require('node-cron')
const { sendMonthlyBillingReminder } = require('../controllers/invoice.controller')
const { sendFollowUpReminder } = require('../controllers/lead.controller')
const { createNotification } = require('../controllers/notification.controller')
const prisma = require('./prisma')

// 1st of every month at 9:00 AM IST
cron.schedule('0 9 1 * *', () => {
  console.log('Running monthly billing reminder...')
  sendMonthlyBillingReminder()
}, { timezone: 'Asia/Kolkata' })

// Every day at 9:00 AM IST
cron.schedule('0 9 * * *', () => {
  console.log('Running daily follow-up reminder...')
  sendFollowUpReminder()
}, { timezone: 'Asia/Kolkata' })

// Every hour — check for tasks due within 24 hours
cron.schedule('0 * * * *', async () => {
  console.log('Checking upcoming task deadlines...')
  try {
    const now = new Date()
    const in24 = new Date(now.getTime() + 24 * 60 * 60 * 1000)

    const tasks = await prisma.task.findMany({
      where: {
        deadline: { gte: now, lte: in24 },
        status: { not: 'DONE' }
      }
    })

    for (const task of tasks) {
      const hoursLeft = Math.ceil((new Date(task.deadline) - now) / (1000 * 60 * 60))
      await createNotification(
        task.assignedTo,
        'Task Due Soon',
        `"${task.title}" is due in ${hoursLeft} hour${hoursLeft !== 1 ? 's' : ''}. Make sure to complete it on time.`
      )
    }
  } catch (err) {
    console.error('Deadline reminder error:', err.message)
  }
}, { timezone: 'Asia/Kolkata' })

console.log('Cron jobs scheduled')