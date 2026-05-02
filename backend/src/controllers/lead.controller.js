const prisma = require('../utils/prisma')

const createLead = async (req, res) => {
  const { name, phone, source, service, notes, followUpAt, clientId } = req.body

  try {
    const lead = await prisma.lead.create({
      data: {
        name,
        phone,
        source,
        service,
        notes,
        followUpAt: followUpAt ? new Date(followUpAt) : null,
        clientId: clientId ? parseInt(clientId) : null
      }
    })
    res.status(201).json(lead)
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

const getAllLeads = async (req, res) => {
  try {
    const leads = await prisma.lead.findMany({
      include: { client: true },
      orderBy: { createdAt: 'desc' }
    })
    res.json(leads)
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

const getLeadById = async (req, res) => {
  const { id } = req.params

  try {
    const lead = await prisma.lead.findUnique({
      where: { id: parseInt(id) },
      include: { client: true }
    })
    if (!lead) return res.status(404).json({ message: 'Lead not found' })
    res.json(lead)
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

const updateLeadStatus = async (req, res) => {
  const { id } = req.params
  const { status, notes, followUpAt } = req.body

  try {
    const lead = await prisma.lead.update({
      where: { id: parseInt(id) },
      data: {
        status,
        notes,
        followUpAt: followUpAt ? new Date(followUpAt) : undefined
      }
    })
    res.json(lead)
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

const deleteLead = async (req, res) => {
  const { id } = req.params

  try {
    await prisma.lead.delete({ where: { id: parseInt(id) } })
    res.json({ message: 'Lead deleted' })
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

// Called by cron — sends daily follow-up digest to admin
const sendFollowUpReminder = async () => {
  const sendEmail = require('../utils/mailer')

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  try {
    const leads = await prisma.lead.findMany({
      where: {
        followUpAt: { gte: today, lt: tomorrow },
        status: { in: ['NEW', 'CONTACTED', 'FOLLOW_UP'] }
      }
    })

    if (leads.length === 0) return

    const rows = leads.map(lead => `
      <tr>
        <td>${lead.name}</td>
        <td>${lead.phone || '-'}</td>
        <td>${lead.service || '-'}</td>
        <td>${lead.status}</td>
        <td>${lead.notes || '-'}</td>
      </tr>
    `).join('')

    const html = `
      <h2>Vedhaan Ops — Today's Follow-ups</h2>
      <p>These leads need follow-up today:</p>
      <table border="1" cellpadding="8" cellspacing="0">
        <thead>
          <tr>
            <th>Name</th>
            <th>Phone</th>
            <th>Service</th>
            <th>Status</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <p>Login to Vedhaan Ops to update their status.</p>
    `

    await sendEmail(process.env.ADMIN_EMAIL, "Today's Follow-up Reminders", html)
    console.log('Follow-up reminder sent')
  } catch (err) {
    console.error('Follow-up reminder error:', err.message)
  }
}

module.exports = { createLead, getAllLeads, getLeadById, updateLeadStatus, deleteLead, sendFollowUpReminder }