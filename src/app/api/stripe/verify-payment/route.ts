import { NextRequest, NextResponse } from 'next/server';
import { stripe, isStripeConfigured } from '@/lib/stripe';
import { requireServerAuth } from '@/lib/server-auth';
import { addCredits } from '@/lib/ai-rate-limit';
import pool from '@/lib/db';

// POST /api/stripe/verify-payment - Check if a payment succeeded and add credits if not already added
export async function POST(request: NextRequest) {
  if (!isStripeConfigured || !stripe) {
    return NextResponse.json({ error: 'Stripe is not configured' }, { status: 503 });
  }

  try {
    const authResult = await requireServerAuth(request);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const userId = authResult.user.id;

    const body = await request.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    console.log(`[Verify Payment] Checking session ${sessionId} for user ${userId}`);

    // Get the checkout session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== 'paid') {
      console.log(`[Verify Payment] Payment not completed. Status: ${session.payment_status}`);
      return NextResponse.json({ success: false, message: 'Payment not completed' });
    }

    // Check if we already processed this payment
    const existingTransaction = await pool.query(
      `SELECT id FROM credit_transactions WHERE stripe_checkout_session_id = $1`,
      [sessionId]
    );

    if (existingTransaction.rows.length > 0) {
      console.log(`[Verify Payment] Credits already added for session ${sessionId}`);
      return NextResponse.json({ success: true, message: 'Credits already added' });
    }

    // Get metadata
    const projectId = parseInt(session.metadata?.projectId || '0');
    const credits = parseInt(session.metadata?.credits || '0');
    const packageId = session.metadata?.packageId;

    if (!projectId || !credits) {
      console.error(`[Verify Payment] Invalid metadata in session ${sessionId}:`, session.metadata);
      return NextResponse.json({ error: 'Invalid session metadata' }, { status: 400 });
    }

    // Verify user has access to the project
    const projectCheck = await pool.query(
      `SELECT p.id FROM projects p
       JOIN project_members pm ON pm.project_id = p.id
       WHERE p.id = $1 AND pm.user_id = $2 AND p.deleted_at IS NULL`,
      [projectId, userId]
    );

    if (projectCheck.rows.length === 0) {
      console.error(`[Verify Payment] User ${userId} doesn't have access to project ${projectId}`);
      return NextResponse.json({ error: 'Project not found or access denied' }, { status: 403 });
    }

    console.log(`[Verify Payment] Adding ${credits} credits to project ${projectId} for user ${userId}`);

    // Add credits
    const result = await addCredits(userId, projectId, credits, {
      stripeCheckoutSessionId: sessionId,
      stripePaymentIntentId: session.payment_intent as string,
      description: `Purchased ${packageId}: ${credits} credits (manual verification)`,
      transactionType: 'purchase',
    });

    console.log(`[Verify Payment] SUCCESS: Added ${credits} credits. New balance: ${result.newBalance}`);

    return NextResponse.json({ 
      success: true, 
      message: 'Credits added successfully',
      newBalance: result.newBalance 
    });
  } catch (error) {
    console.error('[Verify Payment] Error:', error);
    return NextResponse.json({ error: 'Failed to verify payment' }, { status: 500 });
  }
}
