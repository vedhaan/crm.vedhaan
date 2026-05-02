const express = require('express')
const router = express.Router()
const { register, login } = require('../controllers/auth.controller')
const { protect, adminOnly } = require('../middleware/auth.middleware')

router.post('/register', protect, adminOnly, register)
router.post('/login', login)

module.exports = router