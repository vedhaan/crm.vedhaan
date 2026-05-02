const express = require('express')
const router = express.Router()
const { getAllUsers, deleteUser } = require('../controllers/user.controller')
const { protect, adminOnly } = require('../middleware/auth.middleware')

router.use(protect)
router.use(adminOnly)

router.get('/', getAllUsers)
router.delete('/:id', deleteUser)

module.exports = router