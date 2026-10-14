const path = require('path')
const { v4: uuidv4 } = require('uuid')
const prisma = require('../utils/prisma')
const W = require('../utils/workday')
const { uploadToR2, deleteFromR2, getSignedDownloadUrl } = require('../utils/r2')
const { loadContext, fmtFile, fmtEntry, logChange } = require('./worksheet.controller')

const MAX_FILES_PER_ROW = 10
const UNDO_WINDOW_MS = 15 * 60 * 1000
const isAdmin = (req) => req.user.role === 'ADMIN'

// multer decodes names as latin1. Fix it, but keep the original if the result is garbage.
const fixName = (name) => {
  const decoded = Buffer.from(name, 'latin1').toString('utf8')
  return decoded.includes('\uFFFD') ? name : decoded
}

// POST /api/worksheet/entries/:id/files
const uploadEntryFiles = async (req, res) => {
  const keys = []
  try {
    const admin = isAdmin(req)
    const id = parseInt(req.params.id)
    const files = req.files
    if (!files || files.length === 0) return res.status(400).json({ message: 'No files provided' })

    const entry = await prisma.workEntry.findUnique({
      where: { id },
      include: { files: { select: { id: true } } }
    })
    if (!entry || (!admin && entry.userId !== req.user.id)) {
      return res.status(404).json({ message: 'Entry not found' })
    }

    const dateStr = W.toDateStr(entry.workDate)

    if (!admin) {
      const ctx = await loadContext(entry.userId, dateStr)
      if (ctx.state.writeBlock) return res.status(403).json(ctx.state.writeBlock)
    }

    if (entry.files.length + files.length > MAX_FILES_PER_ROW) {
      return res.status(400).json({ message: `A row can hold at most ${MAX_FILES_PER_ROW} files` })
    }

    const uploader = await prisma.user.findUnique({ where: { id: req.user.id }, select: { name: true } })

    for (const f of files) {
      const ext = path.extname(f.originalname).toLowerCase()
      const key = `worksheet/${entry.userId}/${dateStr}/${uuidv4()}${ext}`
      await uploadToR2(f.buffer, key, 'application/octet-stream')
      keys.push(key)
    }

    // Re-check the lock after the upload, so nothing is saved after 6:00 PM
    if (!admin) {
      const again = await loadContext(entry.userId, dateStr)
      if (again.state.writeBlock) {
        await Promise.all(keys.map((k) => deleteFromR2(k).catch(() => {})))
        return res.status(403).json(again.state.writeBlock)
      }
    }

    const created = []
    for (let i = 0; i < files.length; i++) {
      const rec = await prisma.workEntryFile.create({
        data: {
          entryId: id,
          uploadedBy: req.user.id,
          uploaderName: uploader ? uploader.name : 'Unknown',
          byAdmin: admin,
          fileName: fixName(files[i].originalname).slice(0, 255),
          fileKey: keys[i],
          fileSize: files[i].size,
          mimeType: (files[i].mimetype || 'application/octet-stream').slice(0, 150)
        }
      })
      created.push(fmtFile(rec))
    }

    if (admin) await logChange(req.user.id, entry.userId, dateStr, id, 'FILE_ADD', null, { files: created.map((c) => c.fileName) })

    res.status(201).json({ files: created })
  } catch (err) {
    await Promise.all(keys.map((k) => deleteFromR2(k).catch(() => {})))
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

// GET /api/worksheet/files/:id/download  returns { url }
const downloadFile = async (req, res) => {
  try {
    const file = await prisma.workEntryFile.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { entry: { include: { user: { select: { role: true } } } } }
    })
    if (!file) return res.status(404).json({ message: 'File not found' })

    const e = file.entry
    const allowed = isAdmin(req) || e.userId === req.user.id || (e.isShared && e.user.role === 'ADMIN')
    if (!allowed) return res.status(404).json({ message: 'File not found' })

    const url = await getSignedDownloadUrl(file.fileKey, 300, file.fileName)
    res.json({ url })
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

// DELETE /api/worksheet/files/:id
const deleteFile = async (req, res) => {
  try {
    const admin = isAdmin(req)
    const file = await prisma.workEntryFile.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { entry: true }
    })
    if (!file || (!admin && file.entry.userId !== req.user.id)) {
      return res.status(404).json({ message: 'File not found' })
    }

    const dateStr = W.toDateStr(file.entry.workDate)

    if (!admin) {
      if (file.uploadedBy !== req.user.id) {
        return res.status(403).json({ code: 'NOT_YOURS', message: 'Only the uploader or admin can delete this file.' })
      }
      const ctx = await loadContext(file.entry.userId, dateStr)
      if (ctx.state.writeBlock) return res.status(403).json(ctx.state.writeBlock)
      const recent = Date.now() - file.createdAt.getTime() < UNDO_WINDOW_MS
      if (ctx.state.planFrozen && !recent) {
        return res.status(403).json({
          code: 'PLAN_FROZEN',
          message: 'Files can only be deleted before 11:45 AM, or within 15 minutes of uploading.'
        })
      }
    }

    await prisma.workEntryFile.delete({ where: { id: file.id } })
    await deleteFromR2(file.fileKey).catch(() => {})

    if (admin) await logChange(req.user.id, file.entry.userId, dateStr, file.entryId, 'FILE_DELETE', { fileName: file.fileName }, null)

    res.json({ message: 'File deleted' })
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

// GET /api/worksheet/shared?date=  rows admin shared with staff
const getShared = async (req, res) => {
  try {
    const dateStr = req.query.date || W.istNow().dateStr
    const date = W.parseDateStr(dateStr)
    if (!date) return res.status(400).json({ message: 'Invalid date' })

    const entries = await prisma.workEntry.findMany({
      where: { workDate: date, isShared: true, user: { role: 'ADMIN' } },
      include: { files: { orderBy: { id: 'asc' } }, user: { select: { name: true } } },
      orderBy: [{ position: 'asc' }, { id: 'asc' }]
    })

    res.json({
      date: dateStr,
      entries: entries.map((e) => ({ ...fmtEntry(e), ownerName: e.user.name }))
    })
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

module.exports = { uploadEntryFiles, downloadFile, deleteFile, getShared }