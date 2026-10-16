const prisma = require('../utils/prisma')
const W = require('../utils/workday')
const { deleteFromR2 } = require('../utils/r2')
const { createNotification } = require('./notification.controller')

const MAX_ROWS_PER_DAY = 50
const MAX_CARRIES = 3
const STATUSES = ['PENDING', 'IN_PROGRESS', 'DONE']
const PLAN_FIELDS = ['title', 'client', 'targetCount', 'taskType', 'estHours']
const STREAM_SELECT = { id: true, name: true, countLabel: true, taskTypes: true, requireProof: true }

const isAdmin = (req) => req.user.role === 'ADMIN'

const FILES_INCLUDE = { files: { orderBy: { id: 'asc' } } }
const UPDATE_INCLUDE = { files: { orderBy: { id: 'asc' } }, carriedTo: { select: { id: true } } }

const fmtFile = (f) => ({
  id: f.id,
  entryId: f.entryId,
  fileName: f.fileName,
  fileSize: f.fileSize,
  mimeType: f.mimeType,
  uploadedBy: f.uploadedBy,
  uploaderName: f.uploaderName,
  byAdmin: f.byAdmin,
  createdAt: f.createdAt
})

const fmtEntry = (e) => {
  const { files, carriedTo, carriedFrom, ...rest } = e
  return { ...rest, workDate: W.toDateStr(e.workDate), files: (files || []).map(fmtFile) }
}

const plain = (v) => (v ? JSON.parse(JSON.stringify(v)) : undefined)

const logChange = async (actorId, userId, dateStr, entryId, action, before, after) => {
  try {
    await prisma.workEntryLog.create({
      data: {
        actorId,
        userId,
        workDate: W.parseDateStr(dateStr),
        entryId,
        action,
        before: plain(before),
        after: plain(after)
      }
    })
  } catch (err) {
    console.error('Worksheet log error:', err.message)
  }
}

// Creates today's copies of rows that were carried forward from earlier days.
// Only runs before 6 PM on the current day, and is safe to call repeatedly.
const materializeCarry = async (userIds, dateStr) => {
  if (!userIds.length) return
  const date = W.parseDateStr(dateStr)
  const sources = await prisma.workEntry.findMany({
    where: {
      userId: { in: userIds },
      carryForward: true,
      carriedTo: { is: null },
      workDate: { lt: date }
    },
    orderBy: [{ workDate: 'asc' }, { id: 'asc' }]
  })

  for (const s of sources) {
    try {
      const remaining = s.targetCount != null ? Math.max(1, s.targetCount - s.doneCount) : null
      await prisma.workEntry.create({
        data: {
          userId: s.userId,
          workDate: date,
          title: s.title,
          client: s.client,
          taskType: s.taskType,
          targetCount: remaining,
          status: s.status === 'DONE' ? 'PENDING' : s.status,
          remarks: `Carried forward: ${s.carryReason || ''}`.slice(0, 1000),
          isLate: false,
          isAssigned: s.isAssigned,
          assignedBy: s.assignedBy,
          carryCount: s.carryCount + 1,
          carriedFromId: s.id,
          position: 0
        }
      })
    } catch (err) {
      if (err.code !== 'P2002') console.error('Carry forward error:', err.message)
    }
  }
}

const loadContext = async (userId, dateStr, now = W.istNow()) => {
  const date = W.parseDateStr(dateStr)
  const [attendance, holiday, user] = await Promise.all([
    prisma.attendance.findUnique({ where: { userId_date: { userId, date } } }),
    prisma.holiday.findUnique({ where: { date } }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, role: true, createdAt: true, stream: { select: STREAM_SELECT } }
    })
  ])

  if (user) {
    const pre = W.computeDay({
      dateStr,
      entries: [],
      attendance: attendance ? attendance.status : null,
      isHoliday: !!holiday,
      joinedStr: W.judgedFrom(user.createdAt),
      exempt: user.role === 'ADMIN',
      now
    })
    if (pre.isToday && pre.working && !pre.closed) await materializeCarry([userId], dateStr)
  }

  const entries = await prisma.workEntry.findMany({
    where: { userId, workDate: date },
    include: FILES_INCLUDE,
    orderBy: [{ position: 'asc' }, { id: 'asc' }]
  })

  const state = W.computeDay({
    dateStr,
    entries,
    attendance: attendance ? attendance.status : null,
    isHoliday: !!holiday,
    joinedStr: user ? W.judgedFrom(user.createdAt) : null,
    exempt: !!user && user.role === 'ADMIN',
    now
  })

  return { entries, attendance, holiday, user, state }
}

