require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

async function createTestStatement() {
  const client = new Client({ 
    connectionString: process.env.PRODUCTION_DATABASE_URL 
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');

    // 1. Create the statement
    const statementResult = await client.query(`
      INSERT INTO statements (
        statement_id,
        statement_type,
        statement_date,
        headline,
        key_quote,
        full_text,
        context,
        speaker_name,
        speaker_title,
        speaker_organization,
        speaker_type,
        political_affiliation,
        speaker_credentials,
        speaker_wikipedia_url,
        platform,
        platform_url,
        impact_level,
        media_coverage,
        engagement_likes,
        engagement_shares,
        engagement_views,
        previously_supported,
        party_typically_supports,
        breaking_ranks,
        ice_response,
        notable_responses,
        verification_status,
        submitted_by_user_id,
        is_guest_submission,
        field_quote_map
      ) VALUES (
        '2024-06-15-morrison-condemns-policy',
        'denunciation',
        '2024-06-15',
        'Former ICE Director Condemns Family Separation Policy',
        'This policy violates every principle of human decency and American values. We are better than this.',
        'In a stunning reversal, former ICE Director John Morrison has publicly condemned the family separation policies he once helped implement. "This policy violates every principle of human decency and American values. We are better than this," Morrison stated during a congressional hearing.\n\nMorrison, who served under the previous administration, detailed how the policy was deliberately designed to deter immigration through cruelty. "We knew families would be traumatized. That was the point," he admitted, his voice breaking with emotion.\n\nThe former director called for immediate reunification of all separated families and reparations for the psychological trauma inflicted. "I have to live with what I did. These families shouldn''t have to," he concluded.',
        'Morrison''s testimony came during a House Oversight Committee hearing on immigration detention practices. His appearance was unexpected, as he had previously defended the policies publicly.',
        'John Morrison',
        'Former Director',
        'U.S. Immigration and Customs Enforcement',
        'former_official',
        'republican',
        'Former ICE Director (2017-2019), 25 years in immigration enforcement, Purple Heart recipient',
        'https://en.wikipedia.org/wiki/John_Morrison_(fictional)',
        'testimony',
        'https://oversight.house.gov/hearing/ice-detention-practices-2024',
        'national',
        'national',
        15000,
        8500,
        250000,
        true,
        true,
        true,
        'ICE released a brief statement saying they "respect Director Morrison''s perspective" but maintain current policies are "necessary for border security."',
        'Senator Maria Rodriguez called the testimony "damning evidence of systematic abuse." ACLU announced plans to cite Morrison''s statements in ongoing litigation.',
        'pending',
        1,
        false,
        '{}'::jsonb
      ) RETURNING id
    `);
    
    const statementId = statementResult.rows[0].id;
    console.log(`✅ Created statement with ID: ${statementId}`);

    // 2. Create sources
    const sources = [
      {
        url: 'https://oversight.house.gov/hearing/ice-detention-practices-2024',
        title: 'House Oversight Committee Hearing on ICE Detention Practices',
        priority: 'primary'
      },
      {
        url: 'https://www.nytimes.com/2024/06/15/us/politics/former-ice-director-testimony',
        title: 'Former ICE Director Breaks Silence on Family Separation',
        priority: 'primary'
      },
      {
        url: 'https://www.washingtonpost.com/immigration/former-ice-chief-condemns-policy',
        title: 'Ex-ICE Chief Calls Separation Policy "Deliberate Cruelty"',
        priority: 'secondary'
      },
      {
        url: 'https://www.cnn.com/2024/06/15/politics/morrison-testimony-family-separation',
        title: 'Morrison: "We Knew Families Would Be Traumatized"',
        priority: 'secondary'
      },
      {
        url: 'https://www.aclu.org/news/morrison-testimony-confirms-systematic-abuse',
        title: 'ACLU: Morrison Testimony Confirms Systematic Abuse',
        priority: 'corroborating'
      }
    ];

    const sourceIds = [];
    for (const source of sources) {
      const result = await client.query(
        `INSERT INTO statement_sources (statement_id, url, title, priority) 
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [statementId, source.url, source.title, source.priority]
      );
      sourceIds.push(result.rows[0].id);
      console.log(`✅ Added source: ${source.title}`);
    }

    // 3. Create quotes and link them to fields
    const quotes = [
      {
        text: 'This policy violates every principle of human decency and American values. We are better than this.',
        source_url: 'https://oversight.house.gov/hearing/ice-detention-practices-2024',
        source_title: 'House Oversight Committee Hearing',
        verified: true,
        fields: ['key_quote', 'headline']
      },
      {
        text: 'We knew families would be traumatized. That was the point.',
        source_url: 'https://www.nytimes.com/2024/06/15/us/politics/former-ice-director-testimony',
        source_title: 'New York Times',
        verified: true,
        fields: ['full_text', 'context']
      },
      {
        text: 'The policy was deliberately designed to deter immigration through cruelty.',
        source_url: 'https://www.washingtonpost.com/immigration/former-ice-chief-condemns-policy',
        source_title: 'Washington Post',
        verified: true,
        fields: ['full_text']
      },
      {
        text: 'I have to live with what I did. These families shouldn\'t have to.',
        source_url: 'https://www.cnn.com/2024/06/15/politics/morrison-testimony-family-separation',
        source_title: 'CNN',
        verified: true,
        fields: ['full_text']
      },
      {
        text: 'John Morrison served as ICE Director from 2017 to 2019.',
        source_url: 'https://en.wikipedia.org/wiki/John_Morrison_(fictional)',
        source_title: 'Wikipedia',
        verified: true,
        fields: ['speaker_name', 'speaker_title']
      },
      {
        text: 'Morrison is a Purple Heart recipient with 25 years in immigration enforcement.',
        source_url: 'https://en.wikipedia.org/wiki/John_Morrison_(fictional)',
        source_title: 'Wikipedia',
        verified: true,
        fields: ['speaker_credentials']
      },
      {
        text: 'The testimony occurred during a House Oversight Committee hearing on immigration detention practices.',
        source_url: 'https://oversight.house.gov/hearing/ice-detention-practices-2024',
        source_title: 'House Oversight Committee',
        verified: true,
        fields: ['context', 'platform']
      },
      {
        text: 'ICE maintains current policies are "necessary for border security."',
        source_url: 'https://www.ice.gov/news/statement-morrison-testimony',
        source_title: 'ICE Official Statement',
        verified: true,
        fields: ['ice_response']
      },
      {
        text: 'Senator Maria Rodriguez called the testimony "damning evidence of systematic abuse."',
        source_url: 'https://www.senate.gov/news/rodriguez-statement',
        source_title: 'Senate Press Release',
        verified: true,
        fields: ['notable_responses']
      },
      {
        text: 'ACLU announced plans to cite Morrison\'s statements in ongoing litigation.',
        source_url: 'https://www.aclu.org/news/morrison-testimony-confirms-systematic-abuse',
        source_title: 'ACLU Press Release',
        verified: true,
        fields: ['notable_responses']
      },
      {
        text: 'Morrison registered as a Republican in 1995 and has donated to Republican campaigns.',
        source_url: 'https://www.fec.gov/data/receipts/individual-contributions',
        source_title: 'FEC Records',
        verified: true,
        fields: ['political_affiliation']
      },
      {
        text: 'Morrison previously defended family separation policies in 2018 interviews.',
        source_url: 'https://www.foxnews.com/politics/ice-director-defends-family-separation-2018',
        source_title: 'Fox News Interview 2018',
        verified: true,
        fields: ['previously_supported']
      }
    ];

    const fieldQuoteMap = {};
    const quoteIds = [];

    for (const quote of quotes) {
      const result = await client.query(
        `INSERT INTO statement_quotes (statement_id, text, source_url, source_title, verified) 
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [statementId, quote.text, quote.source_url, quote.source_title, quote.verified]
      );
      const quoteId = result.rows[0].id;
      quoteIds.push(quoteId);

      // Map quote to fields
      for (const field of quote.fields) {
        if (!fieldQuoteMap[field]) {
          fieldQuoteMap[field] = [];
        }
        fieldQuoteMap[field].push({
          quote_id: quoteId,
          quote_text: quote.text,
          source_url: quote.source_url,
          source_title: quote.source_title
        });
      }

      // Insert into field_quotes junction table
      for (const field of quote.fields) {
        await client.query(
          `INSERT INTO statement_field_quotes (statement_id, quote_id, field_name) 
           VALUES ($1, $2, $3)`,
          [statementId, quoteId, field]
        );
      }

      console.log(`✅ Added quote: "${quote.text.substring(0, 60)}..."`);
    }

    // 4. Update statement with field_quote_map
    await client.query(
      `UPDATE statements SET field_quote_map = $1 WHERE id = $2`,
      [JSON.stringify(fieldQuoteMap), statementId]
    );

    console.log(`✅ Updated field_quote_map with ${Object.keys(fieldQuoteMap).length} fields`);

    console.log('\n📊 Test Statement Summary:');
    console.log(`   ID: ${statementId}`);
    console.log(`   Type: Denunciation (breaking ranks)`);
    console.log(`   Speaker: Former ICE Director John Morrison`);
    console.log(`   Sources: ${sources.length}`);
    console.log(`   Quotes: ${quotes.length}`);
    console.log(`   Fields with quotes: ${Object.keys(fieldQuoteMap).length}`);
    console.log(`\n✅ Test statement created successfully!`);
    console.log(`\nView at: http://localhost:3000/statements/${statementId}`);
    console.log(`Review at: http://localhost:3000/dashboard/statements/${statementId}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

createTestStatement();
