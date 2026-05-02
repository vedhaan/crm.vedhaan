const prisma = require('../utils/prisma')

const getMyNotifications = async (req, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 20
    })
    res.json(notifications)
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

const markAllRead = async (req, res) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user.id, isRead: false },
      data: { isRead: true }
    })
    res.json({ message: 'All marked as read' })
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

const markOneRead = async (req, res) => {
  const { id } = req.params
  try {
    await prisma.notification.update({
      where: { id: parseInt(id) },
      data: { isRead: true }
    })
    res.json({ message: 'Marked as read' })
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

const createNotification = async (userId, title, message) => {
  try {
    await prisma.notification.create({
      data: { userId: parseInt(userId), title, message }
    })
  } catch (err) {
    console.error('Notification creation error:', err.message)
  }
}

module.exports = { getMyNotifications, markAllRead, markOneRead, createNotification }