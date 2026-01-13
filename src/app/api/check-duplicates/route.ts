import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { rateLimit, RateLimitPresets } from '@/lib/rate-limit';

// POST /api/check-duplicates - Check for existing cases or sources
export async function POST(request: NextRequest) {
  // Rate limit: 20 per minute (standard)
  const rateLimitResponse = rateLimit(request, RateLimitPresets.standard, 'check-duplicates');
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const { victimName, dateOfDeath, sourceUrls } = await request.json();

    const results: {
      existingCases: Array<{ id: number; victim_name: string; incident_date: string; facility_name: string; city?: string; state?: string; verification_status: string }>;
      existingSources: Array<{ url: string; incident_id: number; victim_name: string; verification_status?: string }>;
      guestSubmissionCount: number;
      hasPotentialDuplicates: boolean;
      hasVerifiedMatch: boolean;
      allowSubmission: boolean;
      reason?: string;
    } = {
      existingCases: [],
      existingSources: [],
      guestSubmissionCount: 0,
      hasPotentialDuplicates: false,
      hasVerifiedMatch: false,
      allowSubmission: true
    };

    // If no identifying information provided, return empty results
    const hasName = victimName && typeof victimName === 'string' && victimName.trim().length > 0;
    const hasDate = dateOfDeath && typeof dateOfDeath === 'string' && dateOfDeath.trim().length > 0;
    const hasUrls = sourceUrls && Array.isArray(sourceUrls) && sourceUrls.length > 0;

    if (!hasName && !hasDate && !hasUrls) {
      return NextResponse.json(results);
    }

    // Skip duplicate checking for "unknown" or very generic names
    const isGenericName = hasName && (
      victimName.trim().toLowerCase() === 'unknown' ||
      victimName.trim().toLowerCase() === 'unnamed' ||
      victimName.trim().toLowerCase() === 'n/a' ||
      victimName.trim().toLowerCase() === 'not available' ||
      victimName.trim().length < 3
    );

    // Check for similar cases by name and/or date
    if ((hasName && !isGenericName) || hasDate) {
      const conditions: string[] = [];
      const params: (string | null)[] = [];
      let paramIndex = 1;

      if (hasName && !isGenericName && victimName.trim().length > 2) {
        // Use basic matching for names
        conditions.push(`(
          LOWER(victim_name) LIKE LOWER($${paramIndex}) OR
          LOWER(victim_name) LIKE LOWER($${paramIndex + 1})
        )`);
        const nameTrimmed = victimName.trim();
        params.push(`%${nameTrimmed}%`, `${nameTrimmed}%`);
        paramIndex += 2;
      }

      if (dateOfDeath) {
        conditions.push(`incident_date = $${paramIndex}`);
        params.push(dateOfDeath);
        paramIndex++;
      }

      if (conditions.length > 0) {
        const query = `
          SELECT id, victim_name, incident_date, facility_name, city, state, verification_status
          FROM incidents
          WHERE ${conditions.join(' OR ')}
          ORDER BY incident_date DESC
          LIMIT 10
        `;

        const caseResult = await pool.query(query, params);
        results.existingCases = caseResult.rows;
      }

      // Count guest submissions for this person (including in-review incidents)
      if (hasName && !isGenericName) {
        const submissionCountQuery = `
          SELECT COUNT(*) as count
          FROM guest_submissions
          WHERE 
            LOWER(subject_name) LIKE LOWER($1)
            AND transfer_status IN ('pending', 'in_review')
        `;
        const countResult = await pool.query(submissionCountQuery, [`%${victimName.trim()}%`]);
        results.guestSubmissionCount = parseInt(countResult.rows[0]?.count || '0');

        // Check if too many submissions (10+)
        if (results.guestSubmissionCount >= 10) {
          results.allowSubmission = false;
          results.reason = `Too many submissions already exist for "${victimName}" (${results.guestSubmissionCount} pending/in-review). Please wait for existing submissions to be processed.`;
        }
      }
    }

    // Check for existing source URLs
    if (sourceUrls && Array.isArray(sourceUrls) && sourceUrls.length > 0) {
      const urlList = sourceUrls
        .map((u: string) => u.trim())
        .filter((u: string) => u.length > 0);

      if (urlList.length > 0) {
        // Normalize URLs for comparison (remove trailing slashes, www, etc.)
        const normalizedUrls = urlList.map((url: string) => {
          try {
            const parsed = new URL(url);
            return parsed.hostname.replace(/^www\./, '') + parsed.pathname.replace(/\/$/, '');
          } catch {
            return url.toLowerCase();
          }
        });

        const sourceResult = await pool.query(`
          SELECT s.url, s.case_id as incident_id, i.victim_name, i.verification_status
          FROM sources s
          LEFT JOIN incidents i ON s.case_id = i.incident_id
          WHERE s.url = ANY($1)
          LIMIT 20
        `, [urlList]);

        results.existingSources = sourceResult.rows;

        // Also check for partial URL matches (same domain + similar path)
        if (results.existingSources.length === 0 && normalizedUrls.length > 0) {
          const domainChecks = normalizedUrls.map((_, i) => `
            (REPLACE(REPLACE(s.url, 'https://', ''), 'http://', '') LIKE '%' || $${i + 1} || '%')
          `).join(' OR ');

          const partialResult = await pool.query(`
            SELECT s.url, s.case_id as incident_id, i.victim_name, i.verification_status
            FROM sources s
            LEFT JOIN incidents i ON s.case_id = i.incident_id
            WHERE ${domainChecks}
            LIMIT 10
          `, normalizedUrls);

          results.existingSources = partialResult.rows;
        }
      }
    }

    results.hasPotentialDuplicates = 
      results.existingCases.length > 0 || 
      results.existingSources.length > 0 ||
      results.guestSubmissionCount > 0;
    
    // Check if any of the matches are verified cases (these should be shown to user)
    results.hasVerifiedMatch = 
      results.existingCases.some(c => c.verification_status === 'verified') ||
      results.existingSources.some(s => s.verification_status === 'verified');

    // Allow submission unless we explicitly blocked it (10+ guest submissions)
    // Verified matches are informational - user can still submit if they want
    if (results.hasVerifiedMatch) {
      results.reason = 'Found verified case(s) matching this information. Review them before submitting.';
    } else if (results.guestSubmissionCount > 0 && results.guestSubmissionCount < 10) {
      results.reason = `${results.guestSubmissionCount} guest submission(s) already exist for this person (pending review). Your submission will be added to the review queue.`;
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error('Error checking duplicates:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined
    });
    return NextResponse.json(
      { error: 'Failed to check for duplicates' },
      { status: 500 }
    );
  }
}
