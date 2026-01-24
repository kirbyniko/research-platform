import Stripe from 'stripe';

// Re-export credit packages from separate file
export { CREDIT_PACKAGES, getPackageById } from './stripe-packages';

// Initialize Stripe with secret key (server-side only)
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

// Only log warning on server side
if (typeof window === 'undefined' && !stripeSecretKey) {
  console.warn('[Server] STRIPE_SECRET_KEY not set - payment features will be unavailable');
}

export const stripe = stripeSecretKey 
  ? new Stripe(stripeSecretKey)
  : null;

export const isStripeConfigured = !!stripeSecretKey;