// Validates only the fields that are present in body
const clean = (body) => {
  const data = {}

  if (body.title !== undefined) {
    const t = String(body.title ?? '').trim()
    if (!t) return { error: 'Task is required' }
    if (t.length > 300) return { error: 'Task is too long (max 300 characters)' }
    data.title = t
  }

  if (body.client !== undefined) {
    const c = String(body.client ?? '').trim()
    if (c.length > 150) return { error: 'Client/Project is too long (max 150 characters)' }
    data.client = c || null
  }

  if (body.taskType !== undefined) {
    const t = String(body.taskType ?? '').trim()
    if (t.length > 60) return { error: 'Task type is too long (max 60 characters)' }
    data.taskType = t || null
  }

  if (body.targetCount !== undefined) {
    if (body.targetCount === null || body.targetCount === '') {
      data.targetCount = null
    } else {
      const n = Number(body.targetCount)
      if (!Number.isInteger(n) || n < 1 || n > 100000) return { error: 'Target must be a whole number between 1 and 100000' }
      data.targetCount = n
    }
  }

  if (body.doneCount !== undefined) {
    const n = Number(body.doneCount === '' || body.doneCount === null ? 0 : body.doneCount)
    if (!Number.isInteger(n) || n < 0 || n > 1000000) return { error: 'Done count must be a whole number, 0 or more' }
    data.doneCount = n
  }

  for (const f of ['estHours', 'spentHours']) {
    if (body[f] !== undefined) {
      if (body[f] === null || body[f] === '') {
        data[f] = null
      } else {
        const n = Number(body[f])
        if (!Number.isFinite(n) || n < 0 || n > 24) return { error: 'Hours must be between 0 and 24' }
        data[f] = Math.round(n * 100) / 100
      }
    }
  }

  if (body.status !== undefined) {
    if (!STATUSES.includes(body.status)) return { error: 'Invalid status' }
    data.status = body.status
  }

  if (body.remarks !== undefined) {
    const r = String(body.remarks ?? '').trim()
    if (r.length > 1000) return { error: 'Remarks too long (max 1000 characters)' }
    data.remarks = r || null
  }

  if (body.proof !== undefined) {
    const p = String(body.proof ?? '').trim()
    if (p.length > 20000) return { error: 'Proof is too long (max 20000 characters)' }
    data.proof = p || null
  }

  if (body.carryForward !== undefined) data.carryForward = body.carryForward === true

  if (body.carryReason !== undefined) {
    const r = String(body.carryReason ?? '').trim()
    if (r.length > 300) return { error: 'Reason is too long (max 300 characters)' }
    data.carryReason = r || null
  }

  if (body.isShared !== undefined) data.isShared = body.isShared === true

  return { data }
}

// DONE needs done >= target when a target is set
const doneRuleError = ({ status, targetCount, doneCount }) => {
  if (status === 'DONE' && targetCount != null && doneCount < targetCount) {
    return `Done count (${doneCount}) must reach the target (${targetCount}) before marking Done`
  }
  return null
}

const dayPayload = (ctx) => ({
  serverNow: new Date().toISOString(),
  user: ctx.user ? { id: ctx.user.id, name: ctx.user.name, role: ctx.user.role } : null,
  stream: ctx.user && ctx.user.stream ? ctx.user.stream : null,
  state: ctx.state,
  attendance: ctx.attendance ? { status: ctx.attendance.status, note: ctx.attendance.note } : null,
  holiday: ctx.holiday ? { name: ctx.holiday.name } : null,
  entries: ctx.entries.map(fmtEntry)
})

