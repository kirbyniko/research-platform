import { NextRequest, NextResponse } from 'next/server';
import { stripe, isStripeConfigured, getPackageById } from '@/lib/stripe';
import { addCredits } from '@/lib/ai-rate-limit';
import pool from '@/lib/db';

// Stripe webhook handler
export async function POST(request: NextRequest) {
  if (!isStripeConfigured || !stripe) {
    return NextResponse.json({ error: 'Stripe is not configured' }, { status: 503 });
  }

  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET not configured');
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 });
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      
      // Get metadata
      const userId = parseInt(session.metadata?.userId || '0');
      const projectId = parseInt(session.metadata?.projectId || '0');
      const packageId = session.metadata?.packageId;
      const credits = parseInt(session.metadata?.credits || '0');
      
      if (!userId || !projectId || !credits) {
        console.error('Missing metadata in checkout session:', session.id);
        return NextResponse.json({ error: 'Invalid session metadata' }, { status: 400 });
      }

      console.log(`Processing checkout for project ${projectId} by user ${userId}: ${credits} credits`);

      try {
        // Add credits to project
        const result = await addCredits(userId, projectId, credits, {
          stripeCheckoutSessionId: session.id,
          stripePaymentIntentId: session.payment_intent as string,
          description: `Purchased ${packageId}: ${credits} credits`,
          transactionType: 'purchase',
        });

        console.log(`Added ${credits} credits to project ${projectId}. New balance: ${result.newBalance}`);
      } catch (error) {
        console.error('Failed to add credits:', error);
        return NextResponse.json({ error: 'Failed to add credits' }, { status: 500 });
      }
      break;
    }

    case 'payment_intent.succeeded': {
      console.log('Payment succeeded:', event.data.object.id);
      break;
    }

    case 'payment_intent.payment_failed': {
      console.log('Payment failed:', event.data.object.id);
      break;
    }

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  return NextResponse.json({ received: true });
}
