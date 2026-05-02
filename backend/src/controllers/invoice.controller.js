const prisma = require('../utils/prisma')
const sendEmail = require('../utils/mailer')

const createInvoice = async (req, res) => {
  const { clientId, amount, dueDate } = req.body

  try {
    const invoice = await prisma.invoice.create({
      data: {
        clientId: parseInt(clientId),
        amount: parseFloat(amount),
        dueDate: new Date(dueDate)
      }
    })
    res.status(201).json(invoice)
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

const getAllInvoices = async (req, res) => {
  try {
    const invoices = await prisma.invoice.findMany({
      include: { client: true },
      orderBy: { issuedAt: 'desc' }
    })
    res.json(invoices)
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

const markAsPaid = async (req, res) => {
  const { id } = req.params

  try {
    const invoice = await prisma.invoice.update({
      where: { id: parseInt(id) },
      data: { status: 'PAID', paidAt: new Date() }
    })
    res.json(invoice)
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

const markAsOverdue = async (req, res) => {
  const { id } = req.params

  try {
    const invoice = await prisma.invoice.update({
      where: { id: parseInt(id) },
      data: { status: 'OVERDUE' }
    })
    res.json(invoice)
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

const deleteInvoice = async (req, res) => {
  const { id } = req.params

  try {
    await prisma.invoice.delete({ where: { id: parseInt(id) } })
    res.json({ message: 'Invoice deleted' })
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

// Called by cron job — checks unpaid invoices and emails admin
const sendMonthlyBillingReminder = async () => {
  try {
    const unpaidInvoices = await prisma.invoice.findMany({
      where: { status: { in: ['UNPAID', 'OVERDUE'] } },
      include: { client: true }
    })

    if (unpaidInvoices.length === 0) return

    const rows = unpaidInvoices.map(inv => `
      <tr>
        <td>${inv.client.name}</td>
        <td>₹${inv.amount}</td>
        <td>${inv.status}</td>
        <td>${new Date(inv.dueDate).toDateString()}</td>
      </tr>
    `).join('')

    const html = `
      <h2>Vedhaan Ops — Monthly Billing Reminder</h2>
      <p>The following invoices are unpaid or overdue:</p>
      <table border="1" cellpadding="8" cellspacing="0">
        <thead>
          <tr>
            <th>Client</th>
            <th>Amount</th>
            <th>Status</th>
            <th>Due Date</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <p>Login to Vedhaan Ops to take action.</p>
    `

    await sendEmail(process.env.ADMIN_EMAIL, 'Monthly Billing Reminder — Unpaid Invoices', html)
    console.log('Monthly billing reminder sent')
  } catch (err) {
    console.error('Billing reminder error:', err.message)
  }
}

module.exports = { createInvoice, getAllInvoices, markAsPaid, markAsOverdue, deleteInvoice, sendMonthlyBillingReminder }