const prisma = require('../utils/prisma')
const { createNotification } = require('./notification.controller')

const createTask = async (req, res) => {
  const { title, description, assignedTo, priority, deadline } = req.body

  try {
    const task = await prisma.task.create({
      data: {
        title,
        description,
        assignedTo: parseInt(assignedTo),
        priority: priority || 'MEDIUM',
        deadline: deadline ? new Date(deadline) : null
      }
    })

    // Create notification for assigned member
    await createNotification(
      assignedTo,
      'New Task Assigned',
      `You have been assigned a new task: "${title}"${deadline ? ` — due ${new Date(deadline).toLocaleDateString('en-IN')}` : ''}`
    )

    res.status(201).json(task)
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

const getAllTasks = async (req, res) => {
  try {
    // Admin sees all tasks, member sees only their own
    const where = req.user.role === 'ADMIN' ? {} : { assignedTo: req.user.id }

    const tasks = await prisma.task.findMany({
      where,
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' }
    })
    res.json(tasks)
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

const getTaskById = async (req, res) => {
  const { id } = req.params

  try {
    const task = await prisma.task.findUnique({
      where: { id: parseInt(id) },
      include: { user: { select: { id: true, name: true, email: true } } }
    })
    if (!task) return res.status(404).json({ message: 'Task not found' })

    // Member can only view their own task
    if (req.user.role !== 'ADMIN' && task.assignedTo !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' })
    }

    res.json(task)
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

const updateTask = async (req, res) => {
  const { id } = req.params
  const { title, description, priority, deadline, status } = req.body

  try {
    const task = await prisma.task.findUnique({ where: { id: parseInt(id) } })
    if (!task) return res.status(404).json({ message: 'Task not found' })

    // Member can only update status of their own task
    if (req.user.role !== 'ADMIN' && task.assignedTo !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' })
    }

    const updatedTask = await prisma.task.update({
      where: { id: parseInt(id) },
      data: {
        title: req.user.role === 'ADMIN' ? title : undefined,
        description: req.user.role === 'ADMIN' ? description : undefined,
        priority: req.user.role === 'ADMIN' ? priority : undefined,
        deadline: req.user.role === 'ADMIN' && deadline ? new Date(deadline) : undefined,
        status
      }
    })
    res.json(updatedTask)
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

const deleteTask = async (req, res) => {
  const { id } = req.params

  try {
    await prisma.task.delete({ where: { id: parseInt(id) } })
    res.json({ message: 'Task deleted' })
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

const getMyTasks = async (req, res) => {
  try {
    const tasks = await prisma.task.findMany({
      where: { assignedTo: req.user.id },
      orderBy: { createdAt: 'desc' }
    })
    res.json(tasks)
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

module.exports = { createTask, getAllTasks, getTaskById, updateTask, deleteTask, getMyTasks }