// GET /api/worksheet/day?date=YYYY-MM-DD&userId=
const getDay = async (req, res) => {
  try {
    const now = W.istNow()
    const dateStr = req.query.date || now.dateStr
    if (!W.parseDateStr(dateStr)) return res.status(400).json({ message: 'Invalid date' })

    let userId = req.user.id
    if (req.query.userId) {
      const asked = parseInt(req.query.userId)
      if (!isAdmin(req) && asked !== req.user.id) return res.status(403).json({ message: 'Access denied' })
      userId = asked
    }

    const ctx = await loadContext(userId, dateStr, now)
    if (!ctx.user) return res.status(404).json({ message: 'User not found' })

    res.json(dayPayload(ctx))
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

// GET /api/worksheet/day/all?date=  (admin)
const getDayAll = async (req, res) => {
  try {
    const now = W.istNow()
    const dateStr = req.query.date || now.dateStr
    const date = W.parseDateStr(dateStr)
    if (!date) return res.status(400).json({ message: 'Invalid date' })

    const [users, attendance, holiday] = await Promise.all([
      prisma.user.findMany({
        where: { role: { in: ['MEMBER', 'ADMIN'] } },
        select: { id: true, name: true, role: true, createdAt: true, stream: { select: STREAM_SELECT } }
      }),
      prisma.attendance.findMany({ where: { date } }),
      prisma.holiday.findUnique({ where: { date } })
    ])

    const eligible = users
      .filter((u) => {
        const att = attendance.find((a) => a.userId === u.id)
        const pre = W.computeDay({
          dateStr,
          entries: [],
          attendance: att ? att.status : null,
          isHoliday: !!holiday,
          joinedStr: W.judgedFrom(u.createdAt),
          exempt: u.role === 'ADMIN',
          now
        })
        return pre.isToday && pre.working && !pre.closed
      })
      .map((u) => u.id)
    await materializeCarry(eligible, dateStr)

    const entries = await prisma.workEntry.findMany({
      where: { workDate: date },
      include: FILES_INCLUDE,
      orderBy: [{ position: 'asc' }, { id: 'asc' }]
    })

    users.sort((a, b) => (a.role === b.role ? a.name.localeCompare(b.name) : a.role === 'ADMIN' ? 1 : -1))

    const staff = users.map((u) => {
      const es = entries.filter((e) => e.userId === u.id)
      const att = attendance.find((a) => a.userId === u.id)
      const state = W.computeDay({
        dateStr,
        entries: es,
        attendance: att ? att.status : null,
        isHoliday: !!holiday,
        joinedStr: W.judgedFrom(u.createdAt),
        exempt: u.role === 'ADMIN',
        now
      })
      return {
        user: { id: u.id, name: u.name, role: u.role, stream: u.stream },
        attendance: att ? { status: att.status, note: att.note } : null,
        state,
        entries: es.map(fmtEntry)
      }
    })

    res.json({
      serverNow: new Date().toISOString(),
      date: dateStr,
      holiday: holiday ? { name: holiday.name } : null,
      staff
    })
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

// Shared by the month overview and the report
const buildMonth = async (users, month, now) => {
  const dates = W.monthDates(month)
  const start = W.parseDateStr(dates[0])
  const end = W.parseDateStr(dates[dates.length - 1])
  const ids = users.map((u) => u.id)

  const [entries, attendance, holidays] = await Promise.all([
    prisma.workEntry.findMany({
      where: { userId: { in: ids }, workDate: { gte: start, lte: end } },
      select: {
        userId: true,
        workDate: true,
        status: true,
        isLate: true,
        targetCount: true,
        doneCount: true,
        estHours: true,
        spentHours: true,
        isAssigned: true,
        carryForward: true,
        carriedFromId: true,
        taskType: true,
        _count: { select: { files: true } }
      }
    }),
    prisma.attendance.findMany({ where: { userId: { in: ids }, date: { gte: start, lte: end } } }),
    prisma.holiday.findMany({ where: { date: { gte: start, lte: end } } })
  ])

  const entryMap = new Map()
  for (const e of entries) {
    const k = `${e.userId}|${W.toDateStr(e.workDate)}`
    if (!entryMap.has(k)) entryMap.set(k, [])
    entryMap.get(k).push(e)
  }
  const attMap = new Map(attendance.map((a) => [`${a.userId}|${W.toDateStr(a.date)}`, a.status]))
  const holidaySet = new Set(holidays.map((h) => W.toDateStr(h.date)))

  const result = users.map((u) => {
    const joinedStr = W.judgedFrom(u.createdAt)
    const cells = dates.map((d) => {
      const k = `${u.id}|${d}`
      const list = entryMap.get(k) || []
      const s = W.computeDay({
        dateStr: d,
        entries: list,
        attendance: attMap.get(k) || null,
        isHoliday: holidaySet.has(d),
        joinedStr,
        now
      })
      return {
        date: d,
        status: s.status,
        marks: s.marks,
        rows: list.length,
        done: list.filter((x) => x.status === 'DONE').length
      }
    })
    return {
      id: u.id,
      name: u.name,
      stream: u.stream ? u.stream.name : null,
      cells,
      summary: {
        red: cells.filter((c) => c.marks.includes('RED')).length,
        blue: cells.filter((c) => c.marks.includes('BLUE')).length,
        green: cells.filter((c) => c.status === 'GREEN').length,
        carried: cells.filter((c) => c.status === 'CARRIED').length,
        absent: cells.filter((c) => c.status === 'ABSENT').length,
        excused: cells.filter((c) => c.status === 'EXCUSED').length
      }
    }
  })

  return {
    dates,
    holidays: holidays.map((h) => ({ date: W.toDateStr(h.date), name: h.name })),
    users: result,
    entries
  }
}

// GET /api/worksheet/month?month=YYYY-MM&streamId=
const getMonth = async (req, res) => {
  try {
    const now = W.istNow()
    const month = req.query.month || now.dateStr.slice(0, 7)
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return res.status(400).json({ message: 'Invalid month' })

    const streamId = parseInt(req.query.streamId) || null
    const where = isAdmin(req)
      ? { role: 'MEMBER', ...(streamId ? { streamId } : {}) }
      : { id: req.user.id }

    const users = await prisma.user.findMany({
      where,
      select: { id: true, name: true, createdAt: true, stream: { select: { id: true, name: true } } },
      orderBy: { name: 'asc' }
    })

    const built = await buildMonth(users, month, now)
    const streams = isAdmin(req)
      ? await prisma.stream.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } })
      : []

    res.json({
      serverNow: new Date().toISOString(),
      month,
      dates: built.dates,
      holidays: built.holidays,
      streams,
      users: built.users
    })
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

const typeError = (stream, taskType) => {
  if (!taskType) return null
  if (!stream || !stream.taskTypes.includes(taskType)) {
    return 'Pick a task type from your stream list, or leave it empty'
  }
  return null
}

// POST /api/worksheet/entries
const createEntry = async (req, res) => {
  try {
    const admin = isAdmin(req)
    const now = W.istNow()

    const userId = admin ? parseInt(req.body.userId) : req.user.id
    const dateStr = admin ? req.body.date || now.dateStr : now.dateStr
    if (!userId || !W.parseDateStr(dateStr)) return res.status(400).json({ message: 'userId and a valid date are required' })

    const { data, error } = clean(req.body)
    if (error) return res.status(400).json({ message: error })
    if (!data.title) return res.status(400).json({ message: 'Task is required' })

    const ctx = await loadContext(userId, dateStr, now)
    if (!ctx.user) return res.status(404).json({ message: 'User not found' })

    // Admin adding a row to someone else's sheet is an assignment
    const assigned = admin && userId !== req.user.id

    delete data.carryForward
    delete data.carryReason
    if (!admin || ctx.user.role !== 'ADMIN') delete data.isShared

    if (!admin) {
      if (ctx.state.writeBlock) return res.status(403).json(ctx.state.writeBlock)
      if (ctx.entries.length >= MAX_ROWS_PER_DAY) {
        return res.status(400).json({ message: `Maximum ${MAX_ROWS_PER_DAY} rows per day` })
      }
      const te = typeError(ctx.user.stream, data.taskType)
      if (te) return res.status(400).json({ message: te })
      if (ctx.user.stream && ctx.user.stream.requireProof && data.status === 'DONE' && !data.proof) {
        return res.status(400).json({ message: 'Add a file or proof link before marking this Done' })
      }
    }

    const doneErr = doneRuleError({
      status: data.status || 'PENDING',
      targetCount: data.targetCount ?? null,
      doneCount: data.doneCount ?? 0
    })
    if (doneErr) return res.status(400).json({ message: doneErr })

    const maxPos = ctx.entries.reduce((m, e) => Math.max(m, e.position), 0)

    const entry = await prisma.workEntry.create({
      data: {
        ...data,
        userId,
        workDate: W.parseDateStr(dateStr),
        isLate: !admin && ctx.state.planFrozen,
        isAssigned: assigned,
        assignedBy: assigned ? req.user.id : null,
        position: maxPos + 1
      },
      include: FILES_INCLUDE
    })

    if (admin) await logChange(req.user.id, userId, dateStr, entry.id, assigned ? 'ASSIGN' : 'CREATE', null, entry)

    if (assigned) {
      try {
        const when = dateStr === now.dateStr ? 'today' : dateStr
        await createNotification(userId, 'New Work Assigned', `New work for ${when}: "${entry.title}"`)
      } catch (err) {
        console.error('Assign notification error:', err.message)
      }
    }

    res.status(201).json({ entry: fmtEntry(entry) })
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

// PATCH /api/worksheet/entries/:id
const updateEntry = async (req, res) => {
  try {
    const admin = isAdmin(req)
    const id = parseInt(req.params.id)
    const existing = await prisma.workEntry.findUnique({ where: { id }, include: UPDATE_INCLUDE })
    if (!existing || (!admin && existing.userId !== req.user.id)) {
      return res.status(404).json({ message: 'Entry not found' })
    }

    const dateStr = W.toDateStr(existing.workDate)
    const ctx = await loadContext(existing.userId, dateStr)

    const { data, error } = clean(req.body)
    if (error) return res.status(400).json({ message: error })

    if (!admin) {
      delete data.isShared
      if (ctx.state.writeBlock) return res.status(403).json(ctx.state.writeBlock)

      const rowLocked = existing.isAssigned || !!existing.carriedFromId
      if (ctx.state.planFrozen || rowLocked) {
        for (const f of PLAN_FIELDS) {
          if (f in data) {
            if (data[f] !== existing[f]) {
              return res.status(403).json(
                ctx.state.planFrozen
                  ? {
                      code: 'PLAN_FROZEN',
                      message: 'Plan is frozen after 11:45 AM. You can still change Done, Status, Spent hours, Remarks and Proof.'
                    }
                  : {
                      code: 'ROW_LOCKED',
                      message: 'This row was assigned or carried forward. You can update Done, Status, Spent hours, Remarks and Proof.'
                    }
              )
            }
            delete data[f]
          }
        }
      } else if ('taskType' in data && data.taskType !== existing.taskType) {
        const te = typeError(ctx.user && ctx.user.stream, data.taskType)
        if (te) return res.status(400).json({ message: te })
      }
    }

    const merged = {
      status: data.status ?? existing.status,
      targetCount: 'targetCount' in data ? data.targetCount : existing.targetCount,
      doneCount: data.doneCount ?? existing.doneCount
    }
    const doneErr = doneRuleError(merged)
    if (doneErr) return res.status(400).json({ message: doneErr })

    // Stream rule: some streams need a file or link before Done (staff only)
    if (!admin && merged.status === 'DONE' && existing.status !== 'DONE') {
      const stream = ctx.user && ctx.user.stream
      if (stream && stream.requireProof) {
        const proofText = 'proof' in data ? data.proof : existing.proof
        if (existing.files.length === 0 && !(proofText || '').trim()) {
          return res.status(400).json({
            message: `${stream.name} work needs a file or proof link before it can be marked Done`
          })
        }
      }
    }

    // Carry forward rules
    if (data.carryForward === true) {
      const reason = 'carryReason' in data ? data.carryReason : existing.carryReason
      if (!reason || reason.length < 3) {
        return res.status(400).json({ message: 'Add a reason (at least 3 characters) to carry this work forward' })
      }
      if (existing.carriedTo) return res.status(400).json({ message: 'This row was already carried to the next day' })
      if (existing.carryCount >= MAX_CARRIES) {
        return res.status(400).json({ message: `This work was already carried forward ${MAX_CARRIES} times. Finish it or ask admin.` })
      }
      if (merged.status === 'DONE') return res.status(400).json({ message: 'Finished work cannot be carried forward' })
    }
    if (data.carryForward === false) {
      if (existing.carriedTo) return res.status(400).json({ message: 'Cannot undo: already moved to the next day' })
      data.carryReason = null
    }
    if (data.status === 'DONE' && existing.carryForward && !existing.carriedTo && data.carryForward === undefined) {
      data.carryForward = false
      data.carryReason = null
    }

    if (Object.keys(data).length === 0) return res.json({ entry: fmtEntry(existing) })

    const entry = await prisma.workEntry.update({ where: { id }, data, include: FILES_INCLUDE })

    if (admin) await logChange(req.user.id, existing.userId, dateStr, id, 'UPDATE', existing, entry)

    res.json({ entry: fmtEntry(entry) })
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

// DELETE /api/worksheet/entries/:id
const deleteEntry = async (req, res) => {
  try {
    const admin = isAdmin(req)
    const id = parseInt(req.params.id)
    const existing = await prisma.workEntry.findUnique({ where: { id }, include: FILES_INCLUDE })
    if (!existing || (!admin && existing.userId !== req.user.id)) {
      return res.status(404).json({ message: 'Entry not found' })
    }

    const dateStr = W.toDateStr(existing.workDate)

    if (!admin) {
      if (existing.isAssigned || existing.carriedFromId) {
        return res.status(403).json({ code: 'ROW_LOCKED', message: 'Assigned or carried rows can only be removed by admin.' })
      }
      const ctx = await loadContext(existing.userId, dateStr)
      if (ctx.state.writeBlock) return res.status(403).json(ctx.state.writeBlock)
      if (ctx.state.planFrozen) {
        return res.status(403).json({ code: 'PLAN_FROZEN', message: 'Rows cannot be deleted after 11:45 AM.' })
      }
    }

    await prisma.workEntry.delete({ where: { id } })
    await Promise.all(existing.files.map((f) => deleteFromR2(f.fileKey).catch(() => {})))

    if (admin) await logChange(req.user.id, existing.userId, dateStr, id, 'DELETE', existing, null)

    res.json({ message: 'Entry deleted' })
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

// PUT /api/worksheet/attendance  (admin)  status: PRESENT | ABSENT | EXCUSED | null (clear)
const setAttendance = async (req, res) => {
  try {
    const userId = parseInt(req.body.userId)
    const dateStr = req.body.date
    const date = W.parseDateStr(dateStr)
    const status = req.body.status || null
    const note = req.body.note ? String(req.body.note).trim().slice(0, 300) : null

    if (!userId || !date) return res.status(400).json({ message: 'userId and a valid date are required' })
    if (status !== null && !['PRESENT', 'ABSENT', 'EXCUSED'].includes(status)) {
      return res.status(400).json({ message: 'Status must be PRESENT, ABSENT, EXCUSED or null' })
    }

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } })
    if (!user) return res.status(404).json({ message: 'User not found' })

    if (status === null) {
      await prisma.attendance.deleteMany({ where: { userId, date } })
    } else {
      await prisma.attendance.upsert({
        where: { userId_date: { userId, date } },
        update: { status, note, markedBy: req.user.id },
        create: { userId, date, status, note, markedBy: req.user.id }
      })
    }

    await logChange(req.user.id, userId, dateStr, null, status ? 'ATTENDANCE_SET' : 'ATTENDANCE_CLEAR', null, { status, note })

    res.json({ userId, date: dateStr, status, note })
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

// GET /api/worksheet/holidays?year=2026
const getHolidays = async (req, res) => {
  try {
    const year = parseInt(req.query.year) || Number(W.istNow().dateStr.slice(0, 4))
    const holidays = await prisma.holiday.findMany({
      where: {
        date: { gte: new Date(`${year}-01-01T00:00:00.000Z`), lte: new Date(`${year}-12-31T00:00:00.000Z`) }
      },
      orderBy: { date: 'asc' }
    })
    res.json(holidays.map((h) => ({ id: h.id, date: W.toDateStr(h.date), name: h.name })))
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

// POST /api/worksheet/holidays  (admin)
const createHoliday = async (req, res) => {
  try {
    const date = W.parseDateStr(req.body.date)
    const name = String(req.body.name || '').trim()
    if (!date || !name) return res.status(400).json({ message: 'Valid date and name are required' })
    if (name.length > 150) return res.status(400).json({ message: 'Name too long' })

    const h = await prisma.holiday.create({ data: { date, name } })
    res.status(201).json({ id: h.id, date: W.toDateStr(h.date), name: h.name })
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ message: 'A holiday already exists on this date' })
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

// DELETE /api/worksheet/holidays/:id  (admin)
const deleteHoliday = async (req, res) => {
  try {
    await prisma.holiday.delete({ where: { id: parseInt(req.params.id) } })
    res.json({ message: 'Holiday deleted' })
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ message: 'Holiday not found' })
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

module.exports = {
  getDay,
  getDayAll,
  getMonth,
  createEntry,
  updateEntry,
  deleteEntry,
  setAttendance,
  getHolidays,
  createHoliday,
  deleteHoliday,
  loadContext,
  fmtFile,
  fmtEntry,
  logChange,
  clean,
  buildMonth,
  STREAM_SELECT
}