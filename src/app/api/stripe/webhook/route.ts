import { NextRequest, NextResponse } from 'next/server';
import { stripe, isStripeConfigured, getPackageById } from '@/lib/stripe';
import { addCredits } from '@/lib/ai-rate-limit';
import pool from '@/lib/db';

// Stripe webhook handler
export async function POST(request: NextRequest) {
  console.log('[Stripe Webhook] Received webhook request');
  
  if (!isStripeConfigured || !stripe) {
    console.error('[Stripe Webhook] Stripe not configured');
    return NextResponse.json({ error: 'Stripe is not configured' }, { status: 503 });
  }

  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  console.log('[Stripe Webhook] Signature present:', !!signature);
  console.log('[Stripe Webhook] Body length:', body.length);

  if (!signature) {
    console.error('[Stripe Webhook] Missing signature header');
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('[Stripe Webhook] STRIPE_WEBHOOK_SECRET not configured in environment');
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 });
  }

  console.log('[Stripe Webhook] Webhook secret configured:', webhookSecret.substring(0, 10) + '...');

  let event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    console.log('[Stripe Webhook] Event constructed successfully. Type:', event.type);
  } catch (err) {
    console.error('[Stripe Webhook] Signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      
      console.log('[Stripe Webhook] Checkout session completed:', session.id);
      console.log('[Stripe Webhook] Metadata:', session.metadata);
      
      // Get metadata
      const userId = parseInt(session.metadata?.userId || '0');
      const projectId = parseInt(session.metadata?.projectId || '0');
      const packageId = session.metadata?.packageId;
      const credits = parseInt(session.metadata?.credits || '0');
      
      console.log('[Stripe Webhook] Parsed values - userId:', userId, 'projectId:', projectId, 'credits:', credits);
      
      if (!userId || !projectId || !credits) {
        console.error('[Stripe Webhook] Missing metadata in checkout session:', session.id);
        console.error('[Stripe Webhook] Metadata received:', JSON.stringify(session.metadata));
        return NextResponse.json({ error: 'Invalid session metadata' }, { status: 400 });
      }

      console.log(`[Stripe Webhook] Processing checkout for project ${projectId} by user ${userId}: ${credits} credits`);

      try {
        // Add credits to project
        const result = await addCredits(userId, projectId, credits, {
          stripeCheckoutSessionId: session.id,
          stripePaymentIntentId: session.payment_intent as string,
          description: `Purchased ${packageId}: ${credits} credits`,
          transactionType: 'purchase',
        });

        console.log(`[Stripe Webhook] SUCCESS: Added ${credits} credits to project ${projectId}. New balance: ${result.newBalance}`);
      } catch (error) {
        console.error('[Stripe Webhook] Failed to add credits:', error);
        console.error('[Stripe Webhook] Error details:', error instanceof Error ? error.message : String(error));
        console.error('[Stripe Webhook] Error stack:', error instanceof Error ? error.stack : 'No stack');
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
