const prisma = require('../utils/prisma')
const { uploadToR2, deleteFromR2, getSignedDownloadUrl } = require('../utils/r2')
const { v4: uuidv4 } = require('uuid')
const path = require('path')

// Upload files to a task
const uploadTaskFiles = async (req, res) => {
  const { taskId } = req.params
  const files = req.files

  if (!files || files.length === 0) {
    return res.status(400).json({ message: 'No files provided' })
  }

  try {
    // Verify task exists and user has access
    const task = await prisma.task.findUnique({
      where: { id: parseInt(taskId) }
    })

    if (!task) return res.status(404).json({ message: 'Task not found' })

    // Members can only upload to their own tasks
    if (req.user.role !== 'ADMIN' && task.assignedTo !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' })
    }

    const uploadedFiles = []

    for (const file of files) {
      const ext = path.extname(file.originalname)
      const fileKey = `tasks/${taskId}/${uuidv4()}${ext}`

      await uploadToR2(file.buffer, fileKey, file.mimetype)

      const taskFile = await prisma.taskFile.create({
        data: {
          taskId: parseInt(taskId),
          uploadedBy: req.user.id,
          fileName: file.originalname,
          fileKey,
          fileSize: file.size,
          mimeType: file.mimetype,
        },
        include: {
          uploader: {
            select: { id: true, name: true, role: true }
          }
        }
      })

      uploadedFiles.push(taskFile)
    }

    res.status(201).json(uploadedFiles)
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

// Get all files for a task
const getTaskFiles = async (req, res) => {
  const { taskId } = req.params

  try {
    const task = await prisma.task.findUnique({
      where: { id: parseInt(taskId) }
    })

    if (!task) return res.status(404).json({ message: 'Task not found' })

    // Members can only see files for their own tasks
    if (req.user.role !== 'ADMIN' && task.assignedTo !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' })
    }

    const files = await prisma.taskFile.findMany({
      where: { taskId: parseInt(taskId) },
      include: {
        uploader: {
          select: { id: true, name: true, role: true }
        }
      },
      orderBy: { uploadedAt: 'desc' }
    })

    // Generate signed download URLs for each file
    const filesWithUrls = await Promise.all(
      files.map(async (file) => ({
        ...file,
        downloadUrl: await getSignedDownloadUrl(file.fileKey)
      }))
    )

    res.json(filesWithUrls)
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

// Delete a file
const deleteTaskFile = async (req, res) => {
  const { fileId } = req.params

  try {
    const file = await prisma.taskFile.findUnique({
      where: { id: parseInt(fileId) }
    })

    if (!file) return res.status(404).json({ message: 'File not found' })

    // Only admin or the uploader can delete
    if (req.user.role !== 'ADMIN' && file.uploadedBy !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' })
    }

    await deleteFromR2(file.fileKey)
    await prisma.taskFile.delete({ where: { id: parseInt(fileId) } })

    res.json({ message: 'File deleted' })
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

module.exports = { uploadTaskFiles, getTaskFiles, deleteTaskFile }