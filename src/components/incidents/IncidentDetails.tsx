import type { Incident } from '@/types/incident';

interface IncidentDetailsProps {
  incident: Incident;
}

export function IncidentDetails({ incident }: IncidentDetailsProps) {
  const isDeathType = ['death_in_custody', 'death_during_operation', 'death_at_protest', 'death'].includes(incident.incident_type);
  
  return (
    <section className="bg-white border border-gray-200 rounded-lg p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Details</h2>
      
      {/* Type-specific details */}
      {isDeathType && incident.death_details && (
        <DeathDetails details={incident.death_details} />
      )}
      
      {incident.incident_type === 'shooting' && incident.shooting_details && (
        <ShootingDetails details={incident.shooting_details} />
      )}
      
      {incident.incident_type === 'excessive_force' && incident.excessive_force_details && (
        <ExcessiveForceDetails details={incident.excessive_force_details} />
      )}
      
      {(incident.incident_type === 'protest_suppression' || incident.incident_type === 'death_at_protest') && incident.protest_details && (
        <ProtestDetails details={incident.protest_details} />
      )}
      
      {incident.incident_type === 'injury' && incident.injury_details && (
        <InjuryDetails details={incident.injury_details} />
      )}
      
      {incident.incident_type === 'arrest' && incident.arrest_details && (
        <ArrestDetails details={incident.arrest_details} />
      )}
      
      {incident.incident_type === 'rights_violation' && incident.violation_details && (
        <ViolationDetails details={incident.violation_details} />
      )}
      
      {/* Subject details */}
      {incident.subject && (
        <div className="mt-6 pt-6 border-t border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Subject Information</h3>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            {incident.subject.gender && (
              <>
                <dt className="text-gray-500">Gender</dt>
                <dd className="text-gray-900">{incident.subject.gender}</dd>
              </>
            )}
            {incident.subject.immigration_status && (
              <>
                <dt className="text-gray-500">Immigration Status</dt>
                <dd className="text-gray-900">{incident.subject.immigration_status}</dd>
              </>
            )}
            {incident.subject.years_in_us && (
              <>
                <dt className="text-gray-500">Years in US</dt>
                <dd className="text-gray-900">{incident.subject.years_in_us}</dd>
              </>
            )}
            {incident.subject.family_in_us !== undefined && (
              <>
                <dt className="text-gray-500">Family in US</dt>
                <dd className="text-gray-900">{incident.subject.family_in_us ? 'Yes' : 'No'}</dd>
              </>
            )}
          </dl>
        </div>
      )}
      
      {/* Tags */}
      {incident.tags && incident.tags.length > 0 && (
        <div className="mt-6 pt-6 border-t border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Tags</h3>
          <div className="flex flex-wrap gap-1">
            {incident.tags.map((tag) => (
              <span key={tag} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}
      
      {/* Verification notes */}
      {incident.verification_notes && (
        <div className="mt-6 pt-6 border-t border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Verification Notes</h3>
          <p className="text-sm text-gray-600">{incident.verification_notes}</p>
        </div>
      )}
    </section>
  );
}

function DeathDetails({ details }: { details: Incident['death_details'] }) {
  if (!details) return null;
  return (
    <dl className="grid grid-cols-2 gap-3 text-sm">
      {details.cause_of_death && (
        <>
          <dt className="text-gray-500">Cause of Death</dt>
          <dd className="text-gray-900">{details.cause_of_death}</dd>
        </>
      )}
      {details.manner_of_death && (
        <>
          <dt className="text-gray-500">Manner of Death</dt>
          <dd className="text-gray-900">{details.manner_of_death}</dd>
        </>
      )}
      {details.custody_duration && (
        <>
          <dt className="text-gray-500">Custody Duration</dt>
          <dd className="text-gray-900">{details.custody_duration}</dd>
        </>
      )}
      {details.cause_source && (
        <>
          <dt className="text-gray-500">Cause Source</dt>
          <dd className="text-gray-900">{details.cause_source}</dd>
        </>
      )}
      {details.medical_requests_denied && (
        <>
          <dt className="text-gray-500">Medical Requests Denied</dt>
          <dd className="text-red-700">Yes</dd>
        </>
      )}
      {details.autopsy_performed !== undefined && (
        <>
          <dt className="text-gray-500">Autopsy Performed</dt>
          <dd className="text-gray-900">{details.autopsy_performed ? 'Yes' : 'No'}</dd>
        </>
      )}
    </dl>
  );
}

function InjuryDetails({ details }: { details: Incident['injury_details'] }) {
  if (!details) return null;
  return (
    <dl className="grid grid-cols-2 gap-3 text-sm">
      {details.injury_type && (
        <>
          <dt className="text-gray-500">Injury Type</dt>
          <dd className="text-gray-900">{details.injury_type}</dd>
        </>
      )}
      {details.severity && (
        <>
          <dt className="text-gray-500">Severity</dt>
          <dd className="text-gray-900 capitalize">{details.severity}</dd>
        </>
      )}
      {details.cause && (
        <>
          <dt className="text-gray-500">Cause</dt>
          <dd className="text-gray-900">{details.cause}</dd>
        </>
      )}
      {details.weapon_used && (
        <>
          <dt className="text-gray-500">Weapon Used</dt>
          <dd className="text-gray-900">{details.weapon_used}</dd>
        </>
      )}
      {details.hospitalized !== undefined && (
        <>
          <dt className="text-gray-500">Hospitalized</dt>
          <dd className="text-gray-900">{details.hospitalized ? 'Yes' : 'No'}</dd>
        </>
      )}
      {details.permanent_damage !== undefined && (
        <>
          <dt className="text-gray-500">Permanent Damage</dt>
          <dd className="text-gray-900">{details.permanent_damage ? 'Yes' : 'No'}</dd>
        </>
      )}
    </dl>
  );
}

function ArrestDetails({ details }: { details: Incident['arrest_details'] }) {
  if (!details) return null;
  return (
    <div className="space-y-4">
      <dl className="grid grid-cols-2 gap-3 text-sm">
        {details.stated_reason && (
          <>
            <dt className="text-gray-500">Stated Reason</dt>
            <dd className="text-gray-900">{details.stated_reason}</dd>
          </>
        )}
        {details.actual_context && (
          <>
            <dt className="text-gray-500">Actual Context</dt>
            <dd className="text-gray-900">{details.actual_context}</dd>
          </>
        )}
      </dl>
      
      {details.charges && details.charges.length > 0 && (
        <div>
          <dt className="text-sm text-gray-500 mb-1">Charges</dt>
          <dd className="flex flex-wrap gap-1">
            {details.charges.map((charge, i) => (
              <span key={i} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                {charge}
              </span>
            ))}
          </dd>
        </div>
      )}
      
      <div className="flex flex-wrap gap-3">
        {details.timing_suspicious && (
          <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
            ⚠ Suspicious Timing
          </span>
        )}
        {details.pretext_arrest && (
          <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
            ⚠ Possible Pretext
          </span>
        )}
        {details.selective_enforcement && (
          <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
            ⚠ Selective Enforcement
          </span>
        )}
      </div>
    </div>
  );
}

function ViolationDetails({ details }: { details: Incident['violation_details'] }) {
  if (!details) return null;
  return (
    <div className="space-y-4">
      {details.violation_types && details.violation_types.length > 0 && (
        <div>
          <dt className="text-sm text-gray-500 mb-1">Violations</dt>
          <dd className="flex flex-wrap gap-1">
            {details.violation_types.map((v) => (
              <span key={v} className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                {v.replace(/_/g, ' ')}
              </span>
            ))}
          </dd>
        </div>
      )}
      
      <div className="flex flex-wrap gap-3">
        {details.journalism_related && (
          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
            📰 Journalism Related
          </span>
        )}
        {details.protest_related && (
          <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
            ✊ Protest Related
          </span>
        )}
        {details.activism_related && (
          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
            🌱 Activism Related
          </span>
        )}
      </div>
      
      {details.speech_content && (
        <div>
          <dt className="text-sm text-gray-500 mb-1">Speech Content</dt>
          <dd className="text-sm text-gray-900 bg-gray-50 p-3 rounded border border-gray-200">
            &ldquo;{details.speech_content}&rdquo;
          </dd>
        </div>
      )}
      
      {details.court_ruling && (
        <div>
          <dt className="text-sm text-gray-500 mb-1">Court Ruling</dt>
          <dd className="text-sm text-gray-900">{details.court_ruling}</dd>
        </div>
      )}
    </div>
  );
}

function ShootingDetails({ details }: { details: Incident['shooting_details'] }) {
  if (!details) return null;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 mb-3">
        {details.fatal && (
          <span className="text-xs bg-red-200 text-red-900 px-2 py-1 rounded font-medium">
            ⚠️ FATAL
          </span>
        )}
        {details.bodycam_available && (
          <span className={`text-xs px-2 py-1 rounded ${details.bodycam_released ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
            📹 Bodycam {details.bodycam_released ? 'Released' : 'Available (Not Released)'}
          </span>
        )}
      </div>
      
      <dl className="grid grid-cols-2 gap-3 text-sm">
        {details.weapon_type && (
          <>
            <dt className="text-gray-500">Weapon Type</dt>
            <dd className="text-gray-900">{details.weapon_type}</dd>
          </>
        )}
        {details.shots_fired !== undefined && (
          <>
            <dt className="text-gray-500">Shots Fired</dt>
            <dd className="text-gray-900">{details.shots_fired}</dd>
          </>
        )}
        {details.shots_hit !== undefined && (
          <>
            <dt className="text-gray-500">Shots Hit</dt>
            <dd className="text-gray-900">{details.shots_hit}</dd>
          </>
        )}
        {details.context && (
          <>
            <dt className="text-gray-500">Context</dt>
            <dd className="text-gray-900 capitalize">{details.context.replace(/_/g, ' ')}</dd>
          </>
        )}
        {details.distance && (
          <>
            <dt className="text-gray-500">Distance</dt>
            <dd className="text-gray-900">{details.distance}</dd>
          </>
        )}
        {details.warning_given !== undefined && (
          <>
            <dt className="text-gray-500">Warning Given</dt>
            <dd className={details.warning_given ? 'text-gray-900' : 'text-red-700'}>{details.warning_given ? 'Yes' : 'No'}</dd>
          </>
        )}
        {details.victim_armed !== undefined && (
          <>
            <dt className="text-gray-500">Victim Armed</dt>
            <dd className="text-gray-900">
              {details.victim_armed ? `Yes${details.victim_weapon ? ` (${details.victim_weapon})` : ''}` : 'No'}
            </dd>
          </>
        )}
        {details.shooter_identified !== undefined && (
          <>
            <dt className="text-gray-500">Shooter Identified</dt>
            <dd className="text-gray-900">
              {details.shooter_identified ? (details.shooter_name || 'Yes') : 'No'}
            </dd>
          </>
        )}
      </dl>
    </div>
  );
}

function ExcessiveForceDetails({ details }: { details: Incident['excessive_force_details'] }) {
  if (!details) return null;
  return (
    <div className="space-y-4">
      {details.force_type && details.force_type.length > 0 && (
        <div>
          <dt className="text-sm text-gray-500 mb-1">Force Types Used</dt>
          <dd className="flex flex-wrap gap-1">
            {details.force_type.map((f) => (
              <span key={f} className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">
                {f.replace(/_/g, ' ')}
              </span>
            ))}
          </dd>
        </div>
      )}
      
      <div className="flex flex-wrap gap-2">
        {details.victim_restrained_when_force_used && (
          <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
            ⚠️ Victim Was Restrained
          </span>
        )}
        {details.victim_complying === true && (
          <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
            ⚠️ Victim Was Complying
          </span>
        )}
        {details.video_evidence && (
          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
            📹 Video Evidence
          </span>
        )}
      </div>
      
      <dl className="grid grid-cols-2 gap-3 text-sm">
        {details.duration && (
          <>
            <dt className="text-gray-500">Duration</dt>
            <dd className="text-gray-900">{details.duration}</dd>
          </>
        )}
        {details.restraint_type && (
          <>
            <dt className="text-gray-500">Restraint Type</dt>
            <dd className="text-gray-900">{details.restraint_type}</dd>
          </>
        )}
        {details.witness_count !== undefined && (
          <>
            <dt className="text-gray-500">Witnesses</dt>
            <dd className="text-gray-900">{details.witness_count}</dd>
          </>
        )}
      </dl>
      
      {details.injuries_caused && details.injuries_caused.length > 0 && (
        <div>
          <dt className="text-sm text-gray-500 mb-1">Injuries Caused</dt>
          <dd className="flex flex-wrap gap-1">
            {details.injuries_caused.map((inj, i) => (
              <span key={i} className="text-xs bg-red-50 text-red-700 px-2 py-1 rounded">
                {inj}
              </span>
            ))}
          </dd>
        </div>
      )}
    </div>
  );
}

function ProtestDetails({ details }: { details: Incident['protest_details'] }) {
  if (!details) return null;
  return (
    <div className="space-y-4">
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <dt className="text-gray-500">Protest Topic</dt>
        <dd className="text-gray-900 col-span-2">{details.protest_topic}</dd>
        
        {details.protest_type && (
          <>
            <dt className="text-gray-500">Type</dt>
            <dd className="text-gray-900 capitalize">{details.protest_type.replace(/_/g, ' ')}</dd>
          </>
        )}
        {details.protest_size && (
          <>
            <dt className="text-gray-500">Size</dt>
            <dd className="text-gray-900">{details.protest_size}</dd>
          </>
        )}
        {details.permitted !== undefined && (
          <>
            <dt className="text-gray-500">Permitted</dt>
            <dd className="text-gray-900">{details.permitted ? 'Yes' : 'No'}</dd>
          </>
        )}
      </dl>
      
      <div className="flex flex-wrap gap-2">
        {details.dispersal_ordered && (
          <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
            ⚠️ Dispersal Ordered
          </span>
        )}
        {details.counter_protesters && (
          <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
            Counter-Protesters Present
          </span>
        )}
      </div>
      
      {details.dispersal_method && (
        <div>
          <dt className="text-sm text-gray-500 mb-1">Dispersal Method</dt>
          <dd className="text-sm text-gray-900">{details.dispersal_method}</dd>
        </div>
      )}
      
      {(details.arrests_made !== undefined || details.injuries_reported !== undefined) && (
        <div className="flex gap-4 text-sm">
          {details.arrests_made !== undefined && (
            <div>
              <span className="text-gray-500">Arrests: </span>
              <span className="font-medium">{details.arrests_made}</span>
            </div>
          )}
          {details.injuries_reported !== undefined && (
            <div>
              <span className="text-gray-500">Injuries: </span>
              <span className="font-medium">{details.injuries_reported}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
