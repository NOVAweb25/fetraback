const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment');

router.post('/create-payment', paymentController.createPayment);
router.post('/charge-saved-card', paymentController.chargeSavedCard);
router.post('/webhook', paymentController.moyasarWebhook); // لا تستخدم json parser هنا، Moyasar يرسل raw

module.exports = router;