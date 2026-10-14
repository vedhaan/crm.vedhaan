const express = require('express')
const router = express.Router()
const {
  getDay, getDayAll, getMonth,
  createEntry, updateEntry, deleteEntry,
  setAttendance, getHolidays, createHoliday, deleteHoliday
} = require('../controllers/worksheet.controller')
const { protect, adminOnly } = require('../middleware/auth.middleware')
const { uploadFiles } = require('../middleware/worksheetUpload.middleware')
const { uploadEntryFiles, downloadFile, deleteFile, getShared } = require('../controllers/worksheetFile.controller')

router.use(protect)

router.get('/day', getDay)
router.get('/day/all', adminOnly, getDayAll)
router.get('/month', getMonth)

router.post('/entries', createEntry)
router.patch('/entries/:id', updateEntry)
router.delete('/entries/:id', deleteEntry)

router.put('/attendance', adminOnly, setAttendance)

router.get('/holidays', getHolidays)
router.post('/holidays', adminOnly, createHoliday)
router.delete('/holidays/:id', adminOnly, deleteHoliday)
router.post('/entries/:id/files', uploadFiles, uploadEntryFiles)
router.get('/files/:id/download', downloadFile)
router.delete('/files/:id', deleteFile)
router.get('/shared', getShared)

module.exports = router