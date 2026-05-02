const express = require('express')
const router = express.Router()
const { createTask, getAllTasks, getTaskById, updateTask, deleteTask, getMyTasks } = require('../controllers/task.controller')
const { protect, adminOnly } = require('../middleware/auth.middleware')

router.use(protect)

router.get('/', getAllTasks)
router.get('/my', getMyTasks)
router.get('/:id', getTaskById)
router.post('/', adminOnly, createTask)
router.put('/:id', updateTask)
router.delete('/:id', adminOnly, deleteTask)

module.exports = router