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
      hasPotentialDuplicates: boolean;
      hasVerifiedMatch: boolean;
    } = {
      existingCases: [],
      existingSources: [],
      hasPotentialDuplicates: false,
      hasVerifiedMatch: false
    };

    // Check for similar cases by name and/or date
    if (victimName || dateOfDeath) {
      const conditions: string[] = [];
      const params: (string | null)[] = [];
      let paramIndex = 1;

      if (victimName && victimName.trim().length > 2) {
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
          SELECT s.url, s.incident_id, i.victim_name, i.verification_status
          FROM sources s
          LEFT JOIN incidents i ON s.incident_id = i.id
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
            SELECT s.url, s.incident_id, i.victim_name, i.verification_status
            FROM sources s
            LEFT JOIN incidents i ON s.incident_id = i.id
            WHERE ${domainChecks}
            LIMIT 10
          `, normalizedUrls);

          results.existingSources = partialResult.rows;
        }
      }
    }

    results.hasPotentialDuplicates = 
      results.existingCases.length > 0 || results.existingSources.length > 0;
    
    // Check if any of the matches are verified
    results.hasVerifiedMatch = 
      results.existingCases.some(c => c.verification_status === 'verified') ||
      results.existingSources.some(s => s.verification_status === 'verified');

    return NextResponse.json(results);
  } catch (error) {
    console.error('Error checking duplicates:', error);
    return NextResponse.json(
      { error: 'Failed to check for duplicates' },
      { status: 500 }
    );
  }
}
