const express = require('express')
const router = express.Router()
const { getProfile, updateProfile, changePassword } = require('../controllers/profile.controller')
const { protect } = require('../middleware/auth.middleware')

router.use(protect)

router.get('/', getProfile)
router.put('/', updateProfile)
router.put('/change-password', changePassword)

module.exports = router