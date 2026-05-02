const prisma = require('../utils/prisma')

const getAllUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, createdAt: true }
    })
    res.json(users)
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

const deleteUser = async (req, res) => {
  const { id } = req.params

  try {
    await prisma.user.delete({ where: { id: parseInt(id) } })
    res.json({ message: 'User deleted' })
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

module.exports = { getAllUsers, deleteUser }