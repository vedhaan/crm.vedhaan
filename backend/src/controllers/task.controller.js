const prisma = require('../utils/prisma')
const { createNotification } = require('./notification.controller')

// Helper — standard assignee include shape used across all queries
const taskInclude = {
  assignees: {
    include: {
      user: { select: { id: true, name: true, email: true, avatarUrl: true } }
    }
  },
  files: {
    orderBy: { uploadedAt: 'desc' },
    include: {
      uploader: { select: { id: true, name: true } }
    }
  }
}

// Helper — check if current member is assigned to a task
const isMemberAssigned = async (taskId, userId) => {
  const record = await prisma.taskAssignee.findUnique({
    where: { taskId_userId: { taskId, userId } }
  })
  return !!record
}

const createTask = async (req, res) => {
  const { title, description, assigneeIds, priority, deadline } = req.body

  if (!assigneeIds || !Array.isArray(assigneeIds) || assigneeIds.length === 0) {
    return res.status(400).json({ message: 'At least one assignee is required' })
  }

  try {
    const task = await prisma.task.create({
      data: {
        title,
        description,
        priority: priority || 'MEDIUM',
        deadline: deadline ? new Date(deadline) : null,
        assignees: {
          create: assigneeIds.map(uid => ({ userId: parseInt(uid) }))
        }
      },
      include: taskInclude
    })

    // Notify every assignee
    await Promise.all(
      assigneeIds.map(uid =>
        createNotification(
          parseInt(uid),
          'New Task Assigned',
          `You have been assigned a new task: "${title}"${deadline ? ` — due ${new Date(deadline).toLocaleDateString('en-IN')}` : ''}`
        )
      )
    )

    res.status(201).json(task)
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

const getAllTasks = async (req, res) => {
  try {
    let tasks

    if (req.user.role === 'ADMIN') {
      tasks = await prisma.task.findMany({
        include: taskInclude,
        orderBy: { createdAt: 'desc' }
      })
    } else {
      // Member sees only tasks they are assigned to
      tasks = await prisma.task.findMany({
        where: {
          assignees: { some: { userId: req.user.id } }
        },
        include: taskInclude,
        orderBy: { createdAt: 'desc' }
      })
    }

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
      include: taskInclude
    })

    if (!task) return res.status(404).json({ message: 'Task not found' })

    // Member can only view tasks they are assigned to
    if (req.user.role !== 'ADMIN') {
      const assigned = await isMemberAssigned(task.id, req.user.id)
      if (!assigned) return res.status(403).json({ message: 'Access denied' })
    }

    res.json(task)
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

const updateTask = async (req, res) => {
  const { id } = req.params
  const { title, description, priority, deadline, status, assigneeIds } = req.body

  try {
    const task = await prisma.task.findUnique({
      where: { id: parseInt(id) },
      include: { assignees: true }
    })

    if (!task) return res.status(404).json({ message: 'Task not found' })

    // Member access check
    if (req.user.role !== 'ADMIN') {
      const assigned = await isMemberAssigned(task.id, req.user.id)
      if (!assigned) return res.status(403).json({ message: 'Access denied' })

      // Deadline lock — member cannot change status if task is overdue
      if (task.deadline && new Date(task.deadline) < new Date()) {
        return res.status(403).json({
          message: 'This task is overdue. Contact your admin to update the status.'
        })
      }
    }

    // Build update data
    const data = {}

    if (req.user.role === 'ADMIN') {
      if (title !== undefined)       data.title       = title
      if (description !== undefined) data.description = description
      if (priority !== undefined)    data.priority    = priority
      if (deadline !== undefined)    data.deadline    = deadline ? new Date(deadline) : null
      if (status !== undefined)      data.status      = status

      // Re-assign: delete all existing, insert new
      if (assigneeIds && Array.isArray(assigneeIds) && assigneeIds.length > 0) {
        await prisma.taskAssignee.deleteMany({ where: { taskId: task.id } })

        data.assignees = {
          create: assigneeIds.map(uid => ({ userId: parseInt(uid) }))
        }

        // Notify newly added assignees
        const existingIds = task.assignees.map(a => a.userId)
        const newIds = assigneeIds.map(Number).filter(uid => !existingIds.includes(uid))
        await Promise.all(
          newIds.map(uid =>
            createNotification(
              uid,
              'Task Assigned',
              `You have been assigned to task: "${task.title}"${task.deadline ? ` — due ${new Date(task.deadline).toLocaleDateString('en-IN')}` : ''}`
            )
          )
        )
      }
    } else {
      // Member can only update status
      if (status !== undefined) data.status = status
    }

    const updatedTask = await prisma.task.update({
      where: { id: parseInt(id) },
      data,
      include: taskInclude
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
      where: {
        assignees: { some: { userId: req.user.id } }
      },
      include: taskInclude,
      orderBy: { createdAt: 'desc' }
    })
    res.json(tasks)
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

module.exports = { createTask, getAllTasks, getTaskById, updateTask, deleteTask, getMyTasks }