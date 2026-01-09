import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

// POST /api/check-duplicates - Check for existing cases or sources
export async function POST(request: NextRequest) {
  try {
    const { victimName, dateOfDeath, facility, sourceUrls } = await request.json();

    const results: {
      existingCases: Array<{ id: number; victim_name: string; incident_date: string; facility_name: string }>;
      existingSources: Array<{ url: string; incident_id: number; victim_name: string }>;
      hasPotentialDuplicates: boolean;
    } = {
      existingCases: [],
      existingSources: [],
      hasPotentialDuplicates: false
    };

    // Check for similar cases by name and/or date
    if (victimName || dateOfDeath) {
      const conditions: string[] = [];
      const params: (string | null)[] = [];
      let paramIndex = 1;

      if (victimName && victimName.trim().length > 2) {
        // Use fuzzy matching for names
        conditions.push(`(
          LOWER(victim_name) LIKE LOWER($${paramIndex}) OR
          LOWER(victim_name) LIKE LOWER($${paramIndex + 1}) OR
          similarity(LOWER(victim_name), LOWER($${paramIndex + 2})) > 0.3
        )`);
        const nameTrimmed = victimName.trim();
        params.push(`%${nameTrimmed}%`, `${nameTrimmed}%`, nameTrimmed);
        paramIndex += 3;
      }

      if (dateOfDeath) {
        conditions.push(`incident_date = $${paramIndex}`);
        params.push(dateOfDeath);
        paramIndex++;
      }

      if (conditions.length > 0) {
        // Try with pg_trgm first, fall back to basic matching if extension not available
        let query = `
          SELECT id, victim_name, incident_date, facility_name, city, state
          FROM incidents
          WHERE ${conditions.join(' OR ')}
          ORDER BY incident_date DESC
          LIMIT 10
        `;

        try {
          const caseResult = await pool.query(query, params);
          results.existingCases = caseResult.rows;
        } catch (err: any) {
          // If similarity function fails (extension not installed), use basic matching
          if (err.message?.includes('similarity')) {
            const basicConditions: string[] = [];
            const basicParams: (string | null)[] = [];
            let idx = 1;

            if (victimName && victimName.trim().length > 2) {
              basicConditions.push(`(LOWER(victim_name) LIKE LOWER($${idx}) OR LOWER(victim_name) LIKE LOWER($${idx + 1}))`);
              const nameTrimmed = victimName.trim();
              basicParams.push(`%${nameTrimmed}%`, `${nameTrimmed}%`);
              idx += 2;
            }

            if (dateOfDeath) {
              basicConditions.push(`incident_date = $${idx}`);
              basicParams.push(dateOfDeath);
            }

            if (basicConditions.length > 0) {
              const basicQuery = `
                SELECT id, victim_name, incident_date, facility_name, city, state
                FROM incidents
                WHERE ${basicConditions.join(' OR ')}
                ORDER BY incident_date DESC
                LIMIT 10
              `;
              const caseResult = await pool.query(basicQuery, basicParams);
              results.existingCases = caseResult.rows;
            }
          } else {
            throw err;
          }
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
          SELECT s.url, s.incident_id, i.victim_name
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
            SELECT s.url, s.incident_id, i.victim_name
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

    return NextResponse.json(results);
  } catch (error) {
    console.error('Error checking duplicates:', error);
    return NextResponse.json(
      { error: 'Failed to check for duplicates' },
      { status: 500 }
    );
  }
}
