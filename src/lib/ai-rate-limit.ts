import pool from './db';

interface AIRateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  resetTime?: string;
  tier: string;
  reason?: string;
  creditsUsed?: number;
  creditsRemaining?: number;
  hourlyRemaining?: number;
  dailyRemaining?: number;
}

interface RateLimitTier {
  name: string;
  requests_per_hour: number;
  requests_per_day: number;
  requests_per_month: number;
  requires_credits: boolean;
  credits_per_request: number;
}

/**
 * Check if a project can make an AI request based on rate limits and credits
 * @param userId - User making the request
 * @param projectId - Project the request is for
 * @param operationType - Type of AI operation
 */
export async function checkAIRateLimit(
  userId: number,
  projectId: number,
  operationType: string = 'template_generation'
): Promise<AIRateLimitResult> {
  // Get user's tier
  const userResult = await pool.query(
    `SELECT ai_tier FROM users WHERE id = $1`,
    [userId]
  );
  
  if (userResult.rows.length === 0) {
    return { allowed: false, remaining: 0, resetAt: new Date(), tier: 'none', reason: 'User not found' };
  }
  
  const userTier = userResult.rows[0].ai_tier || 'free';
  
  // Get tier limits
  const tierResult = await pool.query(
    `SELECT * FROM rate_limit_tiers WHERE name = $1`,
    [userTier]
  );
  
  const tier: RateLimitTier = tierResult.rows[0] || { 
    name: 'free', 
    requests_per_hour: 3, 
    requests_per_day: 10, 
    requests_per_month: 50,
    requires_credits: false,
    credits_per_request: 0 
  };
  
  // Check usage in different time windows
  const now = new Date();
  const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  
  const usageResult = await pool.query(`
    SELECT 
      COUNT(*) FILTER (WHERE created_at > $2) as hour_count,
      COUNT(*) FILTER (WHERE created_at > $3) as day_count,
      COUNT(*) FILTER (WHERE created_at > $4) as month_count
    FROM ai_usage 
    WHERE user_id = $1 AND operation_type = $5
  `, [userId, hourAgo, dayAgo, monthAgo, operationType]);
  
  const usage = usageResult.rows[0];
  const hourCount = parseInt(usage.hour_count) || 0;
  const dayCount = parseInt(usage.day_count) || 0;
  const monthCount = parseInt(usage.month_count) || 0;
  
  // Check against limits
  if (hourCount >= tier.requests_per_hour) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: new Date(hourAgo.getTime() + 60 * 60 * 1000),
      tier: tier.name,
      reason: `Hourly limit reached (${tier.requests_per_hour}/hour)`
    };
  }
  
  if (dayCount >= tier.requests_per_day) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: new Date(dayAgo.getTime() + 24 * 60 * 60 * 1000),
      tier: tier.name,
      reason: `Daily limit reached (${tier.requests_per_day}/day)`
    };
  }
  
  if (monthCount >= tier.requests_per_month) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: new Date(monthAgo.getTime() + 30 * 24 * 60 * 60 * 1000),
      tier: tier.name,
      reason: `Monthly limit reached (${tier.requests_per_month}/month)`
    };
  }
  
  // If tier requires credits, check project credit balance
  let creditsBalance = 0;
  if (tier.requires_credits && tier.credits_per_request > 0) {
    const creditsResult = await pool.query(
      `SELECT balance FROM user_credits WHERE project_id = $1 ORDER BY id LIMIT 1`,
      [projectId]
    );
    
    creditsBalance = creditsResult.rows[0]?.balance || 0;
    
    if (creditsBalance < tier.credits_per_request) {
      return {
        allowed: false,
        remaining: creditsBalance,
        resetAt: new Date(),
        tier: tier.name,
        reason: `Insufficient project credits (need ${tier.credits_per_request}, have ${creditsBalance})`,
        creditsRemaining: creditsBalance,
        hourlyRemaining: tier.requests_per_hour - hourCount,
        dailyRemaining: tier.requests_per_day - dayCount
      };
    }
  }
  
  // Calculate remaining requests (minimum of all windows)
  const remaining = Math.min(
    tier.requests_per_hour - hourCount,
    tier.requests_per_day - dayCount,
    tier.requests_per_month - monthCount
  );
  
  return {
    allowed: true,
    remaining: remaining - 1, // After this request
    resetAt: new Date(hourAgo.getTime() + 60 * 60 * 1000),
    resetTime: new Date(hourAgo.getTime() + 60 * 60 * 1000).toISOString(),
    tier: tier.name,
    creditsUsed: tier.requires_credits ? tier.credits_per_request : 0,
    creditsRemaining: creditsBalance - (tier.requires_credits ? tier.credits_per_request : 0),
    hourlyRemaining: tier.requests_per_hour - hourCount - 1,
    dailyRemaining: tier.requests_per_day - dayCount - 1
  };
}

/**
 * Record an AI usage event and deduct project credits if needed
 */
