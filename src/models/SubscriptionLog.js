const mongoose = require('mongoose');

const SubscriptionLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  action: {
    type: String,
    required: true,
    enum: [
      'subscription_created',
      'subscription_activated',
      'subscription_cancelled',
      'subscription_expired',
      'subscription_updated',
      'payment_received',
      'payment_failed',
      'plan_changed',
      'webhook_received',
      'checkout_preference_created'
    ]
  },
  plan: {
    type: String,
    enum: ['free', 'premium'],
    default: null
  },
  status: {
    type: String,
    enum: ['inactive', 'active', 'cancelled', 'expired', 'pending'],
    default: null
  },
  mercadoPagoSubscriptionId: {
    type: String,
    default: null
  },
  mercadoPagoPlanId: {
    type: String,
    default: null
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  ip: {
    type: String,
    default: null
  },
  userAgent: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

SubscriptionLogSchema.index({ userId: 1, createdAt: -1 });
SubscriptionLogSchema.index({ mercadoPagoSubscriptionId: 1 });

module.exports = mongoose.model('SubscriptionLog', SubscriptionLogSchema);
