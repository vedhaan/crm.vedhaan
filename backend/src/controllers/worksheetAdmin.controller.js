const prisma = require('../utils/prisma')
const W = require('../utils/workday')
const { createNotification } = require('./notification.controller')
const { clean, buildMonth, logChange } = require('./worksheet.controller')

const DEFAULT_STREAMS = [
  { name: 'HR', countLabel: 'Tasks', taskTypes: ['Recruitment', 'Screening calls', 'Interviews', 'Onboarding', 'Attendance and payroll', 'Documents and policy', 'Other'] },
  { name: 'Developer', countLabel: 'Deliverables', taskTypes: ['Feature', 'Bug fix', 'Code review', 'Deployment', 'Client change', 'Research', 'Other'] },
  { name: 'SEO Executive', countLabel: 'Backlinks', taskTypes: ['Backlinks', 'On-page SEO', 'Content', 'Keyword research', 'Audit', 'Reporting', 'Other'] },
  { name: 'Digital Marketer', countLabel: 'Posts', taskTypes: ['Social posts', 'Reels and video', 'Ads', 'Email and WhatsApp', 'Design', 'Reporting', 'Other'] },
  { name: 'Management', countLabel: 'Tasks', taskTypes: ['Planning', 'Client calls', 'Review', 'Other'] }
]

const normTypes = (v) => {
  const out = []
  for (const t of Array.isArray(v) ? v : []) {
    const s = String(t || '').trim()
    if (s && s.length <= 60 && !out.includes(s)) out.push(s)
  }
  return out.slice(0, 25)
}

