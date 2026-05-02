const express = require('express')
const router = express.Router()
const { createLead, getAllLeads, getLeadById, updateLeadStatus, deleteLead } = require('../controllers/lead.controller')
const { protect, adminOnly } = require('../middleware/auth.middleware')

router.use(protect)

router.get('/', getAllLeads)
router.get('/:id', getLeadById)
router.post('/', adminOnly, createLead)
router.put('/:id', adminOnly, updateLeadStatus)
router.delete('/:id', adminOnly, deleteLead)

module.exports = router