const express = require('express')
const router = express.Router()
const { createClient, getAllClients, getClientById, updateClient, deleteClient } = require('../controllers/client.controller')
const { protect, adminOnly } = require('../middleware/auth.middleware')

router.use(protect) // all routes below require login

router.get('/', getAllClients)
router.get('/:id', getClientById)
router.post('/', adminOnly, createClient)
router.put('/:id', adminOnly, updateClient)
router.delete('/:id', adminOnly, deleteClient)

module.exports = router