const express = require('express')
const router = express.Router()
const { uploadTaskFiles, getTaskFiles, deleteTaskFile } = require('../controllers/file.controller')
const { protect } = require('../middleware/auth.middleware')
const upload = require('../middleware/upload.middleware')

router.use(protect)

router.post('/tasks/:taskId/files', upload.array('files', 20), uploadTaskFiles)
router.get('/tasks/:taskId/files', getTaskFiles)
router.delete('/files/:fileId', deleteTaskFile)

module.exports = router