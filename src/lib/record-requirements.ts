import pool from './db';

/**
 * Check if a record meets quote requirements for review approval
 */
export async function checkQuoteRequirements(
  recordId: number,
  recordTypeId: number,
  userRole?: string
): Promise<{ passed: boolean; message?: string; missingFields?: string[] }> {
  // Get record type settings
  const typeResult = await pool.query(
    `SELECT 
      require_quotes_for_review,
      require_sources_for_quotes,
      allow_quote_requirement_bypass,
      quote_bypass_roles
     FROM record_types 
     WHERE id = $1`,
    [recordTypeId]
  );
  
  if (typeResult.rows.length === 0) {
    return { passed: false, message: 'Record type not found' };
  }
  
  const settings = typeResult.rows[0];
  
  // Check if user role can bypass
  if (settings.allow_quote_requirement_bypass && 
      userRole && 
      settings.quote_bypass_roles?.includes(userRole)) {
    return { passed: true };
  }
  
  // If not requiring quotes, pass
  if (!settings.require_quotes_for_review) {
    return { passed: true };
  }
  
  // Get fields that require quotes
  const fieldsResult = await pool.query(
    `SELECT fd.slug, fd.name
     FROM field_definitions fd
     WHERE fd.record_type_id = $1 
     AND fd.requires_quote = true
     AND fd.show_in_review_form = true`,
    [recordTypeId]
  );
  
  if (fieldsResult.rows.length === 0) {
    return { passed: true }; // No fields require quotes
  }
  
  // Get record field values
  const recordResult = await pool.query(
    'SELECT data FROM records WHERE id = $1',
    [recordId]
  );
  
  if (recordResult.rows.length === 0) {
    return { passed: false, message: 'Record not found' };
  }
  
  const recordData = recordResult.rows[0].data;
  
  // Check each field that requires quotes
  const missingFields: string[] = [];
  
  for (const field of fieldsResult.rows) {
    // Check if field has a value in the record
    if (!recordData[field.slug]) {
      continue; // Skip if field is empty
    }
    
    // Check if field has any linked quotes
    const quoteResult = await pool.query(
      `SELECT COUNT(*) as count
       FROM record_quotes
       WHERE record_id = $1 AND field_slug = $2`,
      [recordId, field.slug]
    );
    
    if (parseInt(quoteResult.rows[0].count) === 0) {
      missingFields.push(field.name);
    }
  }
  
  if (missingFields.length > 0) {
    return {
      passed: false,
      message: `The following fields require quotes: ${missingFields.join(', ')}`,
      missingFields
    };
  }
  
  // Check if sources are required for quotes
  if (settings.require_sources_for_quotes) {
    const quotesWithoutSourcesResult = await pool.query(
      `SELECT COUNT(*) as count
       FROM record_quotes rq
       LEFT JOIN record_sources rs ON rq.source_id = rs.id
       WHERE rq.record_id = $1 
       AND (rs.id IS NULL OR rs.url IS NULL OR rs.url = '')`,
      [recordId]
    );
    
    const quotesWithoutSources = parseInt(quotesWithoutSourcesResult.rows[0].count);
    
    if (quotesWithoutSources > 0) {
      return {
        passed: false,
        message: `${quotesWithoutSources} quote(s) are missing source URLs`
      };
    }
  }
  
  return { passed: true };
}

/**
 * Check if a record meets validation requirements for publishing
 */
export async function checkValidationRequirements(
  recordId: number,
  recordTypeId: number,
  userRole?: string
): Promise<{ passed: boolean; message?: string; unverifiedFields?: string[] }> {
  // Get record type settings
  const typeResult = await pool.query(
    `SELECT 
      require_all_fields_verified,
      allow_validation_bypass,
      validation_bypass_roles
     FROM record_types 
     WHERE id = $1`,
    [recordTypeId]
  );
  
  if (typeResult.rows.length === 0) {
    return { passed: false, message: 'Record type not found' };
  }
  
  const settings = typeResult.rows[0];
  
  // Check if user role can bypass
  if (settings.allow_validation_bypass && 
      userRole && 
      settings.validation_bypass_roles?.includes(userRole)) {
    return { passed: true };
  }
  
  // If not requiring all fields verified, pass
  if (!settings.require_all_fields_verified) {
    return { passed: true };
  }
  
  // Get fields that require verification
  const fieldsResult = await pool.query(
    `SELECT fd.slug, fd.name
     FROM field_definitions fd
     WHERE fd.record_type_id = $1 
     AND fd.require_verified_for_publish = true
     AND fd.show_in_validation_form = true`,
    [recordTypeId]
  );
  
  if (fieldsResult.rows.length === 0) {
    return { passed: true }; // No fields require verification
  }
  
  // Get record field values and verified_fields
  const recordResult = await pool.query(
    'SELECT data, verified_fields FROM records WHERE id = $1',
    [recordId]
  );
  
  if (recordResult.rows.length === 0) {
    return { passed: false, message: 'Record not found' };
  }
  
  const { data: recordData, verified_fields } = recordResult.rows[0];
  const verifiedFieldsMap = verified_fields || {};
  
  // Check each field that requires verification
  const unverifiedFields: string[] = [];
  
  for (const field of fieldsResult.rows) {
    // Check if field has a value in the record
    if (!recordData[field.slug]) {
      continue; // Skip if field is empty
    }
    
    // Check if field is verified
    if (!verifiedFieldsMap[field.slug]) {
      unverifiedFields.push(field.name);
    }
  }
  
  if (unverifiedFields.length > 0) {
    return {
      passed: false,
      message: `The following fields must be verified: ${unverifiedFields.join(', ')}`,
      unverifiedFields
    };
  }
  
  return { passed: true };
}
