const prisma = require('../utils/prisma')
const bcrypt = require('bcryptjs')

const getProfile = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        address: true,
        avatarUrl: true,
        createdAt: true
      }
    })
    res.json(user)
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

const updateProfile = async (req, res) => {
  const { name, phone, address, avatarUrl } = req.body

  try {
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { name, phone, address, avatarUrl },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        address: true,
        avatarUrl: true,
        createdAt: true
      }
    })
    res.json(user)
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body

  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } })
    const match = await bcrypt.compare(currentPassword, user.password)
    if (!match) return res.status(400).json({ message: 'Current password is incorrect' })

    const hashed = await bcrypt.hash(newPassword, 10)
    await prisma.user.update({
      where: { id: req.user.id },
      data: { password: hashed }
    })
    res.json({ message: 'Password changed successfully' })
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

module.exports = { getProfile, updateProfile, changePassword }