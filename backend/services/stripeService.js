import Stripe from 'stripe';

class StripeService {
  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
    });
  }

  // Create a customer
  async createCustomer(userData) {
    try {
      const customer = await this.stripe.customers.create({
        email: userData.email,
        name: userData.name,
        metadata: {
          userId: userData.id,
          studentId: userData.studentId,
          branch: userData.branch,
          semester: userData.semester
        }
      });
      return customer;
    } catch (error) {
      console.error('Error creating Stripe customer:', error);
      throw error;
    }
  }

  // Create a payment intent
  async createPaymentIntent(amount, currency = 'inr', customerId, metadata = {}) {
    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: amount * 100, // Convert to paise
        currency,
        customer: customerId,
        metadata,
        automatic_payment_methods: {
          enabled: true,
        },
      });
      return paymentIntent;
    } catch (error) {
      console.error('Error creating payment intent:', error);
      throw error;
    }
  }

  // Create a subscription
  async createSubscription(customerId, priceId, metadata = {}) {
    try {
      const subscription = await this.stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
        metadata,
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent'],
      });
      return subscription;
    } catch (error) {
      console.error('Error creating subscription:', error);
      throw error;
    }
  }

  // Create a price for a product
  async createPrice(productId, amount, currency = 'inr', interval = 'month') {
    try {
      const price = await this.stripe.prices.create({
        product: productId,
        unit_amount: amount * 100, // Convert to paise
        currency,
        recurring: {
          interval,
        },
      });
      return price;
    } catch (error) {
      console.error('Error creating price:', error);
      throw error;
    }
  }

  // Create a product
  async createProduct(name, description, metadata = {}) {
    try {
      const product = await this.stripe.products.create({
        name,
        description,
        metadata,
      });
      return product;
    } catch (error) {
      console.error('Error creating product:', error);
      throw error;
    }
  }

  // Retrieve a customer
  async getCustomer(customerId) {
    try {
      const customer = await this.stripe.customers.retrieve(customerId);
      return customer;
    } catch (error) {
      console.error('Error retrieving customer:', error);
      throw error;
    }
  }

  // Retrieve a subscription
  async getSubscription(subscriptionId) {
    try {
      const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);
      return subscription;
    } catch (error) {
      console.error('Error retrieving subscription:', error);
      throw error;
    }
  }

  // Cancel a subscription
  async cancelSubscription(subscriptionId) {
    try {
      const subscription = await this.stripe.subscriptions.cancel(subscriptionId);
      return subscription;
    } catch (error) {
      console.error('Error canceling subscription:', error);
      throw error;
    }
  }

  // Update subscription
  async updateSubscription(subscriptionId, updates) {
    try {
      const subscription = await this.stripe.subscriptions.update(subscriptionId, updates);
      return subscription;
    } catch (error) {
      console.error('Error updating subscription:', error);
      throw error;
    }
  }

  // Create a checkout session
  async createCheckoutSession(customerId, priceId, successUrl, cancelUrl, metadata = {}) {
    try {
      const session = await this.stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata,
      });
      return session;
    } catch (error) {
      console.error('Error creating checkout session:', error);
      throw error;
    }
  }

  // Create a portal session
  async createPortalSession(customerId, returnUrl) {
    try {
      const session = await this.stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl,
      });
      return session;
    } catch (error) {
      console.error('Error creating portal session:', error);
      throw error;
    }
  }

  // Verify webhook signature
  verifyWebhookSignature(payload, signature, secret) {
    try {
      const event = this.stripe.webhooks.constructEvent(payload, signature, secret);
      return event;
    } catch (error) {
      console.error('Error verifying webhook signature:', error);
      throw error;
    }
  }

  // Handle successful payment
  async handleSuccessfulPayment(paymentIntent) {
    try {
      // Update subscription status in database
      const subscriptionId = paymentIntent.metadata.subscriptionId;
      if (subscriptionId) {
        const subscription = await this.getSubscription(subscriptionId);
        return subscription;
      }
      return null;
    } catch (error) {
      console.error('Error handling successful payment:', error);
      throw error;
    }
  }

  // Get subscription plans
  async getSubscriptionPlans() {
    try {
      const prices = await this.stripe.prices.list({
        active: true,
        expand: ['data.product'],
      });
      return prices.data;
    } catch (error) {
      console.error('Error getting subscription plans:', error);
      throw error;
    }
  }
}

export default new StripeService();
