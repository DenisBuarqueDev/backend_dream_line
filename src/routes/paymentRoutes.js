const express = require('express');
const router = express.Router();
const { handleWebhook, testWebhook } = require('../controllers/paymentController');

router.post('/webhook', handleWebhook);
router.get('/test-webhook', (req, res) => {
  res.json({
    message: 'Endpoint de teste do webhook Mercado Pago',
    usage: {
      simulatePaymentApproved: {
        method: 'POST',
        url: '/api/payments/test-webhook',
        body: { action: 'payment.approved', data: { id: 'test_123' }, type: 'payment' }
      },
      simulateSubscriptionCreated: {
        method: 'POST',
        url: '/api/payments/test-webhook',
        body: { action: 'subscription_created', data: { id: 'test_123' }, type: 'subscription' }
      },
      simulateSubscriptionCancelled: {
        method: 'POST',
        url: '/api/payments/test-webhook',
        body: { action: 'subscription_cancelled', data: { id: 'test_123' }, type: 'subscription' }
      }
    }
  });
});
router.post('/test-webhook', testWebhook);

module.exports = router;