// GET /api/worksheet/streams
const getStreams = async (req, res) => {
  try {
    const [streams, staff] = await Promise.all([
      prisma.stream.findMany({ orderBy: { name: 'asc' }, include: { _count: { select: { users: true } } } }),
      prisma.user.findMany({
        where: { role: { in: ['MEMBER', 'ADMIN'] } },
        select: { id: true, name: true, role: true, streamId: true },
        orderBy: [{ role: 'asc' }, { name: 'asc' }]
      })
    ])
    res.json({
      streams: streams.map((s) => ({
        id: s.id,
        name: s.name,
        countLabel: s.countLabel,
        taskTypes: s.taskTypes,
        requireProof: s.requireProof,
        userCount: s._count.users
      })),
      staff
    })
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

// POST /api/worksheet/streams
const createStream = async (req, res) => {
  try {
    const name = String(req.body.name || '').trim()
    if (!name || name.length > 60) return res.status(400).json({ message: 'Name is required (max 60 characters)' })
    const countLabel = String(req.body.countLabel || 'Items').trim().slice(0, 40) || 'Items'
    const s = await prisma.stream.create({
      data: { name, countLabel, taskTypes: normTypes(req.body.taskTypes), requireProof: req.body.requireProof === true }
    })
    res.status(201).json(s)
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ message: 'A stream with this name already exists' })
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

// PATCH /api/worksheet/streams/:id
const updateStream = async (req, res) => {
  try {
    const id = parseInt(req.params.id)
    const data = {}
    if (req.body.name !== undefined) {
      const name = String(req.body.name || '').trim()
      if (!name || name.length > 60) return res.status(400).json({ message: 'Name is required (max 60 characters)' })
      data.name = name
    }
    if (req.body.countLabel !== undefined) {
      data.countLabel = String(req.body.countLabel || '').trim().slice(0, 40) || 'Items'
    }
    if (req.body.taskTypes !== undefined) data.taskTypes = normTypes(req.body.taskTypes)
    if (req.body.requireProof !== undefined) data.requireProof = req.body.requireProof === true

    const s = await prisma.stream.update({ where: { id }, data })
    res.json(s)
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ message: 'A stream with this name already exists' })
    if (err.code === 'P2025') return res.status(404).json({ message: 'Stream not found' })
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

// DELETE /api/worksheet/streams/:id
const deleteStream = async (req, res) => {
  try {
    const id = parseInt(req.params.id)
    const count = await prisma.user.count({ where: { streamId: id } })
    if (count > 0) return res.status(409).json({ message: 'Move the staff in this stream to another stream first' })
    await prisma.stream.delete({ where: { id } })
    res.json({ message: 'Stream deleted' })
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ message: 'Stream not found' })
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

// POST /api/worksheet/streams/seed
const seedStreams = async (req, res) => {
  try {
    const r = await prisma.stream.createMany({ data: DEFAULT_STREAMS, skipDuplicates: true })
    res.json({ created: r.count })
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

// PUT /api/worksheet/staff/:id/stream
const setUserStream = async (req, res) => {
  try {
    const id = parseInt(req.params.id)
    const streamId = req.body.streamId ? parseInt(req.body.streamId) : null
    if (streamId) {
      const s = await prisma.stream.findUnique({ where: { id: streamId }, select: { id: true } })
      if (!s) return res.status(404).json({ message: 'Stream not found' })
    }
    await prisma.user.update({ where: { id }, data: { streamId } })
    res.json({ id, streamId })
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ message: 'User not found' })
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

// POST /api/worksheet/assign   assign the same work to one or more staff
const assignWork = async (req, res) => {
  try {
    const now = W.istNow()
    const dateStr = req.body.date || now.dateStr
    const date = W.parseDateStr(dateStr)
    if (!date) return res.status(400).json({ message: 'Invalid date' })

    const ids = [...new Set((Array.isArray(req.body.userIds) ? req.body.userIds : []).map(Number).filter(Boolean))]
    if (ids.length === 0) return res.status(400).json({ message: 'Select at least one staff member' })
    if (ids.length > 50) return res.status(400).json({ message: 'Too many staff selected' })

    const { data, error } = clean({
      title: req.body.title,
      client: req.body.client,
      targetCount: req.body.targetCount,
      taskType: req.body.taskType,
      estHours: req.body.estHours,
      remarks: req.body.remarks
    })
    if (error) return res.status(400).json({ message: error })
    if (!data.title) return res.status(400).json({ message: 'Task is required' })

    const users = await prisma.user.findMany({
      where: { id: { in: ids }, role: 'MEMBER' },
      select: { id: true, name: true }
    })
    if (users.length === 0) return res.status(404).json({ message: 'No matching staff found' })

    const when = dateStr === now.dateStr ? 'today' : dateStr
    let created = 0

    for (const u of users) {
      const agg = await prisma.workEntry.aggregate({
        where: { userId: u.id, workDate: date },
        _max: { position: true }
      })
      const entry = await prisma.workEntry.create({
        data: {
          ...data,
          userId: u.id,
          workDate: date,
          isLate: false,
          isAssigned: true,
          assignedBy: req.user.id,
          position: (agg._max.position || 0) + 1
        }
      })
      created += 1
      await logChange(req.user.id, u.id, dateStr, entry.id, 'ASSIGN', null, entry)
      try {
        await createNotification(u.id, 'New Work Assigned', `New work for ${when}: "${entry.title}"`)
      } catch (err) {
        console.error('Assign notification error:', err.message)
      }
    }

    res.status(201).json({ created, skipped: ids.length - users.length })
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

const blank = () => ({
  rows: 0, doneRows: 0, target: 0, done: 0, est: 0, spent: 0,
  late: 0, assigned: 0, carriedIn: 0, carriedOut: 0, files: 0
})

const addEntry = (t, e) => {
  t.rows += 1
  if (e.status === 'DONE') t.doneRows += 1
  t.target += e.targetCount || 0
  t.done += e.doneCount || 0
  t.est += e.estHours || 0
  t.spent += e.spentHours || 0
  if (e.isLate) t.late += 1
  if (e.isAssigned) t.assigned += 1
  if (e.carriedFromId) t.carriedIn += 1
  if (e.carryForward) t.carriedOut += 1
  t.files += e._count.files
}

const round2 = (t) => ({ ...t, est: Math.round(t.est * 100) / 100, spent: Math.round(t.spent * 100) / 100 })

// GET /api/worksheet/report?month=YYYY-MM&streamId=
const getReport = async (req, res) => {
  try {
    const now = W.istNow()
    const month = req.query.month || now.dateStr.slice(0, 7)
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return res.status(400).json({ message: 'Invalid month' })
    const streamId = parseInt(req.query.streamId) || null

    const [users, streamList] = await Promise.all([
      prisma.user.findMany({
        where: { role: 'MEMBER', ...(streamId ? { streamId } : {}) },
        select: { id: true, name: true, createdAt: true, stream: { select: { id: true, name: true } } },
        orderBy: { name: 'asc' }
      }),
      prisma.stream.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } })
    ])

    const built = await buildMonth(users, month, now)
    const userById = new Map(users.map((u) => [u.id, u]))
    const markById = new Map(built.users.map((u) => [u.id, u.summary]))

    const perUser = new Map(users.map((u) => [u.id, blank()]))
    const perStream = new Map()
    const byType = new Map()

    const streamName = (u) => (u.stream ? u.stream.name : 'No stream')
    for (const u of users) {
      const n = streamName(u)
      if (!perStream.has(n)) perStream.set(n, { ...blank(), people: new Set() })
      perStream.get(n).people.add(u.id)
    }

    for (const e of built.entries) {
      const u = userById.get(e.userId)
      if (!u) continue
      const sName = streamName(u)
      addEntry(perUser.get(e.userId), e)
      addEntry(perStream.get(sName), e)

      const type = e.taskType || 'Untyped'
      const key = `${sName}|${type}`
      if (!byType.has(key)) byType.set(key, { stream: sName, type, rows: 0, doneRows: 0, done: 0 })
      const bt = byType.get(key)
      bt.rows += 1
      if (e.status === 'DONE') bt.doneRows += 1
      bt.done += e.doneCount || 0
    }

    res.json({
      month,
      streamList,
      users: users.map((u) => ({
        id: u.id,
        name: u.name,
        stream: streamName(u),
        ...round2(perUser.get(u.id)),
        marks: markById.get(u.id)
      })),
      streams: [...perStream.entries()].map(([name, t]) => {
        const { people, ...totals } = t
        return { name, people: people.size, ...round2(totals) }
      }),
      byType: [...byType.values()].sort((a, b) => a.stream.localeCompare(b.stream) || b.rows - a.rows)
    })
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

module.exports = {
  getStreams,
  createStream,
  updateStream,
  deleteStream,
  seedStreams,
  setUserStream,
  assignWork,
  getReport
}