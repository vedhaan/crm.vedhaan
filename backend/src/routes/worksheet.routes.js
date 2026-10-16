const express = require('express')
const router = express.Router()
const {
  getDay, getDayAll, getMonth,
  createEntry, updateEntry, deleteEntry,
  setAttendance, getHolidays, createHoliday, deleteHoliday
} = require('../controllers/worksheet.controller')
const {
  getStreams, createStream, updateStream, deleteStream, seedStreams,
  setUserStream, assignWork, getReport
} = require('../controllers/worksheetAdmin.controller')
const { uploadFiles } = require('../middleware/worksheetUpload.middleware')
const { uploadEntryFiles, downloadFile, deleteFile, getShared } = require('../controllers/worksheetFile.controller')
const { protect, adminOnly } = require('../middleware/auth.middleware')

router.use(protect)

router.get('/day', getDay)
router.get('/day/all', adminOnly, getDayAll)
router.get('/month', getMonth)
router.get('/report', adminOnly, getReport)

router.post('/entries', createEntry)
router.patch('/entries/:id', updateEntry)
router.delete('/entries/:id', deleteEntry)
router.post('/assign', adminOnly, assignWork)

router.post('/entries/:id/files', uploadFiles, uploadEntryFiles)
router.get('/files/:id/download', downloadFile)
router.delete('/files/:id', deleteFile)
router.get('/shared', getShared)

router.put('/attendance', adminOnly, setAttendance)

router.get('/streams', adminOnly, getStreams)
router.post('/streams', adminOnly, createStream)
router.post('/streams/seed', adminOnly, seedStreams)
router.patch('/streams/:id', adminOnly, updateStream)
router.delete('/streams/:id', adminOnly, deleteStream)
router.put('/staff/:id/stream', adminOnly, setUserStream)

router.get('/holidays', getHolidays)
router.post('/holidays', adminOnly, createHoliday)
router.delete('/holidays/:id', adminOnly, deleteHoliday)

module.exports = router