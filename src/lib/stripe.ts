import Stripe from 'stripe';

// Initialize Stripe with secret key
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  console.warn('STRIPE_SECRET_KEY not set - payment features will be unavailable');
}

export const stripe = stripeSecretKey 
  ? new Stripe(stripeSecretKey)
  : null;

export const isStripeConfigured = !!stripeSecretKey;

// Credit package definitions
export const CREDIT_PACKAGES = [
  {
    id: 'credits_10',
    name: '10 AI Credits',
    credits: 10,
    price: 500, // $5.00 in cents
    description: 'Generate 10 AI templates',
    popular: false,
  },
  {
    id: 'credits_50',
    name: '50 AI Credits',
    credits: 50,
    price: 2000, // $20.00 - 20% savings
    description: 'Generate 50 AI templates (20% savings)',
    savings: '20%',
    popular: true,
  },
  {
    id: 'credits_200',
    name: '200 AI Credits',
    credits: 200,
    price: 6000, // $60.00 - 40% savings
    description: 'Generate 200 AI templates (40% savings)',
    savings: '40%',
    popular: false,
  },
  {
    id: 'credits_500',
    name: '500 AI Credits',
    credits: 500,
    price: 12500, // $125.00 - 50% savings
    description: 'Generate 500 AI templates (50% savings)',
    savings: '50%',
    popular: false,
  },
];

export function getPackageById(packageId: string) {
  return CREDIT_PACKAGES.find(p => p.id === packageId);
}
