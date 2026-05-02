const prisma = require('../utils/prisma')

const createClient = async (req, res) => {
  const { name, email, phone, company } = req.body

  try {
    const client = await prisma.client.create({
      data: { name, email, phone, company }
    })
    res.status(201).json(client)
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

const getAllClients = async (req, res) => {
  try {
    const clients = await prisma.client.findMany({
      orderBy: { createdAt: 'desc' }
    })
    res.json(clients)
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

const getClientById = async (req, res) => {
  const { id } = req.params

  try {
    const client = await prisma.client.findUnique({
      where: { id: parseInt(id) },
      include: { invoices: true, leads: true }
    })
    if (!client) return res.status(404).json({ message: 'Client not found' })
    res.json(client)
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

const updateClient = async (req, res) => {
  const { id } = req.params
  const { name, email, phone, company } = req.body

  try {
    const client = await prisma.client.update({
      where: { id: parseInt(id) },
      data: { name, email, phone, company }
    })
    res.json(client)
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

const deleteClient = async (req, res) => {
  const { id } = req.params

  try {
    await prisma.client.delete({ where: { id: parseInt(id) } })
    res.json({ message: 'Client deleted' })
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

module.exports = { createClient, getAllClients, getClientById, updateClient, deleteClient }