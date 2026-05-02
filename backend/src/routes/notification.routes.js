const express = require('express')
const router = express.Router()
const { getMyNotifications, markAllRead, markOneRead } = require('../controllers/notification.controller')
const { protect } = require('../middleware/auth.middleware')

router.use(protect)

router.get('/', getMyNotifications)
router.put('/read-all', markAllRead)
router.put('/:id/read', markOneRead)

module.exports = router