export async function recordAIUsage(
  userId: number,
  projectId: number,
  operationType: string,
  options: {
    modelName?: string;
    inputTokens?: number;
    outputTokens?: number;
    recordTypeId?: number;
    responseTimeMs?: number;
  } = {}
): Promise<{ usageId: number; creditsUsed: number }> {
  // Get user's tier to check if credits are required
  const userResult = await pool.query(
    `SELECT ai_tier FROM users WHERE id = $1`,
    [userId]
  );
  
  const userTier = userResult.rows[0]?.ai_tier || 'free';
  
  const tierResult = await pool.query(
    `SELECT requires_credits, credits_per_request FROM rate_limit_tiers WHERE name = $1`,
    [userTier]
  );
  
  const tier = tierResult.rows[0] || { requires_credits: false, credits_per_request: 0 };
  let creditsUsed = 0;
  let wasFree = true;
  
  // If credits required, deduct them from PROJECT balance
  if (tier.requires_credits && tier.credits_per_request > 0) {
    creditsUsed = tier.credits_per_request;
    wasFree = false;
    
    // Deduct credits from project
    await pool.query(`
      UPDATE user_credits 
      SET balance = balance - $2, total_used = total_used + $2, updated_at = NOW()
      WHERE project_id = $1
    `, [projectId, creditsUsed]);
  }
  
  // Record the usage
  const usageResult = await pool.query(`
    INSERT INTO ai_usage 
    (user_id, operation_type, model_name, input_tokens, output_tokens, credits_used, was_free_tier, project_id, record_type_id, response_time_ms)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING id
  `, [
    userId,
    operationType,
    options.modelName || null,
    options.inputTokens || 0,
    options.outputTokens || 0,
    creditsUsed,
    wasFree,
    projectId,
    options.recordTypeId || null,
    options.responseTimeMs || null
  ]);
  
  const usageId = usageResult.rows[0].id;
  
  // If credits were used, record the transaction
  if (creditsUsed > 0) {
    const balanceResult = await pool.query(
      `SELECT balance FROM user_credits WHERE project_id = $1`,
      [projectId]
    );
    const newBalance = balanceResult.rows[0]?.balance || 0;
    
    await pool.query(`
      INSERT INTO credit_transactions 
      (user_id, project_id, transaction_type, amount, balance_after, ai_usage_id, description)
      VALUES ($1, $2, 'usage', $3, $4, $5, $6)
    `, [userId, projectId, -creditsUsed, newBalance, usageId, `AI ${operationType}`]);
  }
  
  return { usageId, creditsUsed };
}

/**
 * Get user's current credit balance and usage stats
 */
export async function getUserCreditsAndUsage(userId: number) {
  // Get credits
  const creditsResult = await pool.query(`
    SELECT balance, total_purchased, total_used 
    FROM user_credits 
    WHERE user_id = $1
  `, [userId]);
  
  const credits = creditsResult.rows[0] || { balance: 0, total_purchased: 0, total_used: 0 };
  
  // Get recent usage
  const now = new Date();
  const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  
  const usageResult = await pool.query(`
    SELECT 
      COUNT(*) FILTER (WHERE created_at > $2) as hour_count,
      COUNT(*) FILTER (WHERE created_at > $3) as day_count,
      COUNT(*) FILTER (WHERE created_at > $4) as month_count,
      COUNT(*) as total_count
    FROM ai_usage 
    WHERE user_id = $1
  `, [userId, hourAgo, dayAgo, monthAgo]);
  
  const usage = usageResult.rows[0];
  
  // Get user tier and limits
  const userResult = await pool.query(`
    SELECT u.ai_tier, r.* 
    FROM users u
    LEFT JOIN rate_limit_tiers r ON r.name = u.ai_tier
    WHERE u.id = $1
  `, [userId]);
  
  const tierInfo = userResult.rows[0] || { ai_tier: 'free', requests_per_hour: 3, requests_per_day: 10, requests_per_month: 50 };
  
  return {
    credits: {
      balance: credits.balance,
      totalPurchased: credits.total_purchased,
      totalUsed: credits.total_used,
    },
    usage: {
      thisHour: parseInt(usage.hour_count) || 0,
      today: parseInt(usage.day_count) || 0,
      thisMonth: parseInt(usage.month_count) || 0,
      allTime: parseInt(usage.total_count) || 0,
    },
    limits: {
      tier: tierInfo.ai_tier || 'free',
      perHour: tierInfo.requests_per_hour,
      perDay: tierInfo.requests_per_day,
      perMonth: tierInfo.requests_per_month,
      requiresCredits: tierInfo.requires_credits,
      creditsPerRequest: tierInfo.credits_per_request,
    }
  };
}

/**
 * Add credits to a user's account (after Stripe payment)
 */
export async function addCredits(
  userId: number,
  amount: number,
  options: {
    stripePaymentIntentId?: string;
    stripeCheckoutSessionId?: string;
    description?: string;
    transactionType?: 'purchase' | 'bonus' | 'admin_adjustment' | 'refund';
  } = {}
): Promise<{ newBalance: number; transactionId: number }> {
  // Ensure user has a credits record
  await pool.query(`
    INSERT INTO user_credits (user_id, balance, total_purchased)
    VALUES ($1, 0, 0)
    ON CONFLICT (user_id) DO NOTHING
  `, [userId]);
  
  // Add credits
  const updateResult = await pool.query(`
    UPDATE user_credits 
    SET 
      balance = balance + $2, 
      total_purchased = CASE WHEN $3 = 'purchase' THEN total_purchased + $2 ELSE total_purchased END,
      updated_at = NOW()
    WHERE user_id = $1
    RETURNING balance
  `, [userId, amount, options.transactionType || 'purchase']);
  
  const newBalance = updateResult.rows[0].balance;
  
  // Record transaction
  const transactionResult = await pool.query(`
    INSERT INTO credit_transactions 
    (user_id, transaction_type, amount, balance_after, stripe_payment_intent_id, stripe_checkout_session_id, description)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING id
  `, [
    userId,
    options.transactionType || 'purchase',
    amount,
    newBalance,
    options.stripePaymentIntentId || null,
    options.stripeCheckoutSessionId || null,
    options.description || `Added ${amount} credits`
  ]);
  
  return { newBalance, transactionId: transactionResult.rows[0].id };
}
