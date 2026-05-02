const express = require('express')
const router = express.Router()
const { createInvoice, getAllInvoices, markAsPaid, markAsOverdue, deleteInvoice } = require('../controllers/invoice.controller')
const { protect, adminOnly } = require('../middleware/auth.middleware')

router.use(protect)

router.get('/', getAllInvoices)
router.post('/', adminOnly, createInvoice)
router.put('/:id/paid', adminOnly, markAsPaid)
router.put('/:id/overdue', adminOnly, markAsOverdue)
router.delete('/:id', adminOnly, deleteInvoice)

module.exports = router