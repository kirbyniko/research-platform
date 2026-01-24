import { NextRequest, NextResponse } from 'next/server';
import { stripe, isStripeConfigured, CREDIT_PACKAGES, getPackageById } from '@/lib/stripe';
import { requireServerAuth } from '@/lib/server-auth';
import pool from '@/lib/db';

// POST /api/stripe/checkout - Create a checkout session
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
    const { packageId, projectId } = body;

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    const pkg = getPackageById(packageId);
    if (!pkg) {
      return NextResponse.json({ error: 'Invalid package' }, { status: 400 });
    }

    // Verify user has access to the project
    const projectCheck = await pool.query(
      `SELECT p.id, p.name FROM projects p
       JOIN project_members pm ON pm.project_id = p.id
       WHERE p.id = $1 AND pm.user_id = $2 AND p.deleted_at IS NULL`,
      [projectId, userId]
    );

    if (projectCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Project not found or access denied' }, { status: 403 });
    }

    const project = projectCheck.rows[0];

    // Get or create Stripe customer ID
    let stripeCustomerId: string;
    const userResult = await pool.query(
      `SELECT stripe_customer_id, email, name FROM users WHERE id = $1`,
      [userId]
    );
    
    const user = userResult.rows[0];
    
    if (user.stripe_customer_id) {
      stripeCustomerId = user.stripe_customer_id;
    } else {
      // Create Stripe customer
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name || undefined,
        metadata: {
          userId: userId.toString(),
        },
      });
      stripeCustomerId = customer.id;
      
      // Save customer ID
      await pool.query(
        `UPDATE users SET stripe_customer_id = $1 WHERE id = $2`,
        [stripeCustomerId, userId]
      );
    }

    // Get the base URL from the request
    const protocol = request.headers.get('x-forwarded-proto') || 'http';
    const host = request.headers.get('host') || 'localhost:3000';
    const baseUrl = `${protocol}://${host}`;

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${pkg.name} - ${project.name}`,
              description: `${pkg.description} for project: ${project.name}`,
            },
            unit_amount: pkg.price,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${baseUrl}/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/billing`,
      metadata: {
        userId: userId.toString(),
        projectId: projectId.toString(),
        packageId: pkg.id,
        credits: pkg.credits.toString(),
      },
    });

    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
  }
}

// GET /api/stripe/checkout - Get available packages
export async function GET() {
  return NextResponse.json({ 
    packages: CREDIT_PACKAGES,
    stripeConfigured: isStripeConfigured,
  });
}
