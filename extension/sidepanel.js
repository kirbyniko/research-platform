// ICE Incident Documentation - Sidebar Panel Script

// ============================================
// MODAL SYSTEM - Replace ugly alerts/confirms
// ============================================

function showModal(options) {
  const {
    title = 'Notification',
    message = '',
    buttons = [{ label: 'OK', action: 'confirm', style: 'primary' }],
    type = 'info' // 'info', 'warning', 'error', 'question'
  } = options;

  return new Promise(resolve => {
    // Create modal container
    const modal = document.createElement('div');
    modal.id = 'extension-modal';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    `;

    // Modal content
    const content = document.createElement('div');
    content.style.cssText = `
      background: white;
      border-radius: 12px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      max-width: 500px;
      width: 90%;
      padding: 32px;
      animation: slideIn 0.3s ease-out;
    `;

    // Add animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideIn {
        from {
          opacity: 0;
          transform: translateY(-20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
    `;
    document.head.appendChild(style);

    // Icon
    const iconMap = {
      info: '💡',
      warning: '⚠️',
      error: '❌',
      question: '❓'
    };

    const header = document.createElement('div');
    header.style.cssText = `
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
    `;

    const icon = document.createElement('span');
    icon.textContent = iconMap[type];
    icon.style.cssText = 'font-size: 24px;';

    const titleEl = document.createElement('h2');
    titleEl.textContent = title;
    titleEl.style.cssText = `
      margin: 0;
      font-size: 18px;
      font-weight: 600;
      color: #1f2937;
    `;

    header.appendChild(icon);
    header.appendChild(titleEl);

    // Message
    const messageEl = document.createElement('p');
    messageEl.textContent = message;
    messageEl.style.cssText = `
      margin: 16px 0 24px 0;
      color: #4b5563;
      line-height: 1.5;
      font-size: 14px;
      white-space: pre-wrap;
    `;

    // Buttons container
    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = `
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      margin-top: 24px;
    `;

    // Create buttons
    buttons.forEach(btn => {
      const button = document.createElement('button');
      button.textContent = btn.label;
      
      const baseStyle = `
        padding: 10px 20px;
        border: none;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
        min-width: 100px;
      `;

      const styleMap = {
        primary: `${baseStyle} background: #3b82f6; color: white;`,
        secondary: `${baseStyle} background: #e5e7eb; color: #374151;`,
        danger: `${baseStyle} background: #ef4444; color: white;`,
        success: `${baseStyle} background: #10b981; color: white;`
      };

      button.style.cssText = styleMap[btn.style] || styleMap.secondary;

      button.addEventListener('mouseover', () => {
        if (btn.style === 'primary') button.style.background = '#2563eb';
        if (btn.style === 'secondary') button.style.background = '#d1d5db';
        if (btn.style === 'danger') button.style.background = '#dc2626';
        if (btn.style === 'success') button.style.background = '#059669';
      });

      button.addEventListener('mouseout', () => {
        const colorMap = {
          primary: '#3b82f6',
          secondary: '#e5e7eb',
          danger: '#ef4444',
          success: '#10b981'
        };
        button.style.background = colorMap[btn.style] || colorMap.secondary;
      });

      button.addEventListener('click', () => {
        modal.remove();
        style.remove();
        resolve(btn.action);
      });

      buttonContainer.appendChild(button);
    });

    content.appendChild(header);
    content.appendChild(messageEl);
    content.appendChild(buttonContainer);
    modal.appendChild(content);
    document.body.appendChild(modal);

    // Close on escape
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        modal.remove();
        style.remove();
        document.removeEventListener('keydown', handleEscape);
        resolve('cancel');
      }
    };
    document.addEventListener('keydown', handleEscape);
  });
}

// Replace alert()
function showAlert(message, title = 'Notification') {
  return showModal({
    title: title,
    message: message,
    type: 'info',
    buttons: [{ label: 'OK', action: 'confirm', style: 'primary' }]
  });
}

// Replace confirm()
function showConfirm(message, title = 'Confirm') {
  return showModal({
    title: title,
    message: message,
    type: 'question',
    buttons: [
      { label: 'Cancel', action: false, style: 'secondary' },
      { label: 'Confirm', action: true, style: 'primary' }
    ]
  });
}

// Show error modal
function showError(message, title = 'Error') {
  return showModal({
    title: title,
    message: message,
    type: 'error',
    buttons: [{ label: 'OK', action: 'confirm', style: 'primary' }]
  });
}

// Show warning modal
function showWarning(message, title = 'Warning') {
  return showModal({
    title: title,
    message: message,
    type: 'warning',
    buttons: [
      { label: 'Cancel', action: false, style: 'secondary' },
      { label: 'Continue', action: true, style: 'danger' }
    ]
  });
}

// Helper to convert tri-state select value to boolean/null
function triStateToBoolean(value) {
  if (value === 'yes') return true;
  if (value === 'no') return false;
  return null;
}

// Helper to convert boolean/null to tri-state select value
function booleanToTriState(value) {
  if (value === true) return 'yes';
  if (value === false) return 'no';
  return '';
}

// State
let isPopulatingForm = false; // Flag to prevent updateCaseFromForm during populateCaseForm
let currentCase = {
  incidentType: 'death_in_custody',  // Primary type (backward compatibility)
  incidentTypes: [],  // Array of all selected types (multi-type support)
  name: '',
  dateOfDeath: '',
  age: '',
  country: '',
  occupation: '',
  facility: '',
  location: '',
  causeOfDeath: '',
  agencies: [],
  violations: [],
  tags: [],  // Tags array
  // Death-specific
  deathCause: '',
  deathManner: '',
  deathCustodyDuration: '',
  deathMedicalDenied: null,  // Changed to null for tri-state
  // Injury-specific
  injuryType: '',
  injurySeverity: '',
  injuryWeapon: '',
  injuryCause: '',
  // Arrest-specific
  arrestReason: '',
  arrestContext: '',
  arrestCharges: '',
  arrestTimingSuspicious: null,  // Changed to null for tri-state
  arrestPretext: null,  // Changed to null for tri-state
  arrestSelective: null,  // Changed to null for tri-state
  // Violation-specific
  violationJournalism: false,
  violationProtest: false,
  violationActivism: false,
  violationSpeech: '',
  violationRuling: '',
  // Shooting-specific
  shootingFatal: null,  // Changed to null for tri-state
  shotsFired: '',
  weaponType: '',
  bodycamAvailable: null,  // Changed to null for tri-state
  victimArmed: null,  // Changed to null for tri-state
  warningGiven: null,  // Changed to null for tri-state
  shootingContext: '',
  // Excessive force-specific
  forceTypes: [],
  victimRestrained: null,  // Changed to null for tri-state
  victimComplying: null,  // Changed to null for tri-state
  videoEvidence: null,  // Changed to null for tri-state
  hospitalizationRequired: null,  // Added tri-state
  // Medical neglect-specific
  requestsDocumented: null,  // Added tri-state
  resultedInDeath: null,  // Added tri-state
  medicalNeglectAlleged: null,  // Added tri-state
  autopsyAvailable: null,  // Added tri-state
  // Protest-specific
  protestTopic: '',
  protestSize: '',
  protestPermitted: null,  // Changed to null for tri-state
  dispersalMethod: [],
  arrestsMade: ''
};
let verifiedQuotes = [];
let pendingQuotes = [];
let sources = [];
let media = [];  // Array of {url, media_type, title?, description?}
let customFields = [];  // Array of custom fields for current incident
let isConnected = false;
let apiUrl = 'https://research-platform-beige.vercel.app';
let apiKey = '';
let currentSelectors = {};
let isExtracting = false;
let currentPageIsPdf = false;
let userRole = null;  // For analyst workflow
let currentUserId = null;  // Current user's ID for lock checking
let currentUserEmail = null;  // Current user's email
let reviewQueue = [];  // Cases awaiting review
let reviewQueueStats = {};  // Stats from API
let guestSubmissionsQueue = [];  // Guest submissions awaiting review
let guestSubmissionsCount = 0;  // Count of pending guest submissions
let reviewMode = false;  // Are we reviewing an existing incident?
let reviewIncidentId = null;  // ID of incident being reviewed
let isNewIncidentFromGuest = false;  // Are we creating a new incident from guest submission?
let currentGuestSubmissionId = null;  // ID of guest submission being reviewed
let verifiedFields = {};  // Track which fields have been verified in review mode

// Multi-project state
let projectsLoaded = false;
let currentProjectSlug = null;
let currentRecordTypeSlug = null;
let dynamicFieldDefinitions = [];
let dynamicFieldGroups = [];
let verifiedMedia = {};  // Track which media items have been verified
let reviewTimeline = []; // Timeline entries loaded during review

// Validation state
let validateMode = false;
let validateIncidentId = null;
let validationState = {};  // { key: { checked: bool, reason: string } }
let validationData = null; // Full case data for validation

// Guest submission rate limit tracking
let guestSubmissions = [];  // Array of timestamps
const GUEST_RATE_LIMIT = 5;  // 5 per hour
const GUEST_RATE_WINDOW = 60 * 60 * 1000;  // 1 hour in ms

// Constitutional and Legal Reference Database
const LEGAL_REFERENCES = {
  first_amendment: {
    name: "First Amendment",
    text: "Congress shall make no law respecting an establishment of religion, or prohibiting the free exercise thereof; or abridging the freedom of speech, or of the press; or the right of the people peaceably to assemble, and to petition the Government for a redress of grievances.",
    textSource: "https://constitution.congress.gov/constitution/amendment-1/",
    cases: [
      {
        name: "Brandenburg v. Ohio (1969)",
        citation: "395 U.S. 444",
        sourceUrl: "https://www.law.cornell.edu/supremecourt/text/395/444",
        holding: "The constitutional guarantees of free speech and free press do not permit a State to forbid or proscribe advocacy of the use of force or of law violation except where such advocacy is directed to inciting or producing imminent lawless action and is likely to incite or produce such action."
      },
      {
        name: "NAACP v. Claiborne Hardware Co. (1982)",
        citation: "458 U.S. 886",
        sourceUrl: "https://www.law.cornell.edu/supremecourt/text/458/886",
        holding: "Civil liability may not be imposed merely because an individual belonged to a group, some members of which committed acts of violence."
      },
      {
        name: "Nieves v. Bartlett (2019)",
        citation: "139 S. Ct. 1715",
        sourceUrl: "https://www.supremecourt.gov/opinions/18pdf/17-1174_m6io.pdf",
        holding: "Because there are a 'limited number of circumstances' in which 'an officer's retaliatory intent could be sufficiently unrelated to any legitimate arrestee behavior' to allow a claim, we craft a narrow exception."
      }
    ],
    applicationNotes: "[Editorial guidance - not quotable] Consider when: arrests target journalists, protesters, or activists; retaliation for criticism; suppression of peaceful assembly."
  },
  fourth_amendment: {
    name: "Fourth Amendment",
    text: "The right of the people to be secure in their persons, houses, papers, and effects, against unreasonable searches and seizures, shall not be violated, and no Warrants shall issue, but upon probable cause, supported by Oath or affirmation, and particularly describing the place to be searched, and the persons or things to be seized.",
    textSource: "https://constitution.congress.gov/constitution/amendment-4/",
    cases: [
      {
        name: "Terry v. Ohio (1968)",
        citation: "392 U.S. 1",
        sourceUrl: "https://www.law.cornell.edu/supremecourt/text/392/1",
        holding: "Where a police officer observes unusual conduct which leads him reasonably to conclude in light of his experience that criminal activity may be afoot... he is entitled for the protection of himself and others in the area to conduct a carefully limited search of the outer clothing of such persons in an attempt to discover weapons."
      },
      {
        name: "Tennessee v. Garner (1985)",
        citation: "471 U.S. 1",
        sourceUrl: "https://www.law.cornell.edu/supremecourt/text/471/1",
        holding: "Where the suspect poses no immediate threat to the officer and no threat to others, the harm resulting from failing to apprehend him does not justify the use of deadly force to do so... A police officer may not seize an unarmed, nondangerous suspect by shooting him dead."
      },
      {
        name: "Graham v. Connor (1989)",
        citation: "490 U.S. 386",
        sourceUrl: "https://www.law.cornell.edu/supremecourt/text/490/386",
        holding: "The 'reasonableness' of a particular use of force must be judged from the perspective of a reasonable officer on the scene, rather than with the 20/20 vision of hindsight."
      },
      {
        name: "Arizona v. United States (2012)",
        citation: "567 U.S. 387",
        sourceUrl: "https://www.law.cornell.edu/supremecourt/text/11-182",
        holding: "The Federal Government has broad, undoubted power over the subject of immigration and the status of aliens."
      }
    ],
    applicationNotes: "[Editorial guidance - not quotable] Consider when: arrests without probable cause; excessive force during arrests; warrantless searches; prolonged detention."
  },
  fifth_amendment: {
    name: "Fifth Amendment",
    text: "No person shall be held to answer for a capital, or otherwise infamous crime, unless on a presentment or indictment of a Grand Jury...; nor shall any person be subject for the same offence to be twice put in jeopardy of life or limb; nor shall be compelled in any criminal case to be a witness against himself, nor be deprived of life, liberty, or property, without due process of law; nor shall private property be taken for public use, without just compensation.",
    textSource: "https://constitution.congress.gov/constitution/amendment-5/",
    cases: [
      {
        name: "Mathews v. Eldridge (1976)",
        citation: "424 U.S. 319",
        sourceUrl: "https://www.law.cornell.edu/supremecourt/text/424/319",
        holding: "Due process is flexible, and calls for such procedural protections as the particular situation demands."
      },
      {
        name: "Zadvydas v. Davis (2001)",
        citation: "533 U.S. 678",
        sourceUrl: "https://www.law.cornell.edu/supremecourt/text/533/678",
        holding: "Once an alien enters the country, the legal circumstance changes, for the Due Process Clause applies to all 'persons' within the United States, including aliens, whether their presence here is lawful, unlawful, temporary, or permanent."
      },
      {
        name: "Jennings v. Rodriguez (2018)",
        citation: "138 S. Ct. 830",
        sourceUrl: "https://www.supremecourt.gov/opinions/17pdf/15-1204_f29g.pdf",
        holding: "The relevant statutory provisions do not give detained aliens the right to periodic bond hearings during the course of their detention."
      }
    ],
    applicationNotes: "[Editorial guidance - not quotable] Consider when: prolonged detention without hearing; deportation without adequate process; denial of opportunity to contest charges."
  },
  sixth_amendment: {
    name: "Sixth Amendment",
    text: "In all criminal prosecutions, the accused shall enjoy the right to a speedy and public trial, by an impartial jury of the State and district wherein the crime shall have been committed...; to be informed of the nature and cause of the accusation; to be confronted with the witnesses against him; to have compulsory process for obtaining witnesses in his favor, and to have the Assistance of Counsel for his defence.",
    textSource: "https://constitution.congress.gov/constitution/amendment-6/",
    cases: [
      {
        name: "Gideon v. Wainwright (1963)",
        citation: "372 U.S. 335",
        sourceUrl: "https://www.law.cornell.edu/supremecourt/text/372/335",
        holding: "The right of one charged with crime to counsel may not be deemed fundamental and essential to fair trials in some countries, but it is in ours."
      },
      {
        name: "Padilla v. Kentucky (2010)",
        citation: "559 U.S. 356",
        sourceUrl: "https://www.law.cornell.edu/supremecourt/text/08-651",
        holding: "Counsel must inform her client whether his plea carries a risk of deportation."
      }
    ],
    applicationNotes: "[Editorial guidance - not quotable] Consider when: denial of legal representation; inadequate legal counsel; lack of interpreter services."
  },
  eighth_amendment: {
    name: "Eighth Amendment",
    text: "Excessive bail shall not be required, nor excessive fines imposed, nor cruel and unusual punishments inflicted.",
    textSource: "https://constitution.congress.gov/constitution/amendment-8/",
    cases: [
      {
        name: "Estelle v. Gamble (1976)",
        citation: "429 U.S. 97",
        sourceUrl: "https://www.law.cornell.edu/supremecourt/text/429/97",
        holding: "Deliberate indifference to serious medical needs of prisoners constitutes the 'unnecessary and wanton infliction of pain' proscribed by the Eighth Amendment."
      },
      {
        name: "Farmer v. Brennan (1994)",
        citation: "511 U.S. 825",
        sourceUrl: "https://www.law.cornell.edu/supremecourt/text/511/825",
        holding: "A prison official may be held liable under the Eighth Amendment for denying humane conditions of confinement only if he knows that inmates face a substantial risk of serious harm and disregards that risk by failing to take reasonable measures to abate it."
      },
      {
        name: "Kingsley v. Hendrickson (2015)",
        citation: "576 U.S. 389",
        sourceUrl: "https://www.supremecourt.gov/opinions/14pdf/14-6368_m64o.pdf",
        holding: "A pretrial detainee must show only that the force purposely or knowingly used against him was objectively unreasonable."
      }
    ],
    applicationNotes: "[Editorial guidance - not quotable] Consider when: denial of medical care in detention; inhumane conditions; excessive force against detainees."
  },
  fourteenth_amendment: {
    name: "Fourteenth Amendment (Section 1)",
    text: "All persons born or naturalized in the United States, and subject to the jurisdiction thereof, are citizens of the United States and of the State wherein they reside. No State shall make or enforce any law which shall abridge the privileges or immunities of citizens of the United States; nor shall any State deprive any person of life, liberty, or property, without due process of law; nor deny to any person within its jurisdiction the equal protection of the laws.",
    textSource: "https://constitution.congress.gov/constitution/amendment-14/",
    cases: [
      {
        name: "Plyler v. Doe (1982)",
        citation: "457 U.S. 202",
        sourceUrl: "https://www.law.cornell.edu/supremecourt/text/457/202",
        holding: "Whatever his status under the immigration laws, an alien is surely a 'person' in any ordinary sense of that term. Aliens, even aliens whose presence in this country is unlawful, have long been recognized as 'persons' guaranteed due process of law by the Fifth and Fourteenth Amendments."
      },
      {
        name: "Yick Wo v. Hopkins (1886)",
        citation: "118 U.S. 356",
        sourceUrl: "https://www.law.cornell.edu/supremecourt/text/118/356",
        holding: "The fourteenth amendment to the constitution is not confined to the protection of citizens... These provisions are universal in their application, to all persons within the territorial jurisdiction."
      },
      {
        name: "Wong Wing v. United States (1896)",
        citation: "163 U.S. 228",
        sourceUrl: "https://www.law.cornell.edu/supremecourt/text/163/228",
        holding: "All persons within the territory of the United States are entitled to the protection guaranteed by those amendments, and... even aliens shall not be held to answer for a capital or other infamous crime, unless on a presentment or indictment of a grand jury."
      }
    ],
    applicationNotes: "[Editorial guidance - not quotable] Consider when: discrimination based on nationality; selective enforcement; denial of equal legal protections."
  },
  civil_rights: {
    name: "Civil Rights Statutes",
    text: "42 U.S.C. § 1983: Every person who, under color of any statute, ordinance, regulation, custom, or usage, of any State or Territory... subjects, or causes to be subjected, any citizen of the United States or other person within the jurisdiction thereof to the deprivation of any rights, privileges, or immunities secured by the Constitution and laws, shall be liable to the party injured.",
    textSource: "https://www.law.cornell.edu/uscode/text/42/1983",
    cases: [
      {
        name: "Monroe v. Pape (1961)",
        citation: "365 U.S. 167",
        sourceUrl: "https://www.law.cornell.edu/supremecourt/text/365/167",
        holding: "Section 1979 [now § 1983] should be read against the background of tort liability that makes a man responsible for the natural consequences of his actions."
      },
      {
        name: "Monell v. Department of Social Services (1978)",
        citation: "436 U.S. 658",
        sourceUrl: "https://www.law.cornell.edu/supremecourt/text/436/658",
        holding: "Local governing bodies... can be sued directly under § 1983 for monetary, declaratory, or injunctive relief where... the action that is alleged to be unconstitutional implements or executes a policy statement, ordinance, regulation, or decision officially adopted and promulgated by that body's officers."
      },
      {
        name: "Bivens v. Six Unknown Named Agents (1971)",
        citation: "403 U.S. 388",
        sourceUrl: "https://www.law.cornell.edu/supremecourt/text/403/388",
        holding: "The Fourth Amendment operates as a limitation upon the exercise of federal power... and where federally protected rights have been invaded, it has been the rule from the beginning that courts will be alert to adjust their remedies so as to grant the necessary relief."
      }
    ],
    applicationNotes: "[Editorial guidance - not quotable] Consider when: any constitutional violation by government officials; basis for § 1983 or Bivens lawsuits."
  },
  excessive_force: {
    name: "Excessive Force Standards",
    text: "[No constitutional text - derived from 4th/8th/14th Amendment case law]",
    textSource: null,
    cases: [
      {
        name: "Graham v. Connor (1989)",
        citation: "490 U.S. 386",
        sourceUrl: "https://www.law.cornell.edu/supremecourt/text/490/386",
        holding: "Our Fourth Amendment jurisprudence has long recognized that the right to make an arrest or investigatory stop necessarily carries with it the right to use some degree of physical coercion or threat thereof to effect it... The calculus of reasonableness must embody allowance for the fact that police officers are often forced to make split-second judgments—in circumstances that are tense, uncertain, and rapidly evolving."
      },
      {
        name: "Tennessee v. Garner (1985)",
        citation: "471 U.S. 1",
        sourceUrl: "https://www.law.cornell.edu/supremecourt/text/471/1",
        holding: "Where the suspect poses no immediate threat to the officer and no threat to others, the harm resulting from failing to apprehend him does not justify the use of deadly force to do so."
      },
      {
        name: "Scott v. Harris (2007)",
        citation: "550 U.S. 372",
        sourceUrl: "https://www.law.cornell.edu/supremecourt/text/550/372",
        holding: "A police officer's attempt to terminate a dangerous high-speed car chase that threatens the lives of innocent bystanders does not violate the Fourth Amendment, even when it places the fleeing motorist at risk of serious injury or death."
      }
    ],
    applicationNotes: "[Editorial guidance - not quotable] Graham factors: (1) severity of crime, (2) immediate threat posed, (3) active resistance/evasion."
  },
  wrongful_death: {
    name: "Wrongful Death & Deliberate Indifference",
    text: "[No constitutional text - derived from 8th/14th Amendment case law and state tort law]",
    textSource: null,
    cases: [
      {
        name: "Estate of Owensby v. City of Cincinnati (6th Cir. 2005)",
        citation: "414 F.3d 596",
        sourceUrl: "https://caselaw.findlaw.com/court/us-6th-circuit/1234567.html",
        holding: "[Note: Circuit court decisions should be verified. Consult Westlaw/LexisNexis for authoritative text.]"
      },
      {
        name: "County of Sacramento v. Lewis (1998)",
        citation: "523 U.S. 833",
        sourceUrl: "https://www.law.cornell.edu/supremecourt/text/523/833",
        holding: "The touchstone of due process is protection of the individual against arbitrary action of government... only the most egregious official conduct can be said to be 'arbitrary in the constitutional sense.'"
      }
    ],
    applicationNotes: "[Editorial guidance - not quotable] Consider when: deaths from medical neglect; deaths from excessive force; failure to protect from known dangers."
  },
  asylum_violation: {
    name: "Asylum & Refugee Law",
    text: "8 U.S.C. § 1158(a)(1): Any alien who is physically present in the United States or who arrives in the United States (whether or not at a designated port of arrival...), irrespective of such alien's status, may apply for asylum.",
    textSource: "https://www.law.cornell.edu/uscode/text/8/1158",
    cases: [
      {
        name: "INS v. Cardoza-Fonseca (1987)",
        citation: "480 U.S. 421",
        sourceUrl: "https://www.law.cornell.edu/supremecourt/text/480/421",
        holding: "There is simply no room in the United Nations' definition for concluding that because an applicant only has a 10% chance of being shot, tortured, or otherwise persecuted, that he or she has no 'well-founded fear' of the event happening."
      },
      {
        name: "Sale v. Haitian Centers Council (1993)",
        citation: "509 U.S. 155",
        sourceUrl: "https://www.law.cornell.edu/supremecourt/text/509/155",
        holding: "Neither the text nor the negotiating history of [INA § 243(h)] suggests that Congress intended the statute to have extraterritorial application."
      }
    ],
    applicationNotes: "[Editorial guidance - not quotable] Consider when: deportation to danger; denial of asylum hearings; expedited removal without screening."
  }
};

// Default CSS selectors
const DEFAULT_SELECTORS = {
  "nytimes.com": {
    article: "article[data-testid='story-body'], section[name='articleBody']",
    headline: "h1[data-testid='headline']",
    date: "time[datetime]",
    author: "[data-testid='byline']"
  },
  "washingtonpost.com": {
    article: "article.paywall, .article-body",
    headline: "h1[data-qa='headline'], h1",
    date: "span.display-date, time",
    author: ".author-name, .byline"
  },
  "theguardian.com": {
    article: "div[data-gu-name='body'], .article-body-commercial-selector",
    headline: "h1",
    date: "time[datetime]",
    author: "a[rel='author']"
  },
  "reuters.com": {
    article: "article, .article-body__content",
    headline: "h1[data-testid='Heading'], h1",
    date: "time[datetime]",
    author: "[data-testid='AuthorName'], .author-name"
  },
  "apnews.com": {
    article: "div.RichTextStoryBody, .Article",
    headline: "h1",
    date: "span.Timestamp, time",
    author: ".CardHeadline-By, .byline"
  },
  "ice.gov": {
    article: "article, .main-content, .field--name-body",
    headline: "h1",
    date: ".date-display-single, time",
    author: ""
  },
  "*": {
    article: "article, main, [role='main'], .article, .post, .content, .story",
    headline: "h1",
    date: "time[datetime], .date, .published, .timestamp",
    author: ".author, .byline, [rel='author']"
  }
};

// DOM Elements
const elements = {};

// Initialize
async function init() {
  cacheElements();
  await loadSettings();
  await loadState();
  setupEventListeners();
  setupQuoteAssociationListeners();
  setupTabs();
  checkConnection();
  updatePageInfo();
  loadQuoteAssociations();
  
  // Initialize project selector
  await initProjectContext();
  
  // Initialize violation case law dropdowns
  initializeAllCaseLawDropdowns();
  updateViolationCount();
  
  // Check if opened in wide mode popup
  if (window.location.search.includes('wide=true')) {
    enableWideMode();
  }
  
  // Initialize content mode in background for context menu
  chrome.runtime.sendMessage({
    type: 'SET_CONTENT_MODE',
    mode: currentContentType,
    isValidateMode: false
  });
}

// Enable wide mode layout (for popup window)
function enableWideMode() {
  document.body.classList.add('wide-mode');
  document.querySelectorAll('.tab-content').forEach(tab => {
    if (tab.id !== 'tab-settings') {
      tab.classList.add('active');
    }
  });
  // Hide the wide mode button since we're already in wide mode
  const wideModeBtn = document.getElementById('wideModeBtn');
  if (wideModeBtn) {
    wideModeBtn.style.display = 'none';
  }
}

// Cache DOM elements
function cacheElements() {
  elements.statusDot = document.getElementById('statusDot');
  elements.statusText = document.getElementById('statusText');
  elements.pageInfo = document.getElementById('pageInfo');
  // Incident type
  elements.incidentType = document.getElementById('incidentType');
  // Basic case fields
  elements.caseName = document.getElementById('caseName');
  elements.caseDod = document.getElementById('caseDod');
  elements.caseAge = document.getElementById('caseAge');
  elements.caseCountry = document.getElementById('caseCountry');
  elements.caseGender = document.getElementById('caseGender');
  elements.caseImmigrationStatus = document.getElementById('caseImmigrationStatus');
  elements.caseFacility = document.getElementById('caseFacility');
  elements.caseCity = document.getElementById('caseCity');
  elements.caseState = document.getElementById('caseState');
  elements.caseCause = document.getElementById('caseCause');
  // Tag elements
  elements.tagSelect = document.getElementById('tagSelect');
  elements.addTagBtn = document.getElementById('addTagBtn');
  elements.currentTags = document.getElementById('currentTags');
  // Media elements
  elements.addMediaBtn = document.getElementById('addMediaBtn');
  elements.uploadMediaBtn = document.getElementById('uploadMediaBtn');
  elements.mediaFileInput = document.getElementById('mediaFileInput');
  elements.uploadProgress = document.getElementById('uploadProgress');
  elements.uploadProgressBar = document.getElementById('uploadProgressBar');
  elements.uploadStatus = document.getElementById('uploadStatus');
  elements.mediaList = document.getElementById('mediaList');
  // Sections that show/hide based on type
  elements.violationsSection = document.getElementById('violationsSection');
  elements.deathFields = document.getElementById('deathFields');
  elements.injuryFields = document.getElementById('injuryFields');
  elements.arrestFields = document.getElementById('arrestFields');
  elements.violationFields = document.getElementById('violationFields');
  // Death-specific fields
  elements.deathCause = document.getElementById('deathCause');
  elements.deathManner = document.getElementById('deathManner');
  elements.deathCustodyDuration = document.getElementById('deathCustodyDuration');
  elements.deathMedicalDenied = document.getElementById('deathMedicalDenied');
  elements.medicalNeglectAlleged = document.getElementById('medicalNeglectAlleged');
  // Injury-specific fields
  elements.injuryType = document.getElementById('injuryType');
  elements.injurySeverity = document.getElementById('injurySeverity');
  elements.injuryWeapon = document.getElementById('injuryWeapon');
  elements.injuryCause = document.getElementById('injuryCause');
  // Arrest-specific fields
  elements.arrestReason = document.getElementById('arrestReason');
  elements.arrestContext = document.getElementById('arrestContext');
  elements.arrestCharges = document.getElementById('arrestCharges');
  elements.arrestTimingSuspicious = document.getElementById('arrestTimingSuspicious');
  elements.arrestPretext = document.getElementById('arrestPretext');
  elements.arrestSelective = document.getElementById('arrestSelective');
  // Violation-specific fields
  elements.violationJournalism = document.getElementById('violationJournalism');
  elements.violationProtest = document.getElementById('violationProtest');
  elements.violationActivism = document.getElementById('violationActivism');
  elements.violationSpeech = document.getElementById('violationSpeech');
  elements.violationRuling = document.getElementById('violationRuling');
  // Quote/source lists
  elements.quoteList = document.getElementById('quoteList');
  elements.quoteCount = document.getElementById('quoteCount');
  elements.timelineList = document.getElementById('timelineList');
  elements.timelineCount = document.getElementById('timelineCount');
  elements.pendingList = document.getElementById('pendingList');
  elements.pendingCount = document.getElementById('pendingCount');
  elements.reviewQuoteText = document.getElementById('reviewQuoteText');
  elements.reviewQuoteSourceSelect = document.getElementById('reviewQuoteSourceSelect');
  elements.addReviewQuoteBtn = document.getElementById('addReviewQuoteBtn');
  elements.reviewTimelineDate = document.getElementById('reviewTimelineDate');
  elements.reviewTimelineDesc = document.getElementById('reviewTimelineDesc');
  elements.reviewTimelineQuoteSelect = document.getElementById('reviewTimelineQuoteSelect');
  elements.addReviewTimelineBtn = document.getElementById('addReviewTimelineBtn');
  elements.sourceList = document.getElementById('sourceList');
  elements.sourceCount = document.getElementById('sourceCount');
  elements.extractBtn = document.getElementById('extractBtn');
  elements.extractProgress = document.getElementById('extractProgress');
  elements.progressFill = document.getElementById('progressFill');
  elements.progressText = document.getElementById('progressText');
  elements.bulkActions = document.getElementById('bulkActions');
  elements.saveCaseBtn = document.getElementById('saveCaseBtn');
  elements.newCaseBtn = document.getElementById('newCaseBtn');
  elements.clearCaseBtn = document.getElementById('clearCaseBtn');
  elements.addSourceBtn = document.getElementById('addSourceBtn');
  elements.addManualSourceBtn = document.getElementById('addManualSourceBtn');
  elements.acceptAllBtn = document.getElementById('acceptAllBtn');
  elements.rejectAllBtn = document.getElementById('rejectAllBtn');
  elements.manualAddHeader = document.getElementById('manualAddHeader');
  elements.manualAddContent = document.getElementById('manualAddContent');
  elements.manualQuoteText = document.getElementById('manualQuoteText');
  elements.manualQuoteSource = document.getElementById('manualQuoteSource');
  elements.manualQuoteCategory = document.getElementById('manualQuoteCategory');
  elements.addManualQuoteBtn = document.getElementById('addManualQuoteBtn');
  // Custom selector elements
  elements.customSelectorHeader = document.getElementById('customSelectorHeader');
  elements.customSelectorContent = document.getElementById('customSelectorContent');
  elements.customSelector = document.getElementById('customSelector');
  elements.pickElementBtn = document.getElementById('pickElementBtn');
  elements.testSelectorBtn = document.getElementById('testSelectorBtn');
  elements.extractCustomBtn = document.getElementById('extractCustomBtn');
  elements.selectorTestResult = document.getElementById('selectorTestResult');
  // Case tab extract elements (integrated)
  elements.caseExtractBtn = document.getElementById('caseExtractBtn');
  elements.casePasteText = document.getElementById('casePasteText');
  elements.caseExtractFromTextBtn = document.getElementById('caseExtractFromTextBtn');
  elements.caseExtractProgress = document.getElementById('caseExtractProgress');
  elements.caseProgressFill = document.getElementById('caseProgressFill');
  elements.caseProgressText = document.getElementById('caseProgressText');
  // Settings elements
  elements.apiKey = document.getElementById('apiKey');
  elements.testConnectionBtn = document.getElementById('testConnectionBtn');

  elements.clearAllDataBtn = document.getElementById('clearAllDataBtn');
  // Review add controls
  if (elements.addReviewQuoteBtn) elements.addReviewQuoteBtn.addEventListener('click', addReviewQuote);
  if (elements.addReviewTimelineBtn) elements.addReviewTimelineBtn.addEventListener('click', addReviewTimelineEntry);
  // Agency collapsible
  elements.agenciesHeader = document.getElementById('agenciesHeader');
  elements.agenciesContent = document.getElementById('agenciesContent');
  elements.violationsHeader = document.getElementById('violationsHeader');
  elements.violationsContent = document.getElementById('violationsContent');
  // New sections for shooting/force/protest details
  elements.shootingSection = document.getElementById('shootingSection');
  elements.shootingHeader = document.getElementById('shootingHeader');
  elements.shootingContent = document.getElementById('shootingContent');
  elements.excessiveForceSection = document.getElementById('excessiveForceSection');
  elements.excessiveForceHeader = document.getElementById('excessiveForceHeader');
  elements.excessiveForceContent = document.getElementById('excessiveForceContent');
  elements.protestSection = document.getElementById('protestSection');
  elements.protestHeader = document.getElementById('protestHeader');
  elements.protestContent = document.getElementById('protestContent');
  // Shooting detail fields
  elements.shootingFatal = document.getElementById('shootingFatal');
  elements.shotsFired = document.getElementById('shotsFired');
  elements.weaponType = document.getElementById('weaponType');
  elements.bodycamAvailable = document.getElementById('bodycamAvailable');
  elements.victimArmed = document.getElementById('victimArmed');
  elements.warningGiven = document.getElementById('warningGiven');
  elements.shootingContext = document.getElementById('shootingContext');
  // Excessive force detail fields
  elements.victimRestrained = document.getElementById('victimRestrained');
  elements.victimComplying = document.getElementById('victimComplying');
  elements.videoEvidence = document.getElementById('videoEvidence');
  elements.hospitalizationRequired = document.getElementById('hospitalizationRequired');
  elements.injuriesSustained = document.getElementById('injuriesSustained');
  // Additional force type checkboxes
  elements.forceChokehold = document.getElementById('force-chokehold');
  elements.forceKneeOnNeck = document.getElementById('force-knee_on_neck');
  // Protest detail fields
  elements.protestTopic = document.getElementById('protestTopic');
  elements.protestSize = document.getElementById('protestSize');
  elements.protestPermitted = document.getElementById('protestPermitted');
  elements.dispersalMethodCheckboxes = document.querySelectorAll('.dispersal-method-checkbox');
  elements.arrestsMade = document.getElementById('arrestsMade');
  // Medical neglect section
  elements.medicalNeglectSection = document.getElementById('medicalNeglectSection');
  elements.medicalCondition = document.getElementById('medicalCondition');
  elements.treatmentDenied = document.getElementById('treatmentDenied');
  elements.requestsDocumented = document.getElementById('requestsDocumented');
  elements.resultedInDeath = document.getElementById('resultedInDeath');
  // Death section additions
  elements.autopsyAvailable = document.getElementById('autopsyAvailable');
  elements.deathCircumstances = document.getElementById('deathCircumstances');
  // Arrest section additions
  elements.warrantPresent = document.getElementById('warrantPresent');
  
  // Content type elements (NEW)
  elements.incidentFormContainer = document.getElementById('incidentFormContainer');
  elements.statementFormContainer = document.getElementById('statementFormContainer');
  elements.contentTypeRadios = document.querySelectorAll('input[name="content_type"]');
  
  // Statement form elements
  elements.statementType = document.getElementById('statementType');
  elements.statementDate = document.getElementById('statementDate');
  elements.statementHeadline = document.getElementById('statementHeadline');
  elements.statementKeyQuote = document.getElementById('statementKeyQuote');
  elements.speakerName = document.getElementById('speakerName');
  elements.speakerTitle = document.getElementById('speakerTitle');
  elements.speakerOrganization = document.getElementById('speakerOrganization');
  elements.speakerType = document.getElementById('speakerType');
  elements.politicalAffiliation = document.getElementById('politicalAffiliation');
  elements.speakerCredentials = document.getElementById('speakerCredentials');
  elements.speakerWikipedia = document.getElementById('speakerWikipedia');
  elements.statementPlatform = document.getElementById('statementPlatform');
  elements.statementPlatformUrl = document.getElementById('statementPlatformUrl');
  elements.statementFullText = document.getElementById('statementFullText');
  elements.statementContext = document.getElementById('statementContext');
  elements.statementImpactLevel = document.getElementById('statementImpactLevel');
  elements.statementMediaCoverage = document.getElementById('statementMediaCoverage');
  elements.engagementLikes = document.getElementById('engagementLikes');
  elements.engagementShares = document.getElementById('engagementShares');
  elements.engagementViews = document.getElementById('engagementViews');
  elements.previouslySupported = document.getElementById('previouslySupported');
  elements.partyTypicallySupports = document.getElementById('partyTypicallySupports');
  elements.breakingRanks = document.getElementById('breakingRanks');
  elements.iceResponse = document.getElementById('iceResponse');
  elements.notableResponses = document.getElementById('notableResponses');
  elements.statementImpactSection = document.getElementById('statementImpactSection');
  elements.statementPersuasionSection = document.getElementById('statementPersuasionSection');
  elements.statementResponsesSection = document.getElementById('statementResponsesSection');
  
  // Statement manual quote elements
  elements.statementManualAddHeader = document.getElementById('statementManualAddHeader');
  elements.statementManualAddContent = document.getElementById('statementManualAddContent');
  elements.statementManualQuoteText = document.getElementById('statementManualQuoteText');
  elements.statementManualQuoteSource = document.getElementById('statementManualQuoteSource');
  elements.statementManualQuoteCategory = document.getElementById('statementManualQuoteCategory');
  elements.addStatementManualQuoteBtn = document.getElementById('addStatementManualQuoteBtn');
}

// Load settings from storage
async function loadSettings() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['apiKey', 'apiUrl', 'customSelectors'], (result) => {
      if (result.apiKey) {
        apiKey = result.apiKey;
        elements.apiKey.value = apiKey;
      }
      if (result.apiUrl) {
        apiUrl = result.apiUrl;
        console.log('Loaded API URL from storage:', apiUrl);
      } else {
        console.log('Using default API URL:', apiUrl);
      }
      if (result.customSelectors) {
        currentSelectors = result.customSelectors;
      }
      resolve();
    });
  });
}

// Load state from background
async function loadState() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'GET_STATE' }, (response) => {
      if (response) {
        if (response.currentCase) {
          currentCase = response.currentCase;
          populateCaseForm();
        }
        // Use verifiedQuotes array if available, otherwise filter from pendingQuotes
        if (response.verifiedQuotes && response.verifiedQuotes.length > 0) {
          verifiedQuotes = response.verifiedQuotes;
          // Mark all loaded quotes as verified in verifiedFields so they display
          verifiedQuotes.forEach(q => {
            verifiedFields[`quote_${q.id}`] = true;
          });
        } else if (response.pendingQuotes) {
          verifiedQuotes = response.pendingQuotes.filter(q => q.status === 'verified');
          // Mark filtered verified quotes
          verifiedQuotes.forEach(q => {
            verifiedFields[`quote_${q.id}`] = true;
          });
        }
        if (response.pendingQuotes) {
          pendingQuotes = response.pendingQuotes.filter(q => q.status !== 'verified');
        }
        if (response.sources) {
          sources = response.sources;
        }
        renderQuotes();
        renderPendingQuotes();
        renderSources();
      }
      resolve();
    });
  });
}

// Initialize project context - fetch projects and set up selectors
async function initProjectContext() {
  const projectSelector = document.getElementById('projectSelector');
  const recordTypeSelector = document.getElementById('recordTypeSelector');
  
  if (!projectSelector || !recordTypeSelector) {
    console.warn('[ProjectContext] Selectors not found');
    return;
  }
  
  // Set up change handlers
  projectSelector.addEventListener('change', async (e) => {
    const slug = e.target.value;
    if (slug) {
      await selectProject(slug);
    } else {
      recordTypeSelector.innerHTML = '<option value="">-- Select Type --</option>';
      recordTypeSelector.disabled = true;
      currentProjectSlug = null;
      currentRecordTypeSlug = null;
    }
  });
  
  recordTypeSelector.addEventListener('change', async (e) => {
    const slug = e.target.value;
    if (slug) {
      await selectRecordType(slug);
    } else {
      currentRecordTypeSlug = null;
      dynamicFieldDefinitions = [];
      dynamicFieldGroups = [];
    }
  });
  
  // If we have an API key, try to load projects
  if (apiKey) {
    await loadProjects();
  } else {
    // Show guest mode - hide project selector
    const contextBar = document.getElementById('projectContextBar');
    if (contextBar) {
      contextBar.innerHTML = '<span style="color: #666; font-size: 12px;">🔑 Add API key in Settings to access projects</span>';
    }
  }
}

// Load available projects
async function loadProjects() {
  const projectSelector = document.getElementById('projectSelector');
  
  try {
    const response = await fetch(`${apiUrl}/api/projects`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        console.warn('[ProjectContext] Not authenticated');
        return;
      }
      throw new Error(`Failed to fetch projects: ${response.status}`);
    }
    
    const data = await response.json();
    const projects = data.projects || [];
    
    // Populate selector
    projectSelector.innerHTML = '<option value="">-- Select Project --</option>';
    
    for (const project of projects) {
      const option = document.createElement('option');
      option.value = project.slug;
      option.textContent = project.name;
      projectSelector.appendChild(option);
    }
    
    projectsLoaded = true;
    console.log('[ProjectContext] Loaded', projects.length, 'projects');
    
    // Restore saved project selection
    chrome.storage.local.get(['currentProjectSlug', 'currentRecordTypeSlug'], async (result) => {
      if (result.currentProjectSlug) {
        projectSelector.value = result.currentProjectSlug;
        await selectProject(result.currentProjectSlug);
        
        if (result.currentRecordTypeSlug) {
          const recordTypeSelector = document.getElementById('recordTypeSelector');
          recordTypeSelector.value = result.currentRecordTypeSlug;
          await selectRecordType(result.currentRecordTypeSlug);
        }
      }
    });
    
  } catch (error) {
    console.error('[ProjectContext] Error loading projects:', error);
    projectSelector.innerHTML = '<option value="">Error loading projects</option>';
  }
}

// Select a project and load its record types
async function selectProject(projectSlug) {
  currentProjectSlug = projectSlug;
  chrome.storage.local.set({ currentProjectSlug: projectSlug });
  
  const recordTypeSelector = document.getElementById('recordTypeSelector');
  recordTypeSelector.innerHTML = '<option value="">Loading...</option>';
  recordTypeSelector.disabled = true;
  
  try {
    const response = await fetch(`${apiUrl}/api/projects/${projectSlug}/record-types`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch record types: ${response.status}`);
    }
    
    const data = await response.json();
    const recordTypes = data.recordTypes || [];
    
    // Populate selector
    recordTypeSelector.innerHTML = '<option value="">-- Select Type --</option>';
    
    for (const rt of recordTypes) {
      const option = document.createElement('option');
      option.value = rt.slug;
      option.textContent = `${rt.icon || '📄'} ${rt.name}`;
      recordTypeSelector.appendChild(option);
    }
    
    recordTypeSelector.disabled = false;
    console.log('[ProjectContext] Loaded', recordTypes.length, 'record types for', projectSlug);
    
    // Notify background script of project change
    chrome.runtime.sendMessage({
      type: 'PROJECT_CHANGED',
      projectSlug: projectSlug
    });
    
  } catch (error) {
    console.error('[ProjectContext] Error loading record types:', error);
    recordTypeSelector.innerHTML = '<option value="">Error loading types</option>';
  }
}

// Select a record type and load its field definitions
async function selectRecordType(recordTypeSlug) {
  currentRecordTypeSlug = recordTypeSlug;
  chrome.storage.local.set({ currentRecordTypeSlug: recordTypeSlug });
  
  try {
    const response = await fetch(
      `${apiUrl}/api/projects/${currentProjectSlug}/record-types/${recordTypeSlug}`,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`Failed to fetch field definitions: ${response.status}`);
    }
    
    const data = await response.json();
    dynamicFieldDefinitions = data.fields || [];
    dynamicFieldGroups = data.groups || [];
    
    console.log('[ProjectContext] Loaded', dynamicFieldDefinitions.length, 'fields in', dynamicFieldGroups.length, 'groups');
    
    // Notify background script to rebuild context menus
    chrome.runtime.sendMessage({
      type: 'RECORD_TYPE_CHANGED',
      projectSlug: currentProjectSlug,
      recordTypeSlug: recordTypeSlug,
      fields: dynamicFieldDefinitions,
      groups: dynamicFieldGroups
    });
    
    // Update the form with dynamic fields if DynamicForm is available
    if (typeof window.DynamicForm !== 'undefined') {
      updateFormWithDynamicFields();
    }
    
  } catch (error) {
    console.error('[ProjectContext] Error loading field definitions:', error);
    dynamicFieldDefinitions = [];
    dynamicFieldGroups = [];
  }
}

// Update the form container with dynamically generated fields
function updateFormWithDynamicFields() {
  // For now, we'll use legacy forms - in Phase 2 we'll generate dynamic forms
  // This is a placeholder for future full dynamic form generation
  console.log('[ProjectContext] Would update form with', dynamicFieldDefinitions.length, 'fields');
  
  // TODO: Replace the static form sections with dynamic ones
  // const formContainer = document.getElementById('dynamicFormContainer');
  // if (formContainer) {
  //   const form = window.DynamicForm.render(dynamicFieldDefinitions, dynamicFieldGroups, currentCase);
  //   formContainer.innerHTML = '';
  //   formContainer.appendChild(form);
  // }
}

// Setup tab navigation
function setupTabs() {
  const tabs = document.querySelectorAll('.tab');
  const saveCaseBtn = document.getElementById('saveCaseBtn');
  
  tabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      const targetTab = tab.dataset.tab;
      const currentTab = document.querySelector('.tab.active')?.dataset.tab;
      
      // Don't do anything if clicking the same tab
      if (targetTab === currentTab) {
        console.log('[TAB CLICK] Same tab, ignoring');
        return;
      }
      
      console.log('[TAB CLICK] ===== TAB SWITCH ATTEMPT =====');
      console.log('[TAB CLICK] Current:', currentTab, '→ Target:', targetTab);
      console.log('[TAB CLICK] ReviewMode:', reviewMode, 'ReviewIncidentId:', reviewIncidentId);
      console.log('[TAB CLICK] ValidateMode:', validateMode, 'ValidateIncidentId:', validateIncidentId);
      console.log('[TAB CLICK] currentCase.name:', currentCase.name);
      console.log('[TAB CLICK] currentCase.city:', currentCase.city);
      console.log('[TAB CLICK] verifiedQuotes.length:', verifiedQuotes.length);
      console.log('[TAB CLICK] sources.length:', sources.length);
      console.log('[TAB CLICK] Form caseName value:', document.getElementById('caseName')?.value);
      console.log('[TAB CLICK] Form caseCity value:', document.getElementById('caseCity')?.value);
      
      // ABSOLUTE LOCK: Cannot leave review or validate modes via tab switching
      if (reviewMode && reviewIncidentId) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        showAlert('You\'re currently reviewing a case.\n\nYou must use the "← Back" or "✗ Reject" button to exit review mode.\n\nTab switching is disabled during review.', '❌ Review in Progress');
        console.log('[TAB CLICK] BLOCKED: Review mode active');
        return;
      }
      
      if (validateMode && validateIncidentId) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        showAlert('You\'re currently validating a case.\n\nYou must use the "← Back to Queue" button or complete validation to exit.\n\nTab switching is disabled during validation.', '❌ Validation in Progress');
        console.log('[TAB CLICK] BLOCKED: Validate mode active');
        return;
      }
      
      // Check for unsaved data - check BOTH variables AND form fields
      const nameValue = document.getElementById('caseName')?.value?.trim() || '';
      const cityValue = document.getElementById('caseCity')?.value?.trim() || '';
      const headlineValue = document.getElementById('statementHeadline')?.value?.trim() || '';
      const speakerValue = document.getElementById('speakerName')?.value?.trim() || '';
      
      const hasIncidentData = currentCase.name || currentCase.city || nameValue || cityValue || verifiedQuotes.length > 0 || sources.length > 0;
      const hasStatementData = headlineValue || speakerValue;
      
      console.log('[TAB CLICK] Has incident data:', hasIncidentData);
      console.log('[TAB CLICK] Has statement data:', hasStatementData);
      
      if (hasIncidentData || hasStatementData) {
        const dataType = hasStatementData ? 'statement' : 'incident';
        const message = `⚠️ You have unsaved ${dataType} data:\n\n` +
                       (hasIncidentData ? `• Case name: ${currentCase.name || '(empty)'}\n` : '') +
                       (hasStatementData ? `• Speaker: ${document.getElementById('speakerName')?.value || '(empty)'}\n` : '') +
                       `• Quotes: ${verifiedQuotes.length}\n` +
                       `• Sources: ${sources.length}\n\n` +
                       `Switching tabs will CLEAR ALL THIS DATA.\n\nContinue?`;
        
        if (!confirm(message)) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          console.log('[TAB CLICK] User cancelled tab switch');
          return;
        }
        
        // User confirmed - clear ALL data
        console.log('[TAB CLICK] User confirmed - clearing ALL data NOW');
        console.log('[TAB CLICK] Before clear - quotes:', verifiedQuotes.length, 'sources:', sources.length, 'name:', currentCase.name);
        
        // Reset ALL state variables
        currentCase = {
          incidentType: 'death',
          name: '',
          dateOfDeath: '',
          age: '',
          country: '',
          gender: '',
          immigration_status: '',
          facility: '',
          city: '',
          state: '',
          causeOfDeath: '',
          agencies: [],
          violations: [],
          tags: []
        };
        verifiedQuotes = [];
        sources = [];
        media = [];
        pendingQuotes = [];
        verifiedFields = {};
        fieldQuoteAssociations = {};
        
        // Clear storage
        chrome.storage.local.set({
          currentCase: currentCase,
          verifiedQuotes: [],
          sources: [],
          fieldQuoteAssociations: {}
        });
        
        // Clear ALL form fields manually
        if (document.getElementById('caseName')) document.getElementById('caseName').value = '';
        if (document.getElementById('caseCity')) document.getElementById('caseCity').value = '';
        if (document.getElementById('caseState')) document.getElementById('caseState').value = '';
        if (document.getElementById('caseCause')) document.getElementById('caseCause').value = '';
        if (document.getElementById('statementHeadline')) document.getElementById('statementHeadline').value = '';
        if (document.getElementById('speakerName')) document.getElementById('speakerName').value = '';
        if (document.getElementById('statementKeyQuote')) document.getElementById('statementKeyQuote').value = '';
        
        // Render empty lists
        renderQuotes();
        renderSources();
        renderMediaList();
        renderPendingQuotes();
        
        console.log('[TAB CLICK] After clear - quotes:', verifiedQuotes.length, 'sources:', sources.length, 'name:', currentCase.name);
      }
      
      // In wide mode, only tabs nav is hidden but we still track active state
      const isWideMode = document.body.classList.contains('wide-mode');
      
      // Remove active class from all tabs
      tabs.forEach(t => t.classList.remove('active'));
      
      // Add active class to clicked tab
      tab.classList.add('active');
      
      if (!isWideMode) {
        // Only change tab content visibility in normal mode
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        const tabId = `tab-${tab.dataset.tab}`;
        document.getElementById(tabId).classList.add('active');
      }
      
      // Show Save Incident button only on Case tab (and not in review mode)
      if (saveCaseBtn && !reviewMode) {
        saveCaseBtn.style.display = (tab.dataset.tab === 'case') ? 'inline-flex' : 'none';
      }
      
      // Update selectors when config tab is opened
      if (tab.dataset.tab === 'config') {
        loadSelectorsForCurrentDomain();
      }
      
      // Load activity when settings tab is opened
      if (tab.dataset.tab === 'settings') {
        loadMyActivity();
      }
      
      console.log('[TAB CLICK] Tab switched to:', targetTab);
    });
  });
}

// Setup event listeners
function setupEventListeners() {
  console.log('[setupEventListeners] Called - setting up all event listeners');
  
  // Incident type checkboxes - show/hide relevant fields (multi-select)
  document.querySelectorAll('.incident-type-checkbox').forEach(checkbox => {
    checkbox.addEventListener('change', handleIncidentTypeChange);
  });
  
  // Keep hidden select listener for backward compatibility
  if (elements.incidentType) {
    elements.incidentType.addEventListener('change', handleIncidentTypeChange);
  }
  
  // Form inputs - save on change
  ['caseName', 'caseDod', 'caseAge', 'caseCountry', 'caseGender', 'caseImmigrationStatus', 'caseFacility', 'caseCity', 'caseState', 'caseCause'].forEach(id => {
    if (elements[id]) {
      elements[id].addEventListener('input', () => {
        updateCaseFromForm();
      });
      elements[id].addEventListener('change', () => {
        // If field is now empty and in review mode, remove from verification and hide checkbox
        if (reviewMode && !elements[id].value.trim()) {
          const mappedName = {
            'caseName': 'name',
            'caseDod': 'date',
            'caseAge': 'age',
            'caseCountry': 'nationality',
            'caseGender': 'gender',
            'caseImmigrationStatus': 'immigration_status',
            'caseFacility': 'facility',
            'caseCity': 'city',
            'caseState': 'state',
            'caseCause': 'summary'
          }[id];
          if (mappedName && verifiedFields[mappedName]) {
            delete verifiedFields[mappedName];
          }
          updateReviewModeUI();
        }
      });
    }
  });
  
  // Case image URL - show preview on valid URL
  if (elements.caseImageUrl) {
    elements.caseImageUrl.addEventListener('input', handleImageUrlChange);
  }
  if (elements.removeImageBtn) {
    elements.removeImageBtn.addEventListener('click', removeImage);
  }
  
  // Death-specific fields
  ['deathCause', 'deathManner', 'deathCustodyDuration'].forEach(id => {
    if (elements[id]) {
      elements[id].addEventListener('input', updateCaseFromForm);
      elements[id].addEventListener('change', () => {
        updateCaseFromForm();
        // If field is now empty and in review mode, remove from verification and hide checkbox
        if (reviewMode && !elements[id].value.trim()) {
          const mappedName = {
            'deathCause': 'death_cause',
            'deathManner': 'death_manner',
            'deathCustodyDuration': 'death_custody_duration'
          }[id];
          if (mappedName && verifiedFields[mappedName]) {
            delete verifiedFields[mappedName];
          }
          updateReviewModeUI();
        }
      });
    }
  });
  if (elements.deathMedicalDenied) {
    elements.deathMedicalDenied.addEventListener('change', updateCaseFromForm);
  }
  
  // Injury-specific fields
  ['injuryType', 'injurySeverity', 'injuryWeapon', 'injuryCause'].forEach(id => {
    if (elements[id]) {
      elements[id].addEventListener('input', updateCaseFromForm);
      elements[id].addEventListener('change', () => {
        updateCaseFromForm();
        // If field is now empty and in review mode, remove from verification and hide checkbox
        if (reviewMode && !elements[id].value.trim()) {
          const mappedName = {
            'injuryType': 'injury_type',
            'injurySeverity': 'injury_severity',
            'injuryWeapon': 'injury_weapon',
            'injuryCause': 'injury_cause'
          }[id];
          if (mappedName && verifiedFields[mappedName]) {
            delete verifiedFields[mappedName];
          }
          updateReviewModeUI();
        }
      });
    }
  });
  
  // Arrest-specific fields
  ['arrestReason', 'arrestContext', 'arrestCharges'].forEach(id => {
    if (elements[id]) {
      elements[id].addEventListener('input', updateCaseFromForm);
    }
  });
  ['arrestTimingSuspicious', 'arrestPretext', 'arrestSelective'].forEach(id => {
    if (elements[id]) {
      elements[id].addEventListener('change', updateCaseFromForm);
    }
  });
  
  // Violation-specific fields
  ['violationJournalism', 'violationProtest', 'violationActivism'].forEach(id => {
    if (elements[id]) {
      elements[id].addEventListener('change', updateCaseFromForm);
    }
  });
  ['violationSpeech', 'violationRuling'].forEach(id => {
    if (elements[id]) {
      elements[id].addEventListener('input', updateCaseFromForm);
    }
  });
  
  // Agency checkboxes
  document.querySelectorAll('[id^="agency-"]').forEach(checkbox => {
    checkbox.addEventListener('change', updateCaseFromForm);
  });
  
  // NEW: Violation checkbox cards
  document.querySelectorAll('.violation-checkbox').forEach(checkbox => {
    checkbox.addEventListener('change', (e) => {
      const violationType = e.target.dataset.violation;
      const card = e.target.closest('.violation-card');
      const details = card.querySelector('.violation-details');
      
      if (e.target.checked) {
        card.classList.add('selected');
        details.classList.remove('hidden');
      } else {
        card.classList.remove('selected');
        details.classList.add('hidden');
      }
      
      updateViolationCount();
      updateCaseFromForm();
    });
  });
  
  // Violation case law dropdown - show custom input when "custom" selected
  document.querySelectorAll('.violation-caselaw-select').forEach(select => {
    select.addEventListener('change', (e) => {
      const violationType = e.target.dataset.violation;
      const customInput = document.querySelector(`.violation-caselaw-custom[data-violation="${violationType}"]`);
      if (customInput) {
        if (e.target.value === 'custom') {
          customInput.classList.remove('hidden');
          customInput.focus();
        } else {
          customInput.classList.add('hidden');
        }
      }
      updateCaseFromForm();
    });
  });
  
  // Violation descriptions - auto-save on change
  document.querySelectorAll('.violation-description').forEach(textarea => {
    textarea.addEventListener('change', updateCaseFromForm);
  });
  
  // Violation classification dropdowns
  document.querySelectorAll('.violation-classification').forEach(select => {
    select.addEventListener('change', updateCaseFromForm);
  });
  
  // Custom case law inputs
  document.querySelectorAll('.violation-caselaw-custom').forEach(input => {
    input.addEventListener('change', updateCaseFromForm);
  });
  
  // Agencies collapsible
  if (elements.agenciesHeader) {
    elements.agenciesHeader.addEventListener('click', () => {
      elements.agenciesHeader.classList.toggle('open');
      elements.agenciesContent.classList.toggle('open');
    });
  }
  
  // Violations collapsible
  if (elements.violationsHeader) {
    elements.violationsHeader.addEventListener('click', () => {
      elements.violationsHeader.classList.toggle('open');
      elements.violationsContent.classList.toggle('open');
    });
  }
  
  // Shooting section collapsible
  if (elements.shootingHeader) {
    elements.shootingHeader.addEventListener('click', () => {
      elements.shootingHeader.classList.toggle('open');
      elements.shootingContent.classList.toggle('open');
    });
  }
  
  // Excessive force section collapsible
  if (elements.excessiveForceHeader) {
    elements.excessiveForceHeader.addEventListener('click', () => {
      elements.excessiveForceHeader.classList.toggle('open');
      elements.excessiveForceContent.classList.toggle('open');
    });
  }
  
  // Protest section collapsible
  if (elements.protestHeader) {
    elements.protestHeader.addEventListener('click', () => {
      elements.protestHeader.classList.toggle('open');
      elements.protestContent.classList.toggle('open');
    });
  }
  
  // Shooting-specific field listeners
  ['shotsFired', 'weaponType', 'shootingContext'].forEach(id => {
    if (elements[id]) {
      elements[id].addEventListener('input', updateCaseFromForm);
    }
  });
  ['shootingFatal', 'bodycamAvailable', 'victimArmed', 'warningGiven'].forEach(id => {
    if (elements[id]) {
      elements[id].addEventListener('change', updateCaseFromForm);
    }
  });
  
  // Force type checkboxes
  document.querySelectorAll('[id^="force-"]').forEach(checkbox => {
    checkbox.addEventListener('change', updateCaseFromForm);
  });
  
  // Excessive force field listeners
  ['victimRestrained', 'victimComplying', 'videoEvidence'].forEach(id => {
    if (elements[id]) {
      elements[id].addEventListener('change', updateCaseFromForm);
    }
  });
  
  // Protest-specific field listeners
  ['protestTopic', 'protestSize', 'arrestsMade'].forEach(id => {
    if (elements[id]) {
      elements[id].addEventListener('input', updateCaseFromForm);
    }
  });
  if (elements.protestPermitted) {
    elements.protestPermitted.addEventListener('change', updateCaseFromForm);
  }
  if (elements.dispersalMethodCheckboxes) {
    elements.dispersalMethodCheckboxes.forEach(cb => {
      cb.addEventListener('change', updateCaseFromForm);
    });
  }
  
  // Extract button
  elements.extractBtn.addEventListener('click', extractArticle);
  
  // Save button (footer - main one used in review mode)
  elements.saveCaseBtn.addEventListener('click', async () => {
    console.log('=== SAVE BUTTON CLICKED (Footer) ===');
    await saveCase();
  });
  
  // Save button (form section - for creating new statements/incidents)
  const saveCaseFormBtn = document.getElementById('saveCaseFormBtn');
  if (saveCaseFormBtn) {
    saveCaseFormBtn.addEventListener('click', async () => {
      console.log('=== SAVE FORM BUTTON CLICKED ===');
      await saveCase();
    });
  }
  
  // Cancel review button
  const cancelReviewBtn = document.getElementById('cancelReviewBtn');
  if (cancelReviewBtn) {
    cancelReviewBtn.addEventListener('click', exitReviewMode);
  }
  
  // Reject case button
  const rejectCaseBtn = document.getElementById('rejectCaseBtn');
  if (rejectCaseBtn) {
    rejectCaseBtn.addEventListener('click', rejectCase);
  }
  
  // New case button
  elements.newCaseBtn.addEventListener('click', newCase);
  
  // Clear case button
  elements.clearCaseBtn.addEventListener('click', clearCase);
  
  // Content type switching (NEW)
  if (elements.contentTypeRadios) {
    elements.contentTypeRadios.forEach(radio => {
      radio.addEventListener('change', handleContentTypeChange);
    });
  }
  
  // Statement type change (show/hide conditional sections)
  if (elements.statementType) {
    elements.statementType.addEventListener('change', handleStatementTypeChange);
  }
  
  // Duplicate checker button
  const checkDuplicatesBtn = document.getElementById('checkDuplicatesBtn');
  if (checkDuplicatesBtn) {
    checkDuplicatesBtn.addEventListener('click', checkForDuplicates);
  }
  
  // Add source button
  elements.addSourceBtn.addEventListener('click', addCurrentPageAsSource);
  
  // Statement form source buttons (use same handlers)
  const addStatementSourceBtn = document.getElementById('addStatementSourceBtn');
  if (addStatementSourceBtn) {
    addStatementSourceBtn.addEventListener('click', addCurrentPageAsSource);
  }
  
  // Add manual source button
  if (elements.addManualSourceBtn) {
    elements.addManualSourceBtn.addEventListener('click', () => {
      sources.push({ 
        id: `local-source-${Date.now()}`,
        url: '', 
        title: '', 
        priority: 'secondary',
        addedAt: new Date().toISOString() 
      });
      renderSources();
    });
  }
  
  // Statement form manual source button
  const addManualStatementSourceBtn = document.getElementById('addManualStatementSourceBtn');
  if (addManualStatementSourceBtn) {
    addManualStatementSourceBtn.addEventListener('click', () => {
      sources.push({ 
        id: `local-source-${Date.now()}`,
        url: '', 
        title: '', 
        priority: 'secondary',
        addedAt: new Date().toISOString() 
      });
      renderSources();
    });
  }
  
  // Add media button
  if (elements.addMediaBtn) {
    elements.addMediaBtn.addEventListener('click', () => {
      media.push({ url: '', media_type: 'image', description: '', addedAt: new Date().toISOString() });
      renderMediaList();
    });
  }
  
  // Upload media button
  if (elements.uploadMediaBtn) {
    elements.uploadMediaBtn.addEventListener('click', () => {
      if (!reviewMode || !currentCase?.id) {
        showNotification('File uploads are only available when reviewing an existing case', 'warning');
        return;
      }
      elements.mediaFileInput?.click();
    });
  }
  
  // File input change handler
  if (elements.mediaFileInput) {
    elements.mediaFileInput.addEventListener('change', handleMediaFileUpload);
  }
  
  // Add tag button
  if (elements.addTagBtn) {
    elements.addTagBtn.addEventListener('click', () => {
      const tagSelect = elements.tagSelect;
      if (tagSelect && tagSelect.value) {
        addTag(tagSelect.value);
        tagSelect.value = '';
      }
    });
  }
  
  // Tag select on change (also add on select for convenience)
  if (elements.tagSelect) {
    elements.tagSelect.addEventListener('change', () => {
      const tagSelect = elements.tagSelect;
      if (tagSelect && tagSelect.value) {
        addTag(tagSelect.value);
        tagSelect.value = '';
      }
    });
  }
  
  // Bug report button
  const reportBugBtn = document.getElementById('reportBugBtn');
  if (reportBugBtn) {
    reportBugBtn.addEventListener('click', openBugReportModal);
  }
  
  // Bug report modal controls
  const closeBugReportModal = document.getElementById('closeBugReportModal');
  if (closeBugReportModal) {
    closeBugReportModal.addEventListener('click', closeBugReport);
  }
  const cancelBugReport = document.getElementById('cancelBugReport');
  if (cancelBugReport) {
    cancelBugReport.addEventListener('click', closeBugReport);
  }
  const submitBugReport = document.getElementById('submitBugReport');
  if (submitBugReport) {
    submitBugReport.addEventListener('click', submitBugReportHandler);
  }
  const bugReportModal = document.getElementById('bugReportModal');
  if (bugReportModal) {
    bugReportModal.addEventListener('click', (e) => {
      if (e.target.id === 'bugReportModal') closeBugReport();
    });
  }
  
  // Guest submission modal controls
  const confirmGuestSubmission = document.getElementById('confirmGuestSubmission');
  if (confirmGuestSubmission) {
    confirmGuestSubmission.addEventListener('click', () => {
      document.getElementById('guestSubmissionModal').style.display = 'none';
      performSave(true);
    });
  }
  const cancelGuestSubmission = document.getElementById('cancelGuestSubmission');
  if (cancelGuestSubmission) {
    cancelGuestSubmission.addEventListener('click', () => {
      document.getElementById('guestSubmissionModal').style.display = 'none';
    });
  }
  const guestSubmissionModal = document.getElementById('guestSubmissionModal');
  if (guestSubmissionModal) {
    guestSubmissionModal.addEventListener('click', (e) => {
      if (e.target.id === 'guestSubmissionModal') {
        guestSubmissionModal.style.display = 'none';
      }
    });
  }
  
  // Custom fields modal controls
  const addCustomFieldBtn = document.getElementById('addCustomFieldBtn');
  if (addCustomFieldBtn) {
    addCustomFieldBtn.addEventListener('click', () => openCustomFieldModal());
  }
  
  // Clear form button
  const clearFormBtn = document.getElementById('clearFormBtn');
  if (clearFormBtn) {
    clearFormBtn.addEventListener('click', async () => {
      const confirmed = await showConfirm('Are you sure you want to clear the form? All unsaved data will be lost.', '⚠️ Clear Form');
      if (confirmed) {
        clearCase();
      }
    });
  }

  const customFieldModalClose = document.getElementById('customFieldModalClose');
  if (customFieldModalClose) {
    customFieldModalClose.addEventListener('click', closeCustomFieldModal);
  }
  const customFieldCancel = document.getElementById('customFieldCancel');
  if (customFieldCancel) {
    customFieldCancel.addEventListener('click', closeCustomFieldModal);
  }
  const customFieldSave = document.getElementById('customFieldSave');
  if (customFieldSave) {
    customFieldSave.addEventListener('click', saveCustomField);
  }
  const customFieldModal = document.getElementById('customFieldModal');
  if (customFieldModal) {
    customFieldModal.addEventListener('click', (e) => {
      if (e.target.id === 'customFieldModal') closeCustomFieldModal();
    });
  }
  
  // Clear highlights button
  if (elements.clearHighlightsBtn) {
    elements.clearHighlightsBtn.addEventListener('click', clearAllHighlights);
  }
  
  elements.acceptAllBtn.addEventListener('click', acceptAllPending);
  elements.rejectAllBtn.addEventListener('click', rejectAllPending);
  
  // Manual add collapsible
  elements.manualAddHeader.addEventListener('click', () => {
    elements.manualAddHeader.classList.toggle('open');
    elements.manualAddContent.classList.toggle('open');
  });
  
  // Add manual quote
  elements.addManualQuoteBtn.addEventListener('click', addManualQuote);
  
  // Statement manual add collapsible
  if (elements.statementManualAddHeader) {
    elements.statementManualAddHeader.addEventListener('click', () => {
      elements.statementManualAddHeader.classList.toggle('open');
      elements.statementManualAddContent.classList.toggle('open');
    });
  }
  
  // Add statement manual quote
  if (elements.addStatementManualQuoteBtn) {
    elements.addStatementManualQuoteBtn.addEventListener('click', addStatementManualQuote);
  }
  
  // Custom selector collapsible
  elements.customSelectorHeader.addEventListener('click', () => {
    elements.customSelectorHeader.classList.toggle('open');
    elements.customSelectorContent.classList.toggle('open');
  });
  
  // Element picker and custom selector
  elements.pickElementBtn.addEventListener('click', startElementPicker);
  elements.testSelectorBtn.addEventListener('click', testCustomSelector);
  elements.extractCustomBtn.addEventListener('click', extractFromCustomSelector);
  
  // Case tab integrated extract buttons
  if (elements.caseExtractBtn) {
    elements.caseExtractBtn.addEventListener('click', caseExtractArticle);
  }
  if (elements.caseExtractFromTextBtn) {
    elements.caseExtractFromTextBtn.addEventListener('click', caseExtractFromPastedText);
  }
  
  // Toggle paste text area
  const togglePasteTextBtn = document.getElementById('togglePasteTextBtn');
  const pasteTextArea = document.getElementById('pasteTextArea');
  if (togglePasteTextBtn && pasteTextArea) {
    togglePasteTextBtn.addEventListener('click', () => {
      if (pasteTextArea.style.display === 'none') {
        pasteTextArea.style.display = 'block';
        togglePasteTextBtn.textContent = '✕ Close';
      } else {
        pasteTextArea.style.display = 'none';
        togglePasteTextBtn.textContent = '📋 Paste Text';
      }
    });
  }
  
  // Clear unverified quotes button
  const clearUnverifiedBtn = document.getElementById('clearUnverifiedBtn');
  if (clearUnverifiedBtn) {
    clearUnverifiedBtn.addEventListener('click', async () => {
      const clearQuotes = await showConfirm('Clear all unverified quotes?', '⚠️ Clear Quotes');
      if (clearQuotes) {
        verifiedQuotes = verifiedQuotes.filter(q => verifiedFields[`quote_${q.id}`]);
        renderQuotes();
        syncQuotesToBackground();
      }
    });
  }
  
  // Toggle unverified quotes
  const toggleUnverifiedBtn = document.getElementById('toggleUnverifiedQuotes');
  if (toggleUnverifiedBtn) {
    toggleUnverifiedBtn.addEventListener('click', () => {
      const list = document.getElementById('unverifiedQuoteList');
      const icon = document.getElementById('unverifiedToggleIcon');
      if (list.style.display === 'none') {
        list.style.display = 'block';
        icon.textContent = '▲';
      } else {
        list.style.display = 'none';
        icon.textContent = '▼';
      }
    });
  }
  
  // Cases search input
  const casesSearchInput = document.getElementById('casesSearchInput');
  if (casesSearchInput) {
    casesSearchInput.addEventListener('input', debounce(filterCasesList, 300));
  }
  
  // Test connection
  elements.testConnectionBtn.addEventListener('click', testConnection);
  
  // Reset API URL to production
  const resetApiUrlBtn = document.getElementById('resetApiUrlBtn');
  if (resetApiUrlBtn) {
    resetApiUrlBtn.addEventListener('click', () => {
      apiUrl = 'https://research-platform-beige.vercel.app';
      chrome.storage.local.set({ apiUrl }, () => {
        document.getElementById('apiUrlDisplay').textContent = apiUrl;
        showAlert('API URL reset to production: ' + apiUrl, '✅ Success');
        checkConnection();
        // Reload projects with new URL
        if (apiKey) {
          loadProjects();
        }
      });
    });
  }
  
  // API Key change
  elements.apiKey.addEventListener('change', async () => {
    apiKey = elements.apiKey.value;
    chrome.storage.local.set({ apiKey });
    // Re-check role when API key changes
    if (apiKey) {
      await checkUserRole();
      // Also load projects when API key is set
      await loadProjects();
    } else {
      userRole = null;
      updateUserStatus();
      // Reset project context
      const contextBar = document.getElementById('projectContextBar');
      if (contextBar) {
        contextBar.innerHTML = '<span style="color: #666; font-size: 12px;">🔑 Add API key in Settings to access projects</span>';
      }
    }
  });
  
  // Get API Key link
  const getApiKeyLink = document.getElementById('getApiKeyLink');
  if (getApiKeyLink) {
    getApiKeyLink.addEventListener('click', (e) => {
      e.preventDefault();
      // Open the account page in a new tab
      const accountUrl = apiUrl.replace(/\/api$/, '').replace(':3001', ':3000') + '/account';
      chrome.tabs.create({ url: accountUrl });
    });
  }
  
  // Settings tab event listeners
  
  // Refresh activity button
  const refreshActivityBtn = document.getElementById('refreshActivityBtn');
  if (refreshActivityBtn) {
    refreshActivityBtn.addEventListener('click', () => {
      loadMyActivity();
    });
  }

  elements.clearAllDataBtn.addEventListener('click', clearAllData);
  
  // Event delegation for quote actions (avoids inline handlers blocked by CSP)
  document.addEventListener('click', (e) => {
    const action = e.target.dataset.action;
    if (!action) return;
    
    const id = e.target.dataset.id;
    const isVerified = e.target.dataset.verified === 'true';
    const page = e.target.dataset.page;
    const index = e.target.dataset.index;
    
    switch (action) {
      case 'accept':
        acceptQuote(id);
        break;
      case 'reject':
        rejectQuote(id);
        break;
      case 'copy':
        copyQuote(id, isVerified);
        break;
      case 'find':
        highlightAndScroll(id, isVerified);
        break;
      case 'pin':
        togglePinHighlight(id, isVerified);
        break;
      case 'goToPage':
        goToPage(parseInt(page));
        break;
      case 'removeVerified':
        removeVerifiedQuote(id);
        break;
      case 'deleteMedia':
        deleteMedia(parseInt(index));
        break;
    }
  });
}

// Toggle wide mode - open in a popup window for wider view
function toggleWideMode() {
  // Open sidepanel in a new popup window with larger dimensions
  chrome.windows.create({
    url: chrome.runtime.getURL('sidepanel.html') + '?wide=true',
    type: 'popup',
    width: 1200,
    height: 800
  });
}

// Clear all highlights on the current page
function clearAllHighlights() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, { type: 'REMOVE_HIGHLIGHTS' }, (response) => {
      if (response && response.success) {
        showNotification('Highlights cleared', 'success');
      }
    });
  });
}

// Show notification toast
function showNotification(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `notification ${type}`;
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#6366f1'};
    color: white;
    padding: 8px 16px;
    border-radius: 6px;
    font-size: 12px;
    z-index: 10000;
    animation: fadeInOut 2s ease;
  `;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2000);
}

// Check API connection and user role
async function checkConnection() {
  try {
    const response = await fetch(`${apiUrl}/api/cases`, {
      method: 'HEAD'
    });
    isConnected = response.ok;
  } catch {
    isConnected = false;
  }
  
  updateConnectionStatus();
  
  // Check user role if we have an API key
  if (apiKey) {
    await checkUserRole();
  }
  
  // Update user status display
  updateUserStatus();
}

// Check user role from API key
async function checkUserRole() {
  try {
    const response = await fetch(`${apiUrl}/api/auth/me`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      userRole = data.user?.role || null;
      currentUserId = data.user?.id || null;
      currentUserEmail = data.user?.email || null;
      
      // Show/hide review tab based on role
      const reviewTab = document.getElementById('reviewTab');
      if (reviewTab) {
        const isAnalyst = userRole === 'analyst' || userRole === 'admin' || userRole === 'editor';
        reviewTab.style.display = isAnalyst ? '' : 'none';
        
        // If analyst, load review queue (only pending cases needing review)
        if (isAnalyst) {
          loadReviewQueue('needs_review');
          // Update UI to show "Needs Review" as default filter
          reviewQueueFilter = 'needs_review';
          const labelEl = document.getElementById('reviewFilterLabel');
          if (labelEl) labelEl.textContent = 'Needs Review';
        }
      }
      
      // Show/hide statements tab based on role
      const statementsTab = document.getElementById('statementsTab');
      if (statementsTab) {
        const isAnalyst = userRole === 'analyst' || userRole === 'admin' || userRole === 'editor';
        statementsTab.style.display = isAnalyst ? '' : 'none';
        
        // If analyst, load statements queue
        if (isAnalyst) {
          loadStatementsQueue('pending');
        }
      }
      
      // Show/hide validate tab based on role
      const validateTab = document.getElementById('validateTab');
      if (validateTab) {
        const canValidate = userRole === 'analyst' || userRole === 'admin' || userRole === 'editor';
        validateTab.style.display = canValidate ? '' : 'none';
        
        // If can validate, load validation queue
        if (canValidate) {
          loadValidationQueue();
        }
      }
    } else {
      userRole = null;
    }
  } catch (error) {
    console.error('Error checking user role:', error);
    userRole = null;
  }
  
  // Update user status display after role check
  updateUserStatus();
}

// Update user status display
function updateUserStatus() {
  const userStatusEl = document.getElementById('userStatus');
  if (!userStatusEl) return;
  
  if (!apiKey) {
    userStatusEl.textContent = 'Guest Mode';
    userStatusEl.style.color = '#f59e0b'; // Orange/warning
    userStatusEl.title = 'Submitting as guest (5/hour limit). Add API key in Settings for higher limits.';
  } else if (userRole === 'admin') {
    userStatusEl.textContent = '👑 Admin';
    userStatusEl.style.color = '#8b5cf6'; // Purple
    userStatusEl.title = 'Admin access';
  } else if (userRole === 'analyst') {
    userStatusEl.textContent = '✓ Analyst';
    userStatusEl.style.color = '#10b981'; // Green
    userStatusEl.title = 'Analyst - submissions auto-verified';
  } else if (userRole === 'editor') {
    userStatusEl.textContent = '✎ Editor';
    userStatusEl.style.color = '#3b82f6'; // Blue
    userStatusEl.title = 'Editor access';
  } else if (userRole) {
    userStatusEl.textContent = '👤 User';
    userStatusEl.style.color = '#6b7280'; // Gray
    userStatusEl.title = 'Authenticated user';
  } else {
    userStatusEl.textContent = '👤 Guest';
    userStatusEl.style.color = '#f59e0b'; // Orange
    userStatusEl.title = 'API key invalid or expired. Submitting as guest.';
  }
}

// Update connection status UI
function updateConnectionStatus() {
  elements.statusDot.className = `status-dot ${isConnected ? '' : 'disconnected'}`;
  elements.statusText.textContent = isConnected ? 'Connected' : 'Disconnected';
}

// Update page info
async function updatePageInfo() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      const tab = tabs[0];
      
      // Check if tab has URL loaded
      if (!tab.url) {
        elements.pageInfo.textContent = 'Loading...';
        elements.pageInfo.style.color = '#666';
        return;
      }
      
      try {
        const url = new URL(tab.url);
        const isPdf = tab.url.toLowerCase().endsWith('.pdf') || 
                      tab.url.includes('application/pdf');
        
        // Check if extension can run on this page
        const isRestrictedPage = tab.url.startsWith('chrome://') || 
                                 tab.url.startsWith('chrome-extension://') || 
                                 tab.url.startsWith('edge://') ||
                                 tab.url === 'about:blank';
        
        if (isRestrictedPage) {
          elements.pageInfo.textContent = 'Cannot run on system pages';
          elements.pageInfo.style.color = '#ef4444';
          return;
        }
        
        // Try to ping content script with retries
        let retries = 0;
        const maxRetries = 3;
        
        const tryPing = () => {
          chrome.tabs.sendMessage(tab.id, { type: 'PING' }, (response) => {
            if (chrome.runtime.lastError || !response) {
              retries++;
              if (retries < maxRetries) {
                // Retry after delay
                elements.pageInfo.textContent = isPdf ? 
                  `${url.hostname} (checking...)` : 
                  `${url.hostname} (checking...)`;
                elements.pageInfo.style.color = '#f59e0b';
                setTimeout(tryPing, 300);
              } else {
                // Max retries reached
                elements.pageInfo.textContent = isPdf ? 
                  `${url.hostname} (refresh page)` : 
                  `${url.hostname} (refresh page)`;
                elements.pageInfo.style.color = '#f59e0b';
              }
            } else {
              // Success
              elements.pageInfo.textContent = isPdf ? 
                `${url.hostname} [ready]` :
                `${url.hostname} [ready]`;
              elements.pageInfo.style.color = '#22c55e';
            }
          });
        };
        
        tryPing();
        
        // Update extract button text based on page type
        if (elements.extractBtn) {
          elements.extractBtn.textContent = isPdf ? 
            'Extract PDF Content' : 
            'Extract Article Content';
        }
        
        // Track PDF status and re-render quotes if changed
        if (currentPageIsPdf !== isPdf) {
          currentPageIsPdf = isPdf;
          renderQuotes();
          renderPendingQuotes();
        }
      } catch {
        elements.pageInfo.textContent = '-';
        elements.pageInfo.style.color = '#666';
      }
    }
  });
}

// === ELEMENT PICKER FUNCTIONS ===

// Start element picker mode
function startElementPicker() {
  elements.pickElementBtn.textContent = 'Picking...';
  elements.pickElementBtn.disabled = true;
  
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, { type: 'START_ELEMENT_PICKER' }, (response) => {
      if (response && response.selector) {
        elements.customSelector.value = response.selector;
        elements.selectorTestResult.textContent = `Selected: ${response.selector}`;
        elements.selectorTestResult.style.display = 'block';
        elements.selectorTestResult.style.color = '#22c55e';
      }
      elements.pickElementBtn.textContent = '👆 Pick Element';
      elements.pickElementBtn.disabled = false;
    });
  });
}

// Test custom selector
function testCustomSelector() {
  const selector = elements.customSelector.value.trim();
  
  if (!selector) {
    elements.selectorTestResult.textContent = 'Enter a selector first';
    elements.selectorTestResult.style.display = 'block';
    elements.selectorTestResult.style.color = '#ef4444';
    return;
  }
  
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, {
      type: 'TEST_SELECTOR',
      selector: selector
    }, (response) => {
      if (response && response.count !== undefined) {
        elements.selectorTestResult.textContent = `Found ${response.count} match${response.count !== 1 ? 'es' : ''}`;
        elements.selectorTestResult.style.display = 'block';
        elements.selectorTestResult.style.color = response.count > 0 ? '#22c55e' : '#ef4444';
      } else {
        elements.selectorTestResult.textContent = 'Error testing selector';
        elements.selectorTestResult.style.display = 'block';
        elements.selectorTestResult.style.color = '#ef4444';
      }
    });
  });
}

// Extract from custom selector
async function extractFromCustomSelector() {
  const selector = elements.customSelector.value.trim();
  
  if (!selector) {
    showAlert('Please enter a CSS selector', '⚠️ Missing Input');
    return;
  }
  
  if (isExtracting) return;
  
  isExtracting = true;
  elements.extractCustomBtn.disabled = true;
  elements.extractCustomBtn.innerHTML = '<div class="spinner white"></div> Extracting...';
  elements.extractProgress.classList.remove('hidden');
  elements.progressFill.style.width = '10%';
  elements.progressText.textContent = 'Extracting from selector...';
  
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, { 
      type: 'EXTRACT_FROM_SELECTOR',
      selector: selector
    }, async (response) => {
      if (response && response.error) {
        elements.progressText.textContent = `Error: ${response.error}`;
        setTimeout(() => {
          elements.extractProgress.classList.add('hidden');
        }, 3000);
      } else if (response && response.sentences && response.sentences.length > 0) {
        elements.progressFill.style.width = '30%';
        elements.progressText.textContent = `Found ${response.sentences.length} sentences. Classifying...`;
        
        // Add current page as source
        addSourceFromResponse(tabs[0], { headline: response.title || tabs[0].title });
        
        // Classify sentences
        await classifySentences(response.sentences, false);
      } else {
        elements.progressText.textContent = 'No content found with this selector.';
        setTimeout(() => {
          elements.extractProgress.classList.add('hidden');
        }, 2000);
      }
      
      isExtracting = false;
      elements.extractCustomBtn.disabled = false;
      elements.extractCustomBtn.textContent = 'Extract from Selector';
    });
  });
}

// ============================================
// CASE TAB INTEGRATED EXTRACT FUNCTIONS
// ============================================

// Extract article from Case tab
async function caseExtractArticle() {
  if (isExtracting) return;
  
  isExtracting = true;
  elements.caseExtractBtn.disabled = true;
  elements.caseExtractBtn.innerHTML = '<div class="spinner white"></div> Extracting...';
  elements.caseExtractProgress.classList.remove('hidden');
  elements.caseProgressFill.style.width = '10%';
  elements.caseProgressText.textContent = 'Extracting content...';
  
  // Get current domain from page info
  const domainText = elements.pageInfo.textContent || '';
  const domain = domainText.replace(' (PDF)', '');
  
  let selectors = DEFAULT_SELECTORS['*'];
  
  for (const key of Object.keys(DEFAULT_SELECTORS)) {
    if (key !== '*' && domain.includes(key)) {
      selectors = DEFAULT_SELECTORS[key];
      break;
    }
  }
  
  if (currentSelectors[domain]) {
    selectors = { ...selectors, ...currentSelectors[domain] };
  }
  
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, { 
      type: 'EXTRACT_ARTICLE',
      selectors: selectors
    }, async (response) => {
      if (response && response.error) {
        elements.caseProgressText.textContent = `Error: ${response.error}`;
        setTimeout(() => {
          elements.caseExtractProgress.classList.add('hidden');
        }, 3000);
        isExtracting = false;
        elements.caseExtractBtn.disabled = false;
        elements.caseExtractBtn.innerHTML = '📰 Extract Page';
        return;
      }
      
      if (response && response.isPdf) {
        // PDF extraction
        elements.caseProgressText.textContent = 'Extracting PDF content...';
        elements.caseProgressFill.style.width = '20%';
        
        if (response.sentences && response.sentences.length > 0) {
          elements.caseProgressFill.style.width = '30%';
          elements.caseProgressText.textContent = `Found ${response.sentences.length} sentences from PDF. Classifying...`;
          
          // Add current page as source (PDF)
          addSourceFromResponse(tabs[0], {
            headline: response.title || tabs[0].title,
            isPdf: true
          });
          
          // Pass PDF sentences with page numbers and source URL
          await classifySentencesForCase(response.sentences, true, tabs[0].url, response.title || tabs[0].title);
        } else {
          elements.caseProgressText.textContent = 'No text extracted from PDF.';
          setTimeout(() => {
            elements.caseExtractProgress.classList.add('hidden');
          }, 2000);
        }
      } else if (response && response.sentences && response.sentences.length > 0) {
        // Regular article extraction
        elements.caseProgressFill.style.width = '30%';
        elements.caseProgressText.textContent = `Found ${response.sentences.length} sentences. Classifying...`;
        
        // Add current page as source
        addSourceFromResponse(tabs[0], response);
        
        // Classify sentences (no page numbers for articles) with source URL
        await classifySentencesForCase(response.sentences, false, tabs[0].url, response.headline || tabs[0].title);
      } else {
        elements.caseProgressText.textContent = 'No content found. Try pasting text below.';
        setTimeout(() => {
          elements.caseExtractProgress.classList.add('hidden');
        }, 2000);
      }
      
      isExtracting = false;
      elements.caseExtractBtn.disabled = false;
      elements.caseExtractBtn.innerHTML = '📰 Extract Page';
    });
  });
}

// Extract from pasted text
async function caseExtractFromPastedText() {
  const text = elements.casePasteText.value.trim();
  
  if (!text) {
    showAlert('Please paste some text first', '⚠️ No Text');
    return;
  }
  
  if (isExtracting) return;
  
  isExtracting = true;
  elements.caseExtractFromTextBtn.disabled = true;
  elements.caseExtractFromTextBtn.innerHTML = '<div class="spinner white"></div> Extracting...';
  elements.caseExtractProgress.classList.remove('hidden');
  elements.caseProgressFill.style.width = '10%';
  elements.caseProgressText.textContent = 'Processing pasted text...';
  
  try {
    // Split text into sentences
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    
    elements.caseProgressFill.style.width = '30%';
    elements.caseProgressText.textContent = `Found ${sentences.length} sentences. Classifying...`;
    
    // Classify sentences
    await classifySentencesForCase(sentences, false, '', 'Pasted Text');
    
  } catch (error) {
    console.error('Error extracting from text:', error);
    elements.caseProgressText.textContent = 'Error processing text';
    setTimeout(() => {
      elements.caseExtractProgress.classList.add('hidden');
    }, 2000);
  } finally {
    isExtracting = false;
    elements.caseExtractFromTextBtn.disabled = false;
    elements.caseExtractFromTextBtn.innerHTML = 'Extract from Pasted Text';
  }
}

// Start element picker from Case tab
function caseStartElementPicker() {
  elements.casePickElementBtn.textContent = '⏳ Picking...';
  elements.casePickElementBtn.disabled = true;
  
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, { type: 'START_ELEMENT_PICKER' }, (response) => {
      if (response && response.selector) {
        elements.caseSelectedSelector.value = response.selector;
        elements.caseElementPickerResult.style.display = 'block';
      } else {
        elements.caseElementPickerResult.style.display = 'none';
      }
      elements.casePickElementBtn.textContent = '👆 From Element';
      elements.casePickElementBtn.disabled = false;
    });
  });
}

// Extract from selected element in Case tab
async function caseExtractFromElement() {
  const selector = elements.caseSelectedSelector.value.trim();
  
  if (!selector) {
    showAlert('No element selected. Click "From Element" first.', '⚠️ No Selection');
    return;
  }
  
  if (isExtracting) return;
  
  isExtracting = true;
  elements.caseExtractFromElementBtn.disabled = true;
  elements.caseExtractFromElementBtn.innerHTML = '<div class="spinner white"></div> Extracting...';
  elements.caseExtractProgress.classList.remove('hidden');
  elements.caseProgressFill.style.width = '10%';
  elements.caseProgressText.textContent = 'Extracting from element...';
  
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, { 
      type: 'EXTRACT_FROM_SELECTOR',
      selector: selector
    }, async (response) => {
      if (response && response.error) {
        elements.caseProgressText.textContent = `Error: ${response.error}`;
        setTimeout(() => {
          elements.caseExtractProgress.classList.add('hidden');
        }, 3000);
      } else if (response && response.sentences && response.sentences.length > 0) {
        elements.caseProgressFill.style.width = '30%';
        elements.caseProgressText.textContent = `Found ${response.sentences.length} sentences. Classifying...`;
        
        // Add current page as source
        addSourceFromResponse(tabs[0], { headline: response.title || tabs[0].title });
        
        // Classify sentences with source URL
        await classifySentencesForCase(response.sentences, false, tabs[0].url, response.title || tabs[0].title);
      } else {
        elements.caseProgressText.textContent = 'No content found in this element.';
        setTimeout(() => {
          elements.caseExtractProgress.classList.add('hidden');
        }, 2000);
      }
      
      isExtracting = false;
      elements.caseExtractFromElementBtn.disabled = false;
      elements.caseExtractFromElementBtn.textContent = 'Extract from Selected Element';
      
      // Hide the element picker result after extraction
      setTimeout(() => {
        elements.caseElementPickerResult.style.display = 'none';
        elements.caseSelectedSelector.value = '';
      }, 1000);
    });
  });
}

// Classify sentences for Case tab (uses same API but updates Case tab progress)
async function classifySentencesForCase(sentences, isPdf = false, sourceUrl = '', sourceTitle = '') {
  try {
    // Handle array of objects (PDF with page numbers) or array of strings
    const sentenceTexts = isPdf ? sentences.map(s => s.text || s) : sentences;
    const total = sentenceTexts.length;
    let processed = 0;
    
    // Process in batches of 5 (same as Extract tab)
    const batchSize = 5;
    const results = [];
    
    for (let i = 0; i < sentenceTexts.length; i += batchSize) {
      const batch = sentenceTexts.slice(i, i + batchSize);
      const originalBatch = sentences.slice(i, i + batchSize);
      
      const response = await fetch(`${apiUrl}/api/extension/classify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ sentences: batch })
      });
      
      if (response.ok) {
        const data = await response.json();
        // Merge page numbers from original sentences
        const classifiedWithPages = data.classifications.map((c, idx) => ({
          ...c,
          pageNumber: isPdf && originalBatch[idx] ? originalBatch[idx].pageNumber : undefined
        }));
        results.push(...classifiedWithPages);
      } else {
        // Fallback: add as uncategorized
        results.push(...batch.map((s, idx) => ({
          text: s,
          category: 'context',
          confidence: 0.5,
          pageNumber: isPdf && originalBatch[idx] ? originalBatch[idx].pageNumber : undefined
        })));
      }
      
      processed += batch.length;
      const progress = 30 + (processed / total) * 60;
      elements.caseProgressFill.style.width = `${progress}%`;
      elements.caseProgressText.textContent = `Classified ${processed}/${total} sentences...`;
    }
    
    // Filter and add directly to verified quotes (Case tab extraction)
    const relevant = results.filter(r => r.category !== 'irrelevant' && r.confidence > 0.3);
    
    relevant.forEach(r => {
      verifiedQuotes.push({
        id: crypto.randomUUID(),
        text: r.text,
        category: r.category,
        confidence: r.confidence,
        pageNumber: r.pageNumber,
        sourceUrl: sourceUrl,
        sourceTitle: sourceTitle,
        status: 'verified',
        createdAt: new Date().toISOString()
      });
      // Mark as unverified by default (user can verify with button)
      verifiedFields[`quote_${verifiedQuotes[verifiedQuotes.length - 1].id}`] = false;
    });
    
    elements.caseProgressFill.style.width = '100%';
    elements.caseProgressText.textContent = `Added ${relevant.length} quotes! Scroll down to review.`;
    
    renderQuotes();
    syncQuotesToBackground();
    
    setTimeout(() => {
      elements.caseExtractProgress.classList.add('hidden');
    }, 2000);
    
  } catch (error) {
    console.error('Classification error:', error);
    elements.caseProgressText.textContent = 'Classification failed. Using fallback.';
    
    // Add all sentences as uncategorized
    const sentenceTexts = Array.isArray(sentences) && sentences[0]?.text ? sentences : sentences.map(s => ({ text: s }));
    sentenceTexts.forEach(s => {
      const text = s.text || s;
      if (text.length > 30) {
        pendingQuotes.push({
          id: crypto.randomUUID(),
          text: text,
          category: 'context',
          confidence: 0.5,
          pageNumber: s.pageNumber,
          sourceUrl: sourceUrl,
          sourceTitle: sourceTitle,
          status: 'pending',
          createdAt: new Date().toISOString()
        });
      }
    });
    
    renderPendingQuotes();
    syncQuotesToBackground();
    
    setTimeout(() => {
      elements.caseExtractProgress.classList.add('hidden');
    }, 2000);
  }
}

// Test connection
async function testConnection() {
  elements.testConnectionBtn.disabled = true;
  elements.testConnectionBtn.innerHTML = '<div class="spinner"></div> Testing...';
  
  await checkConnection();
  
  elements.testConnectionBtn.disabled = false;
  elements.testConnectionBtn.textContent = 'Test Connection';
  
  showAlert(isConnected ? 'Connection successful!' : 'Connection failed. Is the server running?', isConnected ? '✅ Connected' : '❌ Connection Failed');
}

// Populate case form from state
function populateCaseForm() {
  // Set flag to prevent updateCaseFromForm from being called during population
  isPopulatingForm = true;
  
  try {
    elements.caseName.value = currentCase.name || '';
    elements.caseDod.value = currentCase.dateOfDeath || '';
    elements.caseAge.value = currentCase.age || '';
    elements.caseCountry.value = currentCase.country || '';
    elements.caseFacility.value = currentCase.facility || '';
    elements.caseCity.value = currentCase.city || '';
    elements.caseState.value = currentCase.state || '';
    // Summary field - try summary first, then fall back to causeOfDeath for legacy data
    elements.caseCause.value = currentCase.summary || currentCase.causeOfDeath || '';
  
  // Populate image URL and show preview if valid
  if (elements.caseImageUrl) {
    elements.caseImageUrl.value = currentCase.imageUrl || '';
    if (currentCase.imageUrl) {
      elements.caseImagePreview.src = currentCase.imageUrl;
      elements.imagePreviewContainer.style.display = 'block';
    } else {
      elements.imagePreviewContainer.style.display = 'none';
    }
  }
  
  // Populate gender
  if (elements.caseGender) {
    elements.caseGender.value = currentCase.gender || '';
  }
  
  // Populate immigration status
  if (elements.caseImmigrationStatus) {
    elements.caseImmigrationStatus.value = currentCase.immigration_status || '';
  }
  
  // IMPORTANT: Populate ALL type-specific fields BEFORE setting incident type,
  // because handleIncidentTypeChange() calls updateCaseFromForm() which reads from form fields
  
  // Populate type-specific fields (death, injury, arrest, violation, shooting, etc.)
  if (elements.deathCause) elements.deathCause.value = currentCase.deathCause || '';
  if (elements.deathManner) elements.deathManner.value = currentCase.deathManner || '';
  if (elements.deathCustodyDuration) elements.deathCustodyDuration.value = currentCase.deathCustodyDuration || '';
  if (elements.deathMedicalDenied) elements.deathMedicalDenied.checked = currentCase.deathMedicalDenied || false;
  if (elements.medicalNeglectAlleged) elements.medicalNeglectAlleged.checked = currentCase.medicalNeglectAlleged || false;
  // Autopsy and circumstances
  if (elements.autopsyAvailable) elements.autopsyAvailable.checked = currentCase.autopsyAvailable || false;
  if (elements.deathCircumstances) elements.deathCircumstances.value = currentCase.deathCircumstances || '';
  // ADDED: Medical neglect fields
  if (elements.medicalCondition) elements.medicalCondition.value = currentCase.medicalCondition || '';
  if (elements.treatmentDenied) elements.treatmentDenied.value = currentCase.treatmentDenied || '';
  if (elements.requestsDocumented) elements.requestsDocumented.checked = currentCase.requestsDocumented || false;
  if (elements.resultedInDeath) elements.resultedInDeath.checked = currentCase.resultedInDeath || false;
  
  if (elements.injuryType) elements.injuryType.value = currentCase.injuryType || '';
  if (elements.injurySeverity) elements.injurySeverity.value = currentCase.injurySeverity || '';
  if (elements.injuryWeapon) elements.injuryWeapon.value = currentCase.injuryWeapon || '';
  if (elements.injuryCause) elements.injuryCause.value = currentCase.injuryCause || '';
  
  if (elements.arrestReason) elements.arrestReason.value = currentCase.arrestReason || '';
  if (elements.arrestContext) elements.arrestContext.value = currentCase.arrestContext || '';
  if (elements.arrestCharges) elements.arrestCharges.value = currentCase.arrestCharges || '';
  // Tri-state fields for arrest
  if (elements.arrestTimingSuspicious) elements.arrestTimingSuspicious.value = booleanToTriState(currentCase.arrestTimingSuspicious);
  if (elements.arrestPretext) elements.arrestPretext.value = booleanToTriState(currentCase.arrestPretext);
  if (elements.arrestSelective) elements.arrestSelective.value = booleanToTriState(currentCase.arrestSelective);
  if (elements.warrantPresent) elements.warrantPresent.value = booleanToTriState(currentCase.warrantPresent);
  
  if (elements.violationJournalism) elements.violationJournalism.checked = currentCase.violationJournalism || false;
  if (elements.violationProtest) elements.violationProtest.checked = currentCase.violationProtest || false;
  if (elements.violationActivism) elements.violationActivism.checked = currentCase.violationActivism || false;
  if (elements.violationSpeech) elements.violationSpeech.value = currentCase.violationSpeech || '';
  if (elements.violationRuling) elements.violationRuling.value = currentCase.violationRuling || '';
  
  // Populate shooting-specific fields (tri-state)
  if (elements.shootingFatal) elements.shootingFatal.value = booleanToTriState(currentCase.shootingFatal);
  if (elements.shotsFired) elements.shotsFired.value = currentCase.shotsFired || '';
  if (elements.weaponType) elements.weaponType.value = currentCase.weaponType || '';
  if (elements.bodycamAvailable) elements.bodycamAvailable.value = booleanToTriState(currentCase.bodycamAvailable);
  if (elements.victimArmed) elements.victimArmed.value = booleanToTriState(currentCase.victimArmed);
  if (elements.warningGiven) elements.warningGiven.value = booleanToTriState(currentCase.warningGiven);
  if (elements.shootingContext) elements.shootingContext.value = currentCase.shootingContext || '';
  
  // Populate excessive force fields
  document.querySelectorAll('[id^="force-"]').forEach(checkbox => {
    const forceType = checkbox.value;
    checkbox.checked = currentCase.forceTypes && currentCase.forceTypes.includes(forceType);
  });
  // Tri-state fields for excessive force
  if (elements.victimRestrained) elements.victimRestrained.value = booleanToTriState(currentCase.victimRestrained);
  if (elements.victimComplying) elements.victimComplying.value = booleanToTriState(currentCase.victimComplying);
  if (elements.videoEvidence) elements.videoEvidence.value = booleanToTriState(currentCase.videoEvidence);
  if (elements.hospitalizationRequired) elements.hospitalizationRequired.value = booleanToTriState(currentCase.hospitalizationRequired);
  
  // Populate medical neglect fields (tri-state)
  if (elements.medicalNeglectAlleged) elements.medicalNeglectAlleged.value = booleanToTriState(currentCase.medicalNeglectAlleged);
  if (elements.autopsyAvailable) elements.autopsyAvailable.value = booleanToTriState(currentCase.autopsyAvailable);
  if (elements.requestsDocumented) elements.requestsDocumented.value = booleanToTriState(currentCase.requestsDocumented);
  if (elements.resultedInDeath) elements.resultedInDeath.value = booleanToTriState(currentCase.resultedInDeath);
  
  // Populate protest fields (MUST be before incident type is set)
  console.log('[populateCaseForm] Populating protest fields:', {
    protestTopic: currentCase.protestTopic,
    protestSize: currentCase.protestSize,
    protestPermitted: currentCase.protestPermitted,
    dispersalMethod: currentCase.dispersalMethod,
    arrestsMade: currentCase.arrestsMade
  });
  if (elements.protestTopic) {
    elements.protestTopic.value = currentCase.protestTopic || '';
    console.log('[populateCaseForm] Set protestTopic to:', elements.protestTopic.value);
  }
  if (elements.protestSize) {
    elements.protestSize.value = currentCase.protestSize || '';
    console.log('[populateCaseForm] Set protestSize to:', elements.protestSize.value);
  }
  // Tri-state field for permitted
  if (elements.protestPermitted) elements.protestPermitted.value = booleanToTriState(currentCase.protestPermitted);
  if (elements.dispersalMethodCheckboxes) {
    const dispersalMethods = Array.isArray(currentCase.dispersalMethod) ? currentCase.dispersalMethod : (currentCase.dispersalMethod ? [currentCase.dispersalMethod] : []);
    elements.dispersalMethodCheckboxes.forEach(cb => {
      cb.checked = dispersalMethods.includes(cb.value);
    });
    console.log('[populateCaseForm] Set dispersalMethod checkboxes to:', dispersalMethods);
  }
  if (elements.arrestsMade) {
    elements.arrestsMade.value = currentCase.arrestsMade || '';
    console.log('[populateCaseForm] Set arrestsMade to:', elements.arrestsMade.value);
  }
  
  // NOW set incident types (multi-select support)
  // Check for incident_types array first, then fall back to single incidentType
  const typesToSet = currentCase.incident_types || currentCase.incidentTypes || 
    (currentCase.incidentType ? [currentCase.incidentType] : ['death_in_custody']);
  setIncidentTypeCheckboxes(typesToSet);
  console.log('[populateCaseForm] Set incident types:', typesToSet);
  
  // Also set hidden select for backward compatibility
  if (elements.incidentType && typesToSet.length > 0) {
    elements.incidentType.value = typesToSet[0];
  }
  handleIncidentTypeChange();
  
  // Populate agencies
  console.log('[populateCaseForm] Populating agencies, currentCase.agencies:', currentCase.agencies);
  document.querySelectorAll('[id^="agency-"]').forEach(checkbox => {
    const agency = checkbox.value;
    const shouldCheck = currentCase.agencies && currentCase.agencies.includes(agency);
    checkbox.checked = shouldCheck;
    if (shouldCheck) {
      console.log('[populateCaseForm] Checked agency:', agency);
    }
  });
  
  // Populate violations using new checkbox-based system
  console.log('[populateCaseForm] Populating violations, violations_data:', currentCase.violations_data);
  console.log('[populateCaseForm] Populating violations, violations:', currentCase.violations);
  // First try to use violations_data (full data), then fall back to legacy arrays
  if (currentCase.violations_data && Array.isArray(currentCase.violations_data)) {
    populateViolationsFromData(currentCase.violations_data);
  } else {
    // Legacy support - convert old format to new format
    const legacyViolations = [];
    
    // Build from tiered arrays
    if (currentCase.violations_alleged) {
      currentCase.violations_alleged.forEach(v => {
        const details = currentCase.violation_details_map?.[v] || {};
        legacyViolations.push({
          type: v,
          classification: 'alleged',
          description: details.description || '',
          constitutional_basis: details.constitutional_basis || ''
        });
      });
    }
    if (currentCase.violations_potential) {
      currentCase.violations_potential.forEach(v => {
        const details = currentCase.violation_details_map?.[v] || {};
        legacyViolations.push({
          type: v,
          classification: 'potential',
          description: details.description || '',
          constitutional_basis: details.constitutional_basis || ''
        });
      });
    }
    if (currentCase.violations_possible) {
      currentCase.violations_possible.forEach(v => {
        const details = currentCase.violation_details_map?.[v] || {};
        legacyViolations.push({
          type: v,
          classification: 'possible',
          description: details.description || '',
          constitutional_basis: details.constitutional_basis || ''
        });
      });
    }
    
    // If still nothing, try plain violations array
    if (legacyViolations.length === 0 && currentCase.violations) {
      currentCase.violations.forEach(v => {
        legacyViolations.push({
          type: v,
          classification: 'alleged',
          description: '',
          constitutional_basis: ''
        });
      });
    }
    
    populateViolationsFromData(legacyViolations);
  }
  
  // Populate tags - preserve existing array, just ensure it's always an array
  console.log('Populating tags (before check):', currentCase.tags, 'type:', typeof currentCase.tags, 'isArray:', Array.isArray(currentCase.tags));
  if (!Array.isArray(currentCase.tags)) {
    console.warn('Tags was not an array, initializing to empty array. Was:', currentCase.tags);
    currentCase.tags = [];
  }
  console.log('Populating tags (after check):', currentCase.tags);
  renderTags();
  
  } finally {
    // Always reset the flag when done
    isPopulatingForm = false;
  }
}

// ============================================
// VIOLATION CLASSIFICATION (CHECKBOX-BASED)
// ============================================

// Update violation count in header
function updateViolationCount() {
  const countEl = document.getElementById('violationCount');
  if (!countEl) return;
  
  const checkedCount = document.querySelectorAll('.violation-checkbox:checked').length;
  countEl.textContent = `(${checkedCount})`;
}

// Populate case law dropdown for a specific violation type
function populateViolationCaseLaw(violationType) {
  const select = document.querySelector(`.violation-caselaw-select[data-violation="${violationType}"]`);
  if (!select) return;
  
  // Map violation types to legal reference keys
  const refKeyMap = {
    '1st_amendment': 'first_amendment',
    '4th_amendment': 'fourth_amendment',
    '5th_amendment_due_process': 'fifth_amendment',
    '8th_amendment': 'eighth_amendment',
    '14th_amendment_equal_protection': 'fourteenth_amendment',
    'medical_neglect': 'eighth_amendment',  // Medical neglect cases like Estelle v. Gamble are 8th Amendment
    'excessive_force': 'excessive_force',
    'false_imprisonment': 'civil_rights',
    'civil_rights_violation': 'civil_rights'
  };
  
  const refKey = refKeyMap[violationType];
  if (!refKey || !LEGAL_REFERENCES || !LEGAL_REFERENCES[refKey]) {
    return;
  }
  
  const ref = LEGAL_REFERENCES[refKey];
  const cases = ref.cases || [];
  
  // Clear existing options except first two
  while (select.options.length > 2) {
    select.remove(2);
  }
  
  // Add case law options
  cases.forEach(c => {
    const option = document.createElement('option');
    option.value = `${c.name} (${c.citation})`;
    option.textContent = `${c.name} (${c.citation})`;
    select.appendChild(option);
  });
}

// Initialize all case law dropdowns
function initializeAllCaseLawDropdowns() {
  document.querySelectorAll('.violation-caselaw-select').forEach(select => {
    const violationType = select.dataset.violation;
    populateViolationCaseLaw(violationType);
  });
}

// Get selected violations data for submission
function getSelectedViolations() {
  const violations = [];
  
  document.querySelectorAll('.violation-checkbox:checked').forEach(checkbox => {
    const violationType = checkbox.dataset.violation;
    const card = checkbox.closest('.violation-card');
    
    const classification = card.querySelector('.violation-classification')?.value || 'alleged';
    const description = card.querySelector('.violation-description')?.value || '';
    const caseLawSelect = card.querySelector('.violation-caselaw-select');
    const caseLawCustom = card.querySelector('.violation-caselaw-custom');
    
    let caseLaw = '';
    if (caseLawSelect && caseLawSelect.value === 'custom' && caseLawCustom) {
      caseLaw = caseLawCustom.value;
    } else if (caseLawSelect && caseLawSelect.value && caseLawSelect.value !== 'custom') {
      caseLaw = caseLawSelect.value;
    }
    
    violations.push({
      type: violationType,
      classification: classification,
      description: description,
      constitutional_basis: caseLaw
    });
  });
  
  return violations;
}

// Populate violations from loaded case data
function populateViolationsFromData(violationsData) {
  // First, clear all checkboxes
  document.querySelectorAll('.violation-checkbox').forEach(cb => {
    cb.checked = false;
    const card = cb.closest('.violation-card');
    card.classList.remove('selected');
    card.querySelector('.violation-details').classList.add('hidden');
  });
  
  if (!violationsData || !Array.isArray(violationsData)) {
    updateViolationCount();
    return;
  }
  
  violationsData.forEach(v => {
    const checkbox = document.querySelector(`.violation-checkbox[data-violation="${v.type}"]`);
    if (!checkbox) return;
    
    checkbox.checked = true;
    const card = checkbox.closest('.violation-card');
    card.classList.add('selected');
    card.querySelector('.violation-details').classList.remove('hidden');
    
    // Set classification
    const classSelect = card.querySelector('.violation-classification');
    if (classSelect && v.classification) {
      classSelect.value = v.classification;
    }
    
    // Set description
    const descTextarea = card.querySelector('.violation-description');
    if (descTextarea && v.description) {
      descTextarea.value = v.description;
    }
    
    // Set case law
    const caseLawSelect = card.querySelector('.violation-caselaw-select');
    const caseLawCustom = card.querySelector('.violation-caselaw-custom');
    
    if (v.constitutional_basis && caseLawSelect) {
      // Check if it's a known case law option
      const options = Array.from(caseLawSelect.options);
      const matchingOption = options.find(opt => opt.value === v.constitutional_basis);
      
      if (matchingOption) {
        caseLawSelect.value = v.constitutional_basis;
        if (caseLawCustom) caseLawCustom.classList.add('hidden');
      } else {
        // Custom entry
        caseLawSelect.value = 'custom';
        if (caseLawCustom) {
          caseLawCustom.classList.remove('hidden');
          caseLawCustom.value = v.constitutional_basis;
        }
      }
    }
  });
  
  updateViolationCount();
}

// Legacy functions - kept for compatibility but mostly no-op now
function updateViolationSelectStyle(select) {
  // No longer used - kept for compatibility
}

function updateViolationBasisVisibility() {
  // No longer used - kept for compatibility
}

function populateViolationTypeDropdown() {
  // No longer used - kept for compatibility
}

// Populate case law dropdown based on selected violation type
function populateCaseLawDropdown() {
  const violationType = document.getElementById('violationBasisType')?.value;
  const caseLawSelect = document.getElementById('violationCaseLawSelect');
  const customInput = document.getElementById('violationLegalFrameworkCustom');
  
  if (!caseLawSelect) return;
  
  // Reset dropdown
  caseLawSelect.innerHTML = '<option value="">Select case law...</option><option value="custom">-- Custom Entry --</option>';
  
  // Hide custom input by default
  if (customInput) {
    customInput.classList.add('hidden');
    customInput.value = '';
  }
  
  if (!violationType || !LEGAL_REFERENCES[violationType]) {
    return;
  }
  
  const ref = LEGAL_REFERENCES[violationType];
  
  // Add cases from the selected violation type
  if (ref.cases && ref.cases.length > 0) {
    const optgroup = document.createElement('optgroup');
    optgroup.label = ref.name;
    
    ref.cases.forEach((caseItem, idx) => {
      const option = document.createElement('option');
      option.value = `${violationType}:${idx}`;
      option.textContent = `${caseItem.name} (${caseItem.citation})`;
      option.dataset.holding = caseItem.holding;
      option.dataset.sourceUrl = caseItem.sourceUrl || '';
      optgroup.appendChild(option);
    });
    
    caseLawSelect.appendChild(optgroup);
  }
  
  // Also add common cross-referenced cases if relevant
  const crossRefs = getCrossReferencedCases(violationType);
  if (crossRefs.length > 0) {
    const crossOptgroup = document.createElement('optgroup');
    crossOptgroup.label = 'Related Case Law';
    
    crossRefs.forEach(item => {
      const option = document.createElement('option');
      option.value = `${item.type}:${item.idx}`;
      option.textContent = `${item.caseItem.name} (${item.caseItem.citation})`;
      option.dataset.holding = item.caseItem.holding;
      option.dataset.sourceUrl = item.caseItem.sourceUrl || '';
      crossOptgroup.appendChild(option);
    });
    
    caseLawSelect.appendChild(crossOptgroup);
  }
}

// Get cross-referenced cases that might apply to multiple violation types
function getCrossReferencedCases(violationType) {
  const crossRefs = [];
  
  // Common cross-references
  const crossRefMap = {
    'fourth_amendment': ['excessive_force'],
    'excessive_force': ['fourth_amendment', 'eighth_amendment'],
    'eighth_amendment': ['fourteenth_amendment'],
    'wrongful_death': ['fourth_amendment', 'eighth_amendment', 'excessive_force'],
    'fourteenth_amendment': ['fifth_amendment'],
    'civil_rights': ['fourth_amendment', 'eighth_amendment']
  };
  
  const relatedTypes = crossRefMap[violationType] || [];
  
  relatedTypes.forEach(relType => {
    const ref = LEGAL_REFERENCES[relType];
    if (ref && ref.cases) {
      ref.cases.forEach((caseItem, idx) => {
        // Avoid duplicates
        const alreadyIncluded = crossRefs.some(cr => 
          cr.caseItem.name === caseItem.name
        );
        if (!alreadyIncluded) {
          crossRefs.push({ type: relType, idx, caseItem });
        }
      });
    }
  });
  
  return crossRefs;
}

// Handle case law dropdown selection
function handleCaseLawSelection() {
  const caseLawSelect = document.getElementById('violationCaseLawSelect');
  const customInput = document.getElementById('violationLegalFrameworkCustom');
  const hiddenInput = document.getElementById('violationLegalFramework');
  
  if (!caseLawSelect) return;
  
  const value = caseLawSelect.value;
  
  if (value === 'custom') {
    // Show custom input
    if (customInput) {
      customInput.classList.remove('hidden');
      customInput.focus();
    }
    if (hiddenInput) hiddenInput.value = '';
  } else if (value && value.includes(':')) {
    // Hide custom input
    if (customInput) {
      customInput.classList.add('hidden');
      customInput.value = '';
    }
    
    // Parse the selected case
    const [violationType, caseIdx] = value.split(':');
    const ref = LEGAL_REFERENCES[violationType];
    if (ref && ref.cases && ref.cases[parseInt(caseIdx)]) {
      const caseItem = ref.cases[parseInt(caseIdx)];
      const frameworkValue = `${caseItem.name} (${caseItem.citation})`;
      if (hiddenInput) hiddenInput.value = frameworkValue;
    }
  } else {
    // No selection
    if (customInput) {
      customInput.classList.add('hidden');
      customInput.value = '';
    }
    if (hiddenInput) hiddenInput.value = '';
  }
}

// View selected case law details
function viewSelectedCaseLaw() {
  console.log('viewSelectedCaseLaw called');
  const caseLawSelect = document.getElementById('violationCaseLawSelect');
  console.log('caseLawSelect element:', caseLawSelect);
  console.log('caseLawSelect value:', caseLawSelect?.value);
  
  if (!caseLawSelect || !caseLawSelect.value) {
    console.log('No selection - showing notification');
    showNotification('Please select a case law from the dropdown first.', 'warning');
    return;
  }
  
  const value = caseLawSelect.value;
  
  if (value === 'custom') {
    showNotification('Custom entries have no associated case details to view.', 'info');
    return;
  }
  
  if (!value.includes(':')) {
    showNotification('Please select a specific case law from the dropdown.', 'warning');
    return;
  }
  
  // Parse the selected case
  const [violationType, caseIdx] = value.split(':');
  const ref = LEGAL_REFERENCES[violationType];
  
  if (!ref) {
    showNotification(`No legal reference found for type: ${violationType}`, 'error');
    console.error('LEGAL_REFERENCES keys:', Object.keys(LEGAL_REFERENCES));
    console.error('Attempted violation type:', violationType);
    return;
  }
  
  if (!ref.cases || !ref.cases[parseInt(caseIdx)]) {
    showNotification(`Case index ${caseIdx} not found for ${violationType}`, 'error');
    return;
  }
  
  const caseItem = ref.cases[parseInt(caseIdx)];
  
  // Build modal content
  let content = `
    <div class="case-law-detail-view">
      <h3 style="margin: 0 0 15px 0; color: #1e3a5f; font-size: 16px;">${caseItem.name}</h3>
      
      <div style="margin-bottom: 15px;">
        <strong style="color: #666;">Citation:</strong>
        <div style="margin-top: 5px; font-family: monospace; background: #f5f5f5; padding: 8px; border-radius: 4px;">
          ${caseItem.citation}
        </div>
      </div>
      
      <div style="margin-bottom: 15px;">
        <strong style="color: #666;">Holding:</strong>
        <div style="margin-top: 5px; background: #fff9e6; padding: 10px; border-left: 3px solid #f59e0b; border-radius: 4px; line-height: 1.5;">
          "${caseItem.holding}"
        </div>
        <div style="margin-top: 8px; display: flex; gap: 10px;">
          <button onclick="copyToClipboard(\`${caseItem.holding.replace(/`/g, '\\`').replace(/"/g, '\\"')}\`)" 
                  style="padding: 5px 10px; background: #e5e7eb; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">
            📋 Copy Holding
          </button>
          <button onclick="copyToClipboard(\`${caseItem.name} (${caseItem.citation})\`)" 
                  style="padding: 5px 10px; background: #e5e7eb; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">
            📋 Copy Citation
          </button>
        </div>
      </div>
      
      ${caseItem.sourceUrl ? `
      <div style="margin-bottom: 10px;">
        <strong style="color: #666;">Verification Link:</strong>
        <div style="margin-top: 5px;">
          <a href="${caseItem.sourceUrl}" target="_blank" style="color: #2563eb; word-break: break-all;">
            ${caseItem.sourceUrl}
          </a>
        </div>
      </div>
      ` : ''}
      
      <div style="margin-top: 15px; padding-top: 10px; border-top: 1px solid #e5e7eb;">
        <strong style="color: #666;">Violation Type:</strong>
        <span style="margin-left: 5px;">${ref.name}</span>
      </div>
    </div>
  `;
  
  // Open the legal ref modal with this content
  const modal = document.getElementById('legalRefModal');
  const modalTitle = document.getElementById('legalRefTitle');
  const modalBody = document.getElementById('legalRefBody');
  
  console.log('Modal elements:', { modal: !!modal, modalTitle: !!modalTitle, modalBody: !!modalBody });
  
  if (modal && modalTitle && modalBody) {
    modalTitle.textContent = 'Case Law Details';
    modalBody.innerHTML = content;
    modal.classList.add('active');
    console.log('Modal should be visible now');
  }
}

// Helper function to copy text to clipboard
function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    // Brief visual feedback could be added here
    console.log('Copied to clipboard');
  }).catch(err => {
    console.error('Failed to copy:', err);
    showAlert('Failed to copy to clipboard', '❌ Copy Failed');
  });
}

// Save violation basis information
function saveViolationBasis() {
  // Get legal framework from dropdown or custom input
  const caseLawSelect = document.getElementById('violationCaseLawSelect');
  const customInput = document.getElementById('violationLegalFrameworkCustom');
  const hiddenInput = document.getElementById('violationLegalFramework');
  
  let legalFramework = '';
  let sourceUrl = '';
  
  if (caseLawSelect?.value === 'custom' && customInput) {
    legalFramework = customInput.value.trim();
  } else if (caseLawSelect?.value && caseLawSelect.value.includes(':')) {
    const selectedOption = caseLawSelect.selectedOptions[0];
    legalFramework = hiddenInput?.value || selectedOption?.textContent || '';
    sourceUrl = selectedOption?.dataset?.sourceUrl || '';
  }
  
  const relevantFactsRaw = document.getElementById('violationRelevantFacts')?.value || '';
  const note = document.getElementById('violationNote')?.value || '';
  
  const relevantFacts = relevantFactsRaw.split('\n').filter(f => f.trim());
  
  // Get all potential/possible violations
  const violationsNeedingBasis = [];
  document.querySelectorAll('.violation-select').forEach(select => {
    if (select.value === 'potential' || select.value === 'possible') {
      violationsNeedingBasis.push({
        type: select.dataset.violation,
        classification: select.value
      });
    }
  });
  
  if (violationsNeedingBasis.length === 0) {
    showNotification('No potential/possible violations to document', 'warning');
    return;
  }
  
  // Initialize violation_details_map if not exists
  if (!currentCase.violation_details_map) {
    currentCase.violation_details_map = {};
  }
  
  // Apply the same basis to all potential/possible violations
  violationsNeedingBasis.forEach(v => {
    const key = `${v.type}_${v.classification}`;
    currentCase.violation_details_map[key] = {
      legal_framework: legalFramework || undefined,
      legal_framework_source: sourceUrl || undefined,
      relevant_facts: relevantFacts.length > 0 ? relevantFacts : undefined,
      note: note || undefined
    };
  });
  
  showNotification(`Legal basis saved for ${violationsNeedingBasis.length} violation(s)`, 'success');
}

// Get all selected incident types from checkboxes
function getSelectedIncidentTypes() {
  const checkboxes = document.querySelectorAll('.incident-type-checkbox:checked');
  return Array.from(checkboxes).map(cb => cb.value);
}

// Set incident type checkboxes from array
function setIncidentTypeCheckboxes(types) {
  // Uncheck all first
  document.querySelectorAll('.incident-type-checkbox').forEach(cb => {
    cb.checked = false;
  });
  // Check the specified types
  if (types && types.length > 0) {
    types.forEach(type => {
      const checkbox = document.querySelector(`.incident-type-checkbox[value="${type}"]`);
      if (checkbox) checkbox.checked = true;
    });
  }
}

// Show sections for a specific incident type
function showSectionsForType(type) {
  switch (type) {
    case 'death':
    case 'death_in_custody':
    case 'death_during_operation':
    case 'detention_death':
      if (elements.deathFields) elements.deathFields.classList.remove('hidden');
      break;
    case 'death_at_protest':
      if (elements.deathFields) elements.deathFields.classList.remove('hidden');
      if (elements.protestSection) elements.protestSection.classList.remove('hidden');
      break;
    case 'injury':
      if (elements.injuryFields) elements.injuryFields.classList.remove('hidden');
      break;
    case 'shooting':
      if (elements.shootingSection) elements.shootingSection.classList.remove('hidden');
      break;
    case 'excessive_force':
      if (elements.excessiveForceSection) elements.excessiveForceSection.classList.remove('hidden');
      if (elements.injuryFields) elements.injuryFields.classList.remove('hidden');
      break;
    case 'medical_neglect':
      if (elements.medicalNeglectSection) elements.medicalNeglectSection.classList.remove('hidden');
      break;
    case 'protest_suppression':
      if (elements.protestSection) elements.protestSection.classList.remove('hidden');
      break;
    case 'arrest':
      if (elements.arrestFields) elements.arrestFields.classList.remove('hidden');
      break;
    case 'rights_violation':
    case 'retaliation':
      if (elements.violationFields) elements.violationFields.classList.remove('hidden');
      break;
  }
}

// Handle incident type change - show/hide relevant sections (supports multi-type)
function handleIncidentTypeChange() {
  // Get all selected types
  const selectedTypes = getSelectedIncidentTypes();
  
  // Update hidden select for backward compatibility (use first type)
  if (elements.incidentType && selectedTypes.length > 0) {
    elements.incidentType.value = selectedTypes[0];
  }
  
  // Hide all type-specific sections and clean up their verifiedFields
  [elements.deathFields, elements.injuryFields, elements.arrestFields, elements.violationFields,
   elements.shootingSection, elements.excessiveForceSection, elements.protestSection, elements.medicalNeglectSection].forEach(el => {
    if (el) {
      el.classList.add('hidden');
      
      // In review mode, remove verifiedFields for fields in this section
      if (reviewMode) {
        const fieldsInSection = el.querySelectorAll('[data-field]');
        fieldsInSection.forEach(wrapper => {
          const fieldName = wrapper.dataset.field;
          if (fieldName && verifiedFields[fieldName] !== undefined) {
            delete verifiedFields[fieldName];
          }
        });
      }
    }
  });
  
  // Show violations section ALWAYS (matches web review page behavior)
  // The extension is an analyst tool, so violations should always be visible
  if (elements.violationsSection) {
    elements.violationsSection.classList.remove('hidden');
  }
  
  // Show sections for ALL selected types (multi-type support)
  for (const type of selectedTypes) {
    showSectionsForType(type);
  }
  
  updateCaseFromForm();
}

// Handle image URL changes - show preview on valid URL
function handleImageUrlChange() {
  const url = elements.caseImageUrl.value.trim();
  
  if (!url) {
    elements.imagePreviewContainer.style.display = 'none';
    updateCaseFromForm();
    return;
  }
  
  // Validate it looks like a URL
  try {
    new URL(url);
  } catch {
    elements.imagePreviewContainer.style.display = 'none';
    updateCaseFromForm();
    return;
  }
  
  // Try to load the image
  const img = elements.caseImagePreview;
  img.onload = () => {
    elements.imagePreviewContainer.style.display = 'block';
    updateCaseFromForm();
  };
  img.onerror = () => {
    elements.imagePreviewContainer.style.display = 'none';
    showNotification('Image failed to load', 'error');
  };
  img.src = url;
}

// Remove the case image
function removeImage() {
  elements.caseImageUrl.value = '';
  elements.caseImagePreview.src = '';
  elements.imagePreviewContainer.style.display = 'none';
  updateCaseFromForm();
}

// Update case from form
function updateCaseFromForm() {
  // Don't update case from form while we're populating the form (causes data loss)
  if (isPopulatingForm) {
    console.log('[updateCaseFromForm] Skipped - form is being populated');
    return;
  }
  
  // Collect agencies
  const agencies = [];
  document.querySelectorAll('[id^="agency-"]:checked').forEach(checkbox => {
    agencies.push(checkbox.value);
  });
  
  // Collect violations using new checkbox-based system
  const selectedViolations = getSelectedViolations();
  
  // Build legacy arrays for backwards compatibility
  const violations_alleged = [];
  const violations_potential = [];
  const violations_possible = [];
  const violations = [];
  
  selectedViolations.forEach(v => {
    violations.push(v.type);
    if (v.classification === 'alleged') {
      violations_alleged.push(v.type);
    } else if (v.classification === 'potential') {
      violations_potential.push(v.type);
    } else if (v.classification === 'possible') {
      violations_possible.push(v.type);
    }
  });
  
  // Build violation details map
  const violation_details_map = {};
  selectedViolations.forEach(v => {
    violation_details_map[v.type] = {
      classification: v.classification,
      description: v.description,
      constitutional_basis: v.constitutional_basis
    };
  });
  
  // Collect force types
  const forceTypes = [];
  document.querySelectorAll('[id^="force-"]:checked').forEach(checkbox => {
    forceTypes.push(checkbox.value);
  });
  
  // Preserve existing tags (they're managed by their own UI section)
  const existingTags = currentCase.tags || [];
  
  // Get selected incident types from checkboxes
  const selectedTypes = getSelectedIncidentTypes();
  
  currentCase = {
    incidentType: selectedTypes.length > 0 ? selectedTypes[0] : 'death_in_custody',
    incidentTypes: selectedTypes,
    name: elements.caseName.value,
    dateOfDeath: elements.caseDod.value,
    age: elements.caseAge.value,
    country: elements.caseCountry.value,
    gender: elements.caseGender ? elements.caseGender.value : '',
    immigration_status: elements.caseImmigrationStatus ? elements.caseImmigrationStatus.value : '',
    facility: elements.caseFacility.value,
    city: elements.caseCity ? elements.caseCity.value : '',
    state: elements.caseState ? elements.caseState.value : '',
    causeOfDeath: elements.caseCause.value,
    imageUrl: elements.caseImageUrl ? elements.caseImageUrl.value.trim() : '',
    agencies: agencies,
    violations: violations,
    violations_alleged: violations_alleged,
    violations_potential: violations_potential,
    violations_possible: violations_possible,
    violation_details_map: violation_details_map,
    violations_data: selectedViolations,  // Full violation data for submission
    // Death-specific
    deathCause: elements.deathCause ? elements.deathCause.value : '',
    deathManner: elements.deathManner ? elements.deathManner.value : '',
    deathCustodyDuration: elements.deathCustodyDuration ? elements.deathCustodyDuration.value : '',
    deathMedicalDenied: elements.deathMedicalDenied ? triStateToBoolean(elements.deathMedicalDenied.value) : null,
    medicalNeglectAlleged: elements.medicalNeglectAlleged ? triStateToBoolean(elements.medicalNeglectAlleged.value) : null,
    autopsyAvailable: elements.autopsyAvailable ? triStateToBoolean(elements.autopsyAvailable.value) : null,
    // Injury-specific
    injuryType: elements.injuryType ? elements.injuryType.value : '',
    injurySeverity: elements.injurySeverity ? elements.injurySeverity.value : '',
    injuryWeapon: elements.injuryWeapon ? elements.injuryWeapon.value : '',
    injuryCause: elements.injuryCause ? elements.injuryCause.value : '',
    // Arrest-specific
    arrestReason: elements.arrestReason ? elements.arrestReason.value : '',
    arrestContext: elements.arrestContext ? elements.arrestContext.value : '',
    arrestCharges: elements.arrestCharges ? elements.arrestCharges.value : '',
    arrestTimingSuspicious: elements.arrestTimingSuspicious ? triStateToBoolean(elements.arrestTimingSuspicious.value) : null,
    arrestPretext: elements.arrestPretext ? triStateToBoolean(elements.arrestPretext.value) : null,
    arrestSelective: elements.arrestSelective ? triStateToBoolean(elements.arrestSelective.value) : null,
    warrantPresent: elements.warrantPresent ? triStateToBoolean(elements.warrantPresent.value) : null,
    // Violation-specific
    violationJournalism: elements.violationJournalism ? elements.violationJournalism.checked : false,
    violationProtest: elements.violationProtest ? elements.violationProtest.checked : false,
    violationActivism: elements.violationActivism ? elements.violationActivism.checked : false,
    violationSpeech: elements.violationSpeech ? elements.violationSpeech.value : '',
    violationRuling: elements.violationRuling ? elements.violationRuling.value : '',
    // Shooting-specific (tri-state)
    shootingFatal: elements.shootingFatal ? triStateToBoolean(elements.shootingFatal.value) : null,
    shotsFired: elements.shotsFired ? elements.shotsFired.value : '',
    weaponType: elements.weaponType ? elements.weaponType.value : '',
    bodycamAvailable: elements.bodycamAvailable ? triStateToBoolean(elements.bodycamAvailable.value) : null,
    victimArmed: elements.victimArmed ? triStateToBoolean(elements.victimArmed.value) : null,
    warningGiven: elements.warningGiven ? triStateToBoolean(elements.warningGiven.value) : null,
    shootingContext: elements.shootingContext ? elements.shootingContext.value : '',
    // Excessive force-specific (tri-state for booleans)
    forceTypes: forceTypes,
    victimRestrained: elements.victimRestrained ? triStateToBoolean(elements.victimRestrained.value) : null,
    victimComplying: elements.victimComplying ? triStateToBoolean(elements.victimComplying.value) : null,
    videoEvidence: elements.videoEvidence ? triStateToBoolean(elements.videoEvidence.value) : null,
    hospitalizationRequired: elements.hospitalizationRequired ? triStateToBoolean(elements.hospitalizationRequired.value) : null,
    // Medical neglect-specific (tri-state)
    requestsDocumented: elements.requestsDocumented ? triStateToBoolean(elements.requestsDocumented.value) : null,
    resultedInDeath: elements.resultedInDeath ? triStateToBoolean(elements.resultedInDeath.value) : null,
    // Protest-specific (tri-state for permitted)
    protestTopic: elements.protestTopic ? elements.protestTopic.value : '',
    protestSize: elements.protestSize ? elements.protestSize.value : '',
    protestPermitted: elements.protestPermitted ? triStateToBoolean(elements.protestPermitted.value) : null,
    dispersalMethod: elements.dispersalMethodCheckboxes ? Array.from(elements.dispersalMethodCheckboxes).filter(cb => cb.checked).map(cb => cb.value) : [],
    arrestsMade: elements.arrestsMade ? elements.arrestsMade.value : '',
    // Tags - preserve from before updateCaseFromForm
    tags: existingTags
  };
  
  // Save to background
  chrome.runtime.sendMessage({ type: 'SET_CURRENT_CASE', case: currentCase });
  
  // Notify overlay of the update (for real-time sync)
  notifyOverlayOfUpdate();
}

// Debounced notification to overlay to avoid loops
let overlayNotifyTimer = null;
function notifyOverlayOfUpdate() {
  clearTimeout(overlayNotifyTimer);
  overlayNotifyTimer = setTimeout(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'SIDEPANEL_UPDATED' });
      }
    });
  }, 200);
}

// Field quote associations - stores which quotes are linked to which field (supports multiple)
// Format: { field: [quoteId1, quoteId2, ...] } or { field: quoteId } for backward compatibility
let fieldQuoteAssociations = {};

// Helper to normalize field quote associations to always return an array
function getFieldQuotes(field) {
  const value = fieldQuoteAssociations[field];
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return [value]; // Backward compatibility: single value → array
}

// Helper to set quotes for a field
function setFieldQuotes(field, quoteIds) {
  if (!quoteIds || quoteIds.length === 0) {
    delete fieldQuoteAssociations[field];
  } else {
    fieldQuoteAssociations[field] = quoteIds;
  }
  chrome.storage.local.set({ fieldQuoteAssociations });
}

// Helper to add a quote to a field
function addQuoteToField(field, quoteId) {
  const current = getFieldQuotes(field);
  if (!current.includes(quoteId)) {
    current.push(quoteId);
    setFieldQuotes(field, current);
  }
}

// Helper to remove a quote from a field
function removeQuoteFromField(field, quoteId) {
  const current = getFieldQuotes(field);
  const filtered = current.filter(id => id !== quoteId);
  setFieldQuotes(field, filtered);
}

// Helper to check if a quote is linked to a field
function isQuoteLinkedToField(field, quoteId) {
  return getFieldQuotes(field).includes(quoteId);
}

// Update all quote picker lists with current verified quotes
function updateQuoteAssociationDropdowns() {
  const lists = document.querySelectorAll('.quote-picker-list');
  
  lists.forEach(list => {
    const field = list.dataset.field;
    renderQuotePickerList(list, field, '');
  });
  
  // Update trigger buttons to show selected quotes
  updateQuotePickerTriggers();
}

// Render quotes in a picker list
function renderQuotePickerList(listElement, field, searchTerm) {
  const linkedQuotes = getFieldQuotes(field);
  const search = searchTerm.toLowerCase();
  
  // Combine verified and pending quotes, checking both status property and verifiedFields
  const allQuotes = [
    ...verifiedQuotes.map(q => ({ 
      ...q, 
      isVerified: q.status === 'verified' || verifiedFields[`quote_${q.id}`] || true 
    })),
    ...pendingQuotes.map(q => ({ 
      ...q, 
      isVerified: q.status === 'verified' || verifiedFields[`quote_${q.id}`] || false 
    }))
  ];
  
  // Filter quotes by search term
  const filteredQuotes = allQuotes.filter(q => 
    !search || q.text.toLowerCase().includes(search) || q.category.toLowerCase().includes(search)
  );
  
  if (filteredQuotes.length === 0) {
    listElement.innerHTML = `
      <div class="quote-picker-empty">
        ${allQuotes.length === 0 ? 'No quotes yet' : 'No quotes match your search'}
      </div>
    `;
    return;
  }
  
  listElement.innerHTML = filteredQuotes.map(quote => `
    <div class="quote-picker-item ${linkedQuotes.includes(quote.id) ? 'selected' : ''} ${!quote.isVerified ? 'unverified' : ''}" data-id="${quote.id}" data-field="${field}">
      <div class="quote-picker-item-header">
        <span class="quote-picker-item-status ${quote.isVerified ? 'verified' : 'unverified'}">
          ${quote.isVerified ? 'Verified' : 'Unverified'}
        </span>
        ${!quote.isVerified ? `<button class="quote-picker-verify-btn" data-id="${quote.id}" title="Verify this quote">Verify</button>` : ''}
      </div>
      <div class="quote-picker-item-text">"${escapeHtml(quote.text)}"</div>
      <div class="quote-picker-item-meta">
        ${quote.sourceTitle ? `<span>${escapeHtml(quote.sourceTitle.substring(0, 30))}...</span>` : ''}
      </div>
    </div>
  `).join('');
  
  // Add verify button handlers
  listElement.querySelectorAll('.quote-picker-verify-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      verifyQuoteInline(btn.dataset.id);
      renderQuotePickerList(listElement, field, searchTerm);
    });
  });
}

// Update trigger buttons to reflect current selections (supports multiple quotes)
function updateQuotePickerTriggers() {
  document.querySelectorAll('.quote-picker-trigger').forEach(trigger => {
    const field = trigger.dataset.field;
    const linkedQuoteIds = getFieldQuotes(field);
    const preview = trigger.querySelector('.selected-quote-preview');
    
    // Remove existing clear button and verify button
    const existingClear = trigger.querySelector('.clear-btn');
    if (existingClear) existingClear.remove();
    const existingVerify = trigger.querySelector('.inline-verify-btn');
    if (existingVerify) existingVerify.remove();
    // Remove existing count badge
    const existingBadge = trigger.querySelector('.quote-count-badge');
    if (existingBadge) existingBadge.remove();
    
    if (linkedQuoteIds.length > 0) {
      // Find all linked quotes - use String() comparison to handle number/string mismatch
      const linkedQuotes = linkedQuoteIds.map(qid => {
        let quote = verifiedQuotes.find(q => String(q.id) === String(qid));
        if (quote) return { ...quote, isVerified: true };
        quote = pendingQuotes.find(q => String(q.id) === String(qid));
        if (quote) {
          // For statements, check verifiedFields; for incidents, pending means unverified
          const isVerified = currentContentType === 'statement' ? (verifiedFields[`quote_${qid}`] || false) : false;
          return { ...quote, isVerified };
        }
        return null;
      }).filter(Boolean);
      
      if (linkedQuotes.length > 0) {
        const hasUnverified = linkedQuotes.some(q => !q.isVerified);
        const firstQuote = linkedQuotes[0];
        const truncated = firstQuote.text.length > 25 ? firstQuote.text.substring(0, 25) + '...' : firstQuote.text;
        
        if (linkedQuotes.length === 1) {
          // Single quote - show as before
          if (firstQuote.isVerified) {
            preview.textContent = `[linked] "${truncated}"`;
            trigger.classList.add('has-quote');
            trigger.classList.remove('has-unverified');
          } else {
            preview.textContent = `[unverified] "${truncated}"`;
            trigger.classList.add('has-quote', 'has-unverified');
          }
        } else {
          // Multiple quotes - show count and first quote preview
          preview.textContent = `"${truncated}"`;
          trigger.classList.add('has-quote');
          if (hasUnverified) {
            trigger.classList.add('has-unverified');
          } else {
            trigger.classList.remove('has-unverified');
          }
          
          // Add count badge
          const badge = document.createElement('span');
          badge.className = 'quote-count-badge';
          badge.textContent = `+${linkedQuotes.length - 1}`;
          badge.title = `${linkedQuotes.length} quotes linked`;
          trigger.insertBefore(badge, preview.nextSibling);
        }
        
        // Add inline verify button if any unverified
        if (hasUnverified) {
          const verifyBtn = document.createElement('button');
          verifyBtn.className = 'inline-verify-btn';
          verifyBtn.textContent = 'Verify';
          verifyBtn.onclick = (e) => {
            e.stopPropagation();
            // Verify all unverified linked quotes
            linkedQuotes.filter(q => !q.isVerified).forEach(q => verifyQuoteInline(q.id));
            updateQuotePickerTriggers();
          };
          trigger.appendChild(verifyBtn);
        }
        
        // Add clear button
        const clearBtn = document.createElement('button');
        clearBtn.className = 'clear-btn';
        clearBtn.textContent = '✕';
        clearBtn.onclick = (e) => {
          e.stopPropagation();
          clearQuoteAssociation(field);
        };
        trigger.appendChild(clearBtn);
      } else {
        // Quotes no longer exist
        resetTriggerText(trigger, field);
      }
    } else {
      resetTriggerText(trigger, field);
    }
  });
}

function resetTriggerText(trigger, field) {
  if (!trigger) return;
  const preview = trigger.querySelector('.selected-quote-preview');
  if (!preview) return;
  const isLongField = ['name', 'facility', 'location'].includes(field);
  preview.textContent = isLongField ? '[src] Link quote...' : '[src] Link...';
  trigger.classList.remove('has-quote', 'has-unverified', 'has-matches');
}

function clearQuoteAssociation(field, specificQuoteId = null) {
  if (specificQuoteId) {
    // Remove only the specific quote
    removeQuoteFromField(field, specificQuoteId);
  } else {
    // Clear all quotes for this field
    setFieldQuotes(field, []);
  }
  updateQuotePickerTriggers();
  
  // Update the list if open
  const list = document.querySelector(`.quote-picker-list[data-field="${field}"]`);
  if (list) renderQuotePickerList(list, field, '');
}

// Setup quote picker event listeners
function setupQuoteAssociationListeners() {
  // Toggle dropdown on trigger click
  document.querySelectorAll('.quote-picker-trigger').forEach(trigger => {
    trigger.addEventListener('click', (e) => {
      if (e.target.classList.contains('clear-btn')) return;
      
      const field = trigger.dataset.field;
      const dropdown = document.querySelector(`.quote-picker-dropdown[data-field="${field}"]`);
      
      // Close all other dropdowns
      document.querySelectorAll('.quote-picker-dropdown.open').forEach(d => {
        if (d !== dropdown) d.classList.remove('open');
      });
      
      dropdown.classList.toggle('open');
      
      // Focus search input when opened
      if (dropdown.classList.contains('open')) {
        const searchInput = dropdown.querySelector('input');
        if (searchInput) {
          // Get the associated field value to pre-fill search
          const fieldValue = getFieldValueForQuotePicker(field);
          searchInput.value = fieldValue || '';
          searchInput.focus();
          renderQuotePickerList(dropdown.querySelector('.quote-picker-list'), field, searchInput.value);
        }
      }
    });
  });
  
  // Search filtering
  document.querySelectorAll('.quote-picker-search input').forEach(input => {
    input.addEventListener('input', (e) => {
      const field = e.target.dataset.field;
      const list = document.querySelector(`.quote-picker-list[data-field="${field}"]`);
      renderQuotePickerList(list, field, e.target.value);
    });
  });
  
  // Quote selection via event delegation (supports multiple quotes per field)
  document.querySelectorAll('.quote-picker-list').forEach(list => {
    list.addEventListener('click', (e) => {
      const item = e.target.closest('.quote-picker-item');
      if (!item) return;
      
      let quoteId = item.dataset.id;
      if (quoteId && !String(quoteId).startsWith('local-')) {
        const num = Number(quoteId);
        if (!isNaN(num)) quoteId = num;
      }
      const field = item.dataset.field;
      
      // Toggle selection (add/remove from array)
      if (isQuoteLinkedToField(field, quoteId)) {
        removeQuoteFromField(field, quoteId);
      } else {
        addQuoteToField(field, quoteId);
      }
      
      // Update UI (don't close dropdown - allow multiple selections)
      updateQuotePickerTriggers();
      renderQuotePickerList(list, field, '');
    });
  });
  
  // Capture quote from page button - single global capture mode
  let activeCaptureField = null;
  
  // Check if current page is a PDF and update button text accordingly
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, { type: 'GET_PAGE_INFO' }, (response) => {
        if (response?.isPdf) {
          // Update button text for PDF pages
          document.querySelectorAll('.quote-picker-capture-btn').forEach(btn => {
            btn.textContent = '📋 Auto-capture on copy';
            btn.title = 'Click to activate, then copy text from PDF (Ctrl+C) - quote captures automatically';
          });
        }
      });
    }
  });
  
  document.querySelectorAll('.quote-picker-capture-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const field = btn.dataset.field;
      
      // If already capturing for this field, cancel
      if (activeCaptureField === field) {
        cancelCaptureMode();
        return;
      }
      
      // If capturing for another field, cancel that first
      if (activeCaptureField) {
        cancelCaptureMode();
      }
      
      // Activate capture mode for this field
      activeCaptureField = field;
      
      // Update ALL buttons - reset others, activate this one
      document.querySelectorAll('.quote-picker-capture-btn').forEach(b => {
        if (b.dataset.field === field) {
          b.classList.add('active');
          b.textContent = '🔴 Click to cancel...';
        } else {
          b.classList.remove('active');
          b.textContent = '✨ Capture Quote from Page';
        }
      });
      
      // Close all dropdowns
      document.querySelectorAll('.quote-picker-dropdown.open').forEach(d => {
        d.classList.remove('open');
      });
      
      // Send message to content script to enable selection mode
      chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, {
            type: 'START_QUOTE_CAPTURE',
            field: field
          }).catch(err => {
            console.error('Error starting capture:', err);
            cancelCaptureMode();
            showNotification('Could not start capture mode. Try refreshing the page.', 'error');
          });
        }
      });
    });
  });
  
  function cancelCaptureMode() {
    activeCaptureField = null;
    // Reset all capture buttons
    document.querySelectorAll('.quote-picker-capture-btn').forEach(b => {
      b.classList.remove('active');
      b.textContent = '✨ Capture Quote from Page';
    });
    // Tell content script to cancel
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'CANCEL_QUOTE_CAPTURE' }).catch(() => {});
      }
    });
  }
  
  // Listen for capture completion or cancellation
  window.resetCaptureButtons = cancelCaptureMode;
  
  // Close dropdowns when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.quote-association')) {
      document.querySelectorAll('.quote-picker-dropdown.open').forEach(d => {
        d.classList.remove('open');
      });
    }
  });
  
  // Auto-open quote picker when typing in associated fields
  setupFieldAutoFilter();
  
  // Setup agency checkbox listeners to show/hide quote links
  document.querySelectorAll('.checkbox-with-quote input[type="checkbox"]').forEach(checkbox => {
    checkbox.addEventListener('change', (e) => {
      const wrapper = e.target.closest('.checkbox-with-quote');
      if (e.target.checked) {
        wrapper.classList.add('checked');
      } else {
        wrapper.classList.remove('checked');
        // Clear the quote association when unchecked
        const field = wrapper.querySelector('.checkbox-quote-link').dataset.field;
        if (fieldQuoteAssociations[field]) {
          delete fieldQuoteAssociations[field];
          chrome.storage.local.set({ fieldQuoteAssociations });
          updateAgencyQuoteLinks();
        }
      }
    });
    
    // Initialize state
    if (checkbox.checked) {
      checkbox.closest('.checkbox-with-quote').classList.add('checked');
    }
  });
  
  // Setup agency quote link clicks to open modal
  const agencyQuoteLinks = document.querySelectorAll('.checkbox-quote-link');
  console.log('[setupEventListeners] Found', agencyQuoteLinks.length, 'agency quote links');
  agencyQuoteLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.stopPropagation();
      console.log('[Agency Quote Link Click] Field:', link.dataset.field);
      openQuotePickerModal(link.dataset.field);
    });
  });
  
  // Setup incident type quote link clicks to open modal
  document.querySelectorAll('.incident-type-quote-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.stopPropagation();
      openQuotePickerModal(link.dataset.field);
    });
  });
  
  // Violation info buttons (legal reference)
  const violationInfoBtns = document.querySelectorAll('.violation-info-btn');
  console.log('Found violation info buttons:', violationInfoBtns.length);
  violationInfoBtns.forEach(btn => {
    console.log('Adding listener to btn with data-violation:', btn.dataset.violation);
    btn.addEventListener('click', (e) => {
      console.log('? button clicked, violation:', btn.dataset.violation);
      e.stopPropagation();
      openLegalRefModal(btn.dataset.violation);
    });
  });
  
  // Modal close button
  document.getElementById('closeQuotePickerModal').addEventListener('click', closeQuotePickerModal);
  
  // Legal reference modal close
  document.getElementById('closeLegalRefModal').addEventListener('click', closeLegalRefModal);
  document.getElementById('legalRefModal').addEventListener('click', (e) => {
    if (e.target.id === 'legalRefModal') closeLegalRefModal();
  });
  
  // Modal backdrop click to close
  document.getElementById('quotePickerModal').addEventListener('click', (e) => {
    if (e.target.id === 'quotePickerModal') closeQuotePickerModal();
  });
  
  // Modal search
  document.getElementById('modalQuoteSearch').addEventListener('input', (e) => {
    renderModalQuoteList(e.target.value);
  });
  
  // Modal quote selection (supports multiple quotes per field)
  document.getElementById('modalQuoteList').addEventListener('click', (e) => {
    const item = e.target.closest('.quote-picker-item');
    if (!item) return;
    
    let quoteId = item.dataset.id;
    if (quoteId && !String(quoteId).startsWith('local-')) {
      const num = Number(quoteId);
      if (!isNaN(num)) quoteId = num;
    }
    const field = currentModalField;
    
    // Toggle selection (add/remove from array)
    if (isQuoteLinkedToField(field, quoteId)) {
      removeQuoteFromField(field, quoteId);
    } else {
      addQuoteToField(field, quoteId);
    }
    
    // Update UI (stay open for multiple selections)
    updateAgencyQuoteLinks();
    renderModalQuoteList('');
  });
  
  // Event delegation for analysis action buttons (Smart Auto-Fill only - suggestions, not actions)
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    
    const action = btn.dataset.action;
    
    if (action === 'apply-suggestion') {
      const field = btn.dataset.field;
      const value = btn.dataset.value;
      const quoteId = btn.dataset.quoteId;
      applySmartSuggestion(field, value, quoteId);
    } else if (action === 'apply-all-suggestions') {
      applyAllSmartSuggestions();
    }
  });
}

// Current field being edited in modal
let currentModalField = null;

// Map of form field IDs to quote picker field names
const fieldToPickerMap = {
  'caseName': 'name',
  'caseDod': 'date',
  'caseAge': 'age',
  'caseCountry': 'nationality',
  'caseGender': 'gender',
  'caseImmigrationStatus': 'immigration_status',
  'caseFacility': 'facility',
  'caseCity': 'city',
  'caseState': 'state',
  'caseCause': 'summary',
  'deathCause': 'death_cause',
  'deathManner': 'death_manner',
  'deathCustodyDuration': 'death_custody_duration',
  'injuryType': 'injury_type',
  'injurySeverity': 'injury_severity',
  'injuryWeapon': 'injury_weapon',
  'injuryCause': 'injury_cause',
  'arrestReason': 'arrest_reason',
  'arrestContext': 'arrest_context',
  'arrestCharges': 'arrest_charges'
};

// Get the value from a form field for a quote picker field name
function getFieldValueForQuotePicker(pickerField) {
  const reverseMap = {
    'name': 'caseName',
    'date': 'caseDod',
    'age': 'caseAge',
    'nationality': 'caseCountry',
    'gender': 'caseGender',
    'immigration_status': 'caseImmigrationStatus',
    'facility': 'caseFacility',
    'city': 'caseCity',
    'state': 'caseState',
    'summary': 'caseCause',
    'death_cause': 'deathCause',
    'death_manner': 'deathManner',
    'death_custody_duration': 'deathCustodyDuration',
    'injury_type': 'injuryType',
    'injury_severity': 'injurySeverity',
    'injury_weapon': 'injuryWeapon',
    'injury_cause': 'injuryCause',
    'arrest_reason': 'arrestReason',
    'arrest_context': 'arrestContext',
    'arrest_charges': 'arrestCharges',
    'incident_type': 'incidentType'
  };
  
  const formFieldId = reverseMap[pickerField];
  if (!formFieldId) return '';
  
  const element = document.getElementById(formFieldId);
  if (!element) return '';
  
  // For select elements, get the selected option text
  if (element.tagName === 'SELECT') {
    return element.options[element.selectedIndex]?.text || '';
  }
  
  return element.value || '';
}

// Setup auto-filter on form field input
function setupFieldAutoFilter() {
  Object.entries(fieldToPickerMap).forEach(([formFieldId, pickerField]) => {
    const formField = document.getElementById(formFieldId);
    if (!formField) return;
    
    // On input, update the quote picker dropdown if open, or show matching count
    formField.addEventListener('input', (e) => {
      const value = e.target.value;
      if (value.length >= 2) {
        // Update the trigger button to show matches
        const trigger = document.querySelector(`.quote-picker-trigger[data-field="${pickerField}"]`);
        const dropdown = document.querySelector(`.quote-picker-dropdown[data-field="${pickerField}"]`);
        
        if (trigger && !fieldQuoteAssociations[pickerField]) {
          // Count matching quotes
          const matches = verifiedQuotes.filter(q => 
            q.text.toLowerCase().includes(value.toLowerCase())
          );
          
          if (matches.length > 0) {
            const preview = trigger.querySelector('.selected-quote-preview');
            preview.textContent = `[${matches.length}] matches "${value.substring(0, 15)}${value.length > 15 ? '...' : ''}"`;
            trigger.classList.add('has-matches');
          } else {
            resetTriggerText(trigger, pickerField);
            trigger.classList.remove('has-matches');
          }
        }
        
        // If dropdown is open, update the list
        if (dropdown && dropdown.classList.contains('open')) {
          const searchInput = dropdown.querySelector('input');
          const list = dropdown.querySelector('.quote-picker-list');
          if (searchInput && list) {
            searchInput.value = value;
            renderQuotePickerList(list, pickerField, value);
          }
        }
      } else {
        // Reset trigger if value is too short
        const trigger = document.querySelector(`.quote-picker-trigger[data-field="${pickerField}"]`);
        if (trigger && !fieldQuoteAssociations[pickerField]) {
          resetTriggerText(trigger, pickerField);
          trigger.classList.remove('has-matches');
        }
      }
    });
    
    // On focus, if there's a value, show the dropdown with filtered results
    formField.addEventListener('focus', (e) => {
      const value = e.target.value;
      if (value.length >= 2 && verifiedQuotes.length > 0) {
        const matches = verifiedQuotes.filter(q => 
          q.text.toLowerCase().includes(value.toLowerCase())
        );
        
        if (matches.length > 0) {
          const dropdown = document.querySelector(`.quote-picker-dropdown[data-field="${pickerField}"]`);
          const searchInput = dropdown?.querySelector('input');
          const list = dropdown?.querySelector('.quote-picker-list');
          
          if (dropdown && searchInput && list) {
            // Close other dropdowns
            document.querySelectorAll('.quote-picker-dropdown.open').forEach(d => {
              if (d !== dropdown) d.classList.remove('open');
            });
            
            searchInput.value = value;
            renderQuotePickerList(list, pickerField, value);
            dropdown.classList.add('open');
          }
        }
      }
    });
  });
}

// Open quote picker modal
function openQuotePickerModal(field) {
  currentModalField = field;
  const modal = document.getElementById('quotePickerModal');
  const title = document.getElementById('quotePickerModalTitle');
  const searchInput = document.getElementById('modalQuoteSearch');
  
  // Format title from field name
  const fieldName = field.replace('agency_', '').replace(/_/g, ' ').toUpperCase();
  title.textContent = `Link Quote for: ${fieldName}`;
  
  searchInput.value = '';
  renderModalQuoteList('');
  modal.classList.add('open');
  searchInput.focus();
}

// Close quote picker modal
function closeQuotePickerModal() {
  document.getElementById('quotePickerModal').classList.remove('open');
  currentModalField = null;
}

// Open legal reference modal
function openLegalRefModal(violationType) {
  console.log('openLegalRefModal called with:', violationType);
  console.log('LEGAL_REFERENCES keys:', Object.keys(LEGAL_REFERENCES));
  
  const modal = document.getElementById('legalRefModal');
  const title = document.getElementById('legalRefTitle');
  const body = document.getElementById('legalRefBody');
  
  const ref = LEGAL_REFERENCES[violationType];
  if (!ref) {
    console.error('No ref found for violationType:', violationType);
    showNotification(`No legal reference available for: "${violationType}"`, 'warning');
    return;
  }
  
  title.textContent = ref.name;
  
  let html = '';
  
  // Constitutional/Statutory text
  const textSourceLink = ref.textSource 
    ? `<a href="${ref.textSource}" target="_blank" style="font-size: 10px; color: #3b82f6;">[Verify Source]</a>`
    : '';
  
  html += `
    <div class="legal-ref-section">
      <h4>Constitutional/Statutory Text ${textSourceLink}</h4>
      <div class="constitutional-text">
        "${ref.text}"
      </div>
      <button class="copy-text-btn" onclick="copyLegalText('${violationType}', 'text')">Copy Text</button>
    </div>
  `;
  
  // Application notes (clearly marked as editorial)
  if (ref.applicationNotes) {
    html += `
      <div class="legal-ref-section">
        <h4>Editorial Guidance</h4>
        <p style="font-size: 11px; color: #6b7280; font-style: italic; background: #f1f5f9; padding: 8px; border-radius: 4px; border-left: 3px solid #94a3b8;">
          ${ref.applicationNotes}
        </p>
      </div>
    `;
  }
  
  // Case law with source links
  if (ref.cases && ref.cases.length > 0) {
    html += `
      <div class="legal-ref-section">
        <h4>Key Case Law (Holdings are quotable)</h4>
    `;
    
    ref.cases.forEach((caseItem, idx) => {
      const sourceLink = caseItem.sourceUrl 
        ? `<a href="${caseItem.sourceUrl}" target="_blank" style="font-size: 10px; color: #3b82f6; margin-left: 8px;">[Read Full Opinion]</a>`
        : '';
      
      html += `
        <div class="case-law-item">
          <h5>${caseItem.name} <span style="font-weight: normal; color: #6b7280;">(${caseItem.citation})</span>${sourceLink}</h5>
          <p class="holding" style="margin-top: 8px;"><strong>Holding:</strong> "${caseItem.holding}"</p>
          <div style="margin-top: 8px; display: flex; gap: 8px;">
            <button class="copy-text-btn" onclick="copyLegalText('${violationType}', 'case', ${idx})">Copy Citation + Holding</button>
            ${caseItem.sourceUrl ? `<button class="copy-text-btn" onclick="window.open('${caseItem.sourceUrl}', '_blank')">Open Source</button>` : ''}
          </div>
        </div>
      `;
    });
    
    html += '</div>';
  }
  
  // Important notice
  html += `
    <div style="margin-top: 16px; padding: 10px; background: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; font-size: 11px; color: #92400e;">
      <strong>Important:</strong> Always verify quotes against the linked source before using. Holdings shown here are excerpts - read the full opinion for complete context.
    </div>
  `;
  
  body.innerHTML = html;
  modal.classList.add('active');
}

// Close legal reference modal
function closeLegalRefModal() {
  document.getElementById('legalRefModal').classList.remove('active');
}

// ===========================================
// Bug Report Functions
// ===========================================

// Store console errors for bug reports
let consoleErrors = [];
const originalConsoleError = console.error;
console.error = function(...args) {
  consoleErrors.push({
    timestamp: new Date().toISOString(),
    message: args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')
  });
  // Keep only last 20 errors
  if (consoleErrors.length > 20) consoleErrors.shift();
  originalConsoleError.apply(console, args);
};

function openBugReportModal() {
  const modal = document.getElementById('bugReportModal');
  if (modal) {
    modal.classList.add('active');
    document.getElementById('bugDescription').focus();
  }
}

function closeBugReport() {
  const modal = document.getElementById('bugReportModal');
  if (modal) {
    modal.classList.remove('active');
    // Clear form
    document.getElementById('bugDescription').value = '';
    document.getElementById('bugSteps').value = '';
  }
}

async function submitBugReportHandler() {
  const description = document.getElementById('bugDescription').value.trim();
  const steps = document.getElementById('bugSteps').value.trim();
  const includeState = document.getElementById('bugIncludeState').checked;
  const includeConsole = document.getElementById('bugIncludeConsole').checked;
  
  if (!description) {
    showNotification('Please describe the bug', 'warning');
    return;
  }
  
  // Gather context
  const bugReport = {
    description,
    steps: steps || null,
    timestamp: new Date().toISOString(),
    url: window.location.href,
    userAgent: navigator.userAgent,
    extensionVersion: chrome.runtime.getManifest().version
  };
  
  if (includeState) {
    bugReport.currentCase = currentCase;
    bugReport.verifiedQuotesCount = verifiedQuotes.length;
    bugReport.pendingQuotesCount = pendingQuotes.length;
    bugReport.sourcesCount = sources.length;
    bugReport.isConnected = isConnected;
    bugReport.apiUrl = apiUrl;
  }
  
  if (includeConsole) {
    bugReport.consoleErrors = consoleErrors.slice(-10); // Last 10 errors
  }
  
  // Try to submit to API
  try {
    const response = await fetch(`${apiUrl}/api/bug-reports`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey && { 'Authorization': `Bearer ${apiKey}` })
      },
      body: JSON.stringify(bugReport)
    });
    
    if (response.ok) {
      showNotification('Bug report submitted - thank you!', 'success');
      closeBugReport();
    } else {
      // If API fails, save locally
      await saveBugReportLocally(bugReport);
      showNotification('Saved bug report locally (API unavailable)', 'info');
      closeBugReport();
    }
  } catch (error) {
    console.error('Failed to submit bug report:', error);
    // Save locally as fallback
    await saveBugReportLocally(bugReport);
    showNotification('Saved bug report locally (API unavailable)', 'info');
    closeBugReport();
  }
}

async function saveBugReportLocally(bugReport) {
  const { bugReports = [] } = await chrome.storage.local.get('bugReports');
  bugReports.push(bugReport);
  // Keep only last 50 reports
  if (bugReports.length > 50) bugReports.shift();
  await chrome.storage.local.set({ bugReports });
}

// ===========================================

// Copy legal text to clipboard
function copyLegalText(violationType, type, caseIdx) {
  const ref = LEGAL_REFERENCES[violationType];
  if (!ref) return;
  
  let textToCopy = '';
  
  if (type === 'text') {
    const sourceNote = ref.textSource ? ` (Source: ${ref.textSource})` : '';
    textToCopy = `${ref.name}: "${ref.text}"${sourceNote}`;
  } else if (type === 'case' && ref.cases[caseIdx]) {
    const caseItem = ref.cases[caseIdx];
    const sourceNote = caseItem.sourceUrl ? ` (Source: ${caseItem.sourceUrl})` : '';
    textToCopy = `${caseItem.name}, ${caseItem.citation}: "${caseItem.holding}"${sourceNote}`;
  }
  
  navigator.clipboard.writeText(textToCopy).then(() => {
    showNotification('Copied to clipboard (includes source link)', 'success');
  }).catch(err => {
    console.error('Failed to copy:', err);
    showNotification('Failed to copy', 'error');
  });
}

// Use legal framework from reference
function useLegalFramework(violationType) {
  const ref = LEGAL_REFERENCES[violationType];
  if (!ref || !ref.cases || ref.cases.length === 0) return;
  
  // Use the first/primary case as the legal framework
  const primaryCase = ref.cases[0];
  const frameworkText = `${primaryCase.name} (${primaryCase.citation})`;
  
  const frameworkInput = document.getElementById('violationLegalFramework');
  if (frameworkInput) {
    frameworkInput.value = frameworkText;
    updateCaseFromForm();
  }
  
  closeLegalRefModal();
  showNotification(`Legal framework set to: ${primaryCase.name}`, 'success');
  
  // Show the violation basis section if hidden
  const basisSection = document.getElementById('violationBasisSection');
  if (basisSection) {
    basisSection.classList.remove('hidden');
  }
}

// Render quotes in modal
function renderModalQuoteList(searchTerm) {
  const list = document.getElementById('modalQuoteList');
  const search = searchTerm.toLowerCase();
  const linkedQuotes = getFieldQuotes(currentModalField);
  
  console.log('[renderModalQuoteList] Field:', currentModalField);
  console.log('[renderModalQuoteList] Linked quotes:', linkedQuotes);
  console.log('[renderModalQuoteList] Verified quotes count:', verifiedQuotes.length);
  console.log('[renderModalQuoteList] Pending quotes count:', pendingQuotes.length);
  
  // Combine verified and pending quotes
  const allQuotes = [
    ...verifiedQuotes.map(q => ({ ...q, isVerified: true })),
    ...pendingQuotes.map(q => ({ ...q, isVerified: false }))
  ];
  
  console.log('[renderModalQuoteList] All quotes combined:', allQuotes.length);
  
  const filteredQuotes = allQuotes.filter(q => 
    !search || q.text.toLowerCase().includes(search) || q.category.toLowerCase().includes(search)
  );
  
  console.log('[renderModalQuoteList] Filtered quotes:', filteredQuotes.length);
  
  // Update count display
  const linkedQuotesStr = linkedQuotes.map(id => String(id));
  const selectedCount = linkedQuotesStr.length;
  const countEl = document.getElementById('quotePickerCount');
  if (countEl) {
    countEl.textContent = `(${selectedCount} selected, ${filteredQuotes.length} total)`;
  }
  
  if (filteredQuotes.length === 0) {
    list.innerHTML = `
      <div class="quote-picker-empty">
        ${allQuotes.length === 0 ? 'No quotes yet. Add quotes from the Extract tab.' : 'No quotes match your search'}
      </div>
    `;
    return;
  }
  
  // Normalize linkedQuotes to strings for comparison
  
  list.innerHTML = filteredQuotes.map(quote => {
    const isLinked = linkedQuotesStr.includes(String(quote.id));
    console.log(`[renderModalQuoteList] Quote ${quote.id}: linked=${isLinked}`);
    return `
      <div class="quote-picker-item ${isLinked ? 'selected' : ''} ${!quote.isVerified ? 'unverified' : ''}" data-id="${quote.id}">
        <div class="quote-picker-item-header">
          <span class="quote-picker-item-status ${quote.isVerified ? 'verified' : 'unverified'}">
            ${quote.isVerified ? 'Verified' : 'Unverified'}
          </span>
          ${!quote.isVerified ? `<button class="quote-picker-verify-btn" data-id="${quote.id}" title="Verify this quote">Verify</button>` : ''}
        </div>
        <div class="quote-picker-item-text">"${escapeHtml(quote.text)}"</div>
        <div class="quote-picker-item-meta">
          ${quote.sourceTitle ? `<span>${escapeHtml(quote.sourceTitle.substring(0, 30))}...</span>` : ''}
        </div>
      </div>
    `;
  }).join('');
  
  // Add verify button handlers
  list.querySelectorAll('.quote-picker-verify-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      verifyQuoteInline(btn.dataset.id);
      renderModalQuoteList(searchTerm);
    });
  });
}

// Verify a quote inline (move from pending to verified)
function verifyQuoteInline(quoteId) {
  console.log('[verifyQuoteInline] Called with quoteId:', quoteId, 'currentContentType:', currentContentType);
  
  // For statements, just toggle verified state without moving the quote
  if (currentContentType === 'statement') {
    console.log('[verifyQuoteInline] Statement mode - toggling verified state');
    verifiedFields[`quote_${quoteId}`] = true;
    updateVerificationCounter();
    renderQuotes();
    updateQuotePickerTriggers();
    updateQuoteAssociationDropdowns();
    showNotification('Quote verified', 'success');
    return;
  }
  
  // For incidents, move from pending to verified
  const pendingIndex = pendingQuotes.findIndex(q => String(q.id) === String(quoteId));
  if (pendingIndex !== -1) {
    const quote = pendingQuotes.splice(pendingIndex, 1)[0];
    quote.status = 'verified';
    verifiedQuotes.unshift(quote);
    renderQuotes();
    renderPendingQuotes();
    syncQuotesToBackground();
    showNotification('Quote verified', 'success');
  }
}

// Check if all linked quotes are verified
function checkAllLinkedQuotesVerified() {
  // Collect all linked quote IDs from all fields (flatten arrays)
  const linkedQuoteIds = [];
  for (const [field, value] of Object.entries(fieldQuoteAssociations)) {
    if (Array.isArray(value)) {
      linkedQuoteIds.push(...value);
    } else if (value) {
      linkedQuoteIds.push(value);
    }
  }
  
  for (const quoteId of linkedQuoteIds) {
    // Check if it's in verified quotes - use String comparison for type safety
    const inVerified = verifiedQuotes.find(q => String(q.id) === String(quoteId));
    if (!inVerified) {
      // Check if it's in pending quotes (unverified)
      const inPending = pendingQuotes.find(q => String(q.id) === String(quoteId));
      if (inPending) {
        return { valid: false, unverifiedQuote: inPending };
      }
    }
  }
  
  return { valid: true };
}

// Get list of unverified linked quotes
function getUnverifiedLinkedQuotes() {
  // Collect all linked quote IDs from all fields (flatten arrays)
  const linkedQuoteIds = [];
  for (const [field, value] of Object.entries(fieldQuoteAssociations)) {
    if (Array.isArray(value)) {
      linkedQuoteIds.push(...value);
    } else if (value) {
      linkedQuoteIds.push(value);
    }
  }
  
  const unverified = [];
  const seen = new Set();
  
  for (const quoteId of linkedQuoteIds) {
    if (seen.has(String(quoteId))) continue;
    seen.add(String(quoteId));
    
    const inPending = pendingQuotes.find(q => String(q.id) === String(quoteId));
    if (inPending) {
      unverified.push(inPending);
    }
  }
  
  return unverified;
}

// Update agency quote link text/state
function updateAgencyQuoteLinks() {
  const allLinks = document.querySelectorAll('.checkbox-quote-link');
  console.log('[updateAgencyQuoteLinks] Called - found', allLinks.length, 'links to update');
  console.log('[updateAgencyQuoteLinks] Current fieldQuoteAssociations:', fieldQuoteAssociations);
  
  // Update agency checkbox quote links
  allLinks.forEach(link => {
    const field = link.dataset.field;
    const quoteIds = getFieldQuotes(field);
    
    // Remove existing verify button and badge
    const existingVerify = link.parentElement?.querySelector('.checkbox-verify-btn');
    if (existingVerify) existingVerify.remove();
    const existingBadge = link.parentElement?.querySelector('.quote-count-badge');
    if (existingBadge) existingBadge.remove();
    
    if (quoteIds.length > 0) {
      // Find all linked quotes
      const linkedQuotes = quoteIds.map(qid => {
        let quote = verifiedQuotes.find(q => String(q.id) === String(qid));
        if (quote) return { ...quote, isVerified: true };
        quote = pendingQuotes.find(q => String(q.id) === String(qid));
        if (quote) return { ...quote, isVerified: false };
        return null;
      }).filter(Boolean);
      
      if (linkedQuotes.length > 0) {
        const hasUnverified = linkedQuotes.some(q => !q.isVerified);
        const firstQuote = linkedQuotes[0];
        const truncated = firstQuote.text.length > 20 ? firstQuote.text.substring(0, 20) + '...' : firstQuote.text;
        
        if (linkedQuotes.length === 1) {
          if (firstQuote.isVerified) {
            link.textContent = `[linked] "${truncated}"`;
            link.classList.add('has-quote');
            link.classList.remove('has-unverified');
          } else {
            link.textContent = `[unverified] "${truncated}"`;
            link.classList.add('has-quote', 'has-unverified');
          }
        } else {
          // Multiple quotes
          link.textContent = `"${truncated}" +${linkedQuotes.length - 1}`;
          link.classList.add('has-quote');
          if (hasUnverified) {
            link.classList.add('has-unverified');
          } else {
            link.classList.remove('has-unverified');
          }
        }
        
        // Add verify button if any unverified
        if (hasUnverified) {
          const verifyBtn = document.createElement('button');
          verifyBtn.className = 'checkbox-verify-btn';
          verifyBtn.textContent = 'Verify';
          verifyBtn.onclick = (e) => {
            e.stopPropagation();
            linkedQuotes.filter(q => !q.isVerified).forEach(q => verifyQuoteInline(q.id));
            updateAgencyQuoteLinks();
          };
          link.parentElement.appendChild(verifyBtn);
        }
      } else {
        link.textContent = '[src]';
        link.classList.remove('has-quote', 'has-unverified');
      }
    } else {
      link.textContent = '[src]';
      link.classList.remove('has-quote', 'has-unverified');
    }
  });
  
  // Update incident type quote links (supports multiple quotes)
  document.querySelectorAll('.incident-type-quote-link').forEach(link => {
    const field = link.dataset.field;
    const quoteIds = getFieldQuotes(field);
    
    if (quoteIds.length > 0) {
      // Find all linked quotes
      const linkedQuotes = quoteIds.map(qid => {
        let quote = verifiedQuotes.find(q => String(q.id) === String(qid));
        if (quote) return { ...quote, isVerified: true };
        quote = pendingQuotes.find(q => String(q.id) === String(qid));
        if (quote) return { ...quote, isVerified: false };
        return null;
      }).filter(Boolean);
      
      if (linkedQuotes.length > 0) {
        const hasUnverified = linkedQuotes.some(q => !q.isVerified);
        
        if (linkedQuotes.length === 1) {
          if (linkedQuotes[0].isVerified) {
            link.textContent = `✓`;
            link.classList.add('has-quote');
            link.classList.remove('has-unverified');
            link.title = `Linked: "${linkedQuotes[0].text}"`;
          } else {
            link.textContent = `!`;
            link.classList.add('has-quote', 'has-unverified');
            link.title = `Unverified: "${linkedQuotes[0].text}"`;
          }
        } else {
          // Multiple quotes
          link.textContent = hasUnverified ? `${linkedQuotes.length}!` : `${linkedQuotes.length}✓`;
          link.classList.add('has-quote');
          if (hasUnverified) {
            link.classList.add('has-unverified');
          } else {
            link.classList.remove('has-unverified');
          }
          link.title = `${linkedQuotes.length} quotes linked`;
        }
      } else {
        link.textContent = '[src]';
        link.classList.remove('has-quote', 'has-unverified');
        link.title = 'Link a quote';
      }
    } else {
      link.textContent = '[src]';
      link.classList.remove('has-quote', 'has-unverified');
      link.title = 'Link a quote';
    }
  });
}

// Load saved quote associations
function loadQuoteAssociations() {
  chrome.storage.local.get(['fieldQuoteAssociations'], (result) => {
    if (result.fieldQuoteAssociations) {
      fieldQuoteAssociations = result.fieldQuoteAssociations;
      updateQuoteAssociationDropdowns();
      updateAgencyQuoteLinks();
    }
  });
}

// Render all quotes list
function renderQuotes() {
  // Collect all quotes - in review mode, filter by verifiedFields; otherwise show all
  let allQuotes = [...verifiedQuotes];
  if (pendingQuotes && Array.isArray(pendingQuotes)) {
    allQuotes = allQuotes.concat(pendingQuotes);
  }
  
  console.log('[renderQuotes] verifiedQuotes:', verifiedQuotes.length, 'pendingQuotes:', pendingQuotes?.length || 0, 'total allQuotes:', allQuotes.length);
  
  // In review mode, filter by verifiedFields. Otherwise, use quote's own verified property
  const verifiedList = reviewMode 
    ? allQuotes.filter(q => verifiedFields[`quote_${q.id}`])
    : allQuotes.filter(q => q.verified);
    
  const unverifiedList = reviewMode
    ? allQuotes.filter(q => !verifiedFields[`quote_${q.id}`])
    : allQuotes.filter(q => !q.verified);
  
  console.log('[renderQuotes] verifiedList:', verifiedList.length, 'unverifiedList:', unverifiedList.length);
  
  elements.quoteCount.textContent = verifiedList.length;
  
  // Also update statement quote count
  const statementQuoteCount = document.getElementById('statementQuoteCount');
  if (statementQuoteCount) {
    statementQuoteCount.textContent = allQuotes.length;
  }
  
  // Render verified quotes
  const verifiedQuoteListEl = document.getElementById('verifiedQuoteList');
  const statementQuoteListEl = document.getElementById('statementQuoteList');
  
  console.log('[renderQuotes] verifiedQuoteListEl found:', !!verifiedQuoteListEl);
  console.log('[renderQuotes] statementQuoteListEl found:', !!statementQuoteListEl);
  if (statementQuoteListEl) {
    console.log('[renderQuotes] statementQuoteListEl parent:', statementQuoteListEl.parentElement?.className);
    console.log('[renderQuotes] statementFormContainer visible:', elements.statementFormContainer?.style.display);
  }
  
  const quoteHTML = allQuotes.length === 0 ? `
    <div class="empty-state">
      <div class="empty-state-icon"></div>
      <p>No quotes captured yet</p>
      <p style="font-size: 11px; margin-top: 4px;">
        Use "Extract Page" to capture quotes from article
      </p>
    </div>
  ` : `<!-- RENDERING ${allQuotes.length} QUOTES -->` + allQuotes.map(quote => {
    const isVerified = quote.verified || verifiedFields[`quote_${quote.id}`];
    return `
      <div class="quote-card ${isVerified ? 'verified' : 'unverified'}" data-id="${quote.id}" style="${isVerified ? '' : 'border-left: 3px solid #fbbf24; background: #fffbeb;'}">
        <div style="display: inline-block; background: ${isVerified ? '#dcfce7' : '#fef3c7'}; color: ${isVerified ? '#166534' : '#92400e'}; padding: 2px 6px; border-radius: 3px; font-size: 10px; font-weight: 600; margin-bottom: 6px;">${isVerified ? '✓ VERIFIED' : '⚠️ UNVERIFIED'}</div>
        <div class="quote-text" style="${quote.text.length > 200 ? 'max-height: 100px; overflow: hidden;' : ''}">"${escapeHtml(quote.text)}"</div>
        <div class="quote-meta" style="margin-top: 8px;">
          ${quote.pageNumber ? `<span class="quote-page" data-action="goToPage" data-page="${quote.pageNumber}" title="Go to page">Page ${quote.pageNumber}</span>` : ''}
        </div>
        ${quote.source ? `<div class="quote-source" style="margin-top: 6px; color: #6b7280; font-size: 11px;">Source: ${escapeHtml(quote.source)}</div>` : ''}
        <div class="quote-actions" style="margin-top: 8px; display: flex; gap: 6px; flex-wrap: wrap;">
          ${!isVerified ? `<button class="btn btn-sm btn-success verify-quote-btn" data-quote-id="${quote.id}" title="Mark as verified" style="font-size: 11px; padding: 4px 10px;">✓ Verify</button>` : ''}
          <button class="btn btn-sm btn-icon edit-quote-btn" data-quote-id="${quote.id}" title="Edit quote" style="font-size: 11px; padding: 4px 10px;">Edit</button>
          <button class="btn btn-sm btn-icon" data-action="copy" data-id="${quote.id}" data-verified="${isVerified}" title="Copy quote">Copy</button>
          ${!currentPageIsPdf ? `<button class="btn btn-sm btn-icon" data-action="find" data-id="${quote.id}" data-verified="${isVerified}" title="Find on page">Find</button>
          <button class="btn btn-sm btn-icon pin-btn" data-action="pin" data-id="${quote.id}" data-verified="${isVerified}" title="Pin highlight">Pin</button>` : ''}
          <button class="btn btn-sm btn-danger" data-action="removeVerified" data-id="${quote.id}" title="Remove">X</button>
        </div>
      </div>
    `;
  }).join('');
    
  // Render to both incident and statement quote lists
  if (verifiedQuoteListEl) {
    verifiedQuoteListEl.innerHTML = quoteHTML;
    console.log('[renderQuotes] Updated verifiedQuoteListEl');
    
    // Add event delegation for verify buttons on incident list
    verifiedQuoteListEl.querySelectorAll('.verify-quote-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        const qid = btn.dataset.quoteId;
        await verifyQuoteFromList(qid);
      });
    });
    
    // Add event delegation for edit buttons on incident list
    verifiedQuoteListEl.querySelectorAll('.edit-quote-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        const qid = btn.dataset.quoteId;
        await editQuoteFromList(qid);
      });
    });
  }
  
  if (statementQuoteListEl) {
    console.log('[renderQuotes] Rendering to statementQuoteListEl, quoteHTML length:', quoteHTML.length);
    console.log('[renderQuotes] statementQuoteListEl element:', statementQuoteListEl);
    console.log('[renderQuotes] statementQuoteListEl visibility:', window.getComputedStyle(statementQuoteListEl).display);
    console.log('[renderQuotes] First 100 chars of quoteHTML:', quoteHTML.substring(0, 100));
    statementQuoteListEl.innerHTML = quoteHTML;
    console.log('[renderQuotes] After setting innerHTML, statementQuoteListEl.innerHTML length:', statementQuoteListEl.innerHTML.length);
    console.log('[renderQuotes] After setting innerHTML, first 100 chars:', statementQuoteListEl.innerHTML.substring(0, 100));
    console.log('[renderQuotes] Updated statementQuoteListEl');
    
    // Add event delegation for verify buttons on statement list
    statementQuoteListEl.querySelectorAll('.verify-quote-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        const qid = btn.dataset.quoteId;
        await verifyQuoteFromList(qid);
      });
    });
    
    // Add event delegation for edit buttons on statement list
    statementQuoteListEl.querySelectorAll('.edit-quote-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        const qid = btn.dataset.quoteId;
        await editQuoteFromList(qid);
      });
    });
  }
  
  // Render unverified quotes dropdown (only for incidents, not statements)
  const unverifiedDropdown = document.getElementById('unverifiedQuotesDropdown');
  if (!unverifiedDropdown) {
    // No separate unverified section, we render everything above
    return;
  }
  
  const unverifiedQuoteListContainer = document.getElementById('unverifiedQuoteList');
  const unverifiedCountEl = document.getElementById('unverifiedQuoteCount');
  
  if (unverifiedList.length > 0) {
    unverifiedDropdown.style.display = 'block';
    unverifiedCountEl.textContent = unverifiedList.length;
    
    // Find the actual quote-list div inside the container
    const unverifiedQuoteListEl = unverifiedQuoteListContainer.querySelector('.quote-list');
    
    unverifiedQuoteListEl.innerHTML = unverifiedList.map(quote => {
      return `
      <div class="quote-card unverified" data-id="${quote.id}" style="border-left: 3px solid #fbbf24; background: #fffbeb;">
        <div style="display: inline-block; background: #fef3c7; color: #92400e; padding: 2px 6px; border-radius: 3px; font-size: 10px; font-weight: 600; margin-bottom: 6px;">⚠️ UNVERIFIED</div>
        <div class="quote-text" style="${quote.text.length > 200 ? 'max-height: 100px; overflow: hidden;' : ''}">"${escapeHtml(quote.text)}"</div>
        <div class="quote-meta" style="margin-top: 8px;">
          ${quote.pageNumber ? `<span class="quote-page" data-action="goToPage" data-page="${quote.pageNumber}" title="Go to page">Page ${quote.pageNumber}</span>` : ''}
        </div>
        ${quote.sourceUrl ? `<div class="quote-source" style="margin-top: 6px;"><a href="${escapeHtml(quote.sourceUrl)}" target="_blank" class="source-link" title="View source" style="color: #3b82f6; text-decoration: underline; font-size: 11px;">${escapeHtml(quote.sourceTitle || new URL(quote.sourceUrl).hostname)}</a></div>` : ''}
        <div class="quote-actions" style="margin-top: 8px; display: flex; gap: 6px; flex-wrap: wrap;">
          <button class="btn btn-sm btn-success verify-quote-btn" data-quote-id="${quote.id}" title="Mark as verified" style="font-size: 11px; padding: 4px 10px;">✓ Verify</button>
          <button class="btn btn-sm btn-icon edit-quote-btn" data-quote-id="${quote.id}" title="Edit quote" style="font-size: 11px; padding: 4px 10px;">Edit</button>
          <button class="btn btn-sm btn-icon" data-action="copy" data-id="${quote.id}" data-verified="false" title="Copy quote">Copy</button>
          ${!currentPageIsPdf ? `<button class="btn btn-sm btn-icon" data-action="find" data-id="${quote.id}" data-verified="false" title="Find on page">Find</button>
          <button class="btn btn-sm btn-icon pin-btn" data-action="pin" data-id="${quote.id}" data-verified="false" title="Pin highlight">Pin</button>` : ''}
          <button class="btn btn-sm btn-danger" data-action="removeVerified" data-id="${quote.id}" title="Remove">X</button>
        </div>
      </div>
    `;
    }).join('');
    
    // Add event delegation for verify buttons
    unverifiedQuoteListEl.querySelectorAll('.verify-quote-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        const qid = btn.dataset.quoteId;
        await verifyQuoteFromList(qid);
      });
    });
    
    // Add event delegation for edit buttons
    unverifiedQuoteListEl.querySelectorAll('.edit-quote-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        const qid = btn.dataset.quoteId;
        await editQuoteFromList(qid);
      });
    });
  } else {
    unverifiedDropdown.style.display = 'none';
  }
  
  // Setup quote checkbox listeners (if in review mode)
  if (reviewMode) {
    document.querySelectorAll('.quote-verify-checkbox').forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        const quoteId = e.target.dataset.quoteId;
        verifiedFields[`quote_${quoteId}`] = e.target.checked;
        updateVerificationCounter();
      });
    });
  }
  
  // Update quote association dropdowns with new quotes
  updateQuoteAssociationDropdowns();
  updateAgencyQuoteLinks();
  updateTimelineQuoteSelect();
}

// Toggle unverified quotes dropdown
// Verify a quote from the quotes list
window.verifyQuoteFromList = async function(quoteId) {
  console.log('verifyQuoteFromList called with quoteId:', quoteId, 'reviewIncidentId:', reviewIncidentId, 'contentType:', currentContentType);
  try {
    if (!reviewIncidentId) {
      console.error('No reviewIncidentId set');
      showNotification('No incident loaded', 'error');
      return;
    }
    
    // For statements, just toggle verified state locally (no API call)
    if (currentContentType === 'statement') {
      console.log('Statement mode - toggling verified state locally');
      const quote = [...verifiedQuotes, ...pendingQuotes].find(q => String(q.id) === String(quoteId));
      if (quote) {
        quote.verified = true;
      }
      verifiedFields[`quote_${quoteId}`] = true;
      updateVerificationCounter();
      renderQuotes();
      showNotification('Quote marked as verified', 'success');
      return;
    }
    
    // Check if this is a local quote that needs to be saved first
    if (String(quoteId).startsWith('local-quote-')) {
      console.log('Quote has local ID, saving to database first...');
      const quote = verifiedQuotes.find(q => q.id === quoteId);
      if (!quote) {
        throw new Error('Local quote not found');
      }
      
      console.log('[verifyQuote] Local quote object:', quote);
      console.log('[verifyQuote] source_id:', quote.source_id);
      
      // Save the quote to get a real database ID
      const saveResponse = await fetch(`${apiUrl}/api/incidents/${reviewIncidentId}/quotes`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'X-API-Key': apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: quote.text || quote.quote_text,
          category: quote.category || null,
          source_id: quote.source_id || null
        })
      });
      
      console.log('[verifyQuote] POST body:', {
        text: quote.text || quote.quote_text,
        category: quote.category || null,
        source_id: quote.source_id || null
      });
      
      if (!saveResponse.ok) {
        const errorData = await saveResponse.json();
        throw new Error(errorData.error || 'Failed to save quote');
      }
      
      const saveData = await saveResponse.json();
      const newQuoteId = saveData.id;
      console.log('Quote saved with new ID:', newQuoteId);
      
      // Update the quote in local state with the new ID
      const quoteIndex = verifiedQuotes.findIndex(q => q.id === quoteId);
      if (quoteIndex !== -1) {
        verifiedQuotes[quoteIndex].id = newQuoteId;
      }
      
      // Now verify with the real ID
      quoteId = newQuoteId;
      renderQuotes();
      showNotification('Quote saved', 'success');
    }
    
    console.log('Calling API to verify quote:', quoteId);
    // Call API to verify the quote
    const response = await fetch(`${apiUrl}/api/incidents/${reviewIncidentId}/quotes`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'X-API-Key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        quote_id: parseInt(quoteId),
        verified: true
      })
    });
    
    console.log('API response status:', response.status);
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to verify quote');
    }
    
    console.log('Quote verified successfully');
    // Update local state
    const quote = verifiedQuotes.find(q => q.id === parseInt(quoteId) || q.id === quoteId);
    if (quote) {
      quote.verified = true;
    }
    verifiedFields[`quote_${quoteId}`] = true;
    updateVerificationCounter();
    renderQuotes();
    showNotification('Quote verified', 'success');
  } catch (error) {
    console.error('Error verifying quote:', error);
    showNotification('Failed to verify quote: ' + error.message, 'error');
  }
};

// Edit a quote from the quotes list
window.editQuoteFromList = async function(quoteId) {
  const quote = [...verifiedQuotes, ...pendingQuotes].find(q => String(q.id) === String(quoteId));
  if (!quote) {
    alert('Quote not found');
    return;
  }
  
  // Open modal and populate with current text
  const modal = document.getElementById('editQuoteModal');
  const textArea = document.getElementById('editQuoteText');
  const saveBtn = document.getElementById('saveEditQuote');
  const cancelBtn = document.getElementById('cancelEditQuote');
  const closeBtn = document.getElementById('closeEditQuoteModal');
  
  textArea.value = quote.text || quote.quote || '';
  modal.classList.add('open');
  textArea.focus();
  
  // Store quote ID for save handler
  modal.dataset.quoteId = quoteId;
};

// Handle save quote edit (set up once during initialization)
function setupEditQuoteModal() {
  const modal = document.getElementById('editQuoteModal');
  const saveBtn = document.getElementById('saveEditQuote');
  const cancelBtn = document.getElementById('cancelEditQuote');
  const closeBtn = document.getElementById('closeEditQuoteModal');
  const textArea = document.getElementById('editQuoteText');
  
  const closeModal = () => {
    modal.classList.remove('open');
    textArea.value = '';
    delete modal.dataset.quoteId;
  };
  
  const saveEdit = async () => {
    const quoteId = modal.dataset.quoteId;
    const newText = textArea.value.trim();
    
    console.log('[editQuote] Saving with quoteId:', quoteId, 'newText length:', newText.length, 'currentContentType:', currentContentType);
    
    if (!newText) {
      alert('Quote text cannot be empty');
      return;
    }
    
    // Check if quote has a local ID (not saved to database yet)
    const isLocalQuote = typeof quoteId === 'string' && quoteId.startsWith('local-');
    const isStatementQuote = (currentContentType === 'statement') || (typeof quoteId === 'string' && quoteId.startsWith('stmt-'));
    
    try {
      // For statements, just update locally (no API call)
      if (isStatementQuote) {
        console.log('[editQuote] Statement quote mode - updating locally');
        const allQuotes = [...verifiedQuotes, ...pendingQuotes];
        const idx = allQuotes.findIndex(q => String(q.id) === String(quoteId));
        console.log('[editQuote] Found quote at index:', idx, 'in array of', allQuotes.length, 'quotes');
        if (idx !== -1) {
          allQuotes[idx].text = newText;
          allQuotes[idx].quote = newText;
          console.log('[editQuote] Updated quote text');
        } else {
          console.warn('[editQuote] Quote not found in arrays');
        }
        renderQuotes();
        updateQuoteAssociationDropdowns();
        closeModal();
        showNotification('Quote updated successfully', 'success');
        return;
      }
      
      // If it's a database quote, update via API
      if (!isLocalQuote) {
        console.log('[editQuote] Attempting numeric conversion for quoteId:', quoteId);
        const numericQuoteId = parseInt(quoteId);
        console.log('[editQuote] Numeric result:', numericQuoteId, 'isNaN:', isNaN(numericQuoteId));
        if (isNaN(numericQuoteId)) {
          console.error('[editQuote] Invalid quote ID:', quoteId);
          alert('Invalid quote ID');
          closeModal();
          return;
        }
        
        if (!reviewIncidentId) {
          alert('No incident loaded');
          return;
        }
        
        const response = await fetch(`${apiUrl}/api/incidents/${reviewIncidentId}/quotes`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'X-API-Key': apiKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            quote_id: numericQuoteId,
            text: newText
          })
        });
      
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to update quote');
        }
      }
      
      // Update local state (works for both local and database quotes)
      const idx = verifiedQuotes.findIndex(q => String(q.id) === String(quoteId));
      if (idx !== -1) {
        verifiedQuotes[idx].text = newText;
        verifiedQuotes[idx].quote = newText;
      }
      
      renderQuotes();
      updateQuoteAssociationDropdowns();
      closeModal();
      showNotification('Quote updated successfully', 'success');
    } catch (error) {
      console.error('Error updating quote:', error);
      showNotification('Failed to update quote: ' + error.message, 'error');
    }
  };
  
  saveBtn.addEventListener('click', saveEdit);
  cancelBtn.addEventListener('click', closeModal);
  closeBtn.addEventListener('click', closeModal);
  
  // Close on escape key
  modal.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });
  
  // Save on Ctrl+Enter
  textArea.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'Enter') {
      e.preventDefault();
      saveEdit();
    }
  });
}

// Filter cases list by search term
function filterCasesList() {
  const searchInput = document.getElementById('casesSearchInput');
  if (!searchInput) return;
  
  const searchTerm = searchInput.value.toLowerCase();
  const caseCards = document.querySelectorAll('#reviewQueueList .queue-item');
  
  caseCards.forEach(card => {
    const text = card.textContent.toLowerCase();
    if (text.includes(searchTerm)) {
      card.style.display = '';
    } else {
      card.style.display = 'none';
    }
  });
}

// Render timeline entries with verification checkboxes
function renderTimeline() {
  if (!elements.timelineList || !elements.timelineCount) return;
  const entries = reviewTimeline || [];
  elements.timelineCount.textContent = entries.length;
  
  if (entries.length === 0) {
    elements.timelineList.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon"></div>
        <p>No timeline entries</p>
      </div>
    `;
    return;
  }
  
  elements.timelineList.innerHTML = entries
    .sort((a, b) => (a.sequence_order || 0) - (b.sequence_order || 0))
    .map(entry => {
      const key = `timeline_${entry.id}`;
      const dateText = entry.date || entry.event_date || '';
      const desc = entry.description || '';
      const checked = verifiedFields[key] ? 'checked' : '';
      return `
        <div class="timeline-card" data-timeline-id="${entry.id}">
          ${reviewMode ? `<input type="checkbox" class="timeline-verify-checkbox" data-timeline-id="${entry.id}" ${checked} title="Verify this timeline entry">` : ''}
          <div class="timeline-body">
            <div class="timeline-date">${dateText || 'No date'}</div>
            <div class="timeline-desc">${escapeHtml(desc)}</div>
          </div>
        </div>
      `;
    }).join('');
  
  if (reviewMode) {
    elements.timelineList.querySelectorAll('.timeline-verify-checkbox').forEach(cb => {
      cb.addEventListener('change', (e) => {
        const tid = e.target.dataset.timelineId;
        verifiedFields[`timeline_${tid}`] = e.target.checked;
        updateVerificationCounter();
      });
    });
  }
}

// Normalize option value for a source (prefers DB id when available)
function sourceOptionValue(source) {
  if (!source) return '';
  return source.id ? `id:${source.id}` : `url:${source.url || ''}`;
}

// Keep quote source dropdown in sync with sources list
function updateReviewQuoteSourceSelect() {
  if (!elements.reviewQuoteSourceSelect) return;
  const sel = elements.reviewQuoteSourceSelect;
  sel.innerHTML = '';
  if (!sources || sources.length === 0) {
    sel.innerHTML = '<option value="">No sources available - add one first</option>';
    sel.disabled = true;
    return;
  }
  sel.disabled = false;
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = 'Select source (required)';
  sel.appendChild(placeholder);
  sources.forEach(src => {
    const opt = document.createElement('option');
    opt.value = sourceOptionValue(src);
    const label = src.title || src.url || 'Untitled source';
    opt.textContent = label.length > 80 ? `${label.substring(0, 80)}…` : label;
    sel.appendChild(opt);
  });
}

// Update manual quote source selector
function updateManualQuoteSourceSelect() {
  if (!elements.manualQuoteSource) return;
  const sel = elements.manualQuoteSource;
  sel.innerHTML = '';
  if (!sources || sources.length === 0) {
    sel.innerHTML = '<option value="">No sources available - add one first</option>';
    sel.disabled = true;
  } else {
    sel.disabled = false;
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = '-- Select a source --';
    sel.appendChild(placeholder);
    sources.forEach(src => {
      const opt = document.createElement('option');
      opt.value = src.id || src.url;
      const label = src.title || src.url || 'Untitled source';
      opt.textContent = label.length > 80 ? `${label.substring(0, 80)}…` : label;
      sel.appendChild(opt);
    });
  }
  
  // Also update statement manual quote source selector
  if (elements.statementManualQuoteSource) {
    const statementSel = elements.statementManualQuoteSource;
    statementSel.innerHTML = '';
    if (!sources || sources.length === 0) {
      statementSel.innerHTML = '<option value="">No sources available - add one first</option>';
      statementSel.disabled = true;
    } else {
      statementSel.disabled = false;
      const placeholder = document.createElement('option');
      placeholder.value = '';
      placeholder.textContent = '-- Select a source --';
      statementSel.appendChild(placeholder);
      sources.forEach(src => {
        const opt = document.createElement('option');
        // Use ID if it exists, otherwise URL
        opt.value = src.id || src.url;
        // Show title with hostname for clarity
        let label = src.title || 'Untitled source';
        if (src.url) {
          try {
            const hostname = new URL(src.url).hostname;
            label = `${label} (${hostname})`;
          } catch (e) {}
        }
        opt.textContent = label.length > 100 ? `${label.substring(0, 100)}…` : label;
        statementSel.appendChild(opt);
      });
    }
  }
}

// Update timeline quote selector options
function updateTimelineQuoteSelect() {
  if (!elements.reviewTimelineQuoteSelect) return;
  const sel = elements.reviewTimelineQuoteSelect;
  const current = sel.value;
  sel.innerHTML = '<option value="">Link quote (optional)</option>';
  verifiedQuotes.forEach(q => {
    const opt = document.createElement('option');
    opt.value = q.id;
    opt.textContent = q.text.length > 80 ? q.text.substring(0, 80) + '…' : q.text;
    sel.appendChild(opt);
  });
  if (current) {
    const found = Array.from(sel.options).some(o => o.value === current);
    sel.value = found ? current : '';
  }
}

// Add quote in review mode (local to this session, then included in verification checks)
function addReviewQuote(e) {
  e?.preventDefault?.();
  if (!reviewMode) {
    alert('Load a review case before adding quotes.');
    return;
  }
  const text = elements.reviewQuoteText?.value?.trim() || '';
  if (!text) {
    alert('Please enter quote text');
    return;
  }
  if (!sources || sources.length === 0) {
    alert('Add at least one source before adding quotes.');
    return;
  }
  const sourceKey = elements.reviewQuoteSourceSelect?.value || '';
  console.log('[addReviewQuote] sourceKey:', sourceKey);
  console.log('[addReviewQuote] sources:', sources);
  
  if (!sourceKey) {
    alert('Select a source to link this quote.');
    return;
  }
  const source = sources.find(s => sourceOptionValue(s) === sourceKey);
  console.log('[addReviewQuote] Found source:', source);
  
  if (!source) {
    alert('Selected source could not be found.');
    return;
  }
  const id = `local-quote-${Date.now()}`;
  const quote = {
    id,
    text,
    source_id: source.id || null,
    sourceUrl: source.url || '',
    sourceTitle: source.title || '',
    category: 'context',
    page_number: null,
    paragraph_number: null,
    confidence: null,
    verified: false,
    verified_by: null
  };
  console.log('[addReviewQuote] Created quote:', quote);
  
  verifiedQuotes.push(quote);
  verifiedFields[`quote_${id}`] = false;
  renderQuotes();
  updateVerificationCounter();
  if (elements.reviewQuoteText) elements.reviewQuoteText.value = '';
  if (elements.reviewQuoteSourceSelect) elements.reviewQuoteSourceSelect.value = '';
}

// Add timeline entry in review mode (local, included in verification checks)
function addReviewTimelineEntry(e) {
  e?.preventDefault?.();
  if (!reviewMode) {
    alert('Load a review case before adding timeline entries.');
    return;
  }
  const date = elements.reviewTimelineDate?.value || '';
  const desc = elements.reviewTimelineDesc?.value?.trim() || '';
  const quoteId = elements.reviewTimelineQuoteSelect?.value || '';
  if (!desc) {
    alert('Please enter a description');
    return;
  }
  const id = `local-timeline-${Date.now()}`;
  const entry = {
    id,
    date: date || null,
    description: desc,
    quote_id: quoteId || null,
    sequence_order: (reviewTimeline?.length || 0) + 1
  };
  reviewTimeline.push(entry);
  verifiedFields[`timeline_${id}`] = false;
  renderTimeline();
  updateVerificationCounter();
  if (elements.reviewTimelineDate) elements.reviewTimelineDate.value = '';
  if (elements.reviewTimelineDesc) elements.reviewTimelineDesc.value = '';
  if (elements.reviewTimelineQuoteSelect) elements.reviewTimelineQuoteSelect.value = '';
}

// Render pending quotes list
function renderPendingQuotes() {
  console.log('[renderPendingQuotes] Called, currentContentType:', currentContentType);
  
  elements.pendingCount.textContent = pendingQuotes.length;
  
  // Show/hide bulk actions
  elements.bulkActions.classList.toggle('hidden', pendingQuotes.length === 0);
  
  if (pendingQuotes.length === 0) {
    elements.pendingList.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon"></div>
        <p>No pending quotes</p>
        <p style="font-size: 11px; margin-top: 4px;">
          Click "Extract Article Content" to find quotes
        </p>
      </div>
    `;
    return;
  }
  
  elements.pendingList.innerHTML = pendingQuotes.map(quote => `
    <div class="quote-card pending" data-id="${quote.id}">
      <div class="quote-text ${quote.text.length > 200 ? 'truncated' : ''}">"${escapeHtml(quote.text)}"</div>
      <div class="quote-meta">
        ${quote.confidence ? `<span class="quote-confidence">${Math.round(quote.confidence * 100)}%</span>` : ''}
        ${quote.pageNumber ? `<span class="quote-page" data-action="goToPage" data-page="${quote.pageNumber}" title="Go to page">Page ${quote.pageNumber}</span>` : ''}
      </div>
      ${quote.sourceUrl ? `<div class="quote-source"><a href="${escapeHtml(quote.sourceUrl)}" target="_blank" class="source-link" title="${escapeHtml(quote.sourceUrl)}">${escapeHtml(quote.sourceTitle || new URL(quote.sourceUrl).hostname)}</a></div>` : ''}
      <div class="quote-actions">
        <button class="btn btn-sm btn-success" data-action="accept" data-id="${quote.id}" title="Accept">Accept</button>
        <button class="btn btn-sm btn-danger" data-action="reject" data-id="${quote.id}" title="Reject">X</button>
        <button class="btn btn-sm btn-icon" data-action="copy" data-id="${quote.id}" data-verified="false" title="Copy">Copy</button>
        ${!currentPageIsPdf ? `<button class="btn btn-sm btn-icon" data-action="find" data-id="${quote.id}" data-verified="false" title="Find & scroll to on page">Find</button>
        <button class="btn btn-sm btn-icon pin-btn" data-action="pin" data-id="${quote.id}" data-verified="false" title="Pin highlight on page">Pin</button>` : ''}
      </div>
    </div>
  `).join('');
}

// Escape HTML for safe rendering
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Extract article from current page
async function extractArticle() {
  if (isExtracting) return;
  
  isExtracting = true;
  elements.extractBtn.disabled = true;
  elements.extractBtn.innerHTML = '<div class="spinner white"></div> Extracting...';
  elements.extractProgress.classList.remove('hidden');
  elements.progressFill.style.width = '10%';
  elements.progressText.textContent = 'Extracting content...';
  
  // Get current domain from page info
  const domainText = elements.pageInfo.textContent || '';
  const domain = domainText.replace(' (PDF)', '');
  
  let selectors = DEFAULT_SELECTORS['*'];
  
  for (const key of Object.keys(DEFAULT_SELECTORS)) {
    if (key !== '*' && domain.includes(key)) {
      selectors = DEFAULT_SELECTORS[key];
      break;
    }
  }
  
  if (currentSelectors[domain]) {
    selectors = { ...selectors, ...currentSelectors[domain] };
  }
  
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, { 
      type: 'EXTRACT_ARTICLE',
      selectors: selectors
    }, async (response) => {
      if (response && response.error) {
        elements.progressText.textContent = `Error: ${response.error}`;
        setTimeout(() => {
          elements.extractProgress.classList.add('hidden');
        }, 3000);
        isExtracting = false;
        elements.extractBtn.disabled = false;
        elements.extractBtn.textContent = response.isPdf ? 'Extract PDF Content' : 'Extract Article Content';
        return;
      }
      
      if (response && response.isPdf) {
        // PDF extraction
        elements.progressText.textContent = 'Extracting PDF content...';
        elements.progressFill.style.width = '20%';
        
        if (response.sentences && response.sentences.length > 0) {
          elements.progressFill.style.width = '30%';
          elements.progressText.textContent = `Found ${response.sentences.length} sentences from PDF. Classifying...`;
          
          // Add current page as source (PDF)
          addSourceFromResponse(tabs[0], {
            headline: response.title || tabs[0].title,
            isPdf: true
          });
          
          // Pass PDF sentences with page numbers and source URL
          await classifySentences(response.sentences, true, tabs[0].url, response.title || tabs[0].title);
        } else {
          elements.progressText.textContent = 'No text extracted from PDF.';
          setTimeout(() => {
            elements.extractProgress.classList.add('hidden');
          }, 2000);
        }
      } else if (response && response.sentences && response.sentences.length > 0) {
        // Regular article extraction
        elements.progressFill.style.width = '30%';
        elements.progressText.textContent = `Found ${response.sentences.length} sentences. Classifying...`;
        
        // Add current page as source
        addSourceFromResponse(tabs[0], response);
        
        // Classify sentences (no page numbers for articles) with source URL
        await classifySentences(response.sentences, false, tabs[0].url, response.headline || tabs[0].title);
      } else {
        elements.progressText.textContent = 'No content found. Try adjusting selectors.';
        setTimeout(() => {
          elements.extractProgress.classList.add('hidden');
        }, 2000);
      }
      
      isExtracting = false;
      elements.extractBtn.disabled = false;
      elements.extractBtn.textContent = 'Extract Article Content';
    });
  });
}

// Add source from extraction response
function addSourceFromResponse(tab, response) {
  const existing = sources.find(s => s.url === tab.url);
  if (!existing) {
    sources.push({
      id: `local-source-${Date.now()}`,
      url: tab.url,
      title: response.headline || tab.title,
      date: response.date || '',
      author: response.author || '',
      addedAt: new Date().toISOString()
    });
    renderSources();
  }
}

// Classify sentences using API
async function classifySentences(sentences, isPdf = false, sourceUrl = '', sourceTitle = '') {
  try {
    // Handle array of objects (PDF with page numbers) or array of strings
    const sentenceTexts = isPdf ? sentences.map(s => s.text || s) : sentences;
    const total = sentenceTexts.length;
    let processed = 0;
    
    // Process in batches of 5
    const batchSize = 5;
    const results = [];
    
    for (let i = 0; i < sentenceTexts.length; i += batchSize) {
      const batch = sentenceTexts.slice(i, i + batchSize);
      const originalBatch = sentences.slice(i, i + batchSize);
      
      const response = await fetch(`${apiUrl}/api/extension/classify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ sentences: batch })
      });
      
      if (response.ok) {
        const data = await response.json();
        // Merge page numbers from original sentences
        const classifiedWithPages = data.classifications.map((c, idx) => ({
          ...c,
          pageNumber: isPdf && originalBatch[idx] ? originalBatch[idx].pageNumber : undefined
        }));
        results.push(...classifiedWithPages);
      } else {
        // Fallback: add as uncategorized
        results.push(...batch.map((s, idx) => ({
          text: s,
          category: 'context',
          confidence: 0.5,
          pageNumber: isPdf && originalBatch[idx] ? originalBatch[idx].pageNumber : undefined
        })));
      }
      
      processed += batch.length;
      const progress = 30 + (processed / total) * 60;
      elements.progressFill.style.width = `${progress}%`;
      elements.progressText.textContent = `Classified ${processed}/${total} sentences...`;
    }
    
    // Filter and add to pending
    const relevant = results.filter(r => r.category !== 'irrelevant' && r.confidence > 0.3);
    
    relevant.forEach(r => {
      pendingQuotes.push({
        id: crypto.randomUUID(),
        text: r.text,
        category: r.category,
        confidence: r.confidence,
        pageNumber: r.pageNumber,
        sourceUrl: sourceUrl,
        sourceTitle: sourceTitle,
        status: 'pending',
        createdAt: new Date().toISOString()
      });
    });
    
    elements.progressFill.style.width = '100%';
    elements.progressText.textContent = `Found ${relevant.length} relevant quotes!`;
    
    renderPendingQuotes();
    syncQuotesToBackground();
    
    setTimeout(() => {
      elements.extractProgress.classList.add('hidden');
    }, 2000);
    
  } catch (error) {
    console.error('Classification error:', error);
    elements.progressText.textContent = 'Classification failed. Using fallback.';
    
    // Add all sentences as uncategorized
    const sentenceTexts = Array.isArray(sentences) && sentences[0]?.text ? sentences : sentences.map(s => ({ text: s }));
    sentenceTexts.forEach(s => {
      const text = s.text || s;
      if (text.length > 30) {
        pendingQuotes.push({
          id: crypto.randomUUID(),
          text: text,
          category: 'context',
          confidence: 0.5,
          pageNumber: s.pageNumber,
          sourceUrl: sourceUrl,
          sourceTitle: sourceTitle,
          status: 'pending',
          createdAt: new Date().toISOString()
        });
      }
    });
    
    renderPendingQuotes();
    syncQuotesToBackground();
    
    setTimeout(() => {
      elements.extractProgress.classList.add('hidden');
    }, 2000);
  }
}

// Sync quotes to background script and notify overlay
function syncQuotesToBackground() {
  // Sync all state to background
  chrome.runtime.sendMessage({ 
    type: 'SYNC_STATE', 
    pendingQuotes: pendingQuotes,
    verifiedQuotes: verifiedQuotes,
    sources: sources,
    currentCase: currentCase
  });
  
  // Notify overlay to refresh if it's open
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, { type: 'REFRESH_OVERLAY' }).catch(() => {});
    }
  });
}

// Accept a pending quote
window.acceptQuote = function(quoteId) {
  const idx = pendingQuotes.findIndex(q => String(q.id) === String(quoteId));
  if (idx !== -1) {
    const quote = pendingQuotes.splice(idx, 1)[0];
    quote.status = 'verified';
    verifiedQuotes.push(quote);
    renderQuotes();
    renderPendingQuotes();
    syncQuotesToBackground();
  }
};

// Reject a pending quote
window.rejectQuote = function(quoteId) {
  pendingQuotes = pendingQuotes.filter(q => String(q.id) !== String(quoteId));
  renderPendingQuotes();
  syncQuotesToBackground();
};

// Remove a verified quote
window.removeVerifiedQuote = async function(quoteId) {
  console.log('[removeVerifiedQuote] Called with quoteId:', quoteId);
  console.log('[removeVerifiedQuote] reviewIncidentId:', reviewIncidentId);
  
  let quote = verifiedQuotes.find(q => String(q.id) === String(quoteId));
  if (!quote) {
    // Also search in pendingQuotes for statements
    quote = pendingQuotes.find(q => String(q.id) === String(quoteId));
  }
  
  if (!quote) {
    console.error('[removeVerifiedQuote] Quote not found:', quoteId, 'verifiedQuotes:', verifiedQuotes.length, 'pendingQuotes:', pendingQuotes.length);
    console.error('[removeVerifiedQuote] Verified quote IDs:', verifiedQuotes.map(q => q.id));
    console.error('[removeVerifiedQuote] Pending quote IDs:', pendingQuotes.map(q => q.id));
    return;
  }
  
  console.log('[removeVerifiedQuote] Quote to delete:', quote);
  
  if (!confirm('Delete this quote?')) {
    console.log('[removeVerifiedQuote] User cancelled');
    return;
  }
  
  // If in review mode and quote has a database ID, delete from database
  if (reviewIncidentId && quote.id && typeof quote.id === 'number' && quote.id > 0) {
    console.log('[removeVerifiedQuote] Deleting from database, quote.id:', quote.id);
    try {
      const response = await fetch(`${apiUrl}/api/incidents/${reviewIncidentId}/quotes`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'X-API-Key': apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ quote_id: quote.id })
      });
      
      console.log('[removeVerifiedQuote] API response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('[removeVerifiedQuote] API error:', errorData);
        throw new Error(errorData.error || 'Failed to delete quote');
      }
      
      showNotification('Quote deleted from database', 'success');
    } catch (error) {
      console.error('[removeVerifiedQuote] Error deleting from database:', error);
      showNotification('Failed to delete quote: ' + error.message, 'error');
      return;
    }
  }
  
  // Remove from local state
  console.log('[removeVerifiedQuote] Removing from local state');
  verifiedQuotes = verifiedQuotes.filter(q => String(q.id) !== String(quoteId));
  pendingQuotes = pendingQuotes.filter(q => String(q.id) !== String(quoteId));
  renderQuotes();
  syncQuotesToBackground();
};

// Accept all pending quotes
function acceptAllPending() {
  pendingQuotes.forEach(q => {
    q.status = 'verified';
    verifiedQuotes.push(q);
  });
  pendingQuotes = [];
  renderQuotes();
  renderPendingQuotes();
  syncQuotesToBackground();
}

// Reject all pending quotes
function rejectAllPending() {
  if (confirm('Clear all pending quotes?')) {
    pendingQuotes = [];
    renderPendingQuotes();
    syncQuotesToBackground();
  }
}

// Copy quote text
window.copyQuote = function(quoteId, isVerified) {
  const list = isVerified ? verifiedQuotes : pendingQuotes;
  const quote = list.find(q => String(q.id) === String(quoteId));
  if (quote) {
    navigator.clipboard.writeText(quote.text);
    showNotification('Quote copied!', 'success');
  }
};

// Copy legal text to clipboard (global for onclick)
window.copyLegalText = copyLegalText;

// Use legal framework from reference (global for onclick)
window.useLegalFramework = useLegalFramework;

// Highlight quote on page (basic - clears previous)
window.highlightQuote = function(quoteId, isVerified) {
  const list = isVerified ? verifiedQuotes : pendingQuotes;
  const quote = list.find(q => String(q.id) === String(quoteId));
  if (quote) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { 
        type: 'HIGHLIGHT_TEXT', 
        text: quote.text,
        category: quote.category || ''
      });
    });
  }
};

// Highlight and scroll to quote with visual feedback
window.highlightAndScroll = function(quoteId, isVerified) {
  const list = isVerified ? verifiedQuotes : pendingQuotes;
  const quote = list.find(q => String(q.id) === String(quoteId));
  if (quote) {
    // Flash the quote card to show it was activated
    const card = document.querySelector(`[data-id="${quoteId}"]`);
    if (card) {
      card.classList.add('highlight-flash');
      setTimeout(() => card.classList.remove('highlight-flash'), 300);
    }
    
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      const isPdf = tab.url && (tab.url.toLowerCase().endsWith('.pdf') || tab.url.includes('/file'));
      
      if (isPdf) {
        // For PDFs: copy to clipboard and show hint
        const searchText = quote.text.substring(0, 100);
        navigator.clipboard.writeText(searchText).then(() => {
          showNotification('Copied! Press Ctrl+F to search in PDF', 'success');
        });
        return;
      }
      
      chrome.tabs.sendMessage(tab.id, { 
        type: 'HIGHLIGHT_AND_SCROLL', 
        text: quote.text,
        category: quote.category || '',
        flash: true
      }, (response) => {
        if (chrome.runtime.lastError) {
          // Fallback for PDFs or pages without content script
          const searchText = quote.text.substring(0, 100);
          navigator.clipboard.writeText(searchText).then(() => {
            showNotification('Copied! Press Ctrl+F to search', 'success');
          });
          return;
        }
        if (response && response.found) {
          showNotification('Found on page!', 'success');
        } else {
          // Copy text as fallback
          const searchText = quote.text.substring(0, 100);
          navigator.clipboard.writeText(searchText).then(() => {
            showNotification('Text copied - use Ctrl+F to find', 'info');
          });
        }
      });
    });
  }
};

// Track pinned highlights
let pinnedHighlights = new Set();

// Toggle pinned highlight (stays visible until manually cleared)
window.togglePinHighlight = function(quoteId, isVerified) {
  const list = isVerified ? verifiedQuotes : pendingQuotes;
  const quote = list.find(q => String(q.id) === String(quoteId));
  if (!quote) return;
  
  const btn = document.querySelector(`[data-id="${quoteId}"] .pin-btn`);
  
  if (pinnedHighlights.has(quoteId)) {
    // Unpin - remove this specific highlight
    pinnedHighlights.delete(quoteId);
    if (btn) btn.classList.remove('active');
    
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { 
        type: 'REMOVE_HIGHLIGHT_BY_TEXT', 
        text: quote.text
      });
    });
    showNotification('Highlight unpinned', 'info');
  } else {
    // Pin - add persistent highlight
    pinnedHighlights.add(quoteId);
    if (btn) btn.classList.add('active');
    
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { 
        type: 'PIN_HIGHLIGHT', 
        text: quote.text,
        category: quote.category || '',
        quoteId: quoteId
      }, (response) => {
        if (response && response.found) {
          showNotification('Highlight pinned!', 'success');
        } else {
          showNotification('Text not found on this page', 'error');
          pinnedHighlights.delete(quoteId);
          if (btn) btn.classList.remove('active');
        }
      });
    });
  }
};

// Add manual quote
function addManualQuote() {
  const text = elements.manualQuoteText.value.trim();
  const sourceId = elements.manualQuoteSource.value;
  const category = elements.manualQuoteCategory.value;
  
  if (!text) {
    alert('Please enter quote text');
    return;
  }
  
  if (!sourceId) {
    alert('Please select a source for this quote');
    return;
  }
  
  console.log('[addManualQuote] sourceId selected:', sourceId);
  console.log('[addManualQuote] Available sources:', sources);
  
  // Find the source object to get URL and title
  const source = sources.find(s => String(s.id) === String(sourceId));
  
  console.log('[addManualQuote] Found source:', source);
  
  const quote = {
    id: `local-quote-${Date.now()}`,
    text: text,
    quote_text: text,
    category: category,
    source_id: source ? (typeof source.id === 'number' ? source.id : parseInt(sourceId)) : null,
    source: source ? source.url : null,
    sourceUrl: source ? source.url : null,
    source_title: source ? source.title : null,
    sourceTitle: source ? source.title : null,
    confidence: 1.0,
    status: 'verified',
    verified: false,
    createdAt: new Date().toISOString()
  };
  
  console.log('[addManualQuote] Created quote object:', quote);
  
  verifiedQuotes.push(quote);
  renderQuotes();
  syncQuotesToBackground();
  
  // Clear form
  elements.manualQuoteText.value = '';
  elements.manualQuoteSource.value = '';
  elements.manualAddHeader.classList.remove('open');
  elements.manualAddContent.classList.remove('open');
}

// Add manual quote for statements
function addStatementManualQuote() {
  const text = elements.statementManualQuoteText?.value?.trim();
  const sourceId = elements.statementManualQuoteSource?.value;
  const category = elements.statementManualQuoteCategory?.value || 'speaker_quote';
  
  if (!text) {
    alert('Please enter quote text');
    return;
  }
  
  if (!sourceId) {
    alert('Please select a source for this quote');
    return;
  }
  
  console.log('[addStatementManualQuote] sourceId selected:', sourceId);
  console.log('[addStatementManualQuote] Available sources:', sources);
  
  // Find the source object to get URL and title (match by ID or URL)
  const source = sources.find(s => String(s.id) === String(sourceId) || s.url === sourceId);
  
  console.log('[addStatementManualQuote] Found source:', source);
  
  const quote = {
    id: `local-quote-${Date.now()}`,
    text: text,
    quote_text: text,
    category: category,
    source_id: source ? source.id : null,
    source: source ? source.url : null,
    sourceUrl: source ? source.url : null,
    source_title: source ? source.title : null,
    sourceTitle: source ? source.title : null,
    confidence: 1.0,
    status: 'verified',
    verified: false,
    createdAt: new Date().toISOString()
  };
  
  console.log('[addStatementManualQuote] Created quote object:', quote);
  
  verifiedQuotes.push(quote);
  renderQuotes();
  syncQuotesToBackground();
  
  // Clear form
  if (elements.statementManualQuoteText) elements.statementManualQuoteText.value = '';
  if (elements.statementManualQuoteSource) elements.statementManualQuoteSource.value = '';
  if (elements.statementManualAddHeader) elements.statementManualAddHeader.classList.remove('open');
  if (elements.statementManualAddContent) elements.statementManualAddContent.classList.remove('open');
}

// Render sources list
function renderSources() {
  elements.sourceCount.textContent = sources.length;
  
  // Also update statement source count
  const statementSourceCount = document.getElementById('statementSourceCount');
  if (statementSourceCount) {
    statementSourceCount.textContent = sources.length;
  }
  
  if (sources.length === 0) {
    elements.sourceList.innerHTML = '';
    // Clear statement source list too
    const statementSourceList = document.getElementById('statementSourceList');
    if (statementSourceList) {
      statementSourceList.innerHTML = '';
    }
    updateReviewQuoteSourceSelect();
    return;
  }
  
  // Generate source HTML
  const sourceHtml = sources.map((source, index) => {
    const priorityColor = source.priority === 'primary' ? '#10b981' : source.priority === 'tertiary' ? '#9ca3af' : '#3b82f6';
    const checked = verifiedFields[`source_${source.id}`] ? 'checked' : '';
    
    // If URL is empty (manual entry mode) or user is editing, show input fields
    if (!source.url || source.url === '' || source._isEditing) {
      return `
        <div class="source-item" style="display: flex; flex-direction: column; gap: 8px; padding: 8px; border: 1px solid #e0e0e0; border-radius: 4px; margin-bottom: 4px; background: #f9fafb;">
          <input 
            type="url" 
            data-source-index="${index}" 
            data-field="url"
            placeholder="https://example.com/article" 
            value="${escapeHtml(source.url || '')}"
            style="width: 100%; padding: 6px; font-size: 11px; border: 1px solid #ccc; border-radius: 3px; font-family: monospace;"
          />
          <div style="display: flex; gap: 4px;">
            <input 
              type="text" 
              data-source-index="${index}" 
              data-field="title"
              placeholder="Source title" 
              value="${escapeHtml(source.title || '')}"
              style="flex: 1; padding: 6px; font-size: 11px; border: 1px solid #ccc; border-radius: 3px;"
            />
            <select data-source-priority="${index}" style="padding: 2px 4px; font-size: 11px; border: 1px solid #ccc; border-radius: 3px; background: ${priorityColor}; color: white;">
              <option value="primary" ${source.priority === 'primary' ? 'selected' : ''}>Primary</option>
              <option value="secondary" ${source.priority === 'secondary' || !source.priority ? 'selected' : ''}>Secondary</option>
              <option value="tertiary" ${source.priority === 'tertiary' ? 'selected' : ''}>Tertiary</option>
            </select>
            <button class="btn btn-sm btn-success source-save-btn" data-source-index="${index}" title="${source._isEditing ? 'Done editing' : 'Save source'}" style="padding: 4px 10px;">✓</button>
            <button class="btn btn-sm btn-danger source-delete-btn" data-source-index="${index}" title="Delete source">✕</button>
          </div>
        </div>
      `;
    }
    
    // Normal display mode with link
    return `
    <div class="source-item" style="display: flex; align-items: center; gap: 8px; padding: 8px; border: 1px solid #e0e0e0; border-radius: 4px; margin-bottom: 4px;">
      ${reviewMode ? `<input type="checkbox" class="source-verify-checkbox" data-source-index="${index}" ${verifiedFields[`source_${index}`] ? 'checked' : ''} title="Verify this source">` : ''}
      <a href="${escapeHtml(source.url)}" target="_blank" title="${escapeHtml(source.title || '')}" style="flex: 1; color: #2563eb; text-decoration: none; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
        ${escapeHtml(truncate(source.title || source.url, 30))}
      </a>
      <select data-source-priority="${index}" style="padding: 2px 4px; font-size: 11px; border: 1px solid #ccc; border-radius: 3px; background: ${priorityColor}; color: white;">
        <option value="primary" ${source.priority === 'primary' ? 'selected' : ''}>Primary</option>
        <option value="secondary" ${source.priority === 'secondary' || !source.priority ? 'selected' : ''}>Secondary</option>
        <option value="tertiary" ${source.priority === 'tertiary' ? 'selected' : ''}>Tertiary</option>
      </select>
      <button class="btn btn-sm btn-icon source-edit-btn" data-source-index="${index}" title="Edit source" style="font-size: 11px; padding: 4px 10px;">Edit</button>
      <button class="btn btn-sm btn-danger source-delete-btn" data-source-index="${index}" title="Delete source and all associated quotes">✕</button>
    </div>
  `;
  }).join('');
  
  // Render to incident source list
  elements.sourceList.innerHTML = sourceHtml;
  
  // Add event listeners for delete buttons
  elements.sourceList.querySelectorAll('.source-delete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const index = parseInt(e.target.dataset.sourceIndex);
      window.deleteSource(index);
    });
  });
  
  // Add event listeners for save/done buttons
  elements.sourceList.querySelectorAll('.source-save-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const index = parseInt(e.target.dataset.sourceIndex);
      window.editSource(index);
    });
  });
  
  // Add event listeners for edit buttons
  elements.sourceList.querySelectorAll('.source-edit-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const index = parseInt(e.target.dataset.sourceIndex);
      window.editSource(index);
    });
  });
  
  // Add event listeners for priority selects
  elements.sourceList.querySelectorAll('select[data-source-priority]').forEach(select => {
    select.addEventListener('change', (e) => {
      const index = parseInt(e.target.dataset.sourcePriority);
      updateSourcePriority(index, e.target.value);
    });
  });
  
  // Also render to statement source list
  const statementSourceList = document.getElementById('statementSourceList');
  if (statementSourceList) {
    statementSourceList.innerHTML = sourceHtml;
    
    // Add event listeners for statement source list too
    statementSourceList.querySelectorAll('.source-delete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = parseInt(e.target.dataset.sourceIndex);
        window.deleteSource(index);
      });
    });
    
    statementSourceList.querySelectorAll('.source-save-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = parseInt(e.target.dataset.sourceIndex);
        window.editSource(index);
      });
    });
    
    statementSourceList.querySelectorAll('.source-edit-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = parseInt(e.target.dataset.sourceIndex);
        window.editSource(index);
      });
    });
    
    statementSourceList.querySelectorAll('select[data-source-priority]').forEach(select => {
      select.addEventListener('change', (e) => {
        const index = parseInt(e.target.dataset.sourcePriority);
        updateSourcePriority(index, e.target.value);
      });
    });
    
    statementSourceList.querySelectorAll('input[data-source-index]').forEach(input => {
      input.addEventListener('input', (e) => {
        const index = parseInt(e.target.dataset.sourceIndex);
        const field = e.target.dataset.field;
        if (sources[index]) {
          sources[index][field] = e.target.value;
        }
      });
    });
    
    // Add source verification checkbox listeners for statement list
    statementSourceList.querySelectorAll('.source-verify-checkbox').forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        const index = parseInt(e.target.dataset.sourceIndex);
        verifiedFields[`source_${index}`] = e.target.checked;
        updateVerificationCounter();
      });
    });
  }
  
  // Add event listeners for source verification checkboxes in main list
  elements.sourceList.querySelectorAll('.source-verify-checkbox').forEach(checkbox => {
    checkbox.addEventListener('change', (e) => {
      const index = parseInt(e.target.dataset.sourceIndex);
      verifiedFields[`source_${index}`] = e.target.checked;
      updateVerificationCounter();
    });
  });
  
  // Add event listeners for manual entry inputs in main source list
  elements.sourceList.querySelectorAll('input[data-source-index]').forEach(input => {
    input.addEventListener('input', (e) => {
      const index = parseInt(e.target.dataset.sourceIndex);
      const field = e.target.dataset.field;
      if (sources[index]) {
        sources[index][field] = e.target.value;
      }
    });
  });
  
  updateReviewQuoteSourceSelect();
  updateManualQuoteSourceSelect();

  if (reviewMode) {
    elements.sourceList.querySelectorAll('.source-verify-checkbox').forEach(cb => {
      cb.addEventListener('change', (e) => {
        const sid = e.target.dataset.sourceId;
        verifiedFields[`source_${sid}`] = e.target.checked;
        updateVerificationCounter();
      });
    });
  }
}

// Edit source - converts to editable input mode
window.editSource = function(index) {
  const source = sources[index];
  if (!source) {
    console.error('[editSource] No source at index:', index);
    return;
  }
  
  // Mark source as in edit mode by temporarily clearing URL
  // This will make renderSources() show the input field version
  const originalUrl = source.url;
  const originalTitle = source.title;
  const wasEditing = source._isEditing;
  
  // Toggle edit mode
  if (source._isEditing) {
    // Exit edit mode - restore original values if not changed
    delete source._isEditing;
  } else {
    // Enter edit mode
    source._isEditing = true;
    // Keep URL and title so they show in inputs
  }
  
  renderSources();
};

// Delete source and all associated quotes
window.deleteSource = async function(index) {
  console.log('[deleteSource] Called with index:', index);
  console.log('[deleteSource] Current sources:', sources);
  console.log('[deleteSource] reviewIncidentId:', reviewIncidentId);
  
  const source = sources[index];
  if (!source) {
    console.error('[deleteSource] No source at index:', index);
    return;
  }
  
  console.log('[deleteSource] Source to delete:', source);
  
  // Find all quotes from this source
  const quotesFromSource = verifiedQuotes.filter(q => 
    q.source === source.url || q.sourceUrl === source.url
  );
  
  const confirmMsg = quotesFromSource.length > 0 
    ? `Delete this source and ${quotesFromSource.length} associated quote${quotesFromSource.length > 1 ? 's' : ''}?`
    : `Delete this source?`;
  
  if (!confirm(confirmMsg)) {
    console.log('[deleteSource] User cancelled');
    return;
  }
  
  // If in review mode and source has a database ID, delete from database
  if (reviewIncidentId && source.id && typeof source.id === 'number' && source.id > 0) {
    console.log('[deleteSource] Deleting from database, source.id:', source.id);
    try {
      const response = await fetch(`${apiUrl}/api/incidents/${reviewIncidentId}/sources`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'X-API-Key': apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ source_id: source.id })
      });
      
      console.log('[deleteSource] API response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('[deleteSource] API error:', errorData);
        throw new Error(errorData.error || 'Failed to delete source');
      }
      
      showNotification('Source deleted from database', 'success');
    } catch (error) {
      console.error('[deleteSource] Error deleting from database:', error);
      showNotification('Failed to delete source: ' + error.message, 'error');
      return;
    }
  }
  
  // Remove the source from local state
  console.log('[deleteSource] Removing from local state');
  sources.splice(index, 1);
  
  // Remove all quotes from this source
  if (quotesFromSource.length > 0) {
    console.log('[deleteSource] Removing quotes from source:', quotesFromSource.length);
    verifiedQuotes = verifiedQuotes.filter(q => 
      q.source !== source.url && q.sourceUrl !== source.url
    );
    renderQuotes();
  }
  
  console.log('[deleteSource] Re-rendering sources');
  renderSources();
  syncQuotesToBackground();
  console.log('[deleteSource] Complete');
};

// ============================================
// CUSTOM FIELDS MANAGEMENT
// ============================================

// Load custom fields for current incident
async function loadCustomFields() {
  if (!reviewIncidentId && !validateIncidentId) {
    customFields = [];
    renderCustomFields();
    return;
  }
  
  const incidentId = reviewIncidentId || validateIncidentId;
  
  try {
    const response = await fetch(`${apiUrl}/api/incidents/${incidentId}/custom-fields`, {
      headers: apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {}
    });
    
    if (response.ok) {
      const data = await response.json();
      customFields = data.fields || [];
      renderCustomFields();
    } else {
      console.warn('Failed to load custom fields:', response.status);
      customFields = [];
      renderCustomFields();
    }
  } catch (err) {
    console.error('Error loading custom fields:', err);
    customFields = [];
    renderCustomFields();
  }
}

// Render custom fields list
function renderCustomFields() {
  const list = document.getElementById('customFieldsList');
  const count = document.getElementById('customFieldCount');
  
  if (!list) return;
  
  count.textContent = customFields.length;
  
  if (customFields.length === 0) {
    list.innerHTML = `
      <div class="empty-state custom-fields-empty">
        <p>No custom fields yet</p>
        <p style="font-size: 11px; margin-top: 4px;">Add custom fields via right-click menu or the button above</p>
      </div>
    `;
    return;
  }
  
  list.innerHTML = customFields.map(field => `
    <div class="custom-field-item" data-field-id="${field.id}">
      <div class="custom-field-header">
        <span class="custom-field-name">${escapeHtml(field.field_name)}</span>
        <div class="custom-field-actions">
          <button class="custom-field-btn edit" onclick="editCustomField(${field.id})" title="Edit">✎</button>
          <button class="custom-field-btn delete" onclick="deleteCustomField(${field.id})" title="Delete">✕</button>
        </div>
      </div>
      <div class="custom-field-value">${escapeHtml(field.field_value || '')}</div>
      ${field.quote_text ? `
        <div class="custom-field-quotes">
          <div class="custom-field-quote">
            <div class="custom-field-quote-text">"${escapeHtml(field.quote_text)}"</div>
            ${field.quote_source_title ? `<div style="font-size: 10px; color: #888; margin-top: 2px;">— ${escapeHtml(field.quote_source_title)}</div>` : ''}
          </div>
        </div>
      ` : ''}
    </div>
  `).join('');
}

// Open modal to add/edit custom field
function openCustomFieldModal(fieldId = null, quoteText = null, sourceUrl = null, sourceTitle = null) {
  const modal = document.getElementById('customFieldModal');
  const titleEl = document.getElementById('customFieldModalTitle');
  const nameInput = document.getElementById('customFieldName');
  const valueInput = document.getElementById('customFieldValue');
  const quoteGroup = document.getElementById('customFieldQuoteGroup');
  const quoteTextarea = document.getElementById('customFieldQuote');
  
  // Store context for save
  modal.dataset.fieldId = fieldId || '';
  modal.dataset.quoteText = quoteText || '';
  modal.dataset.sourceUrl = sourceUrl || '';
  modal.dataset.sourceTitle = sourceTitle || '';
  
  if (fieldId) {
    // Editing existing field
    const field = customFields.find(f => f.id === fieldId);
    if (field) {
      titleEl.textContent = 'Edit Custom Field';
      nameInput.value = field.field_name;
      valueInput.value = field.field_value || '';
    }
    quoteGroup.style.display = 'none';
  } else {
    // Adding new field
    titleEl.textContent = 'Add Custom Field';
    nameInput.value = '';
    valueInput.value = '';
    
    if (quoteText) {
      quoteGroup.style.display = 'block';
      quoteTextarea.value = quoteText;
    } else {
      quoteGroup.style.display = 'none';
      quoteTextarea.value = '';
    }
  }
  
  modal.classList.add('open');
  nameInput.focus();
}

// Close custom field modal
function closeCustomFieldModal() {
  const modal = document.getElementById('customFieldModal');
  modal.classList.remove('open');
  modal.dataset.fieldId = '';
  modal.dataset.quoteText = '';
  modal.dataset.sourceUrl = '';
  modal.dataset.sourceTitle = '';
}

// Save custom field
async function saveCustomField() {
  const modal = document.getElementById('customFieldModal');
  const nameInput = document.getElementById('customFieldName');
  const valueInput = document.getElementById('customFieldValue');
  
  const fieldName = nameInput.value.trim();
  const fieldValue = valueInput.value.trim();
  const fieldId = modal.dataset.fieldId;
  const quoteText = modal.dataset.quoteText;
  const sourceUrl = modal.dataset.sourceUrl;
  const sourceTitle = modal.dataset.sourceTitle;
  
  if (!fieldName) {
    showNotification('Field name is required', 'error');
    return;
  }
  
  const incidentId = reviewIncidentId || validateIncidentId;
  if (!incidentId) {
    showNotification('No incident loaded', 'error');
    return;
  }
  
  try {
    // For new fields, include quote info if provided
    const body = {
      field_name: fieldName,
      field_value: fieldValue
    };
    
    if (!fieldId && quoteText) {
      body.quote_text = quoteText;
      body.source_url = sourceUrl;
      body.source_title = sourceTitle;
    }
    
    const response = await fetch(`${apiUrl}/api/incidents/${incidentId}/custom-fields`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {})
      },
      body: JSON.stringify(body)
    });
    
    if (response.ok) {
      showNotification('Custom field saved', 'success');
      closeCustomFieldModal();
      await loadCustomFields();
      // Refresh context menu in background
      chrome.runtime.sendMessage({ type: 'REFRESH_CUSTOM_FIELDS' });
    } else {
      const error = await response.json();
      showNotification(error.error || 'Failed to save custom field', 'error');
    }
  } catch (err) {
    console.error('Error saving custom field:', err);
    showNotification('Failed to save custom field', 'error');
  }
}

// Edit custom field
function editCustomField(fieldId) {
  openCustomFieldModal(fieldId);
}

// Delete custom field
async function deleteCustomField(fieldId) {
  if (!confirm('Delete this custom field?')) return;
  
  const incidentId = reviewIncidentId || validateIncidentId;
  if (!incidentId) {
    showNotification('No incident loaded', 'error');
    return;
  }
  
  try {
    const response = await fetch(`${apiUrl}/api/incidents/${incidentId}/custom-fields?fieldId=${fieldId}`, {
      method: 'DELETE',
      headers: apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {}
    });
    
    if (response.ok) {
      showNotification('Custom field deleted', 'success');
      await loadCustomFields();
      // Refresh context menu in background
      chrome.runtime.sendMessage({ type: 'REFRESH_CUSTOM_FIELDS' });
    } else {
      const error = await response.json();
      showNotification(error.error || 'Failed to delete custom field', 'error');
    }
  } catch (err) {
    console.error('Error deleting custom field:', err);
    showNotification('Failed to delete custom field', 'error');
  }
}

// ============================================
// ============================================
// TAG MANAGEMENT
// ============================================

// Add a tag to the current case
function addTag(tag) {
  if (!tag || currentCase.tags.includes(tag)) return;
  currentCase.tags.push(tag);
  currentCase.tags.sort();
  renderTags();
}

// Remove a tag from the current case
function removeTag(tag) {
  currentCase.tags = currentCase.tags.filter(t => t !== tag);
  renderTags();
}

// Make removeTag globally accessible for onclick handlers
window.removeTag = removeTag;

// Render the tags display
function renderTags() {
  const container = elements.currentTags;
  console.log('renderTags called - container:', container, 'tags:', currentCase.tags);
  if (!container) {
    console.warn('Tags container not found');
    return;
  }
  
  if (!currentCase.tags || currentCase.tags.length === 0) {
    container.innerHTML = '<span style="color: #9ca3af; font-size: 11px;">No tags added</span>';
    return;
  }
  
  container.innerHTML = currentCase.tags.map(tag => `
    <span class="tag-item" style="display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; background: #dbeafe; color: #1e40af; border: 1px solid #93c5fd; border-radius: 12px; font-size: 11px;">
      ${escapeHtml(tag)}
      <button type="button" onclick="removeTag('${escapeHtml(tag)}')" style="background: none; border: none; cursor: pointer; padding: 0; color: #1e40af; font-size: 14px; line-height: 1;">&times;</button>
    </span>
  `).join('');
}

// ============================================
// MEDIA MANAGEMENT (Images/Videos)
// ============================================

// Render the media list
function renderMediaList() {
  const container = elements.mediaList;
  if (!container) return;
  
  // Determine if we're in a mode that requires verification checkboxes
  const showVerification = reviewMode || isNewIncidentFromGuest;
  
  if (media.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="padding: 12px; text-align: center; color: #64748b; font-size: 12px;">
        No images or videos added
      </div>
    `;
    return;
  }
  
  container.innerHTML = media.map((m, index) => {
    const mediaKey = `media_${index}`;
    const isVerified = verifiedMedia[mediaKey] || false;
    const isUploaded = m.isUploaded || m.r2_key;
    const fileSizeDisplay = m.file_size ? `(${(m.file_size / 1024 / 1024).toFixed(2)} MB)` : '';
    
    return `
    <div class="media-item" data-media-index="${index}" style="${isUploaded ? 'border-left: 3px solid #10b981;' : ''}">
      ${showVerification ? `
        <div class="media-verification-row" style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px; padding: 4px 8px; background: ${isVerified ? '#dcfce7' : '#fef9c3'}; border-radius: 4px;">
          <input 
            type="checkbox" 
            class="media-verify-checkbox"
            data-media-index="${index}"
            ${isVerified ? 'checked' : ''}
          >
          <span style="font-size: 11px; color: ${isVerified ? '#166534' : '#854d0e'};">
            ${isVerified ? '✓ Verified' : 'Verify this media'}
          </span>
        </div>
      ` : ''}
      ${isUploaded ? `
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px; padding: 4px 8px; background: #ecfdf5; border-radius: 4px;">
          <span style="font-size: 11px; color: #047857;">
            📤 Uploaded: ${escapeHtml(m.original_filename || m.description || 'File')} ${fileSizeDisplay}
          </span>
          <span style="font-size: 10px; color: #6b7280;">${m.media_type === 'video' ? '🎥' : '🖼️'}</span>
          <button class="media-item-delete" data-action="deleteMedia" data-index="${index}" style="margin-left: auto;">✕</button>
        </div>
        ${m.url && m.media_type === 'image' ? `
          <div style="margin-bottom: 6px;">
            <img src="${escapeHtml(m.url)}" alt="Preview" style="max-width: 100%; max-height: 100px; border-radius: 4px; object-fit: contain;">
          </div>
        ` : ''}
      ` : `
        <div class="media-item-row">
          <input 
            type="url" 
            class="media-item-url" 
            value="${escapeHtml(m.url || '')}" 
            placeholder="https://example.com/photo.jpg"
            data-media-index="${index}"
            data-media-field="url"
          >
          <select 
            class="media-item-type-select"
            data-media-index="${index}"
            data-media-field="type"
          >
            <option value="image" ${m.media_type === 'image' ? 'selected' : ''}>Image</option>
            <option value="video" ${m.media_type === 'video' ? 'selected' : ''}>Video</option>
          </select>
          <button class="media-item-delete" data-action="deleteMedia" data-index="${index}">✕</button>
        </div>
      `}
      <input 
        type="text" 
        class="media-item-description" 
        value="${escapeHtml(m.description || '')}" 
        placeholder="Description / Alt text (what does this show?)"
        data-media-index="${index}"
        data-media-field="description"
      >
      ${m.url && !isUploaded ? `
        <div style="margin-top: 4px;">
          <a href="${escapeHtml(m.url)}" target="_blank" style="font-size: 10px; color: #3b82f6; text-decoration: none;">
            🔗 Preview link
          </a>
        </div>
      ` : ''}
    </div>
  `}).join('');
  
  // Add event listeners for media inputs
  container.querySelectorAll('[data-media-index][data-media-field]').forEach(input => {
    input.addEventListener('input', (e) => {
      const index = parseInt(e.target.dataset.mediaIndex);
      const field = e.target.dataset.mediaField;
      if (media[index]) {
        if (field === 'url') media[index].url = e.target.value;
        else if (field === 'type') media[index].media_type = e.target.value;
        else if (field === 'description') media[index].description = e.target.value;
      }
    });
  });
  
  // Add event listeners for verification checkboxes
  container.querySelectorAll('.media-verify-checkbox').forEach(checkbox => {
    checkbox.addEventListener('change', (e) => {
      const index = parseInt(e.target.dataset.mediaIndex);
      const mediaKey = `media_${index}`;
      verifiedMedia[mediaKey] = e.target.checked;
      
      // Re-render to update styling
      renderMediaList();
      
      // Update submit button state
      updateSubmitButtonState();
    });
  });
}

// Update submit button state based on verifications
function updateSubmitButtonState() {
  if (!reviewMode && !isNewIncidentFromGuest) return;
  
  const submitBtn = elements.submitBtn;
  if (!submitBtn) return;
  
  // Count verified items
  const verifiedFieldCount = Object.values(verifiedFields).filter(v => v).length;
  const verifiedMediaCount = Object.values(verifiedMedia).filter(v => v).length;
  const totalMedia = media.filter(m => m.url).length;
  
  // Require at least some verification
  const hasMinVerification = verifiedFieldCount >= 2 || verifiedMediaCount >= 1;
  
  submitBtn.disabled = !hasMinVerification;
  
  // Update button text with counts
  if (isNewIncidentFromGuest) {
    submitBtn.textContent = `Create Incident & Submit First Review (${verifiedFieldCount} fields, ${verifiedMediaCount}/${totalMedia} media verified)`;
  } else if (reviewMode) {
    submitBtn.textContent = `Submit First Review (${verifiedFieldCount} fields, ${verifiedMediaCount}/${totalMedia} media verified)`;
  }
}

// Delete media by index
function deleteMedia(index) {
  if (index >= 0 && index < media.length) {
    media.splice(index, 1);
    renderMediaList();
  }
}

// Handle media file upload
async function handleMediaFileUpload(event) {
  const files = event.target.files;
  if (!files || files.length === 0) return;
  
  if (!reviewMode || !currentCase?.id) {
    showNotification('File uploads are only available when reviewing an existing case', 'warning');
    return;
  }
  
  const apiUrl = await getApiUrl();
  if (!apiUrl) {
    showNotification('API URL not configured', 'error');
    return;
  }
  
  // Show progress
  if (elements.uploadProgress) elements.uploadProgress.style.display = 'block';
  if (elements.uploadProgressBar) elements.uploadProgressBar.style.width = '0%';
  if (elements.uploadStatus) elements.uploadStatus.textContent = `Uploading 0 of ${files.length}...`;
  
  let successCount = 0;
  let errorCount = 0;
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    
    // Update progress
    if (elements.uploadProgressBar) {
      elements.uploadProgressBar.style.width = `${((i) / files.length) * 100}%`;
    }
    if (elements.uploadStatus) {
      elements.uploadStatus.textContent = `Uploading ${i + 1} of ${files.length}: ${file.name}`;
    }
    
    // Validate file size
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    const maxSize = isImage ? 10 * 1024 * 1024 : 100 * 1024 * 1024;
    
    if (!isImage && !isVideo) {
      showNotification(`Skipped ${file.name}: Not a valid image or video file`, 'warning');
      errorCount++;
      continue;
    }
    
    if (file.size > maxSize) {
      const maxMB = maxSize / 1024 / 1024;
      showNotification(`Skipped ${file.name}: File too large (max ${maxMB}MB)`, 'warning');
      errorCount++;
      continue;
    }
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('caption', '');
      formData.append('description', '');
      
      const response = await fetch(`${apiUrl}/api/incidents/${currentCase.id}/media/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        body: formData
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Upload failed: ${response.status}`);
      }
      
      const result = await response.json();
      
      // Add to local media array
      media.push({
        id: result.media?.id,
        url: result.media?.url || '',
        media_type: isImage ? 'image' : 'video',
        description: file.name,
        r2_key: result.media?.r2_key,
        original_filename: file.name,
        file_size: file.size,
        isUploaded: true,
        addedAt: new Date().toISOString()
      });
      
      successCount++;
    } catch (error) {
      console.error('Upload error:', error);
      showNotification(`Failed to upload ${file.name}: ${error.message}`, 'error');
      errorCount++;
    }
  }
  
  // Complete progress
  if (elements.uploadProgressBar) elements.uploadProgressBar.style.width = '100%';
  if (elements.uploadStatus) {
    elements.uploadStatus.textContent = `Done: ${successCount} uploaded, ${errorCount} failed`;
  }
  
  // Hide progress after a delay
  setTimeout(() => {
    if (elements.uploadProgress) elements.uploadProgress.style.display = 'none';
  }, 2000);
  
  // Clear file input
  event.target.value = '';
  
  // Render updated media list
  renderMediaList();
  
  if (successCount > 0) {
    showNotification(`Successfully uploaded ${successCount} file(s)`, 'success');
  }
}

// Truncate text
function truncate(text, maxLength) {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

// Update source priority
function updateSourcePriority(index, priority) {
  if (sources[index]) {
    sources[index].priority = priority;
    renderSources();
  }
}

// Add current page as source
async function addCurrentPageAsSource() {
  chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
    if (tabs[0]) {
      const existing = sources.find(s => s.url === tabs[0].url);
      if (!existing) {
        const newSource = {
          id: `local-source-${Date.now()}`,
          url: tabs[0].url,
          title: tabs[0].title,
          priority: 'secondary',
          addedAt: new Date().toISOString()
        };
        
        // If in review mode, save to database immediately to get an ID
        if (reviewMode && reviewIncidentId) {
          try {
            const response = await fetch(`${apiUrl}/api/incidents/${reviewIncidentId}/sources`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${apiKey}`,
                'X-API-Key': apiKey,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                url: newSource.url,
                title: newSource.title,
                publication: '',
                source_type: 'news',
                source_priority: newSource.priority
              })
            });
            
            if (response.ok) {
              const data = await response.json();
              newSource.id = data.id;
              showNotification('Source saved to database', 'success');
            } else {
              console.error('Failed to save source to database');
              showNotification('Failed to save source', 'error');
            }
          } catch (error) {
            console.error('Error saving source:', error);
            showNotification('Error saving source', 'error');
          }
        }
        
        sources.push(newSource);
        renderSources();
      }
    }
  });
}

// Build incident object for API
function buildIncidentObject() {
  const incidentTypes = currentCase.incidentTypes || (currentCase.incidentType ? [currentCase.incidentType] : ['death_in_custody']);
  const incidentType = incidentTypes[0] || 'death_in_custody'; // First type for backward compatibility
  const date = currentCase.dateOfDeath || new Date().toISOString().split('T')[0];
  const nameSlug = (currentCase.name || 'unknown').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  
  // Parse location
  let city = '', state = '';
  if (currentCase.location) {
    const parts = currentCase.location.split(',').map(p => p.trim());
    city = parts[0] || '';
    state = parts[1] || '';
  }
  
  const incident = {
    incident_id: `${date}-${incidentType === 'death' ? nameSlug : incidentType + '-' + (city || 'unknown').toLowerCase()}`,
    incident_type: incidentType,
    incident_types: incidentTypes,
    date: date,
    date_precision: 'exact',
    location: {
      city: city,
      state: state,
      country: 'USA',
      facility: currentCase.facility || undefined
    },
    subject: {
      name: currentCase.name || undefined,
      name_public: !!currentCase.name,
      age: currentCase.age ? parseInt(currentCase.age) : undefined,
      nationality: currentCase.country || undefined,
      occupation: currentCase.occupation || undefined
    },
    summary: currentCase.causeOfDeath || '',
    image_url: currentCase.imageUrl || undefined,
    agencies_involved: currentCase.agencies || [],
    violations_alleged: currentCase.violations_alleged || currentCase.violations || [],
    violations_potential: currentCase.violations_potential || [],
    violations_possible: currentCase.violations_possible || [],
    violation_details_map: currentCase.violation_details_map || {},
    tags: currentCase.tags || [],
    verified: false
  };
  
  // Add type-specific details for ALL selected types (multi-type support)
  for (const type of incidentTypes) {
    addTypeSpecificDetails(incident, type, currentCase);
  }
  
  return incident;
}

// Add type-specific details to incident object
function addTypeSpecificDetails(incident, type, caseData) {
  switch (type) {
    case 'death':
    case 'death_in_custody':
    case 'death_during_operation':
    case 'death_at_protest':
    case 'detention_death':
      if (!incident.death_details) {
        incident.death_details = {
          cause_of_death: caseData.deathCause || caseData.causeOfDeath || '',
          cause_source: 'unknown',
          manner_of_death: caseData.deathManner || undefined,
          custody_duration: caseData.deathCustodyDuration || undefined,
          medical_neglect_alleged: caseData.medicalNeglectAlleged || false,
          medical_requests_denied: caseData.deathMedicalDenied || false
        };
      }
      // death_at_protest also gets protest details
      if (type === 'death_at_protest' && !incident.protest_details) {
        incident.protest_details = {
          protest_topic: caseData.protestTopic || '',
          protest_size: caseData.protestSize || undefined,
          permitted: caseData.protestPermitted || false,
          dispersal_method: Array.isArray(caseData.dispersalMethod) && caseData.dispersalMethod.length > 0 ? caseData.dispersalMethod : undefined,
          arrests_made: caseData.arrestsMade ? parseInt(caseData.arrestsMade) : undefined
        };
      }
      break;
      
    case 'injury':
      if (!incident.injury_details) {
        incident.injury_details = {
          injury_type: caseData.injuryType || '',
          severity: caseData.injurySeverity || undefined,
          cause: caseData.injuryCause || '',
          weapon_used: caseData.injuryWeapon || undefined
        };
      }
      break;
      
    case 'arrest':
      if (!incident.arrest_details) {
        incident.arrest_details = {
          stated_reason: caseData.arrestReason || '',
          actual_context: caseData.arrestContext || undefined,
          charges: caseData.arrestCharges ? caseData.arrestCharges.split(',').map(c => c.trim()) : [],
          timing_suspicious: caseData.arrestTimingSuspicious || false,
          pretext_arrest: caseData.arrestPretext || false,
          selective_enforcement: caseData.arrestSelective || false
        };
      }
      break;
      
    case 'rights_violation':
    case 'retaliation':
      if (!incident.violation_details) {
        incident.violation_details = {
          violation_types: caseData.violations || [],
          journalism_related: caseData.violationJournalism || false,
          protest_related: caseData.violationProtest || false,
          activism_related: caseData.violationActivism || false,
          speech_content: caseData.violationSpeech || undefined,
          court_ruling: caseData.violationRuling || undefined
        };
      }
      break;
      
    case 'shooting':
      if (!incident.shooting_details) {
        incident.shooting_details = {
          fatal: caseData.shootingFatal || false,
          shots_fired: caseData.shotsFired ? parseInt(caseData.shotsFired) : undefined,
          weapon_type: caseData.weaponType || 'unknown',
          bodycam_available: caseData.bodycamAvailable || false,
          victim_armed: caseData.victimArmed || false,
          warning_given: caseData.warningGiven || false,
          context: caseData.shootingContext || 'other'
        };
      }
      break;
      
    case 'excessive_force':
      if (!incident.excessive_force_details) {
        incident.excessive_force_details = {
          force_type: caseData.forceTypes || [],
          victim_restrained_when_force_used: caseData.victimRestrained || false,
          victim_complying: caseData.victimComplying || false,
          video_evidence: caseData.videoEvidence || false
        };
      }
      // Excessive force also includes injury details
      if (!incident.injury_details) {
        incident.injury_details = {
          injury_type: caseData.injuryType || '',
          severity: caseData.injurySeverity || undefined,
          cause: caseData.injuryCause || '',
          weapon_used: caseData.injuryWeapon || undefined
        };
      }
      break;
      
    case 'medical_neglect':
      if (!incident.medical_neglect_details) {
        incident.medical_neglect_details = {
          condition_type: caseData.conditionType || '',
          requests_made: caseData.medicalRequestsMade ? parseInt(caseData.medicalRequestsMade) : undefined,
          days_without_care: caseData.daysWithoutCare ? parseInt(caseData.daysWithoutCare) : undefined,
          outcome: caseData.medicalOutcome || ''
        };
      }
      break;
      
    case 'protest_suppression':
      if (!incident.protest_details) {
        incident.protest_details = {
          protest_topic: caseData.protestTopic || '',
          protest_size: caseData.protestSize || undefined,
          permitted: caseData.protestPermitted || false,
          dispersal_method: Array.isArray(caseData.dispersalMethod) && caseData.dispersalMethod.length > 0 ? caseData.dispersalMethod : undefined,
          arrests_made: caseData.arrestsMade ? parseInt(caseData.arrestsMade) : undefined
        };
      }
      break;
  }
}

// Save case to API
async function saveCase() {
  console.log('saveCase called - reviewMode:', reviewMode, 'reviewIncidentId:', reviewIncidentId, 'contentType:', currentContentType);
  
  // If saving a statement in review mode, use statement verification function
  if (reviewMode && currentContentType === 'statement') {
    return submitStatementVerification();
  }
  
  // If saving a statement normally, use statement save function
  if (currentContentType === 'statement') {
    return saveStatement();
  }
  
  // If in review mode, submit verification instead
  if (reviewMode && reviewIncidentId) {
    console.log('Calling submitVerification...');
    return submitVerification();
  }
  
  // If creating new incident from guest submission
  if (isNewIncidentFromGuest && currentGuestSubmissionId) {
    return submitNewIncidentFromGuest();
  }
  
  if (!isConnected) {
    alert('Not connected to API. Please ensure the server is running.');
    return;
  }
  
  if (!currentCase.name && currentCase.incidentType === 'death') {
    showAlert('Please enter a name for the case.', '⚠️ Missing Information');
    return;
  }
  
  // Validate: quotes must have sources
  if (verifiedQuotes.length > 0 && sources.length === 0) {
    alert('Cannot save quotes without sources. Add at least one source first.');
    return;
  }
  
  // Check for unverified linked quotes
  const unverifiedQuotes = getUnverifiedLinkedQuotes();
  if (unverifiedQuotes.length > 0) {
    const quotePreview = unverifiedQuotes.map(q => 
      `• "${q.text.substring(0, 50)}${q.text.length > 50 ? '...' : ''}"`
    ).join('\n');
    
    const message = `Cannot save: ${unverifiedQuotes.length} linked quote${unverifiedQuotes.length > 1 ? 's are' : ' is'} unverified.\n\n${quotePreview}\n\nPlease verify all linked quotes before saving.`;
    showAlert(message, '⚠️ Unverified Quotes');
    return;
  }
  
  // Check for fields with data that don't have quotes linked
  const fieldsWithoutQuotes = [];
  const quotableFields = [
    'victim_name', 'incident_date', 'city', 'state', 'facility_name',
    'age', 'country_of_origin', 'nationality', 'immigration_status',
    'detention_duration', 'cause_of_death', 'medical_condition',
    'description', 'facility_type', 'context', 'medical_care_details',
    'timeline_of_events', 'family_notified', 'autopsy_findings',
    'prior_health_issues', 'legal_representation', 'advocacy_involved'
  ];
  
  quotableFields.forEach(fieldName => {
    const input = getFieldInputElement(fieldName);
    if (input) {
      const value = input.value?.trim();
      // Check if field has data
      if (value && value.length > 0) {
        // Check if field has quotes linked
        const hasQuotes = fieldQuoteAssociations[fieldName] && 
                         fieldQuoteAssociations[fieldName].length > 0;
        if (!hasQuotes) {
          fieldsWithoutQuotes.push(fieldName);
          // Highlight the field
          input.classList.add('missing-quote-warning');
          setTimeout(() => input.classList.remove('missing-quote-warning'), 15000);
        }
      }
    }
  });
  
  if (fieldsWithoutQuotes.length > 0) {
    const fieldLabels = fieldsWithoutQuotes.map(f => getFieldLabel(f) || f);
    const message = `${fieldsWithoutQuotes.length} field${fieldsWithoutQuotes.length > 1 ? 's have' : ' has'} data but no quotes linked:\n\n${fieldLabels.map(l => `• ${l}`).join('\n')}\n\nFields are highlighted in yellow.`;
    
    const proceed = await showWarning(message, '⚠️ Fields Without Quotes');
    if (!proceed) {
      // User chose to cancel - scroll to first field
      const firstField = getFieldInputElement(fieldsWithoutQuotes[0]);
      if (firstField) {
        firstField.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => firstField.focus(), 300);
      }
      return;
    }
  }
  
  // Determine if this is a guest submission (no API key)
  const isGuestSubmission = !apiKey;
  
  // If guest submission, show modal with rate limit info
  if (isGuestSubmission) {
    showGuestSubmissionModal();
    return;
  }
  
  // Proceed with authenticated save
  await performSave(false);
}

// Show guest submission confirmation modal
function showGuestSubmissionModal() {
  // Load guest submissions from storage
  chrome.storage.local.get(['guestSubmissions'], (result) => {
    const now = Date.now();
    guestSubmissions = (result.guestSubmissions || []).filter(ts => now - ts < GUEST_RATE_WINDOW);
    
    const remaining = Math.max(0, GUEST_RATE_LIMIT - guestSubmissions.length);
    const resetTime = guestSubmissions.length > 0 
      ? new Date(guestSubmissions[0] + GUEST_RATE_WINDOW)
      : new Date(now + GUEST_RATE_WINDOW);
    
    // Update modal content
    document.getElementById('guestSubmissionsRemaining').textContent = remaining;
    document.getElementById('guestRateLimitReset').textContent = resetTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    // Show/hide submit button based on limit
    const submitBtn = document.getElementById('confirmGuestSubmission');
    if (remaining === 0) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Rate Limit Reached';
      submitBtn.style.background = '#9ca3af';
    } else {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit as Guest';
      submitBtn.style.background = '#f59e0b';
    }
    
    // Show modal
    document.getElementById('guestSubmissionModal').style.display = 'flex';
  });
}

// Submit new incident created from guest submission
async function submitNewIncidentFromGuest() {
  const saveBtn = document.getElementById('saveCaseBtn');
  if (!saveBtn) return;
  
  // Check for minimum verification
  const verifiedFieldCount = Object.values(verifiedFields).filter(v => v).length;
  const verifiedMediaCount = Object.values(verifiedMedia).filter(v => v).length;
  
  if (verifiedFieldCount < 2 && verifiedMediaCount < 1) {
    showAlert('Please verify at least 2 fields or 1 media item before submitting.', '⚠️ Insufficient Verification');
    return;
  }
  
  saveBtn.disabled = true;
  saveBtn.innerHTML = '<div class="spinner white"></div> Creating incident...';
  
  try {
    // 1. Create the new incident
    const incident = buildIncidentObject();
    
    const createResponse = await fetch(`${apiUrl}/api/incidents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'X-API-Key': apiKey
      },
      body: JSON.stringify(incident)
    });
    
    if (!createResponse.ok) {
      const error = await createResponse.json();
      throw new Error(error.error || 'Failed to create incident');
    }
    
    const createResult = await createResponse.json();
    const incidentDbId = createResult.id;
    
    console.log('Created incident from guest submission:', incidentDbId);
    
    // 2. Add sources if any
    if (sources.length > 0) {
      const sourcesData = sources.map(s => ({
        url: s.url,
        title: s.title || s.url,
        publication: s.publication || undefined,
        source_type: 'news_article',
        source_priority: s.priority || 'secondary'
      }));
      
      await fetch(`${apiUrl}/api/incidents/${incidentDbId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'X-API-Key': apiKey
        },
        body: JSON.stringify({ sources: sourcesData })
      });
    }
    
    // 3. Add media if any
    if (media.length > 0) {
      for (const m of media) {
        if (!m.url) continue;
        
        const mediaIndex = media.indexOf(m);
        const isVerified = verifiedMedia[`media_${mediaIndex}`] || false;
        
        await fetch(`${apiUrl}/api/incidents/${incidentDbId}/media`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'X-API-Key': apiKey
          },
          body: JSON.stringify({
            url: m.url,
            media_type: m.media_type || 'image',
            description: m.description || '',
            verified: isVerified
          })
        });
      }
    }
    
    // 4. Add quotes if any
    if (verifiedQuotes.length > 0) {
      for (const q of verifiedQuotes) {
        await fetch(`${apiUrl}/api/incidents/${incidentDbId}/quotes`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'X-API-Key': apiKey
          },
          body: JSON.stringify({
            text: q.text,
            category: q.category || 'general',
            source_id: q.source_id || null,
            page_number: q.pageNumber || null,
            confidence: q.confidence || null
          })
        });
      }
    }
    
    // 5. Submit first verification
    const verifyResponse = await fetch(`${apiUrl}/api/incidents/${incidentDbId}/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'X-API-Key': apiKey
      },
      body: JSON.stringify({
        notes: 'Created and verified from guest submission via extension'
      })
    });
    
    if (!verifyResponse.ok) {
      console.warn('Verification step failed, but incident was created');
    }
    
    // 6. Update guest submission status to 'accepted'
    await fetch(`${apiUrl}/api/guest-submissions`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'X-API-Key': apiKey
      },
      body: JSON.stringify({
        id: currentGuestSubmissionId,
        status: 'accepted',
        notes: `Accepted and created as incident ${incidentDbId}`
      })
    });
    
    alert(`Incident created and review submitted!\n\nIncident ID: ${incident.incident_id}\n\nCase is now in the validation queue.`);
    
    // Reset state
    isNewIncidentFromGuest = false;
    currentGuestSubmissionId = null;
    verifiedFields = {};
    verifiedMedia = {};
    
    // Remove the banner
    const banner = document.getElementById('guestReviewBanner');
    if (banner) banner.remove();
    
    // Reset form
    clearCase();
    
    // Refresh guest submissions count
    fetchGuestSubmissionsCount();
    
    // Switch to Cases tab
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelector('[data-tab="review"]')?.classList.add('active');
    document.querySelectorAll('.tab-content').forEach(p => p.classList.remove('active'));
    document.getElementById('tab-review')?.classList.add('active');
    
    // Reload review queue
    loadReviewQueue();
    
  } catch (error) {
    console.error('Error creating incident from guest submission:', error);
    alert('Failed to create incident: ' + error.message);
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Create Incident & Submit First Review';
  }
}

// Perform the actual save (called after confirmation)
async function performSave(isGuest) {
  elements.saveCaseBtn.disabled = true;
  elements.saveCaseBtn.innerHTML = '<div class="spinner white"></div> Saving...';
  
  const incident = buildIncidentObject();
  
  try {
    // Build headers - include API key only if we have one
    const headers = {
      'Content-Type': 'application/json'
    };
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }
    
    // Create the incident
    const response = await fetch(`${apiUrl}/api/incidents`, {
      method: 'POST',
      headers,
      body: JSON.stringify(incident)
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create incident');
    }
    
    const result = await response.json();
    const incidentDbId = result.id;
    
    // Then add sources, quotes, and media if we have an ID
    if (incidentDbId && (sources.length > 0 || verifiedQuotes.length > 0 || media.length > 0)) {
      // Validate: quotes must have sources
      if (verifiedQuotes.length > 0 && sources.length === 0) {
        throw new Error('Cannot save quotes without sources. Add at least one source first.');
      }
      
      const patchData = {};
      
      if (sources.length > 0) {
        patchData.sources = sources.map(s => ({
          url: s.url,
          title: s.title,
          publication: s.publication || undefined,
          source_type: 'news_article',
          source_priority: s.priority || 'secondary'
        }));
      }
      
      if (verifiedQuotes.length > 0) {
        // Build a reverse map: quoteId -> [fields] (supports multiple quotes per field)
        const quoteFieldMap = {};
        for (const [field, value] of Object.entries(fieldQuoteAssociations)) {
          const quoteIds = Array.isArray(value) ? value : (value ? [value] : []);
          for (const quoteId of quoteIds) {
            if (!quoteFieldMap[quoteId]) quoteFieldMap[quoteId] = [];
            quoteFieldMap[quoteId].push(field);
          }
        }
        
        // Build source ID map from sources list
        const sourceUrlToId = {};
        sources.forEach((s, idx) => {
          if (s.url) sourceUrlToId[s.url] = idx + 1; // Will be replaced by actual DB IDs after source creation
        });
        
        patchData.quotes = verifiedQuotes.map(q => {
          // Validate quote has source
          if (!q.sourceUrl && !q.source) {
            throw new Error(`Quote "${q.text.substring(0, 50)}..." must be linked to a source.`);
          }
          
          return {
            text: q.text,
            category: q.category,
            source_id: q.sourceId || undefined, // Use existing source_id if available
            page_number: q.pageNumber || undefined,
            confidence: q.confidence || undefined,
            verified: false,
            linked_fields: quoteFieldMap[q.id] || []
          };
        });
      }
      
      // Add media (images/videos) - these don't need sources
      if (media.length > 0) {
        patchData.media = media.map(m => ({
          url: m.url,
          media_type: m.media_type,
          title: m.title || undefined,
          description: m.description || undefined
        }));
      }
      
      // Only PATCH if we have an API key (guests can't update)
      if (apiKey) {
        await fetch(`${apiUrl}/api/incidents/${incidentDbId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify(patchData)
        });
      }
    }
    
    // Show appropriate message based on submission type
    const submissionType = result.submission_type;
    
    // If guest submission, track it
    if (isGuest && submissionType === 'guest') {
      guestSubmissions.push(Date.now());
      chrome.storage.local.set({ guestSubmissions });
    }
    
    if (submissionType === 'analyst') {
      alert(`Incident saved and auto-verified as first review!\nID: ${incident.incident_id}\n\nAnother analyst can now provide second verification.`);
    } else if (submissionType === 'guest') {
      const remaining = GUEST_RATE_LIMIT - guestSubmissions.length;
      alert(`Incident submitted as guest!\nID: ${incident.incident_id}\n\n${result.message}\n\nRemaining submissions this hour: ${remaining}`);
    } else {
      alert(`Incident saved successfully!\nID: ${incident.incident_id}\n\nAwaiting analyst review.`);
    }
  } catch (error) {
    console.error('Save error:', error);
    
    // Check if it's a rate limit error
    if (error.message.includes('Rate limit') || error.message.includes('Too many')) {
      alert('Rate limit exceeded. Please try again later.');
    } else {
      alert('Failed to save incident: ' + error.message);
    }
  } finally {
    elements.saveCaseBtn.disabled = false;
    elements.saveCaseBtn.textContent = reviewMode ? 'Submit Verification' : 'Save Incident';
  }
}

// Update submit button for review mode
function updateSubmitButtonForReview() {
  const saveBtn = document.getElementById('saveCaseBtn');
  if (saveBtn) {
    if (reviewMode) {
      saveBtn.textContent = 'Submit Review';
      saveBtn.style.background = '#10b981'; // Green for verification
      updateReviewModeUI();
    } else {
      saveBtn.textContent = 'Save Incident';
      saveBtn.style.background = ''; // Default blue
      hideVerificationCheckboxes();
    }
  }
}

// Show/hide verification checkboxes based on review mode
function updateReviewModeUI() {
  const checkboxWrappers = document.querySelectorAll('.verification-checkbox-wrapper');
  const cancelBtn = document.getElementById('cancelReviewBtn');
  const rejectBtn = document.getElementById('rejectCaseBtn');
  const saveBtn = document.getElementById('saveCaseBtn');
  
  if (reviewMode) {
    // Show checkboxes for fields with values
    checkboxWrappers.forEach(wrapper => {
      const fieldName = wrapper.dataset.field;
      const fieldInput = getFieldInputElement(fieldName);
      
      if (fieldInput && fieldInput.value && fieldInput.value.trim() !== '') {
        // Ensure parent section is visible if field has a value
        const hiddenParent = fieldInput.closest('.hidden');
        if (hiddenParent) {
          console.log('Making section visible for field:', fieldName, hiddenParent.id);
          hiddenParent.classList.remove('hidden');
        }
        
        wrapper.style.display = 'inline-flex';
        // Initialize verifiedFields if not already set
        if (!(fieldName in verifiedFields)) {
          verifiedFields[fieldName] = false;
        }
      } else {
        wrapper.style.display = 'none';
        // Remove from verifiedFields if it was there
        if (fieldName in verifiedFields) {
          delete verifiedFields[fieldName];
        }
      }
    });
    
    // Initialize quote verification state
    verifiedQuotes.forEach(quote => {
      const quoteKey = `quote_${quote.id}`;
      if (!(quoteKey in verifiedFields)) {
        verifiedFields[quoteKey] = false;
      }
    });
    // Initialize timeline verification state
    (reviewTimeline || []).forEach(t => {
      const tKey = `timeline_${t.id}`;
      if (!(tKey in verifiedFields)) {
        verifiedFields[tKey] = false;
      }
    });
    
    // Setup checkbox listeners
    setupVerificationListeners();
    
    // Re-render quotes to show checkboxes
    renderQuotes();
    renderTimeline();
    
    // Update verification counter
    updateVerificationCounter();
    
    // Show cancel and reject buttons in review mode
    if (cancelBtn) cancelBtn.style.display = 'block';
    if (rejectBtn) rejectBtn.style.display = 'block';
    if (saveBtn) saveBtn.innerHTML = 'Submit Review';
  } else {
    hideVerificationCheckboxes();
    
    // Hide cancel and reject buttons when not in review mode
    if (cancelBtn) cancelBtn.style.display = 'none';
    if (rejectBtn) rejectBtn.style.display = 'none';
    if (saveBtn) saveBtn.innerHTML = 'Save Incident';
  }
}

function hideVerificationCheckboxes() {
  const checkboxWrappers = document.querySelectorAll('.verification-checkbox-wrapper');
  checkboxWrappers.forEach(wrapper => {
    wrapper.style.display = 'none';
  });
  
  // Hide counter if it exists
  const counter = document.getElementById('verificationCounter');
  if (counter) {
    counter.style.display = 'none';
  }
}

// Get input element for a field name
function getFieldInputElement(fieldName) {
  const fieldMappings = {
    'name': 'caseName',
    'date': 'caseDod',
    'age': 'caseAge',
    'nationality': 'caseCountry',
    'gender': 'caseGender',
    'immigration_status': 'caseImmigrationStatus',
    'facility': 'caseFacility',
    'city': 'caseCity',
    'state': 'caseState',
    'summary': 'caseCause',
    'incident_type': 'incidentType',
    'death_cause': 'deathCause',
    'death_manner': 'deathManner',
    'death_custody_duration': 'deathCustodyDuration',
    'injury_type': 'injuryType',
    'injury_severity': 'injurySeverity',
    'arrest_reason': 'arrestReason',
    'arrest_context': 'arrestContext'
  };
  
  const inputId = fieldMappings[fieldName];
  return inputId ? document.getElementById(inputId) : null;
}

// Get display label for a field
function getFieldLabel(fieldName) {
  const labels = {
    'name': 'Subject Name',
    'date': 'Incident Date',
    'age': 'Age',
    'nationality': 'Nationality',
    'occupation': 'Occupation',
    'facility': 'Facility',
    'location': 'Location',
    'summary': 'Summary',
    'incident_type': 'Incident Type',
    'death_cause': 'Death Cause',
    'death_manner': 'Death Manner',
    'death_custody_duration': 'Custody Duration',
    'injury_type': 'Injury Type',
    'injury_severity': 'Injury Severity',
    'arrest_reason': 'Arrest Reason',
    'arrest_context': 'Arrest Context'
  };
  if (fieldName.startsWith('quote_')) return `Quote ${fieldName.replace('quote_', '')}`;
  if (fieldName.startsWith('timeline_')) return `Timeline ${fieldName.replace('timeline_', '')}`;
  return labels[fieldName] || fieldName;
}

// Setup verification checkbox listeners
function setupVerificationListeners() {
  document.querySelectorAll('.field-verify-checkbox').forEach(checkbox => {
    // Remove old listeners by cloning
    const newCheckbox = checkbox.cloneNode(true);
    checkbox.parentNode.replaceChild(newCheckbox, checkbox);
    
    newCheckbox.addEventListener('change', (e) => {
      const fieldName = e.target.dataset.field;
      verifiedFields[fieldName] = e.target.checked;
      updateVerificationCounter();
    });
  });
}

// Update verification counter display
function updateVerificationCounter() {
  if (!reviewMode) return;
  
  const allFields = Object.keys(verifiedFields);
  const verifiedCount = allFields.filter(f => verifiedFields[f]).length;
  const totalCount = allFields.length;
  
  // Get counter element (already in footer)
  let counter = document.getElementById('verificationCounter');
  
  if (counter) {
    counter.textContent = `${verifiedCount}/${totalCount} fields verified`;
    counter.style.color = verifiedCount === totalCount ? '#22c55e' : '#f59e0b';
    counter.style.display = 'inline-block';
  }
}

// Submit verification (called from save button when in review mode)
async function submitVerification() {
  if (!reviewIncidentId) {
    alert('No incident loaded for review');
    return;
  }
  
  // Check if all fields are verified (only for visible fields)
  const fieldsWithData = Object.keys(verifiedFields).filter(fieldName => {
    // Check if it's a quote or timeline field
    if (fieldName.startsWith('quote_') || fieldName.startsWith('timeline_') || fieldName.startsWith('source_')) {
      return true;
    }
    // Check if the field is in a visible section
    const input = getFieldInputElement(fieldName);
    if (input) {
      const hiddenParent = input.closest('.hidden');
      return !hiddenParent; // Include only if not in a hidden section
    }
    return false;
  });
  const unverifiedFields = fieldsWithData.filter(f => !verifiedFields[f]);
  
  if (unverifiedFields.length > 0) {
    console.log('Unverified fields:', unverifiedFields);
    
    // Find and scroll to first unverified field
    let firstElement = null;
    
    // Highlight unverified fields and find first one
    unverifiedFields.forEach((fieldName, index) => {
      // Handle incident type checkboxes specially
      if (fieldName === 'incident_types') {
        const typeCheckboxes = document.querySelectorAll('.incident-type-checkbox');
        typeCheckboxes.forEach(cb => {
          if (cb.checked) {
            const label = cb.closest('label');
            if (label) {
              label.classList.add('unverified-highlight');
              setTimeout(() => label.classList.remove('unverified-highlight'), 15000);
              if (index === 0 && !firstElement) firstElement = label;
            }
          }
        });
        return;
      }
      
      // Handle source checkboxes
      if (fieldName.startsWith('source_')) {
        const sourceId = fieldName.replace('source_', '');
        const sourceCheckbox = document.querySelector(`.source-verify-checkbox[data-source-id="${sourceId}"]`);
        if (sourceCheckbox) {
          const sourceCard = sourceCheckbox.closest('.source-card') || sourceCheckbox.parentElement;
          if (sourceCard) {
            sourceCard.classList.add('unverified-highlight');
            setTimeout(() => sourceCard.classList.remove('unverified-highlight'), 15000);
            if (index === 0 && !firstElement) firstElement = sourceCard;
          }
        }
        return;
      }
      
      const input = getFieldInputElement(fieldName);
      if (input) {
        // Check if field is in a hidden section and make it visible
        const hiddenParent = input.closest('.hidden');
        if (hiddenParent) {
          console.log('Field is in hidden section:', fieldName, hiddenParent.id);
          // Find the type checkbox that shows this section
          const sectionId = hiddenParent.id;
          if (sectionId) {
            // Look for the incident type checkbox that controls this section
            const typeCheckboxes = document.querySelectorAll('.incident-type-checkbox');
            typeCheckboxes.forEach(cb => {
              if (cb.checked && sectionId.includes(cb.value)) {
                hiddenParent.classList.remove('hidden');
              }
            });
          }
        }
        
        input.classList.add('unverified-highlight');
        setTimeout(() => {
          input.classList.remove('unverified-highlight');
        }, 15000);
        if (index === 0 && !firstElement) firstElement = input;
      } else if (fieldName.startsWith('quote_')) {
        const qid = fieldName.replace('quote_', '');
        // Try to find in unverified quotes dropdown first
        const unverifiedContainer = document.getElementById('unverifiedQuotesDropdown');
        if (unverifiedContainer) {
          unverifiedContainer.style.display = 'block';
          unverifiedContainer.classList.add('open');
        }
        const card = document.querySelector(`.quote-card[data-id="${qid}"]`);
        if (card) {
          card.classList.add('unverified-highlight');
          setTimeout(() => card.classList.remove('unverified-highlight'), 15000);
          if (index === 0) firstElement = card;
        } else {
          console.warn('Quote card not found:', qid);
        }
      } else if (fieldName.startsWith('timeline_')) {
        const tid = fieldName.replace('timeline_', '');
        const card = document.querySelector(`.timeline-card[data-timeline-id="${tid}"]`);
        if (card) {
          card.classList.add('unverified-highlight');
          setTimeout(() => card.classList.remove('unverified-highlight'), 15000);
          if (index === 0) firstElement = card;
        } else {
          console.warn('Timeline card not found:', tid);
        }
      } else {
        console.warn('Field element not found:', fieldName, 'Label:', getFieldLabel(fieldName));
      }
    });
    
    // Show debug info about unverified fields
    console.warn('=== UNVERIFIED FIELDS DEBUG ===');
    console.warn('Total unverified:', unverifiedFields.length);
    unverifiedFields.forEach(f => {
      const label = getFieldLabel(f) || f;
      console.warn(`- ${label} (${f})`);
    });
    console.warn('==============================');
    
    // Alert user with list of missing fields
    if (unverifiedFields.length <= 10) {
      const fieldList = unverifiedFields.map(f => `• ${getFieldLabel(f) || f}`).join('\n');
      alert(`❌ Cannot submit - ${unverifiedFields.length} unverified field(s):\n\n${fieldList}\n\nThey are now highlighted for 15 seconds.`);
    } else {
      const fieldList = unverifiedFields.slice(0, 10).map(f => `• ${getFieldLabel(f) || f}`).join('\n');
      alert(`❌ Cannot submit - ${unverifiedFields.length} unverified field(s):\n\n${fieldList}\n...and ${unverifiedFields.length - 10} more\n\nThey are now highlighted for 15 seconds. Check console for full list.`);
    }
    
    // Scroll to first unverified field immediately and forcefully
    if (firstElement) {
      // Remove smooth behavior and scroll immediately to top
      firstElement.scrollIntoView({ behavior: 'auto', block: 'start' });
      // Add a small delay then try smooth scroll to center for better visibility
      setTimeout(() => {
        firstElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        if (firstElement.focus) {
          setTimeout(() => firstElement.focus(), 300);
        }
      }, 50);
    } else {
      console.error('Could not find element for first unverified field:', unverifiedFields[0]);
    }
    
    return;
  }
  
  const saveBtn = document.getElementById('saveCaseBtn');
  if (!saveBtn) return;
  
  saveBtn.disabled = true;
  saveBtn.innerHTML = '<div class="spinner white"></div> Submitting...';
  
  try {
    // Check for fields with data but no quotes (warning, not blocking)
    const missingQuoteFields = [];
    const fieldMappings = {
      'name': 'caseName',
      'date': 'caseDod',
      'age': 'caseAge',
      'nationality': 'caseCountry',
      'gender': 'caseGender',
      'immigration_status': 'caseImmigrationStatus',
      'facility': 'caseFacility',
      'city': 'caseCity',
      'state': 'caseState',
      'summary': 'caseCause',
      'incident_type': 'incidentType',
      'death_cause': 'deathCause',
      'death_manner': 'deathManner',
      'death_custody_duration': 'deathCustodyDuration',
      'injury_type': 'injuryType',
      'injury_severity': 'injurySeverity',
      'injury_weapon': 'injuryWeapon',
      'injury_cause': 'injuryCause',
      'arrest_reason': 'arrestReason',
      'arrest_context': 'arrestContext',
      'arrest_charges': 'arrestCharges'
    };
    Object.keys(fieldMappings).forEach(field => {
      const input = document.getElementById(fieldMappings[field]);
      if (!input) return;
      const hiddenParent = input.closest('.hidden');
      if (hiddenParent) return; // skip hidden sections
      const val = (input.tagName === 'SELECT') ? input.value : (input.value || '').trim();
      if (val && !fieldQuoteAssociations[field]) {
        missingQuoteFields.push(field);
      }
    });
    
    // Warn about missing quotes but allow submission
    if (missingQuoteFields.length > 0) {
      const fieldLabels = missingQuoteFields.map(f => getFieldLabel(f) || f).slice(0, 5).join(', ');
      const more = missingQuoteFields.length > 5 ? ` and ${missingQuoteFields.length - 5} more` : '';
      const confirmed = await showWarning(`${missingQuoteFields.length} field${missingQuoteFields.length > 1 ? 's have' : ' has'} data but no linked quotes:\n\n${fieldLabels}${more}`, '⚠️ Missing Quote Links');
      if (!confirmed) {
        saveBtn.disabled = false;
        saveBtn.innerHTML = 'Submit Review';
        return;
      }
    }

    // 1) Add NEW quotes via the web API to get real IDs
    const localQuotes = (verifiedQuotes || []).filter(q => typeof q.id === 'string' && q.id.startsWith('local-') && q.text && q.source_id);
    const quoteIdMap = {};
    for (const q of localQuotes) {
      const payload = {
        text: q.text,
        category: q.category || null,
        source_id: q.source_id || null,
        page_number: q.page_number || null,
        paragraph_number: q.paragraph_number || null,
        confidence: q.confidence || null
      };
      const res = await fetch(`${apiUrl}/api/incidents/${reviewIncidentId}/quotes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'X-API-Key': apiKey
        },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        let msg = 'Failed to add quote';
        try { const err = await res.json(); msg = err.error || msg; } catch {}
        throw new Error(msg);
      }
      const data = await res.json();
      if (data && data.id) {
        quoteIdMap[q.id] = data.id;
      }
    }

    // 2) Add NEW timeline entries, resolving quote_ids to real IDs when possible
    const localTimeline = (reviewTimeline || []).filter(entry => typeof entry.id === 'string' && entry.id.startsWith('local-'));
    for (const entry of localTimeline) {
      const resolvedQuoteId = (() => {
        if (!entry.quote_id) return null;
        if (typeof entry.quote_id === 'number') return entry.quote_id;
        if (typeof entry.quote_id === 'string' && entry.quote_id.startsWith('local-')) {
          return quoteIdMap[entry.quote_id] || null;
        }
        return null;
      })();

      const timelinePayload = {
        date: entry.date || null,
        description: entry.description,
        quote_id: resolvedQuoteId,
        sequence_order: entry.sequence_order || null
      };

      const tRes = await fetch(`${apiUrl}/api/incidents/${reviewIncidentId}/timeline`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'X-API-Key': apiKey
        },
        body: JSON.stringify(timelinePayload)
      });
      if (!tRes.ok) {
        let msg = 'Failed to add timeline entry';
        try { const err = await tRes.json(); msg = err.error || msg; } catch {}
        throw new Error(msg);
      }
    }
    
    // Submit verification
    const verifyResponse = await fetch(`${apiUrl}/api/incidents/${reviewIncidentId}/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'X-API-Key': apiKey
      },
      body: JSON.stringify({
        notes: 'Reviewed and verified via extension'
      })
    });
    
    if (!verifyResponse.ok) {
      const error = await verifyResponse.json();
      const errorMsg = error.error || 'Failed to submit verification';
      const errorDetails = error.details || '';
      const debugInfo = error.debug || '';
      
      console.error('Verification failed:', errorMsg, 'Status:', verifyResponse.status);
      console.error('Error details:', errorDetails);
      if (debugInfo) console.error('Debug info:', debugInfo);
      
      // If case is in wrong state, provide helpful message
      if (errorMsg.includes('invalid state') || errorMsg.includes('Review is complete')) {
        throw new Error(`${errorMsg}\n\nThis incident may have already been reviewed. Check its status on the website.`);
      }
      
      throw new Error(`${errorMsg}${errorDetails ? '\nDetails: ' + errorDetails : ''}`);
    }
    
    const verifyResult = await verifyResponse.json();
    console.log('Verification result:', verifyResult);
    
    // Release the lock after successful submission
    if (currentLockId) {
      releaseLock(currentLockId);
    }
    
    alert('Verification submitted successfully!\n\nThe incident has been updated and marked as verified.');
    
    // Exit review mode
    reviewMode = false;
    reviewIncidentId = null;
    verifiedFields = {};
    updateSubmitButtonForReview();
    
    // Reload review queue
    loadReviewQueue();
    
    // Switch back to review tab
    const reviewTab = document.querySelector('.tab[data-tab="review"]');
    if (reviewTab) reviewTab.click();
    
  } catch (error) {
    console.error('Verification error:', error);
    alert('Failed to submit verification: ' + error.message);
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Submit Verification';
  }
}

// Submit statement verification (review mode for statements)
async function submitStatementVerification() {
  const saveBtn = document.getElementById('saveCaseBtn');
  if (!saveBtn) return;
  
  // Check for unverified fields
  const unverifiedFields = Object.keys(verifiedFields).filter(f => !verifiedFields[f]);
  
  if (unverifiedFields.length > 0) {
    const message = `You have ${unverifiedFields.length} unverified items:\n\n` +
      unverifiedFields.slice(0, 10).map(f => `• ${f.replace(/_/g, ' ')}`).join('\n') +
      (unverifiedFields.length > 10 ? `\n...and ${unverifiedFields.length - 10} more` : '');
    
    const action = await showModal({
      title: '⚠️ Unverified Items',
      message: message,
      type: 'warning',
      buttons: [
        { label: 'Go Back', action: 'back', style: 'secondary' },
        { label: 'Submit Anyway', action: 'submit', style: 'danger' }
      ]
    });
    
    if (action === 'back') {
      // Find first unverified field and scroll to it
      const firstUnverified = unverifiedFields[0];
      
      // Handle different field types
      if (firstUnverified.startsWith('quote_')) {
        // Scroll to quotes section
        const quotesSection = document.querySelector('#statementQuoteList');
        if (quotesSection) {
          quotesSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
          showAlert('Please verify all quotes in the Supporting Quotes section above.', 'ℹ️ Verify Quotes');
        }
      } else if (firstUnverified.startsWith('source_')) {
        // Scroll to sources section
        const sourcesSection = document.querySelector('#statementSourceList');
        if (sourcesSection) {
          sourcesSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
          showAlert('Please verify all sources in the Sources section.', 'ℹ️ Verify Sources');
        }
      } else {
        // It's a form field - find the checkbox
        const checkbox = document.querySelector(`.field-verify-checkbox[data-field="${firstUnverified}"]`);
        if (checkbox) {
          checkbox.scrollIntoView({ behavior: 'smooth', block: 'center' });
          // Highlight the field
          checkbox.parentElement.style.background = '#fef3c7';
          setTimeout(() => {
            checkbox.parentElement.style.background = '';
          }, 2000);
        }
      }
      return;  // User clicked Go Back - stop here
    }
    // User clicked Submit Anyway - continue to save
  }
  
  saveBtn.disabled = true;
  saveBtn.textContent = 'Submitting...';
  
  try {
    // Submit review - moves to first_review status (still needs validation)
    const response = await fetch(`${apiUrl}/api/statements/${reviewIncidentId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'X-API-Key': apiKey
      },
      body: JSON.stringify({
        verification_status: 'first_review',
        verification_notes: 'First review completed via extension - awaiting validation',
        tags: window.reviewStatementTags || []
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to submit review');
    }
    
    showAlert('Statement review submitted! It will now go to validation before being published.', '✅ Review Submitted');
    
    // Exit review mode
    reviewMode = false;
    reviewIncidentId = null;
    
    // Remove banner
    const banner = document.getElementById('statementReviewBanner');
    if (banner) banner.remove();
    
    // Reload statements queue
    loadStatementsQueue(statementsQueueFilter);
    
    // Switch back to statements tab
    const statementsTab = document.querySelector('.tab[data-tab="statements"]');
    if (statementsTab) statementsTab.click();
    
  } catch (error) {
    console.error('Statement verification error:', error);
    showError('Failed to verify statement: ' + error.message, '❌ Verification Failed');
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Submit Verification';
  }
}

// Current content type (incident or statement)
let currentContentType = 'incident';

/**
 * Handle content type change (incident vs statement)
 */
function handleContentTypeChange(e) {
  const newType = e.target.value;
  const oldType = currentContentType;
  
  console.log('[CONTENT TYPE] Changing from', oldType, 'to', newType);
  
  // Don't do anything if it's the same type
  if (newType === oldType) {
    console.log('[CONTENT TYPE] Same type, ignoring');
    return;
  }
  
  // Skip unsaved data check if we're in review mode (loading a case/statement to review)
  if (reviewMode) {
    console.log('[CONTENT TYPE] Review mode - skipping unsaved data check');
  }
  
  // Check if there's unsaved data in the current form
  let hasUnsavedData = false;
  let dataDetails = '';
  
  if (oldType === 'incident') {
    const nameValue = document.getElementById('caseName')?.value?.trim() || '';
    const cityValue = document.getElementById('caseCity')?.value?.trim() || '';
    hasUnsavedData = nameValue || cityValue || currentCase.name || currentCase.city || verifiedQuotes.length > 0 || sources.length > 0;
    if (hasUnsavedData) {
      dataDetails = `• Name: ${nameValue || currentCase.name || '(empty)'}\n• City: ${cityValue || currentCase.city || '(empty)'}\n• Quotes: ${verifiedQuotes.length}\n• Sources: ${sources.length}`;
    }
  } else if (oldType === 'statement') {
    const headlineValue = document.getElementById('statementHeadline')?.value?.trim() || '';
    const speakerValue = document.getElementById('speakerName')?.value?.trim() || '';
    hasUnsavedData = headlineValue || speakerValue || verifiedQuotes.length > 0 || sources.length > 0;
    if (hasUnsavedData) {
      dataDetails = `• Headline: ${headlineValue || '(empty)'}\n• Speaker: ${speakerValue || '(empty)'}\n• Quotes: ${verifiedQuotes.length}\n• Sources: ${sources.length}`;
    }
  }
  
  console.log('[CONTENT TYPE] Has unsaved data:', hasUnsavedData);
  
  if (hasUnsavedData && !reviewMode) {
    const typeLabel = oldType === 'incident' ? 'incident' : 'statement';
    const message = `⚠️ You have unsaved ${typeLabel} data:\n\n${dataDetails}\n\nSwitching to ${newType} will CLEAR ALL THIS DATA.\n\nContinue?`;
    
    if (!confirm(message)) {
      console.log('[CONTENT TYPE] User cancelled - reverting radio button');
      // Revert the radio button selection
      e.target.checked = false;
      const oldRadio = document.querySelector(`input[name="content_type"][value="${oldType}"]`);
      if (oldRadio) oldRadio.checked = true;
      return;
    }
    
    // User confirmed - clear ALL data
    console.log('[CONTENT TYPE] User confirmed - clearing ALL data');
    currentCase = {
      incidentType: 'death',
      name: '',
      dateOfDeath: '',
      age: '',
      country: '',
      gender: '',
      immigration_status: '',
      facility: '',
      city: '',
      state: '',
      causeOfDeath: '',
      agencies: [],
      violations: [],
      tags: []
    };
    verifiedQuotes = [];
    sources = [];
    media = [];
    pendingQuotes = [];
    verifiedFields = {};
    fieldQuoteAssociations = {};
    
    // Clear storage
    chrome.storage.local.set({
      currentCase: currentCase,
      verifiedQuotes: [],
      sources: [],
      fieldQuoteAssociations: {}
    });
    
    // Clear ALL form fields
    if (document.getElementById('caseName')) document.getElementById('caseName').value = '';
    if (document.getElementById('caseCity')) document.getElementById('caseCity').value = '';
    if (document.getElementById('caseState')) document.getElementById('caseState').value = '';
    if (document.getElementById('caseCause')) document.getElementById('caseCause').value = '';
    if (document.getElementById('statementHeadline')) document.getElementById('statementHeadline').value = '';
    if (document.getElementById('speakerName')) document.getElementById('speakerName').value = '';
    if (document.getElementById('statementKeyQuote')) document.getElementById('statementKeyQuote').value = '';
    
    // Render empty lists
    renderQuotes();
    renderSources();
    renderMediaList();
    renderPendingQuotes();
    
    console.log('[CONTENT TYPE] Data cleared');
  }
  
  // In review mode, don't render quotes here - they will be rendered after loading
  if (reviewMode) {
    console.log('[CONTENT TYPE] Review mode - skipping immediate render');
  } else {
    // Only render when not in review mode (normal content type switching)
    renderQuotes();
    renderSources();
  }
  
  // Now update the content type
  currentContentType = newType;
  
  // Notify background script to update context menu
  const statementType = newType === 'statement' ? (elements.statementType?.value || '') : '';
  chrome.runtime.sendMessage({
    type: 'SET_CONTENT_MODE',
    mode: newType,
    isValidateMode: false,
    statementType: statementType
  });
  
  // Toggle form containers
  if (elements.incidentFormContainer) {
    elements.incidentFormContainer.style.display = newType === 'incident' ? 'block' : 'none';
  }
  if (elements.statementFormContainer) {
    elements.statementFormContainer.style.display = newType === 'statement' ? 'block' : 'none';
  }
  
  // Update button text
  if (elements.newCaseBtn) {
    elements.newCaseBtn.textContent = newType === 'incident' ? 'New Incident' : 'New Statement';
  }
  
  // If switching to statement, set today's date if empty
  if (newType === 'statement' && elements.statementDate && !elements.statementDate.value) {
    elements.statementDate.value = new Date().toISOString().split('T')[0];
  }
  
  // Initialize statement form visibility
  if (newType === 'statement') {
    handleStatementTypeChange();
  }
  
  console.log('[CONTENT TYPE] Content type changed to:', newType);
}

/**
 * Handle statement type change - simplified, no conditional sections
 */
function handleStatementTypeChange() {
  const statementType = elements.statementType ? elements.statementType.value : '';
  
  // Update context menu (all statement types show same menu now)
  chrome.runtime.sendMessage({
    type: 'SET_CONTENT_MODE',
    mode: 'statement',
    isValidateMode: false,
    statementType: statementType
  });
}

/**
 * Get current form data based on content type
 */
function getCurrentFormData() {
  if (currentContentType === 'statement') {
    return getStatementFormData();
  }
  return getIncidentFormData();
}

/**
 * Get statement form data
 */
function getStatementFormData() {
  return {
    content_type: 'statement',
    statement_type: elements.statementType?.value || '',
    statement_date: elements.statementDate?.value || '',
    headline: elements.statementHeadline?.value || '',
    key_quote: elements.statementKeyQuote?.value || '',
    speaker: {
      name: elements.speakerName?.value || '',
      title: elements.speakerTitle?.value || '',
      speaker_type: elements.speakerType?.value || '',
      political_affiliation: elements.politicalAffiliation?.value || '',
      wikipedia_url: elements.speakerWikipedia?.value || '',
    },
    platform: elements.statementPlatform?.value || '',
    platform_url: elements.statementPlatformUrl?.value || '',
    context: elements.statementContext?.value || '',
    impact_level: elements.statementImpactLevel?.value || '',
    media_coverage: elements.statementMediaCoverage?.value || '',
    quotes: verifiedQuotes,
    sources: sources,
  };
}

/**
 * Get incident form data (existing functionality)
 */
function getIncidentFormData() {
  // This returns the current case data structure
  // Existing code already handles this via currentCase
  return {
    content_type: 'incident',
    ...currentCase
  };
}

/**
 * Clear statement form
 */
function clearStatementForm() {
  if (elements.statementType) elements.statementType.value = '';
  if (elements.statementDate) elements.statementDate.value = '';
  if (elements.statementHeadline) elements.statementHeadline.value = '';
  if (elements.statementKeyQuote) elements.statementKeyQuote.value = '';
  if (elements.speakerName) elements.speakerName.value = '';
  if (elements.speakerTitle) elements.speakerTitle.value = '';
  if (elements.speakerOrganization) elements.speakerOrganization.value = '';
  if (elements.speakerType) elements.speakerType.value = '';
  if (elements.politicalAffiliation) elements.politicalAffiliation.value = '';
  if (elements.speakerCredentials) elements.speakerCredentials.value = '';
  if (elements.speakerWikipedia) elements.speakerWikipedia.value = '';
  if (elements.statementPlatform) elements.statementPlatform.value = '';
  if (elements.statementPlatformUrl) elements.statementPlatformUrl.value = '';
  if (elements.statementFullText) elements.statementFullText.value = '';
  if (elements.statementContext) elements.statementContext.value = '';
  if (elements.statementImpactLevel) elements.statementImpactLevel.value = '';
  if (elements.statementMediaCoverage) elements.statementMediaCoverage.value = '';
  if (elements.engagementLikes) elements.engagementLikes.value = '';
  if (elements.engagementShares) elements.engagementShares.value = '';
  if (elements.engagementViews) elements.engagementViews.value = '';
  if (elements.previouslySupported) elements.previouslySupported.checked = false;
  if (elements.partyTypicallySupports) elements.partyTypicallySupports.checked = false;
  if (elements.breakingRanks) elements.breakingRanks.checked = false;
  if (elements.iceResponse) elements.iceResponse.value = '';
  if (elements.notableResponses) elements.notableResponses.value = '';
  
  // Reset conditional section visibility
  handleStatementTypeChange();
}

/**
 * Save a new statement
 */
async function saveStatement() {
  console.log('saveStatement called - reviewMode:', reviewMode, 'reviewIncidentId:', reviewIncidentId);
  
  // If in review mode, submit statement verification instead
  if (reviewMode && reviewIncidentId) {
    console.log('Submitting statement verification...');
    return submitStatementVerification();
  }
  
  if (!isConnected) {
    alert('Not connected to API. Please ensure the server is running.');
    return;
  }
  
  // Get statement data
  const statementData = getStatementFormData();
  
  // Validate required fields
  if (!statementData.statement_type) {
    alert('Please select a statement type.');
    return;
  }
  
  if (!statementData.speaker?.name) {
    alert('Please enter the speaker name.');
    return;
  }
  
  if (!statementData.key_quote) {
    alert('Please enter the key quote from the statement.');
    return;
  }
  
  if (!statementData.statement_date) {
    alert('Please enter the date of the statement.');
    return;
  }
  
  // Validate: quotes must have sources
  if (verifiedQuotes.length > 0 && sources.length === 0) {
    alert('Cannot save quotes without sources. Add at least one source first.');
    return;
  }
  
  // Check for API key
  const isGuestSubmission = !apiKey;
  
  const saveBtn = document.getElementById('saveCaseBtn');
  if (!saveBtn) return;
  
  saveBtn.disabled = true;
  saveBtn.innerHTML = '<div class="spinner white"></div> Submitting statement...';
  
  try {
    // Build the statement object
    const statement = {
      ...statementData,
      quotes: verifiedQuotes.map(q => ({
        ...q,
        verified: verifiedFields[`quote_${q.id}`] || false
      })),
      sources: sources,
      field_quote_map: fieldQuoteAssociations,
      submitted_at: new Date().toISOString(),
      is_guest_submission: isGuestSubmission,
    };
    
    console.log('Submitting statement:', statement);
    
    // Submit to API
    const response = await fetch(`${apiUrl}/api/statements`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { 
          'Authorization': `Bearer ${apiKey}`,
          'X-API-Key': apiKey 
        } : {})
      },
      body: JSON.stringify(statement)
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to submit statement');
    }
    
    const result = await response.json();
    console.log('Statement submitted:', result);
    
    // Clear form on success
    clearStatementForm();
    verifiedQuotes.length = 0;
    sources.length = 0;
    fieldQuoteAssociations = {};
    renderQuotes();
    renderSources();
    
    // Show success message
    const statusMsg = isGuestSubmission 
      ? 'Statement submitted for review! An editor will verify and publish it.'
      : 'Statement saved successfully!';
    showNotification(statusMsg, 'success');
    
  } catch (error) {
    console.error('Error saving statement:', error);
    showNotification(error.message || 'Failed to save statement', 'error');
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Submit Verification';
  }
}

// Create new case
function newCase() {
  // Prevent starting new case while reviewing
  if (reviewMode) {
    const contentName = currentContentType === 'statement' ? 'statement' : 'case';
    alert(`You are currently reviewing a ${contentName}. Please finish or cancel that review before starting a new ${currentContentType}.`);
    return;
  }
  
  const hasData = currentContentType === 'statement' 
    ? (elements.speakerName?.value || elements.statementKeyQuote?.value || verifiedQuotes.length > 0)
    : (verifiedQuotes.length > 0 || currentCase.name);
  
  if (hasData) {
    const typeName = currentContentType === 'statement' ? 'statement' : 'incident';
    if (!confirm(`Start a new ${typeName}? Current data will be cleared.`)) {
      return;
    }
  }
  
  if (currentContentType === 'statement') {
    clearStatementForm();
    // Also clear quotes and sources
    verifiedQuotes.length = 0;
    sources.length = 0;
    renderQuotes();
    renderSources();
  } else {
    clearCase();
  }
}

// Check for duplicate cases
async function checkForDuplicates() {
  const name = elements.caseName ? elements.caseName.value.trim() : '';
  const resultsDiv = document.getElementById('duplicateResults');
  const btn = document.getElementById('checkDuplicatesBtn');
  
  if (!resultsDiv) return;
  
  if (!name || name.length < 2) {
    resultsDiv.innerHTML = '<div style="color: #92400e;">Enter at least 2 characters in the name field to check for duplicates.</div>';
    resultsDiv.classList.remove('hidden', 'has-matches', 'no-matches', 'error');
    resultsDiv.classList.add('has-matches');
    return;
  }
  
  // Get API base URL from settings
  const settings = await chrome.storage.local.get('apiUrl');
  const apiUrl = settings.apiUrl || 'https://ice-deaths.vercel.app';
  
  // Show loading state
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '🔍 Checking...';
  }
  resultsDiv.classList.remove('hidden', 'has-matches', 'no-matches', 'error');
  resultsDiv.innerHTML = '<div style="text-align: center;">Searching...</div>';
  
  try {
    const response = await fetch(`${apiUrl}/api/duplicate-check?name=${encodeURIComponent(name)}`);
    
    if (!response.ok) {
      throw new Error('Search failed');
    }
    
    const data = await response.json();
    const cases = data.cases || [];
    
    if (cases.length === 0) {
      resultsDiv.classList.add('no-matches');
      resultsDiv.innerHTML = '<div style="color: #166534;">✓ No existing cases found matching this name.</div>';
    } else {
      resultsDiv.classList.add('has-matches');
      let html = `<div style="color: #92400e; margin-bottom: 8px;"><strong>⚠️ ${cases.length} potential match${cases.length > 1 ? 'es' : ''} found:</strong></div>`;
      
      cases.forEach(c => {
        const statusClass = c.type || 'unverified';
        const statusLabel = {
          'verified': 'Verified',
          'unverified': 'Unverified',
          'in_review': 'In Review',
          'guest_report': 'Guest Report'
        }[statusClass] || 'Unknown';
        
        html += `
          <div class="duplicate-match">
            <div class="duplicate-match-name">${escapeHtml(c.name)}</div>
            <div class="duplicate-match-details">
              ${c.incident_date ? formatDate(c.incident_date) : 'No date'} 
              ${c.city ? '• ' + escapeHtml(c.city) : ''} 
              ${c.state ? ', ' + escapeHtml(c.state) : ''}
            </div>
            <span class="duplicate-match-status ${statusClass}">${statusLabel}</span>
            ${c.id ? `<a href="${apiUrl}/incidents/${c.id}" target="_blank" class="duplicate-match-link">View case →</a>` : ''}
          </div>
        `;
      });
      
      html += '<div style="margin-top: 8px; font-size: 11px; color: #6b7280;">If this is a new case, proceed with entry. If this matches an existing case, consider adding information to the existing record instead.</div>';
      resultsDiv.innerHTML = html;
    }
  } catch (err) {
    console.error('Duplicate check error:', err);
    resultsDiv.classList.add('error');
    resultsDiv.innerHTML = '<div style="color: #dc2626;">Failed to check for duplicates. Ensure you are connected to the server.</div>';
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '🔍 Check for Duplicates';
    }
  }
}

// Helper function to format date without timezone shift
function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    // Parse as UTC date components to avoid timezone shift
    const datePart = String(dateStr).split('T')[0];
    const [year, month, day] = datePart.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch (e) {
    return dateStr;
  }
}

// Helper function to format date for display (no timezone shift)
function formatDateLocal(dateStr) {
  if (!dateStr) return '';
  try {
    const datePart = String(dateStr).split('T')[0];
    const [year, month, day] = datePart.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString();
  } catch (e) {
    return dateStr;
  }
}

// Clear current case
function clearCase() {
  currentCase = {
    incidentType: 'death',
    name: '',
    dateOfDeath: '',
    age: '',
    country: '',
    gender: '',
    immigration_status: '',
    facility: '',
    city: '',
    state: '',
    causeOfDeath: '',
    agencies: [],
    violations: [],
    violations_alleged: [],
    violations_potential: [],
    violations_possible: [],
    violation_details_map: {},
    violations_data: [],
    tags: [],
    deathCause: '',
    deathManner: '',
    deathCustodyDuration: '',
    deathMedicalDenied: false,
    injuryType: '',
    injurySeverity: '',
    injuryWeapon: '',
    injuryCause: '',
    arrestReason: '',
    arrestContext: '',
    arrestCharges: '',
    arrestTimingSuspicious: false,
    arrestPretext: false,
    arrestSelective: false,
    violationJournalism: false,
    violationProtest: false,
    violationActivism: false,
    violationSpeech: '',
    violationRuling: ''
  };
  verifiedQuotes = [];
  pendingQuotes = [];
  sources = [];
  media = [];  // Clear media
  fieldQuoteAssociations = {};
  chrome.storage.local.set({ fieldQuoteAssociations: {} });
  
  // Clear agency checkboxes
  document.querySelectorAll('[id^="agency-"]').forEach(checkbox => {
    checkbox.checked = false;
  });
  
  // Clear violation checkboxes (new card-based system)
  document.querySelectorAll('.violation-checkbox').forEach(checkbox => {
    checkbox.checked = false;
    const card = checkbox.closest('.violation-card');
    if (card) {
      card.classList.remove('selected');
      const details = card.querySelector('.violation-details');
      if (details) details.classList.add('hidden');
      
      // Clear form fields within card
      const classification = card.querySelector('.violation-classification');
      if (classification) classification.value = 'alleged';
      const description = card.querySelector('.violation-description');
      if (description) description.value = '';
      const caseLawSelect = card.querySelector('.violation-caselaw-select');
      if (caseLawSelect) caseLawSelect.value = '';
      const caseLawCustom = card.querySelector('.violation-caselaw-custom');
      if (caseLawCustom) {
        caseLawCustom.value = '';
        caseLawCustom.classList.add('hidden');
      }
    }
  });
  updateViolationCount();
  
  populateCaseForm();
  renderQuotes();
  renderPendingQuotes();
  renderSources();
  renderMediaList();  // Render empty media list
  updateQuoteAssociationDropdowns();
  updateAgencyQuoteLinks();
  
  // Reset agency checkbox states
  document.querySelectorAll('.checkbox-with-quote').forEach(wrapper => {
    wrapper.classList.remove('checked');
  });
  
  chrome.runtime.sendMessage({ type: 'SET_CURRENT_CASE', case: currentCase });
  chrome.runtime.sendMessage({ type: 'CLEAR_QUOTES' });
}

// Listen for messages from background
chrome.runtime.onMessage.addListener((message) => {
  switch (message.type) {
    case 'QUOTE_ADDED':
      pendingQuotes.push(message.quote);
      renderPendingQuotes();
      break;
    
    case 'QUOTE_VERIFIED':
      // User-selected quote added directly to verified - add to top and show it
      verifiedQuotes.unshift(message.quote);
      // Auto-verify the quote since user explicitly selected it
      verifiedFields[`quote_${message.quote.id}`] = true;
      // Link quote to field if specified
      if (message.quote.linkedField) {
        // Map context menu field keys to picker field keys
        const contextMenuToPickerMap = {
          'victim_name': 'name',
          'incident_date': 'date',
          'subject_age': 'age',
          'subject_nationality': 'nationality',
          'subject_gender': 'gender',
          'subject_immigration_status': 'immigration_status',
          'facility': 'facility',
          'city': 'city',
          'state': 'state',
          'summary': 'summary',
          'cause_of_death': 'death_cause',
          'manner_of_death': 'death_manner',
          'custody_duration': 'death_custody_duration',
          'injury_type': 'injury_type',
          'injury_severity': 'injury_severity',
          'injury_weapon': 'injury_weapon',
          'injury_cause': 'injury_cause',
          'arrest_reason': 'arrest_reason',
          'arrest_context': 'arrest_context',
          'arrest_charges': 'arrest_charges'
        };
        
        const pickerFieldKey = contextMenuToPickerMap[message.quote.linkedField] || message.quote.linkedField;
        addQuoteToField(pickerFieldKey, message.quote.id);
        updateQuotePickerTriggers();
      }
      renderQuotes();
      syncQuotesToBackground();
      // Switch to Case tab to show the new quote
      const caseTab = document.querySelector('[data-tab="case"]');
      if (caseTab) caseTab.click();
      // Scroll the quote list to top to show the new quote
      if (elements.quoteList) {
        elements.quoteList.scrollTop = 0;
      }
      showNotification('Quote added to case', 'success');
      break;
    
    case 'QUOTE_CAPTURED':
      // Quote was captured from page selection
      const capturedQuote = {
        id: crypto.randomUUID(),
        text: message.text,
        sourceUrl: message.sourceUrl,
        sourceTitle: message.sourceTitle,
        category: 'general',
        status: 'verified',
        createdAt: new Date().toISOString()
      };
      
      verifiedQuotes.unshift(capturedQuote);
      verifiedFields[`quote_${capturedQuote.id}`] = true;
      
      // Link to field if specified
      if (message.field) {
        addQuoteToField(message.field, capturedQuote.id);
        updateQuotePickerTriggers();
      }
      
      renderQuotes();
      syncQuotesToBackground();
      
      // Reset capture buttons
      if (window.resetCaptureButtons) window.resetCaptureButtons();
      
      showNotification('Quote captured and linked', 'success');
      break;
    
    case 'CAPTURE_CANCELLED':
      // Content script cancelled capture mode
      if (window.resetCaptureButtons) window.resetCaptureButtons();
      break;
    
    case 'PROMPT_CUSTOM_FIELD':
      // Open modal to add a new custom field with the selected text as quote
      openCustomFieldModal(null, message.selectedText, message.sourceUrl, message.sourceTitle);
      break;
      
    case 'EXTRACTION_PROGRESS':
      elements.progressFill.style.width = `${message.progress}%`;
      elements.progressText.textContent = message.text;
      break;
      
    case 'TRIGGER_EXTRACT':
      extractArticle();
      break;
      
    case 'TRIGGER_SAVE':
      saveCase();
      break;
      
    case 'REFRESH_QUOTES':
      // Reload state from background when overlay makes changes
      loadState();
      break;
    
    case 'DOCUMENT_LOADED':
      // Document loaded from website - refresh all data
      loadState().then(() => {
        showNotification(`Document loaded: ${message.documentData.name || 'Unnamed'}`, 'success');
        // Switch to case tab to show the loaded data
        const caseTab = document.querySelector('[data-tab="case"]');
        if (caseTab) caseTab.click();
      });
      break;
  }
});

// Go to specific page in PDF
window.goToPage = function(pageNumber) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, { 
      type: 'SCROLL_TO_PAGE', 
      pageNumber: pageNumber
    });
  });
};

// === EXPORT FUNCTIONS ===

// Export as JSON
function exportAsJson() {
  const incident = buildIncidentObject();
  const exportData = {
    incident: incident,
    quotes: verifiedQuotes,
    sources: sources,
    exportedAt: new Date().toISOString()
  };
  
  const filename = incident.incident_id || `incident-${new Date().toISOString().split('T')[0]}`;
  
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// Get incident type label
function getIncidentTypeLabel(type) {
  const labels = {
    death: 'Death in Custody',
    injury: 'Injury',
    medical_neglect: 'Medical Neglect',
    arrest: 'Arrest/Detention',
    rights_violation: 'Rights Violation',
    deportation: 'Deportation',
    family_separation: 'Family Separation',
    workplace_raid: 'Workplace Raid',
    other: 'Other'
  };
  return labels[type] || type;
}

// Export as Markdown
function exportAsMarkdown() {
  const incident = buildIncidentObject();
  const incidentType = currentCase.incidentType || 'death';
  
  let md = `# ${currentCase.name || 'Subject Unknown'}\n\n`;
  md += `**Incident Type:** ${getIncidentTypeLabel(incidentType)}\n`;
  
  if (currentCase.dateOfDeath) {
    md += `**Date:** ${currentCase.dateOfDeath}\n`;
  }
  if (currentCase.age) {
    md += `**Age:** ${currentCase.age}\n`;
  }
  if (currentCase.country) {
    md += `**Nationality:** ${currentCase.country}\n`;
  }
  if (currentCase.occupation) {
    md += `**Occupation:** ${currentCase.occupation}\n`;
  }
  if (currentCase.facility) {
    md += `**Facility:** ${currentCase.facility}\n`;
  }
  if (currentCase.location) {
    md += `**Location:** ${currentCase.location}\n`;
  }
  
  // Agencies involved
  if (currentCase.agencies && currentCase.agencies.length > 0) {
    md += `**Agencies Involved:** ${currentCase.agencies.join(', ')}\n`;
  }
  
  // Violations (three-tier system)
  if (currentCase.violations_alleged && currentCase.violations_alleged.length > 0) {
    md += `**Violations Alleged:** ${currentCase.violations_alleged.join(', ')}\n`;
  }
  if (currentCase.violations_potential && currentCase.violations_potential.length > 0) {
    md += `**Violations Potential:** ${currentCase.violations_potential.join(', ')}\n`;
  }
  if (currentCase.violations_possible && currentCase.violations_possible.length > 0) {
    md += `**Violations Possible:** ${currentCase.violations_possible.join(', ')}\n`;
  }
  // Legacy fallback
  if (!currentCase.violations_alleged && !currentCase.violations_potential && !currentCase.violations_possible && currentCase.violations && currentCase.violations.length > 0) {
    md += `**Violations:** ${currentCase.violations.join(', ')}\n`;
  }
  
  // Violation basis details
  if (currentCase.violation_details_map && Object.keys(currentCase.violation_details_map).length > 0) {
    md += `\n### Violation Legal Basis\n\n`;
    for (const [key, basis] of Object.entries(currentCase.violation_details_map)) {
      md += `**${key}:**\n`;
      if (basis.legal_framework) md += `- Legal Framework: ${basis.legal_framework}\n`;
      if (basis.relevant_facts?.length) md += `- Relevant Facts: ${basis.relevant_facts.join('; ')}\n`;
      if (basis.note) md += `- Note: ${basis.note}\n`;
      md += '\n';
    }
  }
  
  if (currentCase.causeOfDeath) {
    md += `\n## Summary\n\n${currentCase.causeOfDeath}\n`;
  }
  
  // Case image
  if (currentCase.imageUrl) {
    md += `\n## Case Image\n\n![Case Image](${currentCase.imageUrl})\n`;
  }
  
  // Type-specific details
  if (incidentType === 'death' && incident.death_details) {
    md += `\n## Death Details\n\n`;
    if (incident.death_details.cause_of_death) md += `- **Cause:** ${incident.death_details.cause_of_death}\n`;
    if (incident.death_details.manner_of_death) md += `- **Manner:** ${incident.death_details.manner_of_death}\n`;
    if (incident.death_details.custody_duration) md += `- **Custody Duration:** ${incident.death_details.custody_duration}\n`;
    if (incident.death_details.medical_requests_denied) md += `- **Medical Requests Denied:** Yes\n`;
  }
  
  if (incidentType === 'arrest' && incident.arrest_details) {
    md += `\n## Arrest Details\n\n`;
    if (incident.arrest_details.stated_reason) md += `- **Stated Reason:** ${incident.arrest_details.stated_reason}\n`;
    if (incident.arrest_details.actual_context) md += `- **Actual Context:** ${incident.arrest_details.actual_context}\n`;
    if (incident.arrest_details.charges?.length) md += `- **Charges:** ${incident.arrest_details.charges.join(', ')}\n`;
    if (incident.arrest_details.timing_suspicious) md += `- **Timing Suspicious**\n`;
    if (incident.arrest_details.pretext_arrest) md += `- **Pretext Arrest Indicators**\n`;
    if (incident.arrest_details.selective_enforcement) md += `- **Selective Enforcement**\n`;
  }
  
  if (incidentType === 'rights_violation' && incident.violation_details) {
    md += `\n## Violation Details\n\n`;
    if (incident.violation_details.journalism_related) md += `- **Journalism Related**\n`;
    if (incident.violation_details.protest_related) md += `- **Protest Related**\n`;
    if (incident.violation_details.activism_related) md += `- **Activism Related**\n`;
    if (incident.violation_details.speech_content) md += `- **Speech/Activity:** ${incident.violation_details.speech_content}\n`;
    if (incident.violation_details.court_ruling) md += `- **Court Ruling:** ${incident.violation_details.court_ruling}\n`;
  }
  
  if (verifiedQuotes.length > 0) {
    md += `\n## Verified Quotes (${verifiedQuotes.length})\n\n`;
    
    const byCategory = {};
    verifiedQuotes.forEach(q => {
      if (!byCategory[q.category]) byCategory[q.category] = [];
      byCategory[q.category].push(q);
    });
    
    for (const [category, quotes] of Object.entries(byCategory)) {
      md += `### ${category.charAt(0).toUpperCase() + category.slice(1)}\n\n`;
      quotes.forEach(q => {
        md += `> "${q.text}"\n`;
        if (q.pageNumber) md += `> — Page ${q.pageNumber}\n`;
        md += '\n';
      });
    }
  }
  
  if (sources.length > 0) {
    md += `## Sources (${sources.length})\n\n`;
    sources.forEach((s, i) => {
      md += `${i + 1}. [${s.title || s.url}](${s.url})\n`;
    });
  }
  
  md += `\n---\n*Exported on ${new Date().toLocaleString()}*\n`;
  
  const filename = incident.incident_id || `incident-${new Date().toISOString().split('T')[0]}`;
  
  const blob = new Blob([md], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

// Copy all quotes to clipboard
function copyAllQuotes() {
  if (verifiedQuotes.length === 0) {
    alert('No verified quotes to copy');
    return;
  }
  
  const text = verifiedQuotes.map(q => {
    let line = `"${q.text}"`;
    if (q.pageNumber) line += ` (Page ${q.pageNumber})`;
    line += ` [${q.category}]`;
    return line;
  }).join('\n\n');
  
  navigator.clipboard.writeText(text).then(() => {
    alert(`Copied ${verifiedQuotes.length} quotes to clipboard`);
  });
}

// === SEARCH FUNCTIONS ===

// Debounce helper
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Search existing cases
async function searchCases() {
  const query = elements.caseSearchInput.value.trim();
  
  if (!query || query.length < 2) {
    elements.caseSearchResults.innerHTML = '<div class="search-empty">Type at least 2 characters to search</div>';
    return;
  }
  
  if (!isConnected) {
    elements.caseSearchResults.innerHTML = '<div class="search-empty">Not connected to API</div>';
    return;
  }
  
  try {
    const response = await fetch(`${apiUrl}/api/extension/cases?search=${encodeURIComponent(query)}`);
    if (!response.ok) throw new Error('Search failed');
    
    const results = await response.json();
    
    if (!results || results.length === 0) {
      elements.caseSearchResults.innerHTML = '<div class="search-empty">No cases found</div>';
      return;
    }
    
    elements.caseSearchResults.innerHTML = results.slice(0, 10).map(c => `
      <div class="search-result-item" data-id="${c.id}">
        <div class="search-result-name">${escapeHtml(c.name)}</div>
        <div class="search-result-meta">
          ${c.date_of_death ? `📅 ${c.date_of_death}` : ''}
          ${c.facility ? `• 🏢 ${c.facility}` : ''}
        </div>
      </div>
    `).join('');
    
    // Add click handlers
    elements.caseSearchResults.querySelectorAll('.search-result-item').forEach(item => {
      item.addEventListener('click', () => loadExistingCase(item.dataset.id));
    });
    
  } catch (error) {
    elements.caseSearchResults.innerHTML = `<div class="search-empty">Error: ${error.message}</div>`;
  }
}

// Load existing case from search
async function loadExistingCase(caseId) {
  if (verifiedQuotes.length > 0 || currentCase.name) {
    if (!confirm('Load this case? Current unsaved data will be lost.')) {
      return;
    }
  }
  
  try {
    const response = await fetch(`${apiUrl}/api/extension/cases/${caseId}`);
    if (!response.ok) throw new Error('Failed to load case');
    
    const data = await response.json();
    
    currentCase = {
      name: data.name || '',
      dateOfDeath: data.date_of_death || '',
      age: data.age || '',
      country: data.country_of_origin || '',
      facility: data.facility || '',
      location: data.location || '',
      causeOfDeath: data.cause_of_death || ''
    };
    
    verifiedQuotes = (data.quotes || []).map(q => ({
      id: q.id || crypto.randomUUID(),
      text: q.quote_text,
      category: q.category || 'context',
      pageNumber: q.page_number,
      status: 'verified'
    }));
    
    // Mark all loaded quotes as verified in verifiedFields so they display
    verifiedQuotes.forEach(q => {
      verifiedFields[`quote_${q.id}`] = true;
    });
    
    sources = (data.sources || []).map(s => ({
      url: s.url,
      title: s.title
    }));
    
    pendingQuotes = [];
    
    populateCaseForm();
    renderQuotes();
    renderPendingQuotes();
    renderSources();
    syncQuotesToBackground();
    
    // Switch to case tab
    document.querySelector('.tab[data-tab="case"]').click();
    
    alert('Case loaded successfully');
    
  } catch (error) {
    alert('Failed to load case: ' + error.message);
  }
}

// === DATA MANAGEMENT ===

// Clear all extension data
function clearAllData() {
  if (!confirm('This will remove ALL unsaved data including cases, quotes, and custom selectors.\n\nAre you sure?')) {
    return;
  }
  
  chrome.storage.local.clear(() => {
    currentCase = {
      name: '',
      dateOfDeath: '',
      age: '',
      country: '',
      facility: '',
      location: '',
      causeOfDeath: ''
    };
    verifiedQuotes = [];
    pendingQuotes = [];
    sources = [];
    currentSelectors = {};
    
    populateCaseForm();
    renderQuotes();
    renderPendingQuotes();
    renderSources();
    
    chrome.runtime.sendMessage({ type: 'SET_CURRENT_CASE', case: currentCase });
    chrome.runtime.sendMessage({ type: 'CLEAR_QUOTES' });
    
    alert('All extension data cleared');
  });
}

// Listen for tab changes to update page info
chrome.tabs.onActivated.addListener(() => {
  // Delay to let content script load on new tab
  setTimeout(() => {
    updatePageInfo();
  }, 500);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'complete') {
    // Small delay to ensure content script is ready
    setTimeout(() => {
      updatePageInfo();
    }, 300);
  }
});

// ============================================
// REVIEW QUEUE FUNCTIONS (Analyst Only)
// ============================================

// Current filter for review queue
let reviewQueueFilter = 'needs_review';

// Lock management variables
let currentLockId = null;  // ID of the incident we currently have locked
let lockHeartbeatInterval = null;  // Interval for extending locks

// Acquire a lock on an incident
async function acquireLock(incidentId) {
  try {
    const response = await fetch(`${apiUrl}/api/incidents/${incidentId}/lock`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'X-API-Key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      // Lock failed - someone else has it
      if (response.status === 423) {
        const lockerName = data.lockedByName || data.lockedByEmail || 'Someone';
        alert(`This case is currently locked by ${lockerName}.\n\nRemaining time: ${data.remainingMinutes} minutes.\n\nPlease choose a different case or wait.`);
        return false;
      }
      console.error('Lock acquisition failed:', data.error);
      return false;
    }
    
    console.log('Lock acquired for incident', incidentId);
    currentLockId = incidentId;
    
    // Start heartbeat to extend lock every 5 minutes
    startLockHeartbeat(incidentId);
    
    // Update lock display
    updateCurrentLockDisplay();
    
    return true;
  } catch (error) {
    console.error('Error acquiring lock:', error);
    return false;
  }
}

// Acquire lock with case info for display
async function acquireLockWithInfo(incidentId, caseInfo) {
  const success = await acquireLock(incidentId);
  if (success) {
    currentLockedCaseInfo = caseInfo;
    updateCurrentLockDisplay();
  }
  return success;
}

// Release a lock on an incident
async function releaseLock(incidentId) {
  if (!incidentId) return;
  
  try {
    const response = await fetch(`${apiUrl}/api/incidents/${incidentId}/lock`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'X-API-Key': apiKey
      }
    });
    
    if (response.ok) {
      console.log('Lock released for incident', incidentId);
    }
  } catch (error) {
    console.error('Error releasing lock:', error);
  }
  
  if (currentLockId === incidentId) {
    currentLockId = null;
    currentLockedCaseInfo = null;
    stopLockHeartbeat();
    updateCurrentLockDisplay();
  }
}

// Extend the current lock
async function extendLock(incidentId) {
  if (!incidentId) return;
  
  try {
    const response = await fetch(`${apiUrl}/api/incidents/${incidentId}/lock`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'X-API-Key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ extend: true })
    });
    
    if (response.ok) {
      console.log('Lock extended for incident', incidentId);
    } else {
      console.warn('Failed to extend lock:', await response.text());
    }
  } catch (error) {
    console.error('Error extending lock:', error);
  }
}

// Start heartbeat to keep lock alive
function startLockHeartbeat(incidentId) {
  stopLockHeartbeat(); // Clear any existing heartbeat
  
  // Extend lock every 5 minutes (lock duration is 30 minutes)
  lockHeartbeatInterval = setInterval(() => {
    extendLock(incidentId);
  }, 5 * 60 * 1000); // 5 minutes
}

// Stop the lock heartbeat
function stopLockHeartbeat() {
  if (lockHeartbeatInterval) {
    clearInterval(lockHeartbeatInterval);
    lockHeartbeatInterval = null;
  }
}

// Release lock when page unloads
window.addEventListener('beforeunload', () => {
  if (currentLockId) {
    // Use sendBeacon for reliable delivery on page close
    const url = `${apiUrl}/api/incidents/${currentLockId}/lock`;
    navigator.sendBeacon(url, ''); // Note: sendBeacon sends POST, we need DELETE
    // Fallback: make a synchronous request (blocking)
    try {
      const xhr = new XMLHttpRequest();
      xhr.open('DELETE', url, false); // false = synchronous
      xhr.setRequestHeader('Authorization', `Bearer ${apiKey}`);
      xhr.setRequestHeader('X-API-Key', apiKey);
      xhr.send();
    } catch (e) {
      console.error('Failed to release lock on unload:', e);
    }
  }
});

// Track current locked case info for display
let currentLockedCaseInfo = null;

// Update the current lock display in settings
function updateCurrentLockDisplay() {
  const section = document.getElementById('currentLockSection');
  const infoEl = document.getElementById('currentLockInfo');
  if (!section || !infoEl) return;
  
  if (currentLockId && currentLockedCaseInfo) {
    section.style.display = 'block';
    infoEl.innerHTML = `
      <div style="font-weight: 600; margin-bottom: 8px;">
        ${escapeHtml(currentLockedCaseInfo.name || 'Unknown')}
      </div>
      <div style="font-size: 11px; color: #666; margin-bottom: 8px;">
        Case #${currentLockId} • ${escapeHtml(currentLockedCaseInfo.type || 'Incident')}
      </div>
      <div style="display: flex; gap: 8px;">
        <button class="btn btn-small btn-primary" onclick="goToLockedCase()">📝 Continue Review</button>
        <button class="btn btn-small btn-danger" onclick="releaseCurrentLock()">🔓 Release Lock</button>
      </div>
    `;
  } else {
    section.style.display = 'none';
  }
}

// Go to the currently locked case
function goToLockedCase() {
  if (!currentLockId || !currentLockedCaseInfo) return;
  
  const status = currentLockedCaseInfo.status;
  if (['first_review', 'first_validation'].includes(status)) {
    // Switch to Validate tab
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelector('[data-tab="validate"]')?.classList.add('active');
    document.querySelectorAll('.tab-content').forEach(p => p.classList.remove('active'));
    document.getElementById('tab-validate')?.classList.add('active');
    loadValidationCase(currentLockId);
  } else {
    // Switch to Case tab for review
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelector('[data-tab="case"]')?.classList.add('active');
    document.querySelectorAll('.tab-content').forEach(p => p.classList.remove('active'));
    document.getElementById('tab-case')?.classList.add('active');
    loadReviewCaseDetails(currentLockId);
  }
}
window.goToLockedCase = goToLockedCase;

// Release the current lock manually
async function releaseCurrentLock() {
  if (!currentLockId) return;
  
  if (confirm('Are you sure you want to release this lock? Another reviewer can then take over this case.')) {
    await releaseLock(currentLockId);
    currentLockedCaseInfo = null;
    updateCurrentLockDisplay();
    // Refresh queues to update lock status
    loadReviewQueue(reviewQueueFilter);
    loadValidationQueue();
    alert('Lock released. The case is now available for others to review.');
  }
}
window.releaseCurrentLock = releaseCurrentLock;

// Load my activity (cases I've reviewed, am reviewing, etc.)
async function loadMyActivity() {
  const listEl = document.getElementById('myActivityList');
  const statsEl = document.getElementById('myActivityStats');
  if (!listEl) return;
  
  listEl.innerHTML = '<div style="text-align: center; padding: 20px; color: #666; font-size: 12px;">Loading activity...</div>';
  
  try {
    const response = await fetch(`${apiUrl}/api/my-activity?_t=${Date.now()}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'X-API-Key': apiKey,
        'Cache-Control': 'no-cache'
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to load activity');
    }
    
    const data = await response.json();
    
    // Update current lock if returned from API
    if (data.currentLock) {
      currentLockId = data.currentLock.id;
      currentLockedCaseInfo = {
        id: data.currentLock.id,
        name: data.currentLock.name,
        type: data.currentLock.type,
        status: data.currentLock.status
      };
      updateCurrentLockDisplay();
    }
    
    // Show stats if available
    if (statsEl && data.stats) {
      const total = data.stats.reviewsDone + data.stats.firstValidationsDone + data.stats.secondValidationsDone;
      statsEl.innerHTML = `
        <div style="display: flex; gap: 8px; flex-wrap: wrap; padding: 8px; background: #f9fafb; border-radius: 6px; font-size: 11px;">
          <span title="First reviews completed">📝 ${data.stats.reviewsDone}</span>
          <span title="First validations completed">✓ ${data.stats.firstValidationsDone}</span>
          <span title="Second validations completed">✓✓ ${data.stats.secondValidationsDone}</span>
          <span title="Published cases you contributed to">🌟 ${data.stats.publishedContributions}</span>
        </div>
      `;
    }
    
    if (!data.recentActivity || data.recentActivity.length === 0) {
      listEl.innerHTML = '<div style="text-align: center; padding: 20px; color: #666; font-size: 12px;">No recent activity</div>';
      return;
    }
    
    listEl.innerHTML = data.recentActivity.map(item => {
      const dateStr = item.actionDate ? new Date(item.actionDate).toLocaleDateString() : '';
      const timeStr = item.actionDate ? new Date(item.actionDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
      
      let roleIcon = '📝';
      let roleText = 'Reviewed';
      let roleColor = '#6b7280';
      
      if (item.myRole === 'first_review') {
        roleIcon = '📝';
        roleText = 'Reviewed';
        roleColor = '#3b82f6';
      } else if (item.myRole === 'first_validation') {
        roleIcon = '✓';
        roleText = '1st Validation';
        roleColor = '#8b5cf6';
      } else if (item.myRole === 'second_validation') {
        roleIcon = '✓✓';
        roleText = '2nd Validation';
        roleColor = '#10b981';
      }
      
      // Status indicator
      let statusIcon = '';
      if (item.currentStatus === 'verified') {
        statusIcon = '🌟';
      } else if (item.currentStatus === 'rejected') {
        statusIcon = '❌';
      } else if (item.currentStatus === 'first_review' || item.currentStatus === 'first_validation') {
        statusIcon = '⏳';
      }
      
      return `
        <div style="padding: 10px; border-bottom: 1px solid #e5e7eb; cursor: pointer;" 
             onclick="openActivityCase(${item.id})">
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div style="flex: 1;">
              <div style="font-weight: 500; font-size: 13px;">${escapeHtml(item.name || 'Unknown')} ${statusIcon}</div>
              <div style="font-size: 11px; color: #666;">${escapeHtml(item.type)} • Case #${item.id}</div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 12px; color: ${roleColor}; font-weight: 500;">${roleIcon} ${roleText}</div>
            </div>
          </div>
          <div style="font-size: 10px; color: #999; margin-top: 4px;">
            ${dateStr} ${timeStr}
          </div>
        </div>
      `;
    }).join('');
    
  } catch (error) {
    console.error('Error loading activity:', error);
    listEl.innerHTML = '<div style="text-align: center; padding: 20px; color: #ef4444; font-size: 12px;">Failed to load activity</div>';
  }
}

// Open a case from activity
function openActivityCase(incidentId) {
  // Switch to Review tab and find the case
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelector('[data-tab="review"]')?.classList.add('active');
  document.querySelectorAll('.tab-content').forEach(p => p.classList.remove('active'));
  document.getElementById('tab-review')?.classList.add('active');
  
  // Look for the case in the queue
  const caseInQueue = reviewQueue.find(c => c.id === incidentId);
  if (caseInQueue) {
    // Simulate clicking on the case
    const card = document.querySelector(`[data-incident-id="${incidentId}"]`);
    if (card) {
      card.click();
      return;
    }
  }
  
  // If not in current queue, load the case directly
  loadReviewCaseDetails(incidentId);
}
window.openActivityCase = openActivityCase;

// Load review queue from API (unverified cases needing first verification)
async function loadReviewQueue(status = 'all') {
  const statusEl = document.getElementById('reviewQueueStatus');
  const listEl = document.getElementById('reviewQueueList');
  
  if (!statusEl || !listEl) return;
  
  statusEl.style.display = 'block';
  statusEl.textContent = 'Loading cases...';
  listEl.style.display = 'none';
  
  try {
    const response = await fetch(`${apiUrl}/api/verification-queue?status=${status}&_t=${Date.now()}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'X-API-Key': apiKey,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch verification queue');
    }
    
    const data = await response.json();
    
    console.log('Review queue response:', {
      total: data.incidents?.length,
      stats: data.stats
    });
    
    reviewQueue = data.incidents || [];
    reviewQueueStats = data.stats || {};
    
    // Update filter counts
    updateReviewFilterCounts();
    
    // Show priority alert for returned cases
    const returnedCount = reviewQueue.filter(i => (i.review_cycle || 1) >= 2).length;
    const alertEl = document.getElementById('reviewPriorityAlert');
    if (alertEl) {
      if (returnedCount > 0) {
        alertEl.style.display = 'block';
        alertEl.innerHTML = `
          <div class="priority-alert alert-orange" style="cursor: pointer;" onclick="setReviewFilter('returned')">
            ⚠️ <strong>${returnedCount}</strong> case${returnedCount !== 1 ? 's' : ''} returned from validation - review first!
          </div>
        `;
      } else {
        alertEl.style.display = 'none';
      }
    }
    
    if (reviewQueue.length === 0) {
      statusEl.textContent = 'No unverified cases found';
      statusEl.style.color = '#22c55e';
      return;
    }
    
    statusEl.style.display = 'none';
    listEl.style.display = 'block';
    renderReviewQueue();
    
  } catch (error) {
    console.error('Error loading unverified cases:', error);
    statusEl.textContent = 'Failed to load cases: ' + error.message;
    statusEl.style.color = '#ef4444';
  }
}

// Load guest submissions from API
async function loadGuestSubmissions() {
  const statusEl = document.getElementById('reviewQueueStatus');
  const listEl = document.getElementById('guestSubmissionsList');
  const queueListEl = document.getElementById('reviewQueueList');
  
  if (!statusEl || !listEl) return;
  
  // Hide the regular queue list, show guest submissions list
  if (queueListEl) queueListEl.style.display = 'none';
  statusEl.style.display = 'block';
  statusEl.textContent = 'Loading guest submissions...';
  listEl.style.display = 'none';
  
  try {
    const response = await fetch(`${apiUrl}/api/guest-submissions?status=pending&limit=50&_t=${Date.now()}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'X-API-Key': apiKey,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch guest submissions');
    }
    
    const data = await response.json();
    
    console.log('Guest submissions response:', data);
    
    guestSubmissionsQueue = data.submissions || [];
    guestSubmissionsCount = guestSubmissionsQueue.length;
    
    // Update the count in filter button
    const countEl = document.getElementById('reviewFilterGuestCount');
    if (countEl) countEl.textContent = guestSubmissionsCount;
    
    if (guestSubmissionsQueue.length === 0) {
      statusEl.textContent = 'No pending guest submissions';
      statusEl.style.color = '#22c55e';
      return;
    }
    
    statusEl.style.display = 'none';
    listEl.style.display = 'block';
    renderGuestSubmissions();
    
  } catch (error) {
    console.error('Error loading guest submissions:', error);
    statusEl.textContent = 'Failed to load submissions: ' + error.message;
    statusEl.style.color = '#ef4444';
  }
}

// Render guest submissions list
function renderGuestSubmissions() {
  const listEl = document.getElementById('guestSubmissionsList');
  if (!listEl) return;
  
  if (guestSubmissionsQueue.length === 0) {
    listEl.innerHTML = '<div class="empty-state">No pending guest submissions</div>';
    return;
  }
  
  listEl.innerHTML = guestSubmissionsQueue.map(submission => {
    const data = submission.submission_data || {};
    const createdAt = new Date(submission.created_at);
    
    return `
    <div class="review-case-card queue-item guest-submission-card" data-submission-id="${submission.id}" style="border-left: 3px solid #6366f1;">
      <div class="queue-item-header">
        <div>
          <div style="font-weight: 600; font-size: 13px;">
            ${escapeHtml(data.victimName || 'Unknown Victim')}
          </div>
          <div style="font-size: 11px; color: #666;">
            ${escapeHtml(data.incidentType?.replace(/_/g, ' ') || 'Incident')}
          </div>
        </div>
        <span class="badge" style="background: #e0e7ff; color: #4f46e5; padding: 2px 8px; border-radius: 4px; font-size: 10px;">
          📝 Guest Submission
        </span>
      </div>
      
      <div class="queue-item-meta" style="font-size: 11px; color: #666; margin: 8px 0;">
        ${escapeHtml(data.location || '')}
        ${data.dateOfDeath ? ' • ' + new Date(data.dateOfDeath).toLocaleDateString() : ''}
      </div>
      
      ${data.description ? `
        <div style="font-size: 11px; color: #374151; margin: 8px 0; padding: 8px; background: #f9fafb; border-radius: 4px; max-height: 60px; overflow: hidden;">
          ${escapeHtml(data.description.substring(0, 150))}${data.description.length > 150 ? '...' : ''}
        </div>
      ` : ''}
      
      <div style="display: flex; gap: 8px; flex-wrap: wrap; margin: 8px 0; font-size: 10px; color: #6b7280;">
        ${data.sourceUrls?.length ? `<span>📎 ${data.sourceUrls.length} source${data.sourceUrls.length !== 1 ? 's' : ''}</span>` : ''}
        ${data.mediaUrls?.length ? `<span>🖼️ ${data.mediaUrls.length} media</span>` : ''}
        ${submission.email ? '<span>✉️ Has contact</span>' : ''}
      </div>
      
      <div style="font-size: 10px; color: #9ca3af; margin-top: 4px;">
        Submitted ${createdAt.toLocaleDateString()} at ${createdAt.toLocaleTimeString()}
      </div>
      
      <div style="margin-top: 12px; display: flex; gap: 8px;">
        <button class="btn btn-sm btn-primary begin-guest-review-btn" data-submission-id="${submission.id}" style="flex: 1;">
          Begin Review
        </button>
        <button class="btn btn-sm btn-secondary reject-guest-btn" data-submission-id="${submission.id}" style="background: #fee2e2; color: #dc2626; border-color: #fecaca;">
          Reject
        </button>
      </div>
    </div>
  `}).join('');
  
  // Add click handlers for Begin Review buttons
  listEl.querySelectorAll('.begin-guest-review-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const submissionId = parseInt(btn.dataset.submissionId);
      handleBeginGuestReview(submissionId);
    });
  });
  
  // Add click handlers for Reject buttons
  listEl.querySelectorAll('.reject-guest-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const submissionId = parseInt(btn.dataset.submissionId);
      await handleRejectGuestSubmission(submissionId);
    });
  });
}

// Handle rejecting a guest submission
async function handleRejectGuestSubmission(submissionId) {
  const reason = prompt('Please provide a reason for rejecting this submission (optional):');
  
  try {
    const response = await fetch(`${apiUrl}/api/guest-submissions`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'X-API-Key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        id: submissionId,
        status: 'rejected',
        notes: reason || 'Rejected by analyst'
      })
    });
    
    if (!response.ok) {
      throw new Error('Failed to reject submission');
    }
    
    alert('Submission rejected');
    loadGuestSubmissions();
    
  } catch (error) {
    console.error('Error rejecting submission:', error);
    alert('Failed to reject submission: ' + error.message);
  }
}

// Handle beginning review of a guest submission
async function handleBeginGuestReview(submissionId) {
  const submission = guestSubmissionsQueue.find(s => s.id === submissionId);
  if (!submission) {
    alert('Submission not found');
    return;
  }
  
  const data = submission.submission_data || {};
  
  console.log('Beginning review for guest submission:', submission);
  
  // Set state for new incident from guest
  isNewIncidentFromGuest = true;
  currentGuestSubmissionId = submissionId;
  reviewMode = false;  // Not reviewing existing incident
  reviewIncidentId = null;
  
  // Reset verification state
  verifiedFields = {};
  verifiedMedia = {};
  
  // Reset form
  clearCase();
  
  // Populate currentCase from guest data
  currentCase = {
    incidentType: data.incidentType || 'death_in_custody',
    name: data.victimName || '',
    dateOfDeath: data.dateOfDeath || '',
    age: '',
    country: '',
    occupation: '',
    facility: data.facility || '',
    location: data.location || '',
    causeOfDeath: '',
    agencies: [],
    violations: [],
    deathCause: '',
    deathManner: '',
    deathCustodyDuration: '',
    deathMedicalDenied: false,
    summary: data.description || ''
  };
  
  // Populate sources from guest's source URLs
  sources = [];
  if (data.sourceUrls && Array.isArray(data.sourceUrls)) {
    data.sourceUrls.forEach(urlItem => {
      let url = '';
      let title = '';
      
      // Handle both string URLs and objects
      if (typeof urlItem === 'string') {
        url = urlItem;
        title = urlItem;
      } else if (typeof urlItem === 'object' && urlItem !== null) {
        url = urlItem.url || '';
        title = urlItem.title || urlItem.url || '';
      }
      
      if (url) {
        sources.push({
          id: `local-source-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          url: url,
          title: title,
          priority: 'secondary',
          addedAt: new Date().toISOString()
        });
      }
    });
  }
  
  // Populate media from guest's media URLs
  media = [];
  if (data.mediaUrls && Array.isArray(data.mediaUrls)) {
    data.mediaUrls.forEach((mediaItem, index) => {
      let url = '';
      let mediaType = 'image';
      let description = '';
      
      // Handle both string URLs and objects
      if (typeof mediaItem === 'string') {
        url = mediaItem;
        // Try to detect type from URL
        if (url.includes('youtube') || url.includes('vimeo') || url.includes('.mp4') || url.includes('.webm')) {
          mediaType = 'video';
        }
      } else if (typeof mediaItem === 'object' && mediaItem !== null) {
        url = mediaItem.url || '';
        mediaType = mediaItem.media_type || mediaItem.type || 'image';
        description = mediaItem.description || '';
      }
      
      if (url) {
        media.push({
          url: url,
          media_type: mediaType,
          description: description,
          addedAt: new Date().toISOString()
        });
      }
    });
  }
  
  // Clear pending and verified quotes
  pendingQuotes = [];
  verifiedQuotes = [];
  reviewTimeline = [];
  
  // Populate the form
  populateCaseForm();
  renderSources();
  renderMediaList();
  renderQuotes();
  renderTimeline();
  renderPendingQuotes();
  
  // Update UI to show we're creating a new incident
  const submitBtn = elements.submitBtn;
  if (submitBtn) {
    submitBtn.textContent = 'Create Incident & Submit First Review';
    submitBtn.disabled = false;
  }
  
  // Show field verification checkboxes
  document.querySelectorAll('.verification-checkbox-wrapper').forEach(wrapper => {
    wrapper.style.display = 'inline-flex';
  });
  
  // Switch to incident tab
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelector('[data-tab="case"]')?.classList.add('active');
  document.querySelectorAll('.tab-content').forEach(p => p.classList.remove('active'));
  document.getElementById('tab-case')?.classList.add('active');
  
  // Show info banner about guest submission
  showGuestReviewBanner(data.victimName || 'Unknown', submission.email);
}

// Show banner indicating we're reviewing a guest submission
function showGuestReviewBanner(victimName, contactEmail) {
  // Remove any existing banner
  const existingBanner = document.getElementById('guestReviewBanner');
  if (existingBanner) existingBanner.remove();
  
  // Create banner
  const banner = document.createElement('div');
  banner.id = 'guestReviewBanner';
  banner.style.cssText = 'background: #e0e7ff; border: 1px solid #a5b4fc; border-radius: 8px; padding: 12px; margin-bottom: 16px;';
  banner.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: start;">
      <div>
        <div style="font-weight: 600; color: #4338ca; font-size: 13px;">📝 Creating from Guest Submission</div>
        <div style="font-size: 11px; color: #6366f1; margin-top: 4px;">
          Review the pre-filled information, verify sources, add quotes, then submit.
        </div>
        ${contactEmail ? `<div style="font-size: 10px; color: #818cf8; margin-top: 4px;">Contact: ${escapeHtml(contactEmail)}</div>` : ''}
      </div>
      <button onclick="cancelGuestReview()" style="background: none; border: none; color: #6366f1; cursor: pointer; font-size: 18px; padding: 0;">&times;</button>
    </div>
  `;
  
  // Insert at top of incident tab
  const tabContent = document.getElementById('tab-case');
  if (tabContent) {
    tabContent.insertBefore(banner, tabContent.firstChild);
  }
}

// Cancel guest review and go back to Cases tab
function cancelGuestReview() {
  isNewIncidentFromGuest = false;
  currentGuestSubmissionId = null;
  
  // Remove banner
  const banner = document.getElementById('guestReviewBanner');
  if (banner) banner.remove();
  
  // Reset form
  clearCase();
  
  // Switch back to Cases tab
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelector('[data-tab="review"]')?.classList.add('active');
  document.querySelectorAll('.tab-content').forEach(p => p.classList.remove('active'));
  document.getElementById('tab-review')?.classList.add('active');
}

// Show banner for statement review
function showReviewBanner(statement) {
  // Remove any existing banner
  const existingBanner = document.getElementById('statementReviewBanner');
  if (existingBanner) existingBanner.remove();
  
  // Create banner
  const banner = document.createElement('div');
  banner.id = 'statementReviewBanner';
  banner.style.cssText = 'background: #dbeafe; border: 1px solid #93c5fd; border-radius: 8px; padding: 12px; margin-bottom: 16px;';
  
  const typeLabel = (statement.statement_type || '').replace('_', ' ');
  
  // Store tags globally for later saving
  window.reviewStatementTags = [...(statement.tags || [])];
  
  banner.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: start;">
      <div style="flex: 1;">
        <div style="font-weight: 600; color: #1e40af; font-size: 13px;">📢 Reviewing Statement</div>
        <div style="font-size: 12px; color: #3b82f6; margin-top: 4px;">
          <strong>${escapeHtml(statement.speaker_name || 'Unknown Speaker')}</strong> - ${escapeHtml(typeLabel)}
        </div>
        <div style="font-size: 11px; color: #60a5fa; margin-top: 2px;">
          ${escapeHtml(statement.headline || 'No headline')}
        </div>
        <div style="font-size: 10px; color: #93c5fd; margin-top: 6px;">
          Review the statement, verify quotes and sources, then approve or reject.
        </div>
        
        <!-- Tags Section -->
        <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #93c5fd;">
          <div style="font-size: 11px; font-weight: 600; color: #1e40af; margin-bottom: 6px;">🏷️ Tags</div>
          <div id="reviewStatementTags" style="display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 8px;">
            ${(statement.tags || []).map((tag) => `
              <span class="review-tag-chip" data-tag="${tag}" style="display: inline-flex; align-items: center; gap: 4px; background: #3b82f6; color: white; padding: 3px 8px; border-radius: 10px; font-size: 10px;">
                ${tag.replace(/-/g, ' ')}
                <button class="review-tag-remove" data-tag="${tag}" style="background: none; border: none; color: white; font-weight: bold; cursor: pointer; padding: 0 3px; font-size: 12px;">×</button>
              </span>
            `).join('')}
          </div>
          <div style="margin-top: 8px;">
            ${[
              { category: 'Topic', tags: ['family-separation', 'detention-conditions', 'deportation', 'border-enforcement', 'workplace-raids', 'racial-profiling', 'legal-rights', 'medical-care', 'mental-health'] },
              { category: 'Speaker', tags: ['politician', 'religious-leader', 'medical-professional', 'legal-expert', 'law-enforcement', 'immigrant-advocate', 'civil-rights-leader', 'business-leader', 'affected-person'] },
              { category: 'Characteristic', tags: ['breaking-ranks', 'cross-party', 'first-hand-account', 'emergency-response', 'viral'] },
              { category: 'Values', tags: ['humanitarian', 'religious-moral', 'economic', 'constitutional', 'human-dignity'] }
            ].map(cat => `
              <details style="margin-bottom: 4px;">
                <summary style="font-size: 10px; color: #1e40af; cursor: pointer; margin-bottom: 4px;">${cat.category}</summary>
                <div style="display: flex; flex-wrap: wrap; gap: 3px; margin-left: 12px;">
                  ${cat.tags.map(tag => `
                    <button class="review-preset-tag-btn" data-tag="${tag}" style="padding: 3px 8px; background: ${(statement.tags || []).includes(tag) ? '#3b82f6' : '#f3f4f6'}; color: ${(statement.tags || []).includes(tag) ? 'white' : '#374151'}; border: 1px solid ${(statement.tags || []).includes(tag) ? '#3b82f6' : '#d1d5db'}; border-radius: 4px; font-size: 9px; cursor: pointer;">${tag.replace(/-/g, ' ')}</button>
                  `).join('')}
                </div>
              </details>
            `).join('')}
          </div>
        </div>
      </div>
      <button onclick="cancelStatementReview()" style="background: none; border: none; color: #3b82f6; cursor: pointer; font-size: 18px; padding: 0;">&times;</button>
    </div>
  `;
  
  // Insert at top of incident tab
  const tabContent = document.getElementById('tab-case');
  if (tabContent) {
    tabContent.insertBefore(banner, tabContent.firstChild);
    
    // Add event listeners for tag buttons
    setTimeout(() => {
      // Preset tag buttons
      document.querySelectorAll('.review-preset-tag-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
          e.preventDefault();
          const tag = this.getAttribute('data-tag');
          const tagsContainer = document.getElementById('reviewStatementTags');
          
          if (window.reviewStatementTags.includes(tag)) {
            // Remove tag
            window.reviewStatementTags = window.reviewStatementTags.filter(t => t !== tag);
            document.querySelector(`.review-tag-chip[data-tag="${tag}"]`)?.remove();
            this.style.background = '#f3f4f6';
            this.style.color = '#374151';
            this.style.borderColor = '#d1d5db';
          } else {
            // Add tag
            window.reviewStatementTags.push(tag);
            const tagChip = document.createElement('span');
            tagChip.className = 'review-tag-chip';
            tagChip.setAttribute('data-tag', tag);
            tagChip.style.cssText = 'display: inline-flex; align-items: center; gap: 4px; background: #3b82f6; color: white; padding: 3px 8px; border-radius: 10px; font-size: 10px;';
            tagChip.innerHTML = `
              ${tag.replace(/-/g, ' ')}
              <button class="review-tag-remove" data-tag="${tag}" style="background: none; border: none; color: white; font-weight: bold; cursor: pointer; padding: 0 3px; font-size: 12px;">×</button>
            `;
            tagsContainer.appendChild(tagChip);
            this.style.background = '#3b82f6';
            this.style.color = 'white';
            this.style.borderColor = '#3b82f6';
            
            // Add remove listener
            tagChip.querySelector('.review-tag-remove').addEventListener('click', function(e) {
              e.stopPropagation();
              const tagToRemove = this.getAttribute('data-tag');
              window.reviewStatementTags = window.reviewStatementTags.filter(t => t !== tagToRemove);
              tagChip.remove();
              const btn = document.querySelector(`.review-preset-tag-btn[data-tag="${tagToRemove}"]`);
              if (btn) {
                btn.style.background = '#f3f4f6';
                btn.style.color = '#374151';
                btn.style.borderColor = '#d1d5db';
              }
            });
          }
        });
      });
      
      // Remove buttons for existing tags
      document.querySelectorAll('.review-tag-remove').forEach(btn => {
        btn.addEventListener('click', function(e) {
          e.stopPropagation();
          const tag = this.getAttribute('data-tag');
          window.reviewStatementTags = window.reviewStatementTags.filter(t => t !== tag);
          this.closest('.review-tag-chip').remove();
          const presetBtn = document.querySelector(`.review-preset-tag-btn[data-tag="${tag}"]`);
          if (presetBtn) {
            presetBtn.style.background = '#f3f4f6';
            presetBtn.style.color = '#374151';
            presetBtn.style.borderColor = '#d1d5db';
          }
        });
      });
    }, 100);
  }
}

// Cancel statement review and go back to Statements tab
function cancelStatementReview() {
  reviewMode = false;
  reviewIncidentId = null;
  
  // Remove banner
  const banner = document.getElementById('statementReviewBanner');
  if (banner) banner.remove();
  
  // Hide cancel/reject buttons
  const cancelBtn = document.getElementById('cancelReviewBtn');
  const rejectBtn = document.getElementById('rejectCaseBtn');
  if (cancelBtn) cancelBtn.style.display = 'none';
  if (rejectBtn) rejectBtn.style.display = 'none';
  
  // Reset save button
  const saveBtn = document.getElementById('saveCaseBtn');
  if (saveBtn) {
    saveBtn.textContent = 'Save Statement';
    saveBtn.style.background = ''; // Reset to default
  }
  
  // Reset form (this will clear fields but NOT call populateCaseForm which would reset content type)
  verifiedQuotes = [];
  pendingQuotes = [];
  sources = [];
  media = [];
  fieldQuoteAssociations = {};
  
  // Clear statement form fields manually
  const fieldsToClear = [
    'statementType', 'statementDate', 'statementHeadline', 'statementKeyQuote',
    'speakerName', 'speakerTitle', 'speakerOrganization', 'speakerType',
    'politicalAffiliation', 'speakerCredentials', 'wikipediaUrl',
    'platform', 'platformUrl', 'fullText', 'context',
    'impactLevel', 'mediaCoverage'
  ];
  
  fieldsToClear.forEach(id => {
    const field = document.getElementById(id);
    if (field) field.value = '';
  });
  
  // Clear checkboxes
  const checkboxes = ['previouslySupported', 'partyTypicallySupports', 'breakingRanks'];
  checkboxes.forEach(id => {
    const checkbox = document.getElementById(id);
    if (checkbox) checkbox.checked = false;
  });
  
  renderQuotes();
  renderSources();
  
  // Switch back to Statements tab
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelector('[data-tab="statements"]')?.classList.add('active');
  document.querySelectorAll('.tab-content').forEach(p => p.classList.remove('active'));
  document.getElementById('tab-statements')?.classList.add('active');
}
window.cancelStatementReview = cancelStatementReview;

// Update review filter button counts

function updateReviewFilterCounts() {
  const stats = reviewQueueStats || {};
  
  // Use stats from API - now correctly filtered by analyst
  // Simplified flow: pending → first_review (validation) → verified
  const allCount = parseInt(stats.total) || 0;
  const needsReviewCount = parseInt(stats.pending) || 0;
  const needsValidationCount = (parseInt(stats.first_review) || 0) + (parseInt(stats.first_validation) || 0);
  const rereviewCount = parseInt(stats.returned_for_review) || 0;
  const revalidationCount = parseInt(stats.revalidation) || 0;
  const publishedCount = parseInt(stats.verified) || 0;
  const rejectedCount = parseInt(stats.rejected) || 0;
  
  const allCountEl = document.getElementById('reviewFilterAllCount');
  const needsReviewCountEl = document.getElementById('reviewFilterNeedsReviewCount');
  const needsValidationCountEl = document.getElementById('reviewFilterNeedsValidationCount');
  const rereviewCountEl = document.getElementById('reviewFilterRereviewCount');
  const revalidationCountEl = document.getElementById('reviewFilterRevalidationCount');
  const publishedCountEl = document.getElementById('reviewFilterPublishedCount');
  const rejectedCountEl = document.getElementById('reviewFilterRejectedCount');
  const activeCountEl = document.getElementById('reviewFilterActiveCount');
  
  if (allCountEl) allCountEl.textContent = allCount;
  if (needsReviewCountEl) needsReviewCountEl.textContent = needsReviewCount;
  if (needsValidationCountEl) needsValidationCountEl.textContent = needsValidationCount;
  if (rereviewCountEl) rereviewCountEl.textContent = rereviewCount;
  if (revalidationCountEl) revalidationCountEl.textContent = revalidationCount;
  if (publishedCountEl) publishedCountEl.textContent = publishedCount;
  if (rejectedCountEl) rejectedCountEl.textContent = rejectedCount;
  
  // Show current filter count in main button
  if (activeCountEl) {
    activeCountEl.textContent = reviewQueue.length;
  }
  
  // Also fetch guest submissions count in background
  fetchGuestSubmissionsCount();
}

// Fetch guest submissions count for the filter button
async function fetchGuestSubmissionsCount() {
  try {
    const response = await fetch(`${apiUrl}/api/guest-submissions?status=pending&limit=1&_t=${Date.now()}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'X-API-Key': apiKey,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      guestSubmissionsCount = data.submissions?.length || 0;
      // Actually we need the full count, let's get it properly
      const fullResponse = await fetch(`${apiUrl}/api/guest-submissions?status=pending&limit=100&_t=${Date.now()}`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'X-API-Key': apiKey,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
      if (fullResponse.ok) {
        const fullData = await fullResponse.json();
        guestSubmissionsCount = fullData.submissions?.length || 0;
        const countEl = document.getElementById('reviewFilterGuestCount');
        if (countEl) countEl.textContent = guestSubmissionsCount;
      }
    }
  } catch (error) {
    console.log('Failed to fetch guest submissions count:', error);
  }
}

// Set review queue filter
function setReviewFilter(filter) {
  reviewQueueFilter = filter;
  
  // Update active state on buttons
  document.querySelectorAll('#reviewFilterDropdown .filter-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.filter === filter);
  });
  
  // Update main button label
  const activeBtn = document.querySelector(`#reviewFilterDropdown .filter-btn[data-filter="${filter}"]`);
  const labelEl = document.getElementById('reviewFilterLabel');
  if (activeBtn && labelEl) {
    labelEl.textContent = activeBtn.dataset.label || 'All Cases';
  }
  
  // Hide dropdown
  const dropdown = document.getElementById('reviewFilterDropdown');
  if (dropdown) dropdown.style.display = 'none';
  
  // Handle guest submissions separately
  if (filter === 'guest_submissions') {
    loadGuestSubmissions();
  } else {
    // Hide guest submissions list and show regular queue
    const guestList = document.getElementById('guestSubmissionsList');
    if (guestList) guestList.style.display = 'none';
    // Refetch data with new filter
    loadReviewQueue(filter);
  }
}

// Render review queue list
function renderReviewQueue() {
  const listEl = document.getElementById('reviewQueueList');
  if (!listEl) return;
  
  // No client-side filtering - API already filtered by status
  const sortedQueue = reviewQueue.sort((a, b) => {
    const cycleA = a.review_cycle || 1;
    const cycleB = b.review_cycle || 1;
    if (cycleB !== cycleA) return cycleB - cycleA;
    return new Date(b.created_at || 0) - new Date(a.created_at || 0);
  });
  
  if (sortedQueue.length === 0) {
    listEl.innerHTML = `<div class="empty-state">No cases matching filter "${reviewQueueFilter}"</div>`;
    return;
  }
  
  listEl.innerHTML = sortedQueue.map(incident => {
    const reviewCycle = incident.review_cycle || 1;
    const isReturned = reviewCycle >= 2;
    const isHighPriority = reviewCycle >= 3;
    const status = incident.verification_status || 'pending';
    
    // Determine status badge text
    let statusBadge = '';
    let statusClass = '';
    if (status === 'pending') {
      if (isReturned) {
        statusBadge = '🔄 Re-Review';
        statusClass = 'badge-orange';
      } else {
        statusBadge = 'Pending Review';
        statusClass = 'badge-yellow';
      }
    } else if (status === 'first_review') {
      if (isReturned) {
        statusBadge = '🔁 Re-Validation';
        statusClass = 'badge-cyan';
      } else {
        statusBadge = 'Awaiting Validation';
        statusClass = 'badge-purple';
      }
    } else if (status === 'first_validation') {
      if (isReturned) {
        statusBadge = '🔁 Re-Validation (2nd)';
        statusClass = 'badge-cyan';
      } else {
        statusBadge = 'Needs 2nd Validation';
        statusClass = 'badge-purple';
      }
    } else if (status === 'verified') {
      statusBadge = 'Published';
      statusClass = 'badge-green';
    } else if (status === 'rejected') {
      statusBadge = 'Rejected';
      statusClass = 'badge-red';
    }
    
    // Lock status - check if locked by someone else
    const isLocked = incident.is_locked && incident.locked_by !== currentUserId;
    const isLockedByMe = incident.is_locked && incident.locked_by === currentUserId;
    const lockedByDisplay = incident.locked_by_name || incident.locked_by_email || 'Someone';
    
    // Card styling based on priority
    const cardClass = isHighPriority ? 'returned-cycle-3plus' : (isReturned ? 'returned-cycle-2' : '');
    
    return `
    <div class="review-case-card queue-item ${cardClass} ${isLocked ? 'locked-by-other' : ''}" data-incident-id="${incident.id}" data-review-cycle="${reviewCycle}" data-status="${status}" data-locked="${isLocked ? 'true' : 'false'}" data-locked-by="${incident.locked_by || ''}">
      ${isReturned ? `
        <div class="priority-badge ${isHighPriority ? 'priority-red' : 'priority-orange'}" style="position: absolute; top: 8px; right: 8px; font-size: 10px; padding: 2px 6px; border-radius: 4px; background: ${isHighPriority ? '#fecaca' : '#fed7aa'}; color: ${isHighPriority ? '#b91c1c' : '#c2410c'}; font-weight: 600;">
          ${isHighPriority ? '⚠️ HIGH PRIORITY' : 'PRIORITY'}
        </div>
      ` : ''}
      
      ${isLocked ? `
        <div class="lock-badge" style="position: absolute; top: 8px; ${isReturned ? 'right: 100px;' : 'right: 8px;'} font-size: 10px; padding: 2px 6px; border-radius: 4px; background: #fef2f2; color: #dc2626; font-weight: 600; border: 1px solid #fecaca;">
          🔒 ${escapeHtml(lockedByDisplay)}
        </div>
      ` : ''}
      
      ${isLockedByMe ? `
        <button 
          class="lock-badge" 
          style="position: absolute; top: 8px; ${isReturned ? 'right: 100px;' : 'right: 8px;'} font-size: 10px; padding: 2px 6px; border-radius: 4px; background: #dcfce7; color: #166534; font-weight: 600; border: 1px solid #bbf7d0; cursor: pointer;"
          title="Click to release lock"
        >
          🔓 Your Lock
        </button>
      ` : ''}
      
      <div class="queue-item-header" style="${isReturned || isLocked || isLockedByMe ? 'padding-right: 100px;' : ''}">
        <div>
          <div style="font-weight: 600; font-size: 13px;">${escapeHtml(incident.victim_name || incident.subject_name || 'Unknown')}</div>
          <div style="font-size: 11px; color: #666;">
            ${escapeHtml(incident.incident_type?.replace(/_/g, ' ') || 'Incident')}
          </div>
        </div>
      </div>
      
      <div style="display: flex; gap: 4px; flex-wrap: wrap; margin: 8px 0;">
        <span class="badge ${statusClass}" style="padding: 2px 8px; border-radius: 4px; font-size: 11px;">
          ${statusBadge}
        </span>
        ${reviewCycle > 1 ? `
          <span class="cycle-badge" style="padding: 2px 8px; border-radius: 4px; font-size: 11px; background: ${isHighPriority ? '#fef2f2' : '#fff7ed'}; color: ${isHighPriority ? '#dc2626' : '#ea580c'}; border: 1px solid ${isHighPriority ? '#fecaca' : '#fed7aa'};">
            ${isHighPriority ? '🔥' : '🔄'} Review Cycle ${reviewCycle}
          </span>
        ` : ''}
      </div>
      
      <div class="queue-item-meta" style="font-size: 11px; color: #666;">
        ${escapeHtml(incident.city ? incident.city + ', ' : '')}${escapeHtml(incident.state || '')}
        ${incident.incident_date ? ' • ' + formatDateLocal(incident.incident_date) : ''}
      </div>
      
      ${incident.tags && incident.tags.length > 0 ? `
        <div style="display: flex; flex-wrap: wrap; gap: 4px; margin: 8px 0;">
          ${incident.tags.slice(0, 4).map(tag => `
            <span style="padding: 2px 6px; background: #eff6ff; color: #1e40af; border: 1px solid #bfdbfe; border-radius: 4px; font-size: 10px;">
              ${escapeHtml(tag)}
            </span>
          `).join('')}
          ${incident.tags.length > 4 ? `
            <span style="padding: 2px 6px; background: #f3f4f6; color: #4b5563; border-radius: 4px; font-size: 10px;">
              +${incident.tags.length - 4} more
            </span>
          ` : ''}
        </div>
      ` : ''}
      
      ${isReturned && incident.rejection_reason ? `
        <div style="background: #fef3c7; padding: 8px; border-radius: 4px; margin: 8px 0; font-size: 11px; color: #92400e; border-left: 3px solid #f59e0b;">
          <strong>📝 Feedback:</strong> ${escapeHtml(incident.rejection_reason)}
        </div>
      ` : ''}
      
      ${incident.first_verifier_name || incident.first_verifier_email ? `
        <div style="margin-top: 8px; font-size: 10px; color: #888;">
          1st Review: ${escapeHtml(incident.first_verifier_name || incident.first_verifier_email || '')}
        </div>
      ` : ''}
    </div>
  `}).join('');
  
  // Add click listeners
  listEl.querySelectorAll('.review-case-card').forEach(card => {
    card.addEventListener('click', async () => {
      const incidentId = card.dataset.incidentId;
      const status = card.dataset.status;
      const isLockedByOther = card.dataset.locked === 'true';
      console.log('Card clicked, incident ID:', incidentId, 'status:', status, 'locked:', isLockedByOther);
      
      // Find the incident from reviewQueue for case info
      const incident = reviewQueue.find(inc => String(inc.id) === String(incidentId));
      const caseInfo = incident ? {
        id: incident.id,
        name: incident.victim_name || incident.subject_name || 'Unknown',
        type: incident.incident_type?.replace(/_/g, ' ') || 'Incident',
        status: status
      } : { id: incidentId, name: 'Unknown', type: 'Incident', status: status };
      
      // Handle different statuses appropriately
      if (status === 'verified') {
        // Published cases - can only view on website
        alert(`This case is published. You can view it on the website:\n\n${apiUrl}/incidents/${incidentId}`);
        return;
      }
      
      if (status === 'rejected') {
        // Rejected cases - allow reopening for review/corrections
        if (confirm('This case was rejected. Would you like to reopen it for review/corrections?')) {
          // Try to acquire lock first
          const lockAcquired = await acquireLockWithInfo(parseInt(incidentId), caseInfo);
          if (!lockAcquired) return;
          
          // Load in Incident tab for review
          document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
          document.querySelector('[data-tab="case"]')?.classList.add('active');
          document.querySelectorAll('.tab-content').forEach(p => p.classList.remove('active'));
          document.getElementById('tab-case')?.classList.add('active');
          loadReviewCaseDetails(parseInt(incidentId));
        }
        return;
      }
      
      // Try to acquire lock before opening any reviewable case
      const lockAcquired = await acquireLockWithInfo(parseInt(incidentId), caseInfo);
      if (!lockAcquired) return;
      
      if (['first_review', 'first_validation'].includes(status)) {
        // Validation cases - switch to Validate tab and load the case
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelector('[data-tab="validate"]')?.classList.add('active');
        document.querySelectorAll('.tab-content').forEach(p => p.classList.remove('active'));
        document.getElementById('tab-validate')?.classList.add('active');
        loadValidationCase(parseInt(incidentId));
      } else if (status === 'pending') {
        // Review cases - switch to Incident tab and load for review
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelector('[data-tab="case"]')?.classList.add('active');
        document.querySelectorAll('.tab-content').forEach(p => p.classList.remove('active'));
        document.getElementById('tab-case')?.classList.add('active');
        loadReviewCaseDetails(parseInt(incidentId));
      } else {
        // Unknown status - just try to load it
        console.warn('Unknown status:', status);
        loadReviewCaseDetails(parseInt(incidentId));
      }
    });
    
    card.addEventListener('mouseenter', () => {
      card.style.borderColor = '#3b82f6';
    });
    card.addEventListener('mouseleave', () => {
      const cycle = parseInt(card.dataset.reviewCycle || '1');
      card.style.borderColor = cycle >= 3 ? '#fecaca' : (cycle >= 2 ? '#fed7aa' : '#e5e7eb');
    });
    
    // Lock badge click handler
    const lockBtn = card.querySelector('.lock-badge');
    if (lockBtn) {
      lockBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const incidentId = parseInt(card.dataset.incidentId);
        if (confirm('Release lock on this case?')) {
          releaseLock(incidentId).then(() => {
            loadReviewQueue(reviewQueueFilter);
          });
        }
      });
    }
  });
}

// Exit review mode and return to queue
function exitReviewMode() {
  console.log('Exiting review mode');
  
  // Check if we're reviewing a statement
  const isStatementReview = currentContentType === 'statement' || document.getElementById('statementReviewBanner');
  
  // Release lock on current incident
  if (currentLockId) {
    releaseLock(currentLockId);
  }
  
  // Reset review state
  reviewMode = false;
  reviewIncidentId = null;
  
  // Remove review banners
  const statementBanner = document.getElementById('statementReviewBanner');
  if (statementBanner) statementBanner.remove();
  
  // Notify background to update context menu (back to normal mode)
  chrome.runtime.sendMessage({
    type: 'SET_CONTENT_MODE',
    mode: currentContentType,
    isValidateMode: false
  });
  
  // Clear ALL data using newCase (clears form, storage, quotes, sources, etc.)
  newCase();
  
  // Update UI
  updateReviewModeUI();
  
  // Switch to appropriate tab
  if (isStatementReview) {
    const statementsTab = document.querySelector('.tab[data-tab="statements"]');
    if (statementsTab) statementsTab.click();
  } else {
    const reviewTab = document.querySelector('.tab[data-tab="review"]');
    if (reviewTab) reviewTab.click();
  }
  
  console.log('Review mode exited, returned to queue');
}

// Exit validation mode
function exitValidationMode() {
  console.log('Exiting validation mode');
  
  // Release lock if held
  if (currentLockId) {
    releaseLock(currentLockId);
  }
  
  // Reset validation state
  validateMode = false;
  validateIncidentId = null;
  validationState = {};
  validationData = null;
  
  // Notify background to update context menu (back to normal mode)
  chrome.runtime.sendMessage({
    type: 'SET_CONTENT_MODE',
    mode: currentContentType,
    isValidateMode: false
  });
  
  // Show queue view
  document.getElementById('validateQueueView').style.display = 'block';
  document.getElementById('validateCaseView').style.display = 'none';
  
  console.log('Validation mode exited');
}

// Reject case during review
async function rejectCase() {
  if (!reviewIncidentId) {
    alert('No incident loaded for review');
    return;
  }
  
  // Prompt for rejection reason
  const reason = prompt('Enter rejection reason (required):', '');
  
  if (reason === null || reason.trim() === '') {
    console.log('Rejection cancelled or reason empty');
    return;
  }
  
  const rejectBtn = document.getElementById('rejectCaseBtn');
  if (!rejectBtn) return;
  
  rejectBtn.disabled = true;
  rejectBtn.innerHTML = '<div class="spinner"></div> Rejecting...';
  
  try {
    const response = await fetch(`${apiUrl}/api/incidents/${reviewIncidentId}/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'X-API-Key': apiKey
      },
      body: JSON.stringify({
        action: 'reject',
        rejection_reason: reason.trim()
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to reject case');
    }
    
    const result = await response.json();
    console.log('Case rejected:', result);
    
    alert('Case rejected successfully.');
    
    // Exit review mode and refresh queue
    exitReviewMode();
    refreshVerificationQueue();
    
  } catch (error) {
    console.error('Error rejecting case:', error);
    alert('Error rejecting case: ' + error.message);
  } finally {
    rejectBtn.disabled = false;
    rejectBtn.innerHTML = '✗ Reject';
  }
}

// Load full case details for review
async function loadReviewCaseDetails(incidentId) {
  console.log('loadReviewCaseDetails called with ID:', incidentId);
  
  // Prevent loading different case while already reviewing
  if (reviewMode && reviewIncidentId && reviewIncidentId !== incidentId) {
    if (!confirm(`You are reviewing incident #${reviewIncidentId}. Cancel that review and load incident #${incidentId}?`)) {
      return;
    }
    exitReviewMode();
  }
  
  // Prevent conflict with validate mode
  if (validateMode) {
    alert('You are currently validating a case. Please finish or cancel the validation before reviewing a different case.');
    return;
  }
  
  try {
    const response = await fetch(`${apiUrl}/api/incidents/${incidentId}/verify`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'X-API-Key': apiKey
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('API error response:', errorText);
      throw new Error('Failed to load case details');
    }
    
    const data = await response.json();
    console.log('API data received:', data);
    console.log('Incident tags from API:', data.incident?.tags);
    console.log('Type of tags:', typeof data.incident?.tags, 'Is array:', Array.isArray(data.incident?.tags));
    
    // Also fetch type-specific details
    let incidentDetails = {};
    console.log('[loadReviewCaseDetails] Fetching type-specific details from:', `${apiUrl}/api/incidents/${incidentId}/details`);
    try {
      const detailsResponse = await fetch(`${apiUrl}/api/incidents/${incidentId}/details`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'X-API-Key': apiKey
        }
      });
      console.log('[loadReviewCaseDetails] Details response status:', detailsResponse.status);
      if (detailsResponse.ok) {
        const detailsData = await detailsResponse.json();
        incidentDetails = detailsData.details || {};
        console.log('[loadReviewCaseDetails] Incident details loaded:', incidentDetails);
        console.log('[loadReviewCaseDetails] protest_topic:', incidentDetails.protest_topic);
        console.log('[loadReviewCaseDetails] protest_size:', incidentDetails.protest_size);
        console.log('[loadReviewCaseDetails] dispersal_method:', incidentDetails.dispersal_method);
        console.log('[loadReviewCaseDetails] arrests_made:', incidentDetails.arrests_made);
      } else {
        const errorText = await detailsResponse.text();
        console.error('[loadReviewCaseDetails] Details API error:', detailsResponse.status, errorText);
      }
    } catch (detailsErr) {
      console.warn('[loadReviewCaseDetails] Failed to fetch incident details:', detailsErr);
    }
    
    // Check if this case is in a status that allows review
    const incidentData = data.incident;
    
    // Cases that have completed review (first_review is now validation, first_validation, verified) cannot be reviewed in extension
    // Note: rejected cases CAN be reviewed (for corrections/resubmission)
    if (['first_review', 'first_validation', 'verified'].includes(incidentData.verification_status)) {
      if (incidentData.verification_status === 'verified') {
        alert('This case has already been published.');
      } else {
        alert('This case has completed review and is now in validation.\n\nValidation can be done in the Validate tab or in the web browser at:\n' + apiUrl + '/dashboard/validate/' + incidentId);
      }
      return;
    }
    
    // Set review mode
    reviewMode = true;
    reviewIncidentId = incidentId;
    
    // Notify background to update context menu for review mode
    chrome.runtime.sendMessage({
      type: 'SET_CONTENT_MODE',
      mode: currentContentType,
      isValidateMode: false  // Review mode uses incident fields
    });
    
    // Show cancel and reject buttons immediately
    console.log('[REVIEW MODE] Attempting to show buttons...');
    const cancelBtn = document.getElementById('cancelReviewBtn');
    const rejectBtn = document.getElementById('rejectCaseBtn');
    const footer = document.querySelector('.footer');
    console.log('[REVIEW MODE] cancelBtn:', cancelBtn);
    console.log('[REVIEW MODE] rejectBtn:', rejectBtn);
    console.log('[REVIEW MODE] footer element:', footer);
    if (footer) {
      console.log('[REVIEW MODE] footer computed style:', window.getComputedStyle(footer).display);
      console.log('[REVIEW MODE] footer offsetHeight:', footer.offsetHeight);
      console.log('[REVIEW MODE] footer scrollTop:', footer.scrollTop);
    }
    if (cancelBtn) {
      cancelBtn.style.display = 'block';
      console.log('[REVIEW MODE] Set cancelBtn display to block');
    }
    if (rejectBtn) {
      rejectBtn.style.display = 'block';
      console.log('[REVIEW MODE] Set rejectBtn display to block');
    }
    
    // Scroll to make footer visible
    if (footer) {
      footer.scrollIntoView({ behavior: 'smooth', block: 'end' });
      console.log('[REVIEW MODE] Scrolled footer into view');
    }
    
    // Reset verification state
    verifiedFields = {};
    
    // Reset all checkboxes
    document.querySelectorAll('.field-verify-checkbox').forEach(cb => {
      cb.checked = false;
    });
    document.querySelectorAll('.quote-verify-checkbox').forEach(cb => {
      cb.checked = false;
    });
    
    const incident = data.incident;
    const quotes = data.quotes || [];
    const incidentSources = data.sources || [];
    reviewTimeline = data.timeline || [];
    
    // Transform violations data from API format to extension format
    const violationsFromApi = (data.violations || []).map(v => ({
      type: v.violation_type,
      classification: v.classification || 'alleged',  // Default to 'alleged' if not specified
      description: v.description || '',
      constitutional_basis: v.constitutional_basis || ''
    }));
    console.log('[loadReviewCaseDetails] Transformed violations from API:', violationsFromApi);
    
    // Transform agencies data from API format
    const agenciesFromApi = (data.agencies || []).map(a => a.agency);
    console.log('[loadReviewCaseDetails] Transformed agencies from API:', agenciesFromApi);
    
    // Helper function to normalize incident type values
    function normalizeIncidentType(type) {
      if (!type) return 'death_in_custody';
      
      // Map legacy/alternate values to valid select options
      const typeMap = {
        'detention_death': 'death_in_custody',
        'death': 'death_in_custody',
        'use_of_force': 'excessive_force',
        'force': 'excessive_force',
        'arrest_detention': 'arrest',
        'detention': 'arrest'
      };
      
      const normalized = type.toLowerCase();
      return typeMap[normalized] || type;
    }
    
    // Helper: Get field value using the registry with fallbacks
    const getField = (fieldName, defaultVal = '') => {
      // Try incidentDetails first (JSONB data), then incident (main table)
      if (window.FieldRegistry && window.FieldRegistry.getFieldValue) {
        const fromDetails = window.FieldRegistry.getFieldValue(incidentDetails, fieldName);
        if (fromDetails !== undefined && fromDetails !== null && fromDetails !== '') return fromDetails;
        return window.FieldRegistry.getFieldValue(incident, fieldName, defaultVal);
      }
      // Fallback if registry not loaded
      return incidentDetails[fieldName] || incident[fieldName] || defaultVal;
    };
    
    const getFieldBool = (fieldName, defaultVal = false) => {
      const val = getField(fieldName, defaultVal);
      return val === true || val === 'true' || val === 1;
    };
    
    // Populate currentCase from incident - using field registry for consistent mapping
    currentCase = {
      // Core identity fields
      incidentType: normalizeIncidentType(incident.incident_type),
      incident_types: incident.incident_types || [],
      name: getField('subject_name') || getField('victim_name') || '',
      dateOfDeath: incident.incident_date ? incident.incident_date.split('T')[0] : '',
      age: incident.subject_age?.toString() || '',
      country: getField('subject_nationality') || '',
      gender: getField('subject_gender') || '',
      immigration_status: getField('subject_immigration_status') || '',
      occupation: incident.subject_occupation || '',
      
      // Location fields
      city: incident.city || '',
      state: incident.state || '',
      facility: incident.facility || '',
      location: `${incident.city || ''}, ${incident.state || ''}`.trim(),
      
      // Summary and cause
      summary: incident.summary || '',
      causeOfDeath: getField('cause_of_death') || '',
      
      // Related entities - use transformed API data if available
      agencies: agenciesFromApi.length > 0 ? agenciesFromApi : (incident.agencies_involved || []),
      violations: violationsFromApi.length > 0 ? violationsFromApi.map(v => v.type) : (incident.legal_violations || []),
      violations_data: violationsFromApi.length > 0 ? violationsFromApi : null,
      tags: incident.tags || [],
      
      // Death-specific fields - registry handles aliases
      deathCause: getField('cause_of_death') || '',
      deathManner: getField('manner_of_death') || '',
      deathCustodyDuration: getField('custody_duration') || '',
      deathMedicalDenied: getFieldBool('medical_requests_denied') || getFieldBool('medical_care_denied'),
      medicalNeglectAlleged: getFieldBool('medical_neglect_alleged'),
      autopsyAvailable: getFieldBool('autopsy_available'),
      deathCircumstances: getField('circumstances') || '',
      
      // Medical neglect specific fields
      medicalCondition: getField('medical_condition') || '',
      treatmentDenied: getField('treatment_denied') || '',
      requestsDocumented: getFieldBool('requests_documented'),
      resultedInDeath: getFieldBool('resulted_in_death'),
      
      // Injury-specific fields
      injuryType: getField('injury_type') || '',
      injurySeverity: getField('injury_severity') || '',
      injuryWeapon: getField('injury_weapon') || '',
      injuryCause: getField('injury_cause') || '',
      
      // Arrest-specific fields
      arrestReason: getField('arrest_reason') || '',
      arrestContext: getField('arrest_context') || '',
      arrestCharges: getField('arrest_charges') || (incidentDetails.charges ? incidentDetails.charges.join(', ') : ''),
      arrestTimingSuspicious: getFieldBool('timing_suspicious'),
      arrestPretext: getFieldBool('pretext_arrest'),
      arrestSelective: getFieldBool('selective_enforcement'),
      
      // Violation-specific fields
      violationJournalism: getFieldBool('violation_journalism'),
      violationProtest: getFieldBool('violation_protest'),
      violationActivism: getFieldBool('violation_activism'),
      violationSpeech: getField('violation_speech') || '',
      violationRuling: getField('violation_ruling') || '',
      
      // Shooting-specific fields
      shootingFatal: getFieldBool('shooting_fatal'),
      shotsFired: getField('shots_fired') || '',
      weaponType: getField('weapon_type') || '',
      bodycamAvailable: getFieldBool('bodycam_available'),
      victimArmed: getFieldBool('victim_armed'),
      warningGiven: getFieldBool('warning_given'),
      shootingContext: getField('shooting_context') || '',
      
      // Excessive force-specific fields
      forceTypes: getField('force_types') || [],
      victimRestrained: getFieldBool('victim_restrained'),
      victimComplying: getFieldBool('victim_complying'),
      videoEvidence: getFieldBool('video_evidence'),
      
      // Protest-specific fields
      protestTopic: getField('protest_topic') || '',
      protestSize: getField('protest_size') || '',
      protestPermitted: getFieldBool('permitted'),
      dispersalMethod: getField('dispersal_method') || [],
      arrestsMade: getField('arrests_made') || '',
    };
    
    console.log('currentCase.tags after population:', currentCase.tags);
    console.log('incident.tags was:', incident.tags);
    
    console.log('BEFORE populateCaseForm - currentCase.tags:', currentCase.tags);
    
    // Populate verified quotes
    verifiedQuotes = quotes.map(q => ({
      id: q.id,
      text: q.quote_text || '',
      quote: q.quote_text || '',
      source: q.source?.url || incidentSources.find(s => s.id === q.source_id)?.url || '',
      sourceUrl: q.source?.url || incidentSources.find(s => s.id === q.source_id)?.url || '',
      sourceTitle: q.source?.title || incidentSources.find(s => s.id === q.source_id)?.title || '',
      category: q.category || 'general',
      speaker: q.speaker || '',
      speakerRole: q.speaker_role || '',
      context: q.context || '',
      notes: q.analyst_notes || '',
      pageNumber: q.page_number || null,
      confidence: q.confidence || null
    }));

    // Initialize verification flags for existing quotes and timeline entries
    // In review mode, mark as unverified; otherwise mark as verified (already saved)
    verifiedQuotes.forEach(q => {
      const key = `quote_${q.id}`;
      if (verifiedFields[key] === undefined) {
        verifiedFields[key] = reviewMode ? false : true;
      }
    });
    if (reviewMode) {
      (reviewTimeline || []).forEach(t => {
        const key = `timeline_${t.id}`;
        if (verifiedFields[key] === undefined) verifiedFields[key] = false;
      });
    }
    
    // Populate sources
    sources = incidentSources.map(s => ({
      id: s.id,
      url: s.url,
      title: s.title,
      publication: s.publication,
      author: s.author,
      publishedDate: s.published_date,
      credibilityRating: s.credibility_rating
    }));

    // Initialize source verification flags
    if (reviewMode) {
      sources.forEach(s => {
        const key = `source_${s.id}`;
        if (verifiedFields[key] === undefined) verifiedFields[key] = false;
      });
    }
    
    // Populate media
    const incidentMedia = data.media || [];
    media = incidentMedia.map(m => ({
      id: m.id,
      url: m.url,
      media_type: m.media_type,
      description: m.description || '',
      verified: m.verified || false
    }));
    
    // Reset media verification state
    verifiedMedia = {};
    
    // Initialize media verification flags (check any that are already verified in DB)
    if (reviewMode) {
      media.forEach((m, index) => {
        const key = `media_${index}`;
        verifiedMedia[key] = m.verified || false;
      });
    }
    
    // Clear pending quotes in review mode
    pendingQuotes = [];
    
    // Load quote-field associations from API
    const quoteFieldLinks = data.quote_field_links || [];
    console.log('[loadReviewCaseDetails] Quote field links from API:', quoteFieldLinks);
    
    // Transform quote_field_links into fieldQuoteAssociations format
    // API format: { incident_id, field_name, quote_id }
    // Extension format: { field_name: [quote_id1, quote_id2, ...] }
    // IMPORTANT: Map canonical field names to all their aliases so quotes show up
    fieldQuoteAssociations = {};
    
    const addQuoteAssociation = (fieldName, quoteId) => {
      if (!fieldQuoteAssociations[fieldName]) {
        fieldQuoteAssociations[fieldName] = [];
      }
      if (!fieldQuoteAssociations[fieldName].includes(quoteId)) {
        fieldQuoteAssociations[fieldName].push(quoteId);
      }
    };
    
    quoteFieldLinks.forEach(link => {
      const canonicalField = link.field_name;
      const quoteId = String(link.quote_id);
      
      // Store under canonical name
      addQuoteAssociation(canonicalField, quoteId);
      
      // Handle special case: subject_name and victim_name both map to 'name'
      if (canonicalField === 'subject_name' || canonicalField === 'victim_name') {
        addQuoteAssociation('name', quoteId);
        addQuoteAssociation('subject_name', quoteId);
        addQuoteAssociation('victim_name', quoteId);
      }
      
      // Handle date fields - map incident_date to 'date'
      if (canonicalField === 'incident_date') {
        addQuoteAssociation('date', quoteId);
        addQuoteAssociation('dateOfDeath', quoteId);
      }
      
      // Handle age field - map subject_age to 'age'
      if (canonicalField === 'subject_age') {
        addQuoteAssociation('age', quoteId);
      }
      
      // Handle nationality field - map subject_nationality to 'nationality' and 'country'
      if (canonicalField === 'subject_nationality') {
        addQuoteAssociation('nationality', quoteId);
        addQuoteAssociation('country', quoteId);
      }
      
      // Handle gender field - map subject_gender to 'gender'
      if (canonicalField === 'subject_gender') {
        addQuoteAssociation('gender', quoteId);
      }
      
      // Handle immigration status - map subject_immigration_status to 'immigration_status'
      if (canonicalField === 'subject_immigration_status') {
        addQuoteAssociation('immigration_status', quoteId);
      }
      
      // Handle death fields - map canonical to short names used in HTML
      if (canonicalField === 'cause_of_death') {
        addQuoteAssociation('death_cause', quoteId);
        addQuoteAssociation('deathCause', quoteId);
      }
      if (canonicalField === 'manner_of_death') {
        addQuoteAssociation('death_manner', quoteId);
        addQuoteAssociation('deathManner', quoteId);
      }
      if (canonicalField === 'custody_duration') {
        addQuoteAssociation('death_custody_duration', quoteId);
        addQuoteAssociation('deathCustodyDuration', quoteId);
      }
      if (canonicalField === 'circumstances') {
        addQuoteAssociation('death_circumstances', quoteId);
        addQuoteAssociation('deathCircumstances', quoteId);
      }
      
      // Also store under all aliases from field registry
      if (window.FieldRegistry) {
        const definition = window.FieldRegistry.getFieldDefinition(canonicalField);
        if (definition && definition.aliases) {
          definition.aliases.forEach(alias => {
            addQuoteAssociation(alias, quoteId);
          });
        }
      }
    });
    console.log('[loadReviewCaseDetails] Transformed fieldQuoteAssociations (with aliases):', fieldQuoteAssociations);
    
    // Save to chrome storage for persistence
    chrome.storage.local.set({ fieldQuoteAssociations }, () => {
      console.log('[loadReviewCaseDetails] Quote associations saved to storage');
    });
    
    // Update the UI
    populateCaseForm();
    updateAgencyQuoteLinks(); // Update agency quote link display after form is populated
    updateQuotePickerTriggers(); // Update quote indicator badges on all fields
    renderQuotes(); // Will show verification checkboxes in review mode
    renderTimeline();
    renderPendingQuotes();
    renderSources();
    renderMediaList(); // Render media with verification checkboxes
    loadCustomFields(); // Load custom fields for this incident
    
    // Update submit button text and initialize verification UI
    updateSubmitButtonForReview();
    
    // Switch to incident tab
    const incidentTab = document.querySelector('.tab[data-tab="case"]');
    if (incidentTab) incidentTab.click();
    
  } catch (error) {
    console.error('Error loading case details:', error);
    alert('Failed to load case details: ' + error.message);
  }
}

// Render review case details with field verification
function renderReviewCaseDetails(data) {
  console.log('renderReviewCaseDetails called with data:', data);
  
  const contentEl = document.getElementById('reviewCaseContent');
  if (!contentEl) {
    console.error('reviewCaseContent element not found');
    return;
  }
  
  const incident = data.incident;
  const fieldVerifications = data.field_verifications || [];
  const sources = data.sources || [];
  
  console.log('Incident:', incident);
  console.log('Field verifications:', fieldVerifications);
  console.log('Sources:', sources);
  
  const fields = [
    { key: 'victim_name', label: 'Victim Name' },
    { key: 'incident_date', label: 'Date' },
    { key: 'incident_type', label: 'Type' },
    { key: 'city', label: 'City' },
    { key: 'state', label: 'State' },
    { key: 'facility', label: 'Facility' },
    { key: 'summary', label: 'Summary' },
  ];
  
  const getFieldValue = (key) => {
    if (key === 'victim_name') return incident.victim_name || incident.subject_name || '';
    if (key === 'incident_date' && incident.incident_date) {
      return formatDateLocal(incident.incident_date);
    }
    return incident[key] || '';
  };
  
  const getFieldVerification = (key) => fieldVerifications.find(fv => fv.field_name === key);
  
  contentEl.innerHTML = `
    <div style="margin-bottom: 16px;">
      <h3 style="font-size: 16px; font-weight: 600; margin-bottom: 4px;">
        ${escapeHtml(incident.victim_name || incident.subject_name || 'Unknown')}
      </h3>
      <p style="font-size: 12px; color: #666;">
        ${incident.incident_id || ''} • ${incident.incident_type?.replace(/_/g, ' ') || ''}
      </p>
    </div>
    
    <div style="margin-bottom: 16px;">
      <h4 style="font-size: 12px; font-weight: 600; color: #666; margin-bottom: 8px;">Fields to Verify</h4>
      
      ${fields.map(field => {
        const value = getFieldValue(field.key);
        const verif = getFieldVerification(field.key);
        const status = verif?.verification_status || 'pending';
        
        return `
          <div style="
            border: 1px solid ${status === 'verified' ? '#86efac' : status === 'first_review' ? '#93c5fd' : '#e5e7eb'};
            border-radius: 6px;
            padding: 10px;
            margin-bottom: 8px;
            background: ${status === 'verified' ? '#f0fdf4' : status === 'first_review' ? '#eff6ff' : '#fafafa'};
          ">
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
              <span style="font-weight: 500; font-size: 12px;">${field.label}</span>
              <span style="
                font-size: 10px;
                padding: 2px 6px;
                border-radius: 4px;
                background: ${status === 'verified' ? '#dcfce7' : status === 'first_review' ? '#dbeafe' : '#f3f4f6'};
                color: ${status === 'verified' ? '#166534' : status === 'first_review' ? '#1d4ed8' : '#6b7280'};
              ">${status === 'first_review' ? 'In Validation' : status}</span>
            </div>
            
            <div style="font-size: 13px; color: #374151; margin-bottom: 8px; word-break: break-word;">
              ${value ? escapeHtml(value) : '<em style="color: #9ca3af;">Not provided</em>'}
            </div>
            
            ${verif?.first_verifier_name ? `
              <div style="font-size: 10px; color: #6b7280; margin-bottom: 6px;">
                Reviewed: ${escapeHtml(verif.first_verifier_name)} 
                ${verif.first_verification_notes ? `- "${escapeHtml(verif.first_verification_notes)}"` : ''}
              </div>
            ` : ''}
            
            ${status === 'verified' ? `
              <div style="text-align: center; font-size: 11px; color: #22c55e;">✓ Fully Verified</div>
            ` : ''}
          </div>
        `;
      }).join('')}
    </div>
    
    ${sources.length > 0 ? `
      <div>
        <h4 style="font-size: 12px; font-weight: 600; color: #666; margin-bottom: 8px;">Sources</h4>
        ${sources.map(source => `
          <a href="${escapeHtml(source.url)}" target="_blank" style="
            display: block;
            font-size: 11px;
            color: #2563eb;
            margin-bottom: 4px;
            word-break: break-all;
          ">${escapeHtml(source.title || source.url)}</a>
        `).join('')}
      </div>
    ` : ''}
    
    <div style="margin-top: 16px;">
      <a href="${apiUrl}/dashboard/review/${incident.id}" target="_blank" style="
        display: block;
        text-align: center;
        padding: 10px;
        background: #f3f4f6;
        color: #374151;
        text-decoration: none;
        border-radius: 6px;
        font-size: 12px;
      ">Open Full Review Page →</a>
    </div>
  `;
  
  console.log('HTML content set, length:', contentEl.innerHTML.length);
}

// Verify a field from the extension
async function verifyField(incidentId, fieldName) {
  const notes = prompt('Add verification notes (optional):');
  
  try {
    const response = await fetch(`${apiUrl}/api/incidents/${incidentId}/verify-field`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        field_name: fieldName,
        notes: notes || undefined
      })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      alert(data.message || 'Field verified successfully!');
      // Reload the case details
      loadReviewCaseDetails(incidentId);
      // Refresh the queue
      loadReviewQueue();
    } else {
      alert('Error: ' + (data.error || 'Verification failed'));
    }
  } catch (error) {
    console.error('Error verifying field:', error);
    alert('Failed to verify field');
  }
}

// Make verifyField available globally for onclick handlers
window.verifyField = verifyField;

// Setup review tab event listeners
function setupReviewTabListeners() {
  const refreshBtn = document.getElementById('refreshReviewQueue');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      loadReviewQueue(reviewQueueFilter);
    });
  }
  
  const closeBtn = document.getElementById('closeReviewDetails');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      const detailsSection = document.getElementById('reviewCaseDetails');
      const queueList = document.getElementById('reviewQueueList');
      const queueStatus = document.getElementById('reviewQueueStatus');
      
      if (detailsSection) detailsSection.style.display = 'none';
      if (queueList) queueList.style.display = 'block';
      if (queueStatus) queueStatus.style.display = 'block';
    });
  }
  
  // Setup filter dropdown toggle
  const filterToggle = document.getElementById('reviewFilterToggle');
  const filterDropdown = document.getElementById('reviewFilterDropdown');
  if (filterToggle && filterDropdown) {
    filterToggle.addEventListener('click', () => {
      const isOpen = filterDropdown.style.display !== 'none';
      filterDropdown.style.display = isOpen ? 'none' : 'block';
    });
  }
  
  // Setup filter button listeners
  const filterButtons = document.querySelectorAll('#reviewFilterDropdown .filter-btn');
  filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      setReviewFilter(btn.dataset.filter);
    });
  });
}

// Make setReviewFilter global
window.setReviewFilter = setReviewFilter;

// Helper to escape HTML
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  init();
  setupReviewTabListeners();
  setupValidateTabListeners();
  setupStatementsTabListeners();
  setupAITabListeners();
  setupEditQuoteModal();
  
  // Hide Save Incident button initially (only show on Case tab)
  const saveCaseBtn = document.getElementById('saveCaseBtn');
  const activeTab = document.querySelector('.tab.active');
  if (saveCaseBtn && activeTab && activeTab.dataset.tab !== 'case') {
    saveCaseBtn.style.display = 'none';
  }
});

// ============================================
// VALIDATION TAB FUNCTIONS
// ============================================

// Current filter for validation queue
let validateQueueFilter = 'all';
let validationQueueData = []; // Store full validation queue for filtering

// Set validation queue filter
function setValidateFilter(filter) {
  validateQueueFilter = filter;
  
  // Update active state on buttons
  document.querySelectorAll('#validateFilterButtons .filter-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.filter === filter);
  });
  
  renderValidationQueue();
}

// Make setValidateFilter global
window.setValidateFilter = setValidateFilter;

// Setup validation tab event listeners
function setupValidateTabListeners() {
  // Sub-tab switcher
  document.querySelectorAll('.validate-subtab').forEach(btn => {
    btn.addEventListener('click', function() {
      const type = this.dataset.type;
      
      // Update active state
      document.querySelectorAll('.validate-subtab').forEach(b => {
        b.classList.remove('active');
        b.style.borderBottom = 'none';
        b.style.color = '#6b7280';
      });
      this.classList.add('active');
      this.style.borderBottom = '2px solid #3b82f6';
      this.style.color = '#3b82f6';
      
      // Show/hide containers
      if (type === 'cases') {
        document.getElementById('validateCasesContainer').style.display = 'block';
        document.getElementById('validateStatementsContainer').style.display = 'none';
      } else {
        document.getElementById('validateCasesContainer').style.display = 'none';
        document.getElementById('validateStatementsContainer').style.display = 'block';
        loadValidateStatementsQueue();
      }
    });
  });
  
  const refreshBtn = document.getElementById('refreshValidateQueueBtn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', loadValidationQueue);
  }
  
  const refreshStatementsBtn = document.getElementById('refreshValidateStatementsBtn');
  if (refreshStatementsBtn) {
    refreshStatementsBtn.addEventListener('click', loadValidateStatementsQueue);
  }
  
  const backBtn = document.getElementById('backToValidateQueueBtn');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      exitValidationMode();
    });
  }
  
  const submitBtn = document.getElementById('submitValidationBtn');
  if (submitBtn) {
    submitBtn.addEventListener('click', () => submitValidation('validate'));
  }
  
  const returnBtn = document.getElementById('returnToReviewBtn');
  if (returnBtn) {
    returnBtn.addEventListener('click', () => submitValidation('return_to_review'));
  }
  
  const rejectBtn = document.getElementById('rejectValidationBtn');
  if (rejectBtn) {
    rejectBtn.addEventListener('click', () => submitValidation('reject'));
  }
  
  // Setup filter button listeners
  const filterButtons = document.querySelectorAll('#validateFilterButtons .filter-btn');
  filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      setValidateFilter(btn.dataset.filter);
    });
  });
}

// Load validation queue from API
async function loadValidationQueue() {
  const queueList = document.getElementById('validateQueueList');
  if (!queueList) return;
  
  queueList.innerHTML = '<div class="empty-state">Loading validation queue...</div>';
  
  try {
    const response = await fetch(`${apiUrl}/api/verification-queue?status=needs_validation`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'X-API-Key': apiKey,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to load validation queue');
      } else {
        const text = await response.text();
        console.error('Non-JSON response from validation queue:', text);
        throw new Error('Server returned non-JSON response. Check authentication.');
      }
    }
    
    const data = await response.json();
    
    console.log('Validation queue response:', {
      total: data.incidents?.length,
      statuses: data.incidents?.map(i => ({ id: i.id, status: i.verification_status, cycle: i.review_cycle })),
      stats: data.stats
    });
    
    // The API returns cases with first_review or first_validation status when we pass status=needs_validation
    // No need to filter further - just use what API returns
    validationQueueData = data.incidents || [];
    
    const stats = data.stats || {};
    
    // Update filter counts
    updateValidateFilterCounts();
    
    if (validationQueueData.length === 0) {
      queueList.innerHTML = '<div class="empty-state">No cases ready for validation</div>';
      return;
    }
    
    renderValidationQueue();
    
  } catch (error) {
    console.error('Error loading validation queue:', error);
    queueList.innerHTML = `<div class="empty-state error">Failed to load validation queue: ${error.message}</div>`;
  }
}

// Update validation filter button counts
function updateValidateFilterCounts() {
  const allCount = validationQueueData.length;
  const revalidationCount = validationQueueData.filter(i => (i.review_cycle || 1) >= 2).length;
  const newCount = validationQueueData.filter(i => (i.review_cycle || 1) === 1).length;
  
  const allCountEl = document.getElementById('validateFilterAllCount');
  const revalidationCountEl = document.getElementById('validateFilterRevalidationCount');
  const newCountEl = document.getElementById('validateFilterNewCount');
  
  if (allCountEl) allCountEl.textContent = allCount;
  if (revalidationCountEl) revalidationCountEl.textContent = revalidationCount;
  if (newCountEl) newCountEl.textContent = newCount;
}

// Render validation queue with filters
function renderValidationQueue() {
  const queueList = document.getElementById('validateQueueList');
  if (!queueList) return;
  
  // Filter based on current selection
  let filteredData = [...validationQueueData];
  if (validateQueueFilter === 'revalidation') {
    filteredData = filteredData.filter(i => (i.review_cycle || 1) >= 2);
  } else if (validateQueueFilter === 'new') {
    filteredData = filteredData.filter(i => (i.review_cycle || 1) === 1);
  }
  
  // Sort: returned cases first (higher review_cycle), then by date
  const incidents = filteredData.sort((a, b) => {
    const cycleA = a.review_cycle || 1;
    const cycleB = b.review_cycle || 1;
    if (cycleB !== cycleA) return cycleB - cycleA;
    return new Date(b.created_at || 0) - new Date(a.created_at || 0);
  });
  
  if (incidents.length === 0) {
    queueList.innerHTML = `<div class="empty-state">No cases matching filter "${validateQueueFilter}"</div>`;
    return;
  }
  
  // Show priority alert if there are revalidation cases (only for 'all' filter)
  const revalidationCount = validationQueueData.filter(i => (i.review_cycle || 1) >= 2).length;
  let html = '';
  
  if (revalidationCount > 0 && validateQueueFilter === 'all') {
    html += `
      <div class="priority-alert alert-orange" style="cursor: pointer;" onclick="setValidateFilter('revalidation')">
        ⚠️ <strong>${revalidationCount}</strong> case${revalidationCount !== 1 ? 's' : ''} returned for re-validation - review changes first!
      </div>
    `;
  }
  
  html += incidents.map(incident => {
    const reviewCycle = incident.review_cycle || 1;
    const isReturned = reviewCycle >= 2;
    const isHighPriority = reviewCycle >= 3;
    
    // Lock status - check if locked by someone else
    const isLocked = incident.is_locked && incident.locked_by !== currentUserId;
    const isLockedByMe = incident.is_locked && incident.locked_by === currentUserId;
    const lockedByDisplay = incident.locked_by_name || incident.locked_by_email || 'Someone';
    
    // Card styling based on priority
    const cardClass = isHighPriority ? 'returned-cycle-3plus' : (isReturned ? 'returned-cycle-2' : '');
    
    return `
    <div class="queue-item ${cardClass} ${isLocked ? 'locked-by-other' : ''}" data-id="${incident.id}" data-review-cycle="${reviewCycle}" data-locked="${isLocked ? 'true' : 'false'}">
      ${isReturned ? `
        <div class="priority-badge ${isHighPriority ? 'priority-red' : 'priority-orange'}" style="position: absolute; top: 8px; right: 8px;">
          ${isHighPriority ? '⚠️ HIGH PRIORITY' : '⚡ RE-VALIDATE'}
        </div>
      ` : ''}
      
      ${isLocked ? `
        <div class="lock-badge" style="position: absolute; top: ${isReturned ? '32' : '8'}px; right: 8px; font-size: 10px; padding: 2px 6px; border-radius: 4px; background: #fef2f2; color: #dc2626; font-weight: 600; border: 1px solid #fecaca;">
          🔒 ${escapeHtml(lockedByDisplay)}
        </div>
      ` : ''}
      
      ${isLockedByMe ? `
        <button 
          class="lock-badge" 
          style="position: absolute; top: ${isReturned ? '32' : '8'}px; right: 8px; font-size: 10px; padding: 2px 6px; border-radius: 4px; background: #dcfce7; color: #166534; font-weight: 600; border: 1px solid #bbf7d0; cursor: pointer;"
          title="Click to release lock"
        >
          🔓 Your Lock
        </button>
      ` : ''}
      
      <div class="queue-item-header" style="${isReturned || isLocked || isLockedByMe ? 'padding-right: 100px;' : ''}">
        <strong>${escapeHtml(incident.subject_name || incident.victim_name || 'Unknown')}</strong>
        <div style="display: flex; gap: 4px; flex-wrap: wrap;">
          <span class="badge badge-purple">
            ${incident.verification_status === 'first_review' ? '1st Validation' : '2nd Validation'}
          </span>
          ${reviewCycle > 1 ? `
            <span class="cycle-badge ${isHighPriority ? 'cycle-3plus' : 'cycle-2'}">
              ${isHighPriority ? '🔥' : '🔄'} Cycle ${reviewCycle}
            </span>
          ` : ''}
        </div>
      </div>
      
      <div class="queue-item-meta">
        ${incident.incident_type ? incident.incident_type.replace(/_/g, ' ') : 'Unknown type'}
        ${incident.incident_date ? ' • ' + formatDateLocal(incident.incident_date) : ''}
      </div>
      
      ${incident.tags && incident.tags.length > 0 ? `
        <div style="display: flex; flex-wrap: wrap; gap: 4px; margin: 8px 0;">
          ${incident.tags.slice(0, 4).map(tag => `
            <span style="padding: 2px 6px; background: #eff6ff; color: #1e40af; border: 1px solid #bfdbfe; border-radius: 4px; font-size: 10px;">
              ${escapeHtml(tag)}
            </span>
          `).join('')}
          ${incident.tags.length > 4 ? `
            <span style="padding: 2px 6px; background: #f3f4f6; color: #4b5563; border-radius: 4px; font-size: 10px;">
              +${incident.tags.length - 4} more
            </span>
          ` : ''}
        </div>
      ` : ''}
      
      ${isReturned && incident.rejection_reason ? `
        <div style="background: #fef3c7; padding: 6px 8px; border-radius: 4px; margin: 8px 0; font-size: 11px; color: #92400e;">
          <strong>Previous feedback:</strong> ${escapeHtml(incident.rejection_reason)}
        </div>
      ` : ''}
      
      <button class="btn btn-sm btn-primary validate-case-btn" data-id="${incident.id}" style="margin-top: 8px;">
        ${isReturned ? '🔍 Re-validate Case' : 'Open for Validation'}
      </button>
    </div>
  `}).join('');
  
  queueList.innerHTML = html;
  
  // Add click handlers
  queueList.querySelectorAll('.validate-case-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const incidentId = e.target.dataset.id;
      // Find incident from validation queue for case info
      const incident = validationQueueData.find(inc => String(inc.id) === String(incidentId));
      const caseInfo = incident ? {
        id: incident.id,
        name: incident.victim_name || incident.subject_name || 'Unknown',
        type: incident.incident_type?.replace(/_/g, ' ') || 'Incident',
        status: incident.verification_status || 'validation'
      } : null;
      loadValidationCase(incidentId, caseInfo);
    });
  });
  
  // Lock badge click handlers for validation queue
  queueList.querySelectorAll('.lock-badge').forEach(lockBtn => {
    lockBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const card = lockBtn.closest('.queue-item');
      const incidentId = parseInt(card.dataset.id);
      if (confirm('Release lock on this case?')) {
        releaseLock(incidentId).then(() => {
          loadValidationQueue();
        });
      }
    });
  });
}

// Load a case for validation
async function loadValidationCase(incidentId, caseInfo = null) {
  // Prevent conflict with review mode
  if (reviewMode) {
    alert('You are currently reviewing a case. Please finish or cancel the review before validating a different case.');
    return;
  }
  
  // Try to acquire lock before loading case
  let lockAcquired;
  if (caseInfo) {
    lockAcquired = await acquireLockWithInfo(parseInt(incidentId), caseInfo);
  } else {
    lockAcquired = await acquireLock(parseInt(incidentId));
  }
  if (!lockAcquired) {
    return; // Lock denied, user already alerted
  }
  
  try {
    // Show loading state
    const queueView = document.getElementById('validateQueueView');
    const caseView = document.getElementById('validateCaseView');
    const caseContent = document.getElementById('validateCaseContent');
    
    if (caseContent) {
      caseContent.innerHTML = '<div style="text-align: center; padding: 40px;"><div class="spinner"></div><p style="margin-top: 12px;">Loading case for validation...</p></div>';
    }
    if (queueView) queueView.style.display = 'none';
    if (caseView) caseView.style.display = 'block';
    
    const response = await fetch(`${apiUrl}/api/incidents/${incidentId}/validate`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'X-API-Key': apiKey || '',
        'Content-Type': 'application/json'
      }
    });
    
    // Check content type to handle non-JSON responses
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error('Server returned non-JSON response. Check your authentication.');
    }
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to load case');
    }
    
    // Also fetch the flattened details (same endpoint as review tab uses)
    // This ensures array fields like dispersal_method are properly merged
    try {
      const detailsResponse = await fetch(`${apiUrl}/api/incidents/${incidentId}/details`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'X-API-Key': apiKey || '',
          'Content-Type': 'application/json'
        }
      });
      if (detailsResponse.ok) {
        const detailsData = await detailsResponse.json();
        const flattenedDetails = detailsData.details || {};
        console.log('[loadValidationCase] Flattened details from /details endpoint:', flattenedDetails);
        
        // Store this for the render function to use
        data.flattened_details = flattenedDetails;
      }
    } catch (detailsErr) {
      console.warn('[loadValidationCase] Failed to fetch flattened details:', detailsErr);
    }
    
    validationData = data;
    validateIncidentId = incidentId;
    validateMode = true;
    
    // Notify background to update context menu for validate mode
    chrome.runtime.sendMessage({
      type: 'SET_CONTENT_MODE',
      mode: 'incident',  // Validation is for incidents
      isValidateMode: true
    });
    
    // Check if case is in correct status for validation
    const incident = data.incident;
    if (!['first_review', 'first_validation'].includes(incident.verification_status)) {
      alert(`Cannot validate case with status: ${incident.verification_status}`);
      return;
    }
    
    // Type-specific fields configuration
    const TYPE_SPECIFIC_FIELDS = {
      death: [
        { key: 'cause_of_death', label: 'Cause of Death' },
        { key: 'manner_of_death', label: 'Manner of Death' },
        { key: 'custody_duration', label: 'Custody Duration' },
        { key: 'circumstances', label: 'Circumstances' },
        { key: 'autopsy_available', label: 'Autopsy Available', type: 'boolean' },
        { key: 'medical_neglect_alleged', label: 'Medical Neglect Alleged', type: 'boolean' },
      ],
      death_in_custody: [
        { key: 'cause_of_death', label: 'Cause of Death' },
        { key: 'manner_of_death', label: 'Manner of Death' },
        { key: 'custody_duration', label: 'Custody Duration' },
        { key: 'circumstances', label: 'Circumstances' },
        { key: 'autopsy_available', label: 'Autopsy Available', type: 'boolean' },
        { key: 'medical_neglect_alleged', label: 'Medical Neglect Alleged', type: 'boolean' },
      ],
      shooting: [
        { key: 'shooting_fatal', label: 'Fatal', type: 'boolean' },
        { key: 'shots_fired', label: 'Shots Fired' },
        { key: 'weapon_type', label: 'Weapon Type' },
        { key: 'bodycam_available', label: 'Bodycam Available', type: 'boolean' },
        { key: 'victim_armed', label: 'Victim Armed', type: 'boolean' },
        { key: 'warning_given', label: 'Warning Given', type: 'boolean' },
        { key: 'shooting_context', label: 'Context' },
      ],
      excessive_force: [
        { key: 'force_types', label: 'Force Types Used', type: 'array' },
        { key: 'victim_restrained', label: 'Victim Restrained', type: 'boolean' },
        { key: 'victim_complying', label: 'Victim Complying', type: 'boolean' },
        { key: 'video_evidence', label: 'Video Evidence', type: 'boolean' },
        { key: 'injuries_sustained', label: 'Injuries Sustained' },
        { key: 'hospitalization_required', label: 'Hospitalization Required', type: 'boolean' },
      ],
      injury: [
        { key: 'injury_type', label: 'Injury Type' },
        { key: 'injury_severity', label: 'Severity' },
        { key: 'injury_weapon', label: 'Weapon Used' },
        { key: 'injury_cause', label: 'Cause/Context' },
      ],
      arrest: [
        { key: 'arrest_reason', label: 'Arrest Reason' },
        { key: 'arrest_context', label: 'Context' },
        { key: 'arrest_charges', label: 'Charges' },
        { key: 'timing_suspicious', label: 'Timing Suspicious', type: 'boolean' },
        { key: 'pretext_arrest', label: 'Pretext Arrest', type: 'boolean' },
        { key: 'selective_enforcement', label: 'Selective Enforcement', type: 'boolean' },
        { key: 'warrant_present', label: 'Warrant Present', type: 'boolean' },
      ],
      medical_neglect: [
        { key: 'medical_condition', label: 'Medical Condition' },
        { key: 'treatment_denied', label: 'Treatment Denied' },
        { key: 'requests_documented', label: 'Requests Documented', type: 'boolean' },
        { key: 'resulted_in_death', label: 'Resulted in Death', type: 'boolean' },
      ],
      protest_suppression: [
        { key: 'protest_topic', label: 'Protest Topic' },
        { key: 'protest_size', label: 'Protest Size' },
        { key: 'permitted', label: 'Permitted', type: 'boolean' },
        { key: 'dispersal_method', label: 'Dispersal Methods', type: 'array' },
        { key: 'arrests_made', label: 'Arrests Made' },
      ],
      death_at_protest: [
        { key: 'cause_of_death', label: 'Cause of Death' },
        { key: 'protest_topic', label: 'Protest Topic' },
        { key: 'protest_size', label: 'Protest Size' },
        { key: 'dispersal_method', label: 'Dispersal Methods', type: 'array' },
      ],
      rights_violation: [
        { key: 'journalism_related', label: 'Journalism Related', type: 'boolean' },
        { key: 'protest_related', label: 'Protest Related', type: 'boolean' },
        { key: 'activism_related', label: 'Activism Related', type: 'boolean' },
        { key: 'speech_content', label: 'Speech Content' },
        { key: 'court_ruling', label: 'Court Ruling' },
      ],
      deportation: [
        { key: 'departure_country', label: 'Departure Country' },
        { key: 'destination_country', label: 'Destination Country' },
        { key: 'family_separated', label: 'Family Separated', type: 'boolean' },
        { key: 'expedited', label: 'Expedited', type: 'boolean' },
        { key: 'legal_representation', label: 'Legal Representation', type: 'boolean' },
      ],
      family_separation: [
        { key: 'children_affected', label: 'Children Affected' },
        { key: 'ages_of_children', label: 'Ages of Children' },
        { key: 'separation_duration', label: 'Separation Duration' },
        { key: 'reunification_status', label: 'Reunification Status' },
      ],
      workplace_raid: [
        { key: 'business_type', label: 'Business Type' },
        { key: 'workers_detained', label: 'Workers Detained' },
        { key: 'workers_arrested', label: 'Workers Arrested' },
        { key: 'warrant_obtained', label: 'Warrant Obtained', type: 'boolean' },
        { key: 'media_present', label: 'Media Present', type: 'boolean' },
      ],
    };
    
    // Initialize validation state
    validationState = {};
    
    // Fields - includes altKey fallback pairs
    const displayFieldsConfig = [
      { key: 'subject_name', altKey: 'victim_name' },
      { key: 'incident_date' },
      { key: 'incident_types', altKey: 'incident_type' },
      { key: 'city' },
      { key: 'state' },
      { key: 'country' },
      { key: 'facility' },
      { key: 'subject_age' },
      { key: 'subject_gender' },
      { key: 'subject_nationality' },
      { key: 'subject_immigration_status' },
      { key: 'summary' }
    ];
    
    for (const fieldConfig of displayFieldsConfig) {
      let value = incident[fieldConfig.key];
      // Fall back to altKey if main key is empty
      if ((value === null || value === undefined || value === '') && fieldConfig.altKey) {
        value = incident[fieldConfig.altKey];
      }
      if (value !== null && value !== undefined && value !== '' &&
          !(Array.isArray(value) && value.length === 0)) {
        validationState[`field_${fieldConfig.key}`] = { checked: false, reason: '' };
      }
    }
    
    // Type-specific details from incident_details
    for (const detail of data.incident_details || []) {
      const detailType = detail.detail_type;
      const typeFields = TYPE_SPECIFIC_FIELDS[detailType];
      if (typeFields && detail.details) {
        for (const field of typeFields) {
          const value = detail.details[field.key];
          if (value !== null && value !== undefined && value !== '' && 
              !(Array.isArray(value) && value.length === 0)) {
            validationState[`detail_${detailType}_${field.key}`] = { checked: false, reason: '' };
          }
        }
      }
    }
    
    // Quotes
    for (const quote of data.quotes || []) {
      validationState[`quote_${quote.id}`] = { checked: false, reason: '' };
    }
    
    // Timeline
    for (const entry of data.timeline || []) {
      validationState[`timeline_${entry.id}`] = { checked: false, reason: '' };
    }
    
    // Sources
    for (const source of data.sources || []) {
      validationState[`source_${source.id}`] = { checked: false, reason: '' };
    }
    
    // Media
    for (const item of data.media || []) {
      validationState[`media_${item.id}`] = { checked: false, reason: '' };
    }
    
    // Agencies
    for (const agency of data.agencies || []) {
      validationState[`agency_${agency.id}`] = { checked: false, reason: '' };
    }
    
    // Violations
    for (const violation of data.violations || []) {
      validationState[`violation_${violation.id}`] = { checked: false, reason: '' };
    }
    
    // Load custom fields for this incident and initialize their validation state
    await loadCustomFields();
    for (const field of customFields) {
      validationState[`custom_${field.id}`] = { checked: false, reason: '' };
    }
    
    renderValidationCase(data);
    
    // Switch views
    document.getElementById('validateQueueView').style.display = 'none';
    document.getElementById('validateCaseView').style.display = 'block';
    
  } catch (error) {
    console.error('Error loading validation case:', error);
    // Show error and go back to queue
    const queueView = document.getElementById('validateQueueView');
    const caseView = document.getElementById('validateCaseView');
    if (queueView) queueView.style.display = 'block';
    if (caseView) caseView.style.display = 'none';
    alert('Failed to load case: ' + error.message + '\n\nMake sure you are logged in with an analyst/admin API key.');
  }
}

// Render the validation case UI
function renderValidationCase(data) {
  const { incident, sources, quotes, timeline, quote_field_links, previous_issues } = data;
  
  // Set title with cycle badge if returned case
  const reviewCycle = incident.review_cycle || 1;
  const isReturned = reviewCycle >= 2;
  const isHighPriority = reviewCycle >= 3;
  
  const titleEl = document.getElementById('validateCaseTitle');
  titleEl.innerHTML = escapeHtml(incident.subject_name || incident.victim_name || 'Unknown');
  if (isReturned) {
    titleEl.innerHTML += ` <span class="cycle-badge ${isHighPriority ? 'cycle-3plus' : 'cycle-2'}">${isHighPriority ? '🔥' : '🔄'} Cycle ${reviewCycle}</span>`;
  }
  
  // Set status badge with priority indicator
  const statusBadge = document.getElementById('validateStatusBadge');
  let statusText = incident.verification_status === 'first_review' 
    ? 'Awaiting First Validation' 
    : 'Awaiting Second Validation';
  
  if (isReturned) {
    statusBadge.style.background = isHighPriority ? '#fee2e2' : '#ffedd5';
    statusBadge.style.color = isHighPriority ? '#dc2626' : '#c2410c';
  } else {
    statusBadge.style.background = '#e9d5ff';
    statusBadge.style.color = '#7c3aed';
  }
  statusBadge.textContent = statusText;
  
  // Show previous issues if any
  const issuesContainer = document.getElementById('validatePreviousIssues');
  const issuesList = document.getElementById('validatePreviousIssuesList');
  if (previous_issues && previous_issues.length > 0) {
    issuesContainer.style.display = 'block';
    issuesList.innerHTML = previous_issues.map(issue => `
      <div style="padding: 6px; background: #fff3cd; border-radius: 4px; margin-bottom: 6px; font-size: 12px;">
        <strong>${escapeHtml(issue.field_name)}:</strong> ${escapeHtml(issue.issue_reason)}
      </div>
    `).join('');
  } else {
    issuesContainer.style.display = 'none';
  }
  
  // Build quote-field link map - stores ARRAYS of links per field
  const quoteFieldMap = {};
  for (const link of quote_field_links || []) {
    if (!quoteFieldMap[link.field_name]) {
      quoteFieldMap[link.field_name] = [];
    }
    quoteFieldMap[link.field_name].push(link);
  }
  
  // Helper to find ALL linked quotes by checking all field aliases
  // Returns an array of quotes (deduplicated by quote_id)
  const findLinkedQuotes = (fieldKey, altKey) => {
    const links = [];
    const seenQuoteIds = new Set();
    
    const addLinks = (key) => {
      const keyLinks = quoteFieldMap[key] || [];
      for (const link of keyLinks) {
        if (!seenQuoteIds.has(link.quote_id)) {
          seenQuoteIds.add(link.quote_id);
          links.push(link);
        }
      }
    };
    
    // Direct lookup first
    addLinks(fieldKey);
    if (altKey) addLinks(altKey);
    
    // Use field registry to check all aliases
    if (window.FieldRegistry) {
      // Check fieldKey's canonical name and all aliases
      const definition = window.FieldRegistry.getFieldDefinition(fieldKey);
      if (definition) {
        // Check canonical name
        addLinks(definition.canonical);
        // Check all aliases
        for (const alias of definition.aliases || []) {
          addLinks(alias);
        }
      }
      
      // Also check altKey's canonical name and all aliases (for cases like subject_name/victim_name)
      if (altKey) {
        const altDefinition = window.FieldRegistry.getFieldDefinition(altKey);
        if (altDefinition) {
          addLinks(altDefinition.canonical);
          for (const alias of altDefinition.aliases || []) {
            addLinks(alias);
          }
        }
      }
    }
    
    return links;
  };
  
  // Render content
  const content = document.getElementById('validateCaseContent');
  let html = '';
  
  // Show cycle info banner for returned cases
  if (isReturned) {
    html += `
      <div class="priority-alert ${isHighPriority ? 'alert-red' : 'alert-orange'}" style="margin-bottom: 16px;">
        ${isHighPriority ? '🔥' : '⚠️'} <strong>Review Cycle ${reviewCycle}</strong> - This case was returned from validation. 
        Please carefully verify all corrections before approving.
      </div>
    `;
  }
  
  // Fields section
  const displayFields = [
    { key: 'subject_name', altKey: 'victim_name', label: 'Subject Name' },
    { key: 'incident_date', label: 'Incident Date' },
    { key: 'incident_types', altKey: 'incident_type', label: 'Incident Type(s)' },
    { key: 'city', label: 'City' },
    { key: 'state', label: 'State' },
    { key: 'facility', label: 'Facility' },
    { key: 'subject_age', label: 'Age' },
    { key: 'subject_gender', label: 'Gender' },
    { key: 'subject_nationality', label: 'Nationality' },
    { key: 'subject_immigration_status', label: 'Immigration Status' },
    { key: 'summary', label: 'Summary' }
  ];
  
  html += '<div class="validation-section-header">Incident Fields</div>';
  
  for (const field of displayFields) {
    let value = incident[field.key];
    // Fall back to altKey if main key is empty
    if ((value === null || value === undefined || value === '') && field.altKey) {
      value = incident[field.altKey];
    }
    if (value === null || value === undefined || value === '') continue;
    
    const key = `field_${field.key}`;
    const state = validationState[key] || { checked: false, reason: '' };
    const linkedQuotes = findLinkedQuotes(field.key, field.altKey);
    
    let displayValue = value;
    if (field.key === 'incident_types' || field.key === 'incident_type') {
      // Handle both array and single string
      if (Array.isArray(value)) {
        displayValue = value.map(v => String(v).replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())).join(', ');
      } else {
        displayValue = String(value).replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      }
    } else if (field.key === 'incident_date' && value) {
      displayValue = formatDateLocal(value);
    }
    
    // Build quotes HTML - show all linked quotes
    let quotesHtml = '';
    if (linkedQuotes.length > 0) {
      quotesHtml = `<div class="validation-quotes-header">✓ Verified by ${linkedQuotes.length} quote${linkedQuotes.length !== 1 ? 's' : ''}:</div>`;
      quotesHtml += linkedQuotes.map(lq => `
        <div class="validation-quote">"${escapeHtml(lq.quote_text)}"</div>
        <div class="validation-source">Source: ${escapeHtml(lq.source_title || lq.source_url || 'Unknown')}</div>
      `).join('');
    }
    
    html += `
      <div class="validation-item ${state.checked ? 'validated' : ''}" data-key="${key}">
        <div class="validation-item-header">
          <input type="checkbox" class="validation-checkbox" data-key="${key}" ${state.checked ? 'checked' : ''}>
          <div class="validation-content">
            <div class="validation-label">${field.label}</div>
            <div class="validation-value">${escapeHtml(String(displayValue))}</div>
            ${quotesHtml}
            ${!state.checked ? `
              <input type="text" class="validation-reason-input" data-key="${key}" 
                     placeholder="Reason not validated..." value="${escapeHtml(state.reason)}">
            ` : ''}
          </div>
        </div>
      </div>
    `;
  }
  
  // Quotes section
  if (quotes && quotes.length > 0) {
    html += `<div class="validation-section-header">Quotes (${quotes.length})</div>`;
    
    for (const quote of quotes) {
      const key = `quote_${quote.id}`;
      const state = validationState[key] || { checked: false, reason: '' };
      
      html += `
        <div class="validation-item ${state.checked ? 'validated' : ''}" data-key="${key}">
          <div class="validation-item-header">
            <input type="checkbox" class="validation-checkbox" data-key="${key}" ${state.checked ? 'checked' : ''}>
            <div class="validation-content">
              <div class="validation-value" style="font-style: italic;">"${escapeHtml(quote.quote_text)}"</div>
              <div class="validation-source">
                <a href="${escapeHtml(quote.source_url || '#')}" target="_blank" style="color: #3b82f6;">
                  ${escapeHtml(quote.source_title || quote.source_publication || 'Unknown source')}
                </a>
              </div>
              ${quote.linked_fields && quote.linked_fields.length > 0 ? `
                <div style="font-size: 11px; color: #6b7280; margin-top: 4px;">
                  Links to: ${quote.linked_fields.join(', ')}
                </div>
              ` : ''}
              ${!state.checked ? `
                <input type="text" class="validation-reason-input" data-key="${key}" 
                       placeholder="Reason not validated..." value="${escapeHtml(state.reason)}">
              ` : ''}
            </div>
          </div>
        </div>
      `;
    }
  }
  
  // Timeline section
  if (timeline && timeline.length > 0) {
    html += `<div class="validation-section-header">Timeline (${timeline.length})</div>`;
    
    for (const entry of timeline) {
      const key = `timeline_${entry.id}`;
      const state = validationState[key] || { checked: false, reason: '' };
      
      html += `
        <div class="validation-item ${state.checked ? 'validated' : ''}" data-key="${key}">
          <div class="validation-item-header">
            <input type="checkbox" class="validation-checkbox" data-key="${key}" ${state.checked ? 'checked' : ''}>
            <div class="validation-content">
              <div class="validation-label">${entry.event_date ? formatDateLocal(entry.event_date) : 'No date'}</div>
              <div class="validation-value">${escapeHtml(entry.description)}</div>
              ${entry.quote_text ? `
                <div class="validation-quote">"${escapeHtml(entry.quote_text)}"</div>
                ${entry.quote_source_title ? `<div class="validation-source">Source: ${escapeHtml(entry.quote_source_title)}</div>` : ''}
              ` : `
                <div class="validation-warning">⚠️ No supporting quote linked</div>
              `}
              ${!state.checked ? `
                <input type="text" class="validation-reason-input" data-key="${key}" 
                       placeholder="Reason not validated..." value="${escapeHtml(state.reason)}">
              ` : ''}
            </div>
          </div>
        </div>
      `;
    }
  }
  
  // Sources section
  if (sources && sources.length > 0) {
    html += `<div class="validation-section-header">Sources (${sources.length})</div>`;
    
    for (const source of sources) {
      const key = `source_${source.id}`;
      const state = validationState[key] || { checked: false, reason: '' };
      
      html += `
        <div class="validation-item ${state.checked ? 'validated' : ''}" data-key="${key}">
          <div class="validation-item-header">
            <input type="checkbox" class="validation-checkbox" data-key="${key}" ${state.checked ? 'checked' : ''}>
            <div class="validation-content">
              <div class="validation-label">${escapeHtml(source.title || 'Untitled Source')}</div>
              ${source.publication ? `<div style="font-size: 12px; color: #6b7280;">${escapeHtml(source.publication)}</div>` : ''}
              <div class="validation-source">
                <a href="${escapeHtml(source.url)}" target="_blank" style="color: #3b82f6; word-break: break-all;">
                  ${escapeHtml(source.url)}
                </a>
              </div>
              ${!state.checked ? `
                <input type="text" class="validation-reason-input" data-key="${key}" 
                       placeholder="Reason not validated..." value="${escapeHtml(state.reason)}">
              ` : ''}
            </div>
          </div>
        </div>
      `;
    }
  }
  
  // Type-Specific Details section
  // Use flattened_details from /details endpoint (same as review tab) for accurate array handling
  const flattenedDetails = data.flattened_details || {};
  const incidentDetailsData = data.incident_details || [];
  console.log('[Validation] Flattened details:', flattenedDetails);
  console.log('[Validation] Raw incident_details:', incidentDetailsData);
  
  // Get unique detail types that have data
  const detailTypes = new Set();
  for (const detail of incidentDetailsData) {
    if (detail.detail_type) detailTypes.add(detail.detail_type);
  }
  
  // Skip 'death' type if 'death_in_custody' exists (death_in_custody includes all death fields)
  if (detailTypes.has('death_in_custody') && detailTypes.has('death')) {
    detailTypes.delete('death');
  }
  
  if (detailTypes.size > 0) {
    
    // Type-specific fields configuration (must match the one in loadValidationCase)
    const TYPE_SPECIFIC_FIELDS = {
      death: [
        { key: 'cause_of_death', label: 'Cause of Death' },
        { key: 'manner_of_death', label: 'Manner of Death' },
        { key: 'custody_duration', label: 'Custody Duration' },
        { key: 'circumstances', label: 'Circumstances' },
        { key: 'autopsy_available', label: 'Autopsy Available', type: 'boolean' },
        { key: 'medical_neglect_alleged', label: 'Medical Neglect Alleged', type: 'boolean' },
      ],
      death_in_custody: [
        { key: 'cause_of_death', label: 'Cause of Death' },
        { key: 'manner_of_death', label: 'Manner of Death' },
        { key: 'custody_duration', label: 'Custody Duration' },
        { key: 'circumstances', label: 'Circumstances' },
        { key: 'autopsy_available', label: 'Autopsy Available', type: 'boolean' },
        { key: 'medical_neglect_alleged', label: 'Medical Neglect Alleged', type: 'boolean' },
      ],
      shooting: [
        { key: 'shooting_fatal', label: 'Fatal', type: 'boolean' },
        { key: 'shots_fired', label: 'Shots Fired' },
        { key: 'weapon_type', label: 'Weapon Type' },
        { key: 'bodycam_available', label: 'Bodycam Available', type: 'boolean' },
        { key: 'victim_armed', label: 'Victim Armed', type: 'boolean' },
        { key: 'warning_given', label: 'Warning Given', type: 'boolean' },
        { key: 'shooting_context', label: 'Context' },
      ],
      excessive_force: [
        { key: 'force_types', label: 'Force Types Used', type: 'array' },
        { key: 'victim_restrained', label: 'Victim Restrained', type: 'boolean' },
        { key: 'victim_complying', label: 'Victim Complying', type: 'boolean' },
        { key: 'video_evidence', label: 'Video Evidence', type: 'boolean' },
        { key: 'injuries_sustained', label: 'Injuries Sustained' },
        { key: 'hospitalization_required', label: 'Hospitalization Required', type: 'boolean' },
      ],
      injury: [
        { key: 'injury_type', label: 'Injury Type' },
        { key: 'injury_severity', label: 'Severity' },
        { key: 'injury_weapon', label: 'Weapon Used' },
        { key: 'injury_cause', label: 'Cause/Context' },
      ],
      arrest: [
        { key: 'arrest_reason', label: 'Arrest Reason' },
        { key: 'arrest_context', label: 'Context' },
        { key: 'arrest_charges', label: 'Charges' },
        { key: 'timing_suspicious', label: 'Timing Suspicious', type: 'boolean' },
        { key: 'pretext_arrest', label: 'Pretext Arrest', type: 'boolean' },
        { key: 'selective_enforcement', label: 'Selective Enforcement', type: 'boolean' },
        { key: 'warrant_present', label: 'Warrant Present', type: 'boolean' },
      ],
      medical_neglect: [
        { key: 'medical_condition', label: 'Medical Condition' },
        { key: 'treatment_denied', label: 'Treatment Denied' },
        { key: 'requests_documented', label: 'Requests Documented', type: 'boolean' },
        { key: 'resulted_in_death', label: 'Resulted in Death', type: 'boolean' },
      ],
      protest_suppression: [
        { key: 'protest_topic', label: 'Protest Topic' },
        { key: 'protest_size', label: 'Protest Size' },
        { key: 'permitted', label: 'Permitted', type: 'boolean' },
        { key: 'dispersal_method', label: 'Dispersal Methods', type: 'array' },
        { key: 'arrests_made', label: 'Arrests Made' },
      ],
      death_at_protest: [
        { key: 'cause_of_death', label: 'Cause of Death' },
        { key: 'protest_topic', label: 'Protest Topic' },
        { key: 'protest_size', label: 'Protest Size' },
        { key: 'dispersal_method', label: 'Dispersal Methods', type: 'array' },
      ],
      rights_violation: [
        { key: 'journalism_related', label: 'Journalism Related', type: 'boolean' },
        { key: 'protest_related', label: 'Protest Related', type: 'boolean' },
        { key: 'activism_related', label: 'Activism Related', type: 'boolean' },
        { key: 'speech_content', label: 'Speech Content' },
        { key: 'court_ruling', label: 'Court Ruling' },
      ],
      deportation: [
        { key: 'departure_country', label: 'Departure Country' },
        { key: 'destination_country', label: 'Destination Country' },
        { key: 'family_separated', label: 'Family Separated', type: 'boolean' },
        { key: 'expedited', label: 'Expedited', type: 'boolean' },
        { key: 'legal_representation', label: 'Legal Representation', type: 'boolean' },
      ],
      family_separation: [
        { key: 'children_affected', label: 'Children Affected' },
        { key: 'ages_of_children', label: 'Ages of Children' },
        { key: 'separation_duration', label: 'Separation Duration' },
        { key: 'reunification_status', label: 'Reunification Status' },
      ],
      workplace_raid: [
        { key: 'business_type', label: 'Business Type' },
        { key: 'workers_detained', label: 'Workers Detained' },
        { key: 'workers_arrested', label: 'Workers Arrested' },
        { key: 'warrant_obtained', label: 'Warrant Obtained', type: 'boolean' },
        { key: 'media_present', label: 'Media Present', type: 'boolean' },
      ],
    };
    
    // Iterate over detail records (not just types) to get correct fields for each
    for (const detailRecord of incidentDetailsData) {
      const detailType = detailRecord.detail_type;
      if (!detailType) continue;
      
      // Skip 'death' type if we have 'death_in_custody'
      if (detailType === 'death' && detailTypes.has('death_in_custody')) {
        continue;
      }
      
      const typeFields = TYPE_SPECIFIC_FIELDS[detailType];
      if (!typeFields) continue;
      
      // Get fields that have values - use THIS specific detail record's data
      const recordDetails = detailRecord.details || {};
      const fieldsWithValues = typeFields.filter(field => {
        const value = recordDetails[field.key];
        return value !== null && value !== undefined && value !== '' && 
               !(Array.isArray(value) && value.length === 0);
      });
      
      if (fieldsWithValues.length === 0) continue;
      
      // Format section label properly
      const sectionLabels = {
        'death': 'Death',
        'death_in_custody': 'Death in Custody',
        'death_at_protest': 'Death at Protest',
        'shooting': 'Shooting',
        'excessive_force': 'Excessive Force',
        'injury': 'Injury',
        'arrest': 'Arrest',
        'medical_neglect': 'Medical Neglect',
        'protest_suppression': 'Protest Suppression',
        'rights_violation': 'Rights Violation',
        'deportation': 'Deportation',
        'family_separation': 'Family Separation',
        'workplace_raid': 'Workplace Raid',
      };
      const sectionLabel = sectionLabels[detailType] || detailType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      html += `<div class="validation-section-header">${sectionLabel} Details (${fieldsWithValues.length})</div>`;
      
      for (const field of fieldsWithValues) {
        const key = `detail_${detailType}_${field.key}`;
        const state = validationState[key] || { checked: false, reason: '' };
        const rawValue = recordDetails[field.key]; // Use record's data, not flattened
        const linkedQuotes = findLinkedQuotes(field.key, field.altKey);
        
        // Debug logging for arrays
        if (field.type === 'array') {
          console.log(`[Validation] Field ${field.key}:`, rawValue, 'isArray:', Array.isArray(rawValue), 'type:', typeof rawValue);
        }
        
        // Format display value
        let displayValue;
        if (field.type === 'boolean') {
          displayValue = rawValue ? 'Yes' : 'No';
        } else if (field.type === 'array') {
          // Handle both arrays and strings that look like arrays
          if (Array.isArray(rawValue)) {
            displayValue = rawValue.map(v => String(v).replace(/_/g, ' ')).join(', ') || 'None';
          } else if (typeof rawValue === 'string') {
            // Check if it looks like a PostgreSQL array string (e.g., "{value1,value2}")
            if (rawValue.startsWith('{') && rawValue.endsWith('}')) {
              const arrayValues = rawValue.slice(1, -1).split(',').filter(v => v);
              displayValue = arrayValues.map(v => v.replace(/_/g, ' ')).join(', ');
            } else {
              // Try to parse as JSON array
              try {
                const parsed = JSON.parse(rawValue);
                if (Array.isArray(parsed)) {
                  displayValue = parsed.map(v => String(v).replace(/_/g, ' ')).join(', ');
                } else {
                  displayValue = String(rawValue).replace(/_/g, ' ');
                }
              } catch {
                // Not JSON, treat as single value
                displayValue = String(rawValue).replace(/_/g, ' ');
              }
            }
          } else {
            displayValue = String(rawValue).replace(/_/g, ' ');
          }
        } else {
          displayValue = String(rawValue);
        }
        
        // Build quotes HTML - show all linked quotes
        let quotesHtml = '';
        if (linkedQuotes.length > 0) {
          quotesHtml = `<div class="validation-quotes-header">✓ Verified by ${linkedQuotes.length} quote${linkedQuotes.length !== 1 ? 's' : ''}:</div>`;
          quotesHtml += linkedQuotes.map(lq => `
            <div class="validation-quote">"${escapeHtml(lq.quote_text)}"</div>
            <div class="validation-source">Source: <a href="${escapeHtml(lq.source_url || '#')}" target="_blank" style="color: #3b82f6;">${escapeHtml(lq.source_title || lq.source_url || 'Unknown')}</a></div>
          `).join('');
        }
        
        html += `
          <div class="validation-item ${state.checked ? 'validated' : ''}" data-key="${key}">
            <div class="validation-item-header">
              <input type="checkbox" class="validation-checkbox" data-key="${key}" ${state.checked ? 'checked' : ''}>
              <div class="validation-content">
                <div class="validation-label">${field.label}</div>
                <div class="validation-value">${escapeHtml(displayValue)}</div>
                ${quotesHtml}
                ${!state.checked ? `
                  <input type="text" class="validation-reason-input" data-key="${key}" 
                         placeholder="Reason not validated..." value="${escapeHtml(state.reason)}">
                ` : ''}
              </div>
            </div>
          </div>
        `;
      }
    }
  }
  
  // Media section
  const mediaData = data.media || [];
  if (mediaData.length > 0) {
    html += `<div class="validation-section-header">Media (${mediaData.length})</div>`;
    
    for (const item of mediaData) {
      const key = `media_${item.id}`;
      const state = validationState[key] || { checked: false, reason: '' };
      
      html += `
        <div class="validation-item ${state.checked ? 'validated' : ''}" data-key="${key}">
          <div class="validation-item-header">
            <input type="checkbox" class="validation-checkbox" data-key="${key}" ${state.checked ? 'checked' : ''}>
            <div class="validation-content">
              <div class="validation-label">${item.media_type === 'image' ? '🖼️ Image' : '🎬 Video'}</div>
              <div class="validation-source">
                <a href="${escapeHtml(item.url)}" target="_blank" style="color: #3b82f6; word-break: break-all;">
                  ${escapeHtml(item.url)}
                </a>
              </div>
              ${item.description ? `<div class="validation-value" style="font-size: 12px; margin-top: 4px;">${escapeHtml(item.description)}</div>` : ''}
              ${!state.checked ? `
                <input type="text" class="validation-reason-input" data-key="${key}" 
                       placeholder="Reason not validated..." value="${escapeHtml(state.reason)}">
              ` : ''}
            </div>
          </div>
        </div>
      `;
    }
  }
  
  // Agencies section
  const agenciesData = data.agencies || [];
  if (agenciesData.length > 0) {
    const agencyLabels = {
      ice: 'ICE', ice_ere: 'ICE ERO', cbp: 'CBP', border_patrol: 'Border Patrol',
      local_police: 'Local Police', state_police: 'State Police', federal_marshals: 'US Marshals',
      national_guard: 'National Guard', dhs: 'DHS', private_contractor: 'Private Contractor',
      other: 'Other', unknown: 'Unknown'
    };
    
    html += `<div class="validation-section-header">Agencies (${agenciesData.length})</div>`;
    
    for (const agency of agenciesData) {
      const key = `agency_${agency.id}`;
      const state = validationState[key] || { checked: false, reason: '' };
      const agencyLabel = agencyLabels[agency.agency] || agency.agency;
      const linkedQuotes = findLinkedQuotes(`agency_${agency.agency}`);
      
      // Build quotes HTML
      let quotesHtml = '';
      if (linkedQuotes.length > 0) {
        quotesHtml = `<div class="validation-quotes-header">✓ Verified by ${linkedQuotes.length} quote${linkedQuotes.length !== 1 ? 's' : ''}:</div>`;
        quotesHtml += linkedQuotes.map(lq => `
          <div class="validation-quote">"${escapeHtml(lq.quote_text)}"</div>
          <div class="validation-source">Source: <a href="${escapeHtml(lq.source_url || '#')}" target="_blank" style="color: #3b82f6;">${escapeHtml(lq.source_title || lq.source_url || 'Unknown')}</a></div>
        `).join('');
      }
      
      html += `
        <div class="validation-item ${state.checked ? 'validated' : ''}" data-key="${key}">
          <div class="validation-item-header">
            <input type="checkbox" class="validation-checkbox" data-key="${key}" ${state.checked ? 'checked' : ''}>
            <div class="validation-content">
              <div class="validation-label">${escapeHtml(agencyLabel)}</div>
              ${agency.role ? `<div style="font-size: 12px; color: #6b7280;">Role: ${escapeHtml(agency.role)}</div>` : ''}
              ${quotesHtml}
              ${!state.checked ? `
                <input type="text" class="validation-reason-input" data-key="${key}" 
                       placeholder="Reason not validated..." value="${escapeHtml(state.reason)}">
              ` : ''}
            </div>
          </div>
        </div>
      `;
    }
  }
  
  // Violations section
  const violations = data.violations || [];
  if (violations.length > 0) {
    // Mapping from violation type to readable label
    const violationLabels = {
      '4th_amendment': '4th Amendment',
      '5th_amendment_due_process': '5th Amendment (Due Process)',
      '8th_amendment': '8th Amendment',
      '14th_amendment_equal_protection': '14th Amendment (Equal Protection)',
      '1st_amendment': '1st Amendment',
      'medical_neglect': 'Medical Neglect',
      'excessive_force': 'Excessive Force',
      'false_imprisonment': 'False Imprisonment',
      'civil_rights_violation': 'Civil Rights Violation'
    };
    
    const classificationLabels = {
      'alleged': 'Alleged',
      'potential': 'Potential',
      'possible': 'Possible'
    };
    
    html += `<div class="validation-section-header">Constitutional Violations (${violations.length})</div>`;
    
    for (const violation of violations) {
      const key = `violation_${violation.id}`;
      const state = validationState[key] || { checked: false, reason: '' };
      const typeLabel = violationLabels[violation.violation_type] || violation.violation_type;
      const classLabel = classificationLabels[violation.classification] || violation.classification;
      const linkedQuotes = findLinkedQuotes(`violation_${violation.violation_type}`);
      
      // Build quotes HTML
      let quotesHtml = '';
      if (linkedQuotes.length > 0) {
        quotesHtml = `<div class="validation-quotes-header">✓ Verified by ${linkedQuotes.length} quote${linkedQuotes.length !== 1 ? 's' : ''}:</div>`;
        quotesHtml += linkedQuotes.map(lq => `
          <div class="validation-quote">"${escapeHtml(lq.quote_text)}"</div>
          <div class="validation-source">Source: <a href="${escapeHtml(lq.source_url || '#')}" target="_blank" style="color: #3b82f6;">${escapeHtml(lq.source_title || lq.source_url || 'Unknown')}</a></div>
        `).join('');
      }
      
      html += `
        <div class="validation-item ${state.checked ? 'validated' : ''}" data-key="${key}">
          <div class="validation-item-header">
            <input type="checkbox" class="validation-checkbox" data-key="${key}" ${state.checked ? 'checked' : ''}>
            <div class="validation-content">
              <div class="validation-label">${escapeHtml(typeLabel)}</div>
              <div style="font-size: 12px; color: #6b7280; margin-bottom: 4px;">Classification: ${escapeHtml(classLabel)}</div>
              ${violation.description ? `<div class="validation-value">${escapeHtml(violation.description)}</div>` : ''}
              ${violation.constitutional_basis ? `<div class="validation-source" style="font-size: 11px; margin-top: 4px;">Case Law: ${escapeHtml(violation.constitutional_basis)}</div>` : ''}
              ${quotesHtml}
              ${!state.checked ? `
                <input type="text" class="validation-reason-input" data-key="${key}" 
                       placeholder="Reason not validated..." value="${escapeHtml(state.reason)}">
              ` : ''}
            </div>
          </div>
        </div>
      `;
    }
  }
  
  // Custom Fields section
  if (customFields.length > 0) {
    html += `<div class="validation-section-header">🔧 Custom Fields (${customFields.length})</div>`;
    
    for (const field of customFields) {
      const key = `custom_${field.id}`;
      const state = validationState[key] || { checked: false, reason: '' };
      
      // Build quotes HTML if the custom field has a linked quote
      let quotesHtml = '';
      if (field.quote_text) {
        quotesHtml = `
          <div class="validation-quotes-header">✓ Linked Quote:</div>
          <div class="validation-quote">"${escapeHtml(field.quote_text)}"</div>
          ${field.quote_source_title ? `<div class="validation-source">Source: <a href="${escapeHtml(field.quote_source_url || '#')}" target="_blank" style="color: #3b82f6;">${escapeHtml(field.quote_source_title)}</a></div>` : ''}
        `;
      }
      
      html += `
        <div class="validation-item ${state.checked ? 'validated' : ''}" data-key="${key}">
          <div class="validation-item-header">
            <input type="checkbox" class="validation-checkbox" data-key="${key}" ${state.checked ? 'checked' : ''}>
            <div class="validation-content">
              <div class="validation-label">${escapeHtml(field.field_name)}</div>
              ${field.field_value ? `<div class="validation-value">${escapeHtml(field.field_value)}</div>` : '<div class="validation-value" style="color: #9ca3af; font-style: italic;">(no value)</div>'}
              ${quotesHtml}
              ${!state.checked ? `
                <input type="text" class="validation-reason-input" data-key="${key}" 
                       placeholder="Reason not validated..." value="${escapeHtml(state.reason)}">
              ` : ''}
            </div>
          </div>
        </div>
      `;
    }
  }
  
  // Tags section
  const tags = incident.tags || [];
  if (tags.length > 0) {
    html += `<div class="validation-section-header">🏷️ Tags (${tags.length})</div>`;
    
    for (const tag of tags) {
      const key = `tag_${tag.replace(/[^a-zA-Z0-9]/g, '_')}`;
      const state = validationState[key] || { checked: false, reason: '' };
      
      html += `
        <div class="validation-item ${state.checked ? 'validated' : ''}" data-key="${key}">
          <div class="validation-item-header">
            <input type="checkbox" class="validation-checkbox" data-key="${key}" ${state.checked ? 'checked' : ''}>
            <div class="validation-content">
              <div class="validation-value" style="font-size: 14px;">
                <span style="padding: 4px 10px; background: #eff6ff; color: #1e40af; border: 1px solid #bfdbfe; border-radius: 6px; display: inline-block;">
                  ${escapeHtml(tag)}
                </span>
              </div>
              ${!state.checked ? `
                <input type="text" class="validation-reason-input" data-key="${key}" 
                       placeholder="Reason not validated..." value="${escapeHtml(state.reason)}">
              ` : ''}
            </div>
          </div>
        </div>
      `;
    }
  }
  
  content.innerHTML = html;
  
  // Attach event listeners
  content.querySelectorAll('.validation-checkbox').forEach(checkbox => {
    checkbox.addEventListener('change', (e) => {
      const key = e.target.dataset.key;
      toggleValidationItem(key);
    });
  });
  
  content.querySelectorAll('.validation-reason-input').forEach(input => {
    input.addEventListener('input', (e) => {
      const key = e.target.dataset.key;
      if (validationState[key]) {
        validationState[key].reason = e.target.value;
      }
      updateValidationButtons();
    });
  });
  
  updateValidationButtons();
}

// Toggle validation item
function toggleValidationItem(key) {
  if (!validationState[key]) {
    validationState[key] = { checked: false, reason: '' };
  }
  
  validationState[key].checked = !validationState[key].checked;
  
  if (validationState[key].checked) {
    validationState[key].reason = '';
  }
  
  // Re-render the item
  const item = document.querySelector(`.validation-item[data-key="${key}"]`);
  if (item) {
    item.classList.toggle('validated', validationState[key].checked);
    
    // Show/hide reason input
    const reasonInput = item.querySelector('.validation-reason-input');
    if (validationState[key].checked && reasonInput) {
      reasonInput.remove();
    } else if (!validationState[key].checked && !reasonInput) {
      const content = item.querySelector('.validation-content');
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'validation-reason-input';
      input.dataset.key = key;
      input.placeholder = 'Reason not validated...';
      input.value = validationState[key].reason || '';
      input.addEventListener('input', (e) => {
        validationState[key].reason = e.target.value;
        updateValidationButtons();
      });
      content.appendChild(input);
    }
  }
  
  updateValidationButtons();
}

// Update validation action buttons state
function updateValidationButtons() {
  const allChecked = Object.values(validationState).every(v => v.checked);
  const uncheckedItems = Object.entries(validationState).filter(([_, v]) => !v.checked);
  const allUncheckedHaveReasons = uncheckedItems.every(([_, v]) => v.reason && v.reason.trim() !== '');
  
  const submitBtn = document.getElementById('submitValidationBtn');
  const returnBtn = document.getElementById('returnToReviewBtn');
  const summary = document.getElementById('validateSummary');
  
  if (submitBtn) {
    submitBtn.disabled = !allChecked;
    submitBtn.textContent = validationData?.incident?.verification_status === 'first_review'
      ? '✓ Submit First Validation'
      : '✓ Submit Second Validation & Publish';
  }
  
  if (returnBtn) {
    returnBtn.disabled = uncheckedItems.length === 0 || !allUncheckedHaveReasons;
  }
  
  if (summary) {
    if (allChecked) {
      summary.innerHTML = '<span style="color: #16a34a;">✓ All items validated</span>';
    } else {
      let text = `${uncheckedItems.length} item(s) not validated`;
      if (!allUncheckedHaveReasons && uncheckedItems.length > 0) {
        text += ' <span style="color: #dc2626;">(reasons required)</span>';
      }
      summary.innerHTML = text;
    }
  }
}

// Submit validation action
async function submitValidation(action) {
  if (!validateIncidentId) {
    alert('No case selected for validation');
    return;
  }
  
  try {
    // Build issues array
    const issues = Object.entries(validationState)
      .filter(([_, v]) => !v.checked)
      .map(([key, v]) => {
        const [type, ...rest] = key.split('_');
        return {
          field_type: ['quote', 'timeline', 'source'].includes(type) ? type : 'field',
          field_name: key,
          reason: v.reason
        };
      });
    
    // Validation checks
    const allChecked = Object.values(validationState).every(v => v.checked);
    const allUncheckedHaveReasons = issues.every(i => i.reason && i.reason.trim() !== '');
    
    if (action === 'validate' && !allChecked) {
      alert('All items must be checked to validate.');
      return;
    }
    
    if (action === 'return_to_review') {
      if (issues.length === 0) {
        alert('At least one item must be unchecked to return to review.');
        return;
      }
      if (!allUncheckedHaveReasons) {
        alert('All unchecked items must have a reason.');
        return;
      }
    }
    
    let body = { action };
    
    if (action === 'return_to_review') {
      body.issues = issues;
    }
    
    if (action === 'reject') {
      const reason = prompt('Enter rejection reason:');
      if (!reason || !reason.trim()) {
        return;
      }
      body.rejection_reason = reason;
    }
    
    const response = await fetch(`${apiUrl}/api/incidents/${validateIncidentId}/validate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || 'Validation failed');
    }
    
    // Release lock after successful validation action
    if (currentLockId) {
      releaseLock(currentLockId);
    }
    
    alert(result.message);
    
    // Go back to queue
    document.getElementById('validateQueueView').style.display = 'block';
    document.getElementById('validateCaseView').style.display = 'none';
    validateMode = false;
    validateIncidentId = null;
    validationState = {};
    validationData = null;
    
    // Refresh queue
    loadValidationQueue();
    
  } catch (error) {
    console.error('Error submitting validation:', error);
    alert('Failed to submit validation: ' + error.message);
  }
}

// Show validate tab when user has analyst role and there are cases to validate
function checkValidateTabVisibility() {
  const validateTab = document.getElementById('validateTab');
  if (validateTab) {
    // Show for analyst, editor, admin roles
    if (userRole && ['analyst', 'editor', 'admin'].includes(userRole)) {
      validateTab.style.display = 'block';
      loadValidationQueue();
    } else {
      validateTab.style.display = 'none';
    }
  }
}

// ===========================================
// AI LEGAL ANALYST (POPUP MODAL)
// ===========================================

let aiInstance = null;
let aiLoaded = false;
let aiChatHistory = [];

// Initialize AI modal functionality
function setupAITabListeners() {
  const loadAiBtn = document.getElementById('loadAiBtn');
  const aiModelSelect = document.getElementById('aiModelSelect');
  const aiSendBtn = document.getElementById('aiSendBtn');
  const aiChatInput = document.getElementById('aiChatInput');
  const openAiBtn = document.getElementById('openAiAnalysisBtn');
  const closeAiBtn = document.getElementById('closeAiModal');
  const aiModal = document.getElementById('aiAnalysisModal');
  
  // Open AI Modal button (in Case tab header)
  if (openAiBtn) {
    openAiBtn.addEventListener('click', () => {
      if (aiModal) {
        aiModal.style.display = 'flex';
        checkWebGPUSupport();
      }
    });
  }
  
  // Close modal button
  if (closeAiBtn) {
    closeAiBtn.addEventListener('click', () => {
      if (aiModal) aiModal.style.display = 'none';
    });
  }
  
  // Close modal on overlay click
  if (aiModal) {
    aiModal.addEventListener('click', (e) => {
      if (e.target === aiModal) {
        aiModal.style.display = 'none';
      }
    });
  }
  
  // Load AI button
  if (loadAiBtn) {
    loadAiBtn.addEventListener('click', async () => {
      const model = aiModelSelect?.value || 'TinyLlama-1.1B-Chat-v1.0-q4f16_1-MLC';
      await loadAIModel(model);
    });
  }
  
  // Send message button
  if (aiSendBtn) {
    aiSendBtn.addEventListener('click', () => {
      sendAIMessage();
    });
  }
  
  // Enter key to send
  if (aiChatInput) {
    aiChatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendAIMessage();
      }
    });
  }
  
  // Quick action buttons
  document.querySelectorAll('.ai-quick-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const query = btn.dataset.query;
      if (query && aiChatInput) {
        aiChatInput.value = query;
        sendAIMessage();
      }
    });
  });
  
  // Main action buttons - Smart Auto-Fill and Rights Analysis
  const smartAutoFillBtn = document.getElementById('runSmartAutoFillBtn');
  if (smartAutoFillBtn) {
    smartAutoFillBtn.addEventListener('click', () => {
      console.log('Smart Auto-Fill button clicked');
      try {
        runSmartAutoFill();
      } catch (error) {
        console.error('Error running smart auto-fill:', error);
        alert('Error: ' + error.message);
      }
    });
  }
  
  const rightsAnalysisBtn = document.getElementById('runRightsAnalysisBtn');
  if (rightsAnalysisBtn) {
    rightsAnalysisBtn.addEventListener('click', () => {
      console.log('Rights Analysis button clicked');
      try {
        runRightsAnalysis();
      } catch (error) {
        console.error('Error running rights analysis:', error);
        alert('Error: ' + error.message);
      }
    });
  }
  
  // Clear chat button
  const clearChatBtn = document.getElementById('clearAiChatBtn');
  if (clearChatBtn) {
    clearChatBtn.addEventListener('click', () => {
      clearAIChat();
      // Also clear field suggestions
      const fieldSuggList = document.getElementById('aiFieldSuggestionsList');
      if (fieldSuggList) fieldSuggList.innerHTML = '';
      document.getElementById('aiFieldSuggestionsSection').style.display = 'none';
      document.getElementById('aiCitationsSection').style.display = 'none';
      document.getElementById('aiSuggestionsSection').style.display = 'none';
      pendingFieldSuggestions = [];
    });
  }
}

// Check if WebGPU is supported
async function checkWebGPUSupport() {
  const webgpuCheck = document.getElementById('webgpuCheck');
  if (!webgpuCheck) return;
  
  if (!navigator.gpu) {
    webgpuCheck.innerHTML = '<span style="color: #dc2626;">❌ WebGPU not supported. Use Chrome/Edge 113+ with a compatible GPU.</span>';
    const loadBtn = document.getElementById('loadAiBtn');
    if (loadBtn) loadBtn.disabled = true;
    return false;
  }
  
  try {
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
      webgpuCheck.innerHTML = '<span style="color: #dc2626;">❌ No WebGPU adapter found. Your GPU may not be supported.</span>';
      const loadBtn = document.getElementById('loadAiBtn');
      if (loadBtn) loadBtn.disabled = true;
      return false;
    }
    
    const device = await adapter.requestDevice();
    webgpuCheck.innerHTML = '<span style="color: #16a34a;">✓ WebGPU supported</span>';
    return true;
  } catch (error) {
    webgpuCheck.innerHTML = `<span style="color: #dc2626;">❌ WebGPU error: ${error.message}</span>`;
    const loadBtn = document.getElementById('loadAiBtn');
    if (loadBtn) loadBtn.disabled = true;
    return false;
  }
}

// Load AI model
async function loadAIModel(modelId) {
  const loadBtn = document.getElementById('loadAiBtn');
  const progress = document.getElementById('aiLoadProgress');
  const progressBar = document.getElementById('aiProgressBar');
  const aiProgressText = document.getElementById('aiProgressText');
  
  if (loadBtn) loadBtn.disabled = true;
  if (progress) progress.style.display = 'block';
  
  try {
    // Check if LegalAnalystAI is available
    if (typeof LegalAnalystAI === 'undefined') {
      throw new Error('AI module not loaded. Please refresh the page.');
    }
    
    aiInstance = new LegalAnalystAI();
    
    const result = await aiInstance.initialize(modelId, (info) => {
      // Progress callback
      if (progressBar && info.progress !== undefined) {
        progressBar.style.width = `${Math.round(info.progress * 100)}%`;
      }
      if (aiProgressText) {
        aiProgressText.textContent = info.text || 'Loading...';
      }
    });
    
    // Check if initialization actually succeeded
    if (!result || !result.success) {
      const errorMsg = result?.error || 'Failed to initialize AI';
      
      // Show helpful message for WebLLM not available
      if (result?.needsSetup) {
        if (aiProgressText) {
          aiProgressText.innerHTML = `
            <span style="color: #b45309;">⚠️ WebLLM not bundled with extension.</span><br>
            <small style="color: #666;">The local AI feature requires WebLLM to be included. For now, use the manual analysis tools.</small>
          `;
        }
      } else {
        if (aiProgressText) aiProgressText.textContent = `Error: ${errorMsg}`;
      }
      
      if (loadBtn) loadBtn.disabled = false;
      return;
    }
    
    aiLoaded = true;
    if (aiProgressText) aiProgressText.textContent = '✓ AI Ready';
    if (progressBar) progressBar.style.width = '100%';
    
    // Enable chat
    enableAIChat();
    
    // Load current case context if available
    loadCaseContextToAI();
    
    // Show ready state
    const aiNotReady = document.getElementById('aiNotReady');
    const aiReady = document.getElementById('aiReady');
    const aiModelName = document.getElementById('aiModelName');
    
    if (aiNotReady) aiNotReady.style.display = 'none';
    if (aiReady) aiReady.style.display = 'block';
    if (aiModelName) aiModelName.textContent = modelId.split('-')[0];
    
    addAIMessage('assistant', 'AI Legal Analyst ready. I can help analyze this case for potential rights violations. Ask me questions about the timeline, medical response, use of force, or legal precedents.');
    
  } catch (error) {
    console.error('AI initialization error:', error);
    const aiProgressText = document.getElementById('aiProgressText');
    
    // Check if it's a setup issue
    if (error.message && error.message.includes('WebLLM not available')) {
      if (aiProgressText) {
        aiProgressText.innerHTML = `
          <span style="color: #dc2626;">⚠️ AI model loading requires WebLLM bundle.</span>
          <br><small>For now, you can use the manual tools in the main form to document and analyze this case.</small>
        `;
      }
    } else {
      if (aiProgressText) aiProgressText.textContent = `Error: ${error.message}`;
    }
    
    if (loadBtn) loadBtn.disabled = false;
  }
}

// Enable chat interface after AI loads
function enableAIChat() {
  const chatSection = document.getElementById('aiChatSection');
  const chatInput = document.getElementById('aiChatInput');
  const sendBtn = document.getElementById('aiSendBtn');
  const quickBtns = document.querySelectorAll('.ai-quick-btn');
  
  if (chatSection) chatSection.style.display = 'block';
  if (chatInput) chatInput.disabled = false;
  if (sendBtn) sendBtn.disabled = false;
  quickBtns.forEach(btn => btn.disabled = false);
}

// Load current case data into AI context
function loadCaseContextToAI() {
  if (!aiInstance || !aiLoaded) return;
  
  // Use the getAllQuotes function to get quotes from the correct sources
  const quotes = getAllQuotes();
  console.log('loadCaseContextToAI - loaded', quotes.length, 'quotes');
  
  // Gather timeline entries from DOM or currentCase
  const timeline = [];
  if (currentCase && currentCase.timeline && Array.isArray(currentCase.timeline)) {
    currentCase.timeline.forEach((t, idx) => {
      timeline.push({
        id: t.id || idx + 1,
        date: t.event_date || t.date || '',
        description: t.description || t.event_description || ''
      });
    });
  }
  
  // Also try DOM as fallback
  document.querySelectorAll('.timeline-entry').forEach((entry, idx) => {
    const dateEl = entry.querySelector('input[type="date"], .timeline-date');
    const descEl = entry.querySelector('textarea, .timeline-desc');
    if (dateEl && descEl) {
      const date = dateEl.value || dateEl.textContent;
      const desc = descEl.value || descEl.textContent;
      if (date && desc && !timeline.some(t => t.date === date && t.description === desc)) {
        timeline.push({
          id: timeline.length + 1,
          date: date,
          description: desc
        });
      }
    }
  });
  
  // Gather sources from the sources array or DOM
  const sourcesList = [];
  if (sources && Array.isArray(sources) && sources.length > 0) {
    sources.forEach((s, idx) => {
      sourcesList.push({
        id: idx + 1,
        url: s.url || s.sourceUrl || '',
        title: s.title || s.sourceTitle || '',
        description: s.description || ''
      });
    });
  }
  
  // Also try DOM as fallback for sources
  document.querySelectorAll('.source-entry').forEach((entry, idx) => {
    const urlEl = entry.querySelector('input[type="url"], .source-url');
    const descEl = entry.querySelector('.source-desc, input:not([type="url"])');
    if (urlEl) {
      const url = urlEl.value || urlEl.textContent;
      if (url && !sourcesList.some(s => s.url === url)) {
        sourcesList.push({
          id: sourcesList.length + 1,
          url: url,
          description: descEl?.value || descEl?.textContent || ''
        });
      }
    }
  });
  
  // Get basic case info from the form
  const caseInfo = {
    victim_name: document.getElementById('victim_name')?.value || 'Unknown',
    date_of_death: document.getElementById('date_of_death')?.value || '',
    location: document.getElementById('location')?.value || '',
    custodial_agency: document.getElementById('custodial_agency')?.value || '',
    manner_of_death: document.getElementById('manner_of_death')?.value || '',
    official_cause: document.getElementById('official_cause')?.value || '',
    summary: document.getElementById('summary')?.value || ''
  };
  
  console.log('loadCaseContextToAI - sending to AI:', { caseInfo, quotes: quotes.length, timeline: timeline.length, sources: sourcesList.length });
  aiInstance.loadCaseContext(caseInfo, quotes, timeline, sourcesList);
}

// Send message to AI
async function sendAIMessage() {
  const chatInput = document.getElementById('aiChatInput');
  const chatMessages = document.getElementById('aiChatMessages');
  
  if (!chatInput || !aiInstance || !aiLoaded) return;
  
  const message = chatInput.value.trim();
  if (!message) return;
  
  // Add user message to chat
  addAIMessage('user', message);
  chatInput.value = '';
  
  // Show thinking indicator
  const thinkingId = showAIThinking();
  
  try {
    // Refresh case context before query
    loadCaseContextToAI();
    
    const response = await aiInstance.query(message);
    
    // Remove thinking indicator
    hideAIThinking(thinkingId);
    
    // Handle errors
    if (response.error) {
      addAIMessage('assistant', `Error: ${response.error}`);
      return;
    }
    
    // Add AI response (property is 'response', not 'text')
    addAIMessage('assistant', response.response || 'No response generated.');
    
    // Process all tool results
    if (response.toolResults && response.toolResults.length > 0) {
      response.toolResults.forEach(tr => {
        const result = tr.result;
        if (!result) return;
        
        if (result.type === 'CITATION') {
          addCitationToPanel(result, document.getElementById('aiCitationsList'));
          document.getElementById('aiCitationsSection').style.display = 'block';
        } else if (result.type === 'SUGGESTION') {
          addSuggestionToPanel(result, document.getElementById('aiSuggestionsList'));
          document.getElementById('aiSuggestionsSection').style.display = 'block';
        } else if (result.type === 'FIELD_SUGGESTION') {
          addFieldSuggestionToPanel(result);
          document.getElementById('aiFieldSuggestionsSection').style.display = 'block';
        }
      });
    }
    
  } catch (error) {
    hideAIThinking(thinkingId);
    addAIMessage('assistant', `Error: ${error.message}`);
  }
}

// Add message to chat
function addAIMessage(role, content) {
  const chatMessages = document.getElementById('aiChatMessages');
  if (!chatMessages) return;
  
  const msgDiv = document.createElement('div');
  msgDiv.className = `ai-message ai-${role}`;
  
  // Process markdown-like formatting
  let html = escapeHtml(content)
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br>');
  
  msgDiv.innerHTML = html;
  chatMessages.appendChild(msgDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  
  aiChatHistory.push({ role, content });
}

// Show thinking indicator
function showAIThinking() {
  const chatMessages = document.getElementById('aiChatMessages');
  if (!chatMessages) return null;
  
  const thinkingDiv = document.createElement('div');
  thinkingDiv.className = 'ai-message ai-assistant ai-thinking';
  thinkingDiv.id = 'ai-thinking-' + Date.now();
  thinkingDiv.innerHTML = '<span class="ai-thinking-dot"></span><span class="ai-thinking-dot"></span><span class="ai-thinking-dot"></span>';
  chatMessages.appendChild(thinkingDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  
  return thinkingDiv.id;
}

// Hide thinking indicator
function hideAIThinking(thinkingId) {
  if (!thinkingId) return;
  const thinking = document.getElementById(thinkingId);
  if (thinking) thinking.remove();
}

// Process AI tool results for display
function processAIToolResults(toolResults) {
  const citationsContainer = document.getElementById('aiCitations');
  const suggestionsContainer = document.getElementById('aiSuggestions');
  
  if (!toolResults || !Array.isArray(toolResults)) return;
  
  toolResults.forEach(result => {
    if (result.type === 'CITATION' && citationsContainer) {
      addCitationToPanel(result, citationsContainer);
    } else if (result.type === 'SUGGESTION' && suggestionsContainer) {
      addSuggestionToPanel(result, suggestionsContainer);
    }
  });
}

// Add citation to the citations panel
function addCitationToPanel(citation, container) {
  if (!container || !citation) return;
  
  // Remove "no citations" message if present
  const noMsg = container.querySelector('.ai-panel-empty');
  if (noMsg) noMsg.remove();
  
  const citationDiv = document.createElement('div');
  citationDiv.className = 'ai-citation';
  
  // EXACT badge shows this is verbatim from source data
  citationDiv.innerHTML = `
    <div class="ai-citation-header">
      <span class="exact-badge">EXACT</span>
      <span class="ai-citation-source">${escapeHtml(citation.source || 'Quote')}</span>
    </div>
    <blockquote class="ai-citation-text">"${escapeHtml(citation.exact_text || '')}"</blockquote>
    ${citation.supports_claim ? `<div class="ai-citation-relevance"><strong>Supports:</strong> ${escapeHtml(citation.supports_claim)}</div>` : ''}
    ${citation.source_url ? `<div class="ai-citation-link"><a href="${escapeHtml(citation.source_url)}" target="_blank">View Source</a></div>` : ''}
  `;
  
  container.appendChild(citationDiv);
}

// Add suggestion to the suggestions panel
function addSuggestionToPanel(suggestion, container) {
  // Remove "no suggestions" message if present
  const noMsg = container.querySelector('.ai-panel-empty');
  if (noMsg) noMsg.remove();
  
  const suggDiv = document.createElement('div');
  suggDiv.className = 'ai-suggestion';
  
  // Color-code by classification
  const classificationColors = {
    alleged: '#dc2626',   // Red - lawsuit filed
    potential: '#f59e0b', // Orange - facts match law
    possible: '#6b7280'   // Gray - disputed facts
  };
  const color = classificationColors[suggestion.classification] || classificationColors.potential;
  
  // Format amendment for display
  const amendmentDisplay = (suggestion.amendment || '')
    .replace('_', ' ')
    .replace(/\b\w/g, l => l.toUpperCase());
  
  suggDiv.innerHTML = `
    <div class="ai-suggestion-header">
      <span class="ai-suggestion-type" style="border-left: 3px solid ${color}; padding-left: 8px;">
        ${escapeHtml(amendmentDisplay || 'Constitutional Issue')}
      </span>
      <span class="ai-suggestion-severity" style="color: ${color}; text-transform: uppercase;">${escapeHtml(suggestion.classification || 'potential')}</span>
    </div>
    <div class="ai-suggestion-basis"><strong>Legal Basis:</strong> ${escapeHtml(suggestion.legal_basis || '')}</div>
    ${suggestion.supporting_quotes && suggestion.supporting_quotes.length > 0 ? `
      <div class="ai-suggestion-quotes">
        <strong>Supporting Quotes:</strong>
        ${suggestion.supporting_quotes.map(q => `
          <div class="ai-suggestion-quote">
            <span class="exact-badge" style="font-size: 9px;">EXACT</span>
            "${escapeHtml(q.exact_text.substring(0, 150))}${q.exact_text.length > 150 ? '...' : ''}"
          </div>
        `).join('')}
      </div>
    ` : ''}
  `;
  
  container.appendChild(suggDiv);
}

// Clear AI chat and panels
function clearAIChat() {
  const chatMessages = document.getElementById('aiChatMessages');
  const citationsContainer = document.getElementById('aiCitations');
  const suggestionsContainer = document.getElementById('aiSuggestions');
  
  if (chatMessages) chatMessages.innerHTML = '';
  if (citationsContainer) {
    citationsContainer.innerHTML = '<div class="ai-panel-empty">No citations yet</div>';
  }
  if (suggestionsContainer) {
    suggestionsContainer.innerHTML = '<div class="ai-panel-empty">No suggestions yet</div>';
  }
  
  aiChatHistory = [];
}

// Store pending field suggestions for "Apply All"
let pendingFieldSuggestions = [];

// Add field suggestion to the panel
function addFieldSuggestionToPanel(suggestion) {
  const container = document.getElementById('aiFieldSuggestionsList');
  if (!container || !suggestion) return;
  
  // Store for "Apply All" functionality
  pendingFieldSuggestions.push(suggestion);
  
  const suggDiv = document.createElement('div');
  suggDiv.className = 'ai-field-suggestion';
  suggDiv.dataset.fieldName = suggestion.field_name;
  suggDiv.dataset.suggestedValue = suggestion.suggested_value;
  suggDiv.dataset.quoteId = suggestion.quote_id;
  
  // Format field name for display
  const fieldDisplay = suggestion.field_name
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());
  
  // Truncate quote for preview
  const quotePreview = suggestion.exact_quote_text 
    ? (suggestion.exact_quote_text.length > 100 
      ? suggestion.exact_quote_text.substring(0, 100) + '...' 
      : suggestion.exact_quote_text)
    : '';
  
  suggDiv.innerHTML = `
    <div class="ai-field-suggestion-header">
      <span class="ai-field-suggestion-field">${escapeHtml(fieldDisplay)}</span>
      <button class="btn-apply-field" onclick="applyFieldSuggestion(this, '${escapeHtml(suggestion.field_name)}', '${escapeHtml(suggestion.suggested_value.replace(/'/g, "\\'"))}')">Apply</button>
    </div>
    <div class="ai-field-suggestion-value">${escapeHtml(suggestion.suggested_value)}</div>
    <div class="ai-field-suggestion-quote">
      <span class="exact-badge" style="font-size: 8px; margin-right: 4px;">FROM QUOTE</span>
      "${escapeHtml(quotePreview)}"
    </div>
    <div class="ai-field-suggestion-source">Source: ${escapeHtml(suggestion.quote_source || 'Unknown')}</div>
  `;
  
  container.appendChild(suggDiv);
}

// Apply a single field suggestion
function applyFieldSuggestion(btn, fieldName, value) {
  // Map field names to form element IDs
  const fieldMappings = {
    'date_of_death': 'date_of_death',
    'death_date': 'date_of_death',
    'cause_of_death': 'cause_of_death',
    'official_cause': 'cause_of_death',
    'location': 'location',
    'location_city': 'location',
    'victim_name': 'victim_name',
    'name': 'victim_name',
    'age': 'age',
    'age_at_death': 'age',
    'circumstances': 'circumstances',
    'facility': 'facility',
    'custodial_agency': 'custodial_agency',
    'country_of_origin': 'country_of_origin',
    'occupation': 'occupation'
  };
  
  const elementId = fieldMappings[fieldName] || fieldName;
  const element = document.getElementById(elementId);
  
  if (element) {
    element.value = value;
    element.dispatchEvent(new Event('change', { bubbles: true }));
    
    // Visual feedback
    btn.textContent = '✓ Applied';
    btn.classList.add('applied');
    btn.disabled = true;
    
    // Flash the field
    element.style.transition = 'background-color 0.3s';
    element.style.backgroundColor = '#dcfce7';
    setTimeout(() => {
      element.style.backgroundColor = '';
    }, 1500);
  } else {
    alert(`Field "${fieldName}" not found in form`);
  }
}

// Apply all pending field suggestions
function applyAllFieldSuggestions() {
  const container = document.getElementById('aiFieldSuggestionsList');
  if (!container) return;
  
  const suggestions = container.querySelectorAll('.ai-field-suggestion');
  let applied = 0;
  
  suggestions.forEach(suggDiv => {
    const fieldName = suggDiv.dataset.fieldName;
    const value = suggDiv.dataset.suggestedValue;
    const btn = suggDiv.querySelector('.btn-apply-field');
    
    if (btn && !btn.disabled) {
      applyFieldSuggestion(btn, fieldName, value);
      applied++;
    }
  });
  
  if (applied > 0) {
    addAIMessage('assistant', `Applied ${applied} field suggestion(s) to the form.`);
  }
}

// Make functions globally available
window.applyFieldSuggestion = applyFieldSuggestion;
window.applyAllFieldSuggestions = applyAllFieldSuggestions;

// =============================================================================
// RULE-BASED ANALYSIS FUNCTIONS (Work without AI model)
// =============================================================================

/**
 * Display analysis results in the results panel
 */
function displayAnalysisResults(title, content) {
  console.log('displayAnalysisResults called:', title);
  const resultsPanel = document.getElementById('analysisResults');
  const resultsContent = document.getElementById('analysisResultsContent');
  
  console.log('Results panel:', resultsPanel, 'Content div:', resultsContent);
  
  if (resultsPanel && resultsContent) {
    resultsPanel.style.display = 'block';
    resultsContent.innerHTML = `<h4 style="font-weight: bold; color: #1f2937; margin-bottom: 8px;">${title}</h4>${content}`;
    console.log('Results displayed');
  } else {
    console.error('Could not find results panel elements');
    alert(title + '\n\n' + content.replace(/<[^>]*>/g, '').substring(0, 500));
  }
}

/**
 * Get all quotes from verified quotes list
 * This is the main source of quotes in the extension
 */
function getAllQuotes() {
  console.log('getAllQuotes called');
  console.log('verifiedQuotes:', verifiedQuotes?.length || 0);
  console.log('pendingQuotes:', pendingQuotes?.length || 0);
  
  const quotes = [];
  
  // PRIMARY SOURCE: verifiedQuotes array (this is where quotes are actually stored)
  if (verifiedQuotes && Array.isArray(verifiedQuotes) && verifiedQuotes.length > 0) {
    verifiedQuotes.forEach((q, idx) => {
      quotes.push({
        id: q.id || idx + 1,
        text: q.text || q.quote_text || '',
        source: q.sourceTitle || q.source_title || q.sourceUrl || q.source_publication || 'Verified quote',
        sourceUrl: q.sourceUrl || q.source_url || '',
        category: q.category || 'uncategorized',
        linkedFields: q.linkedFields || q.linked_fields || []
      });
    });
    console.log('Added', quotes.length, 'quotes from verifiedQuotes');
  }
  
  // SECONDARY SOURCE: pendingQuotes (quotes not yet verified)
  if (pendingQuotes && Array.isArray(pendingQuotes) && pendingQuotes.length > 0) {
    pendingQuotes.forEach((q, idx) => {
      // Avoid duplicates
      if (!quotes.some(existing => existing.text === (q.text || q.quote_text))) {
        quotes.push({
          id: q.id || `pending-${idx}`,
          text: q.text || q.quote_text || '',
          source: q.sourceTitle || q.source_title || q.sourceUrl || 'Pending quote',
          sourceUrl: q.sourceUrl || q.source_url || '',
          category: q.category || 'pending',
          linkedFields: q.linkedFields || q.linked_fields || []
        });
      }
    });
    console.log('Total quotes after adding pending:', quotes.length);
  }
  
  // TERTIARY SOURCE: currentCase.quotes (for loaded cases from API)
  if (currentCase && currentCase.quotes && Array.isArray(currentCase.quotes)) {
    currentCase.quotes.forEach((q, idx) => {
      // Avoid duplicates
      const qText = q.quote_text || q.text || '';
      if (qText && !quotes.some(existing => existing.text === qText)) {
        quotes.push({
          id: q.id || `case-${idx}`,
          text: qText,
          source: q.source_publication || q.source_title || 'Case quote',
          sourceUrl: q.source_url || '',
          category: q.category || 'case',
          linkedFields: q.linked_fields || []
        });
      }
    });
    console.log('Total quotes after adding currentCase.quotes:', quotes.length);
  }
  
  console.log('getAllQuotes returning', quotes.length, 'total quotes');
  return quotes;
}

/**
 * Get current form data from currentCase
 */
function getFormData() {
  console.log('getFormData called, currentCase:', currentCase ? 'exists' : 'null');
  
  // Prefer currentCase data if available
  if (currentCase) {
    return { ...currentCase };
  }
  
  // Fallback to scraping form
  const data = {};
  
  // Get text inputs
  document.querySelectorAll('input[type="text"], input[type="date"], select').forEach(el => {
    if (el.name && el.value) {
      data[el.name] = el.value;
    }
  });
  
  // Get textareas
  document.querySelectorAll('textarea').forEach(el => {
    if (el.name && el.value) {
      data[el.name] = el.value;
    }
  });
  
  return data;
}

/**
 * Run violations analysis - pattern match for potential constitutional/legal violations
 */
function runViolationsAnalysis() {
  console.log('runViolationsAnalysis started');
  const quotes = getAllQuotes();
  const formData = getFormData();
  
  console.log('Quotes found:', quotes.length);
  console.log('Form data keys:', Object.keys(formData));
  
  const violationPatterns = {
    'Due Process (5th/14th Amendment)': [
      /denied\s+(access|hearing|counsel|attorney)/i,
      /without\s+(notice|hearing|due\s+process)/i,
      /no\s+(lawyer|attorney|counsel|hearing)/i,
      /denied\s+bond/i,
      /prolonged\s+detention/i
    ],
    'Cruel & Unusual Punishment (8th Amendment)': [
      /denied\s+(medical|medication|treatment|care)/i,
      /ignored\s+(complaints|requests|pleas)/i,
      /untreated/i,
      /solitary\s+confinement/i,
      /excessive\s+force/i,
      /beaten|beat|assault/i,
      /restraint|restrained/i,
      /died\s+(in\s+custody|while\s+detained)/i
    ],
    'Right to Counsel (6th Amendment)': [
      /no\s+(access\s+to|attorney|lawyer|counsel)/i,
      /denied\s+(attorney|lawyer|counsel|legal)/i,
      /without\s+(attorney|lawyer|counsel|legal\s+representation)/i
    ],
    'Medical Neglect': [
      /medical\s+(emergency|condition|issue|problem)/i,
      /complained\s+of\s+(pain|illness|symptoms)/i,
      /requested\s+(medical|doctor|nurse|help)/i,
      /delay(ed)?\s+(in\s+)?(treatment|response|care)/i,
      /hours?\s+before/i,
      /failed\s+to\s+(respond|provide|treat)/i,
      /ignored/i,
      /chronic\s+(condition|illness|disease)/i
    ],
    'Conditions of Confinement': [
      /overcrowd/i,
      /unsanitary/i,
      /inadequate\s+(food|water|ventilation|staffing)/i,
      /extreme\s+(heat|cold|temperature)/i,
      /no\s+(ventilation|air|water)/i
    ],
    'Use of Force': [
      /taser|tased/i,
      /pepper\s+spray/i,
      /physical\s+(force|restraint)/i,
      /handcuff|shackle/i,
      /prone\s+position/i,
      /choke|chokehold/i,
      /beat|beaten|assault/i
    ]
  };
  
  const findings = [];
  const allText = quotes.map(q => q.text).join(' ') + ' ' + Object.values(formData).join(' ');
  
  for (const [category, patterns] of Object.entries(violationPatterns)) {
    for (const pattern of patterns) {
      const match = allText.match(pattern);
      if (match) {
        // Find which quote contains this match
        const matchingQuote = quotes.find(q => pattern.test(q.text));
        findings.push({
          category,
          match: match[0],
          source: matchingQuote ? matchingQuote.source : 'Form data'
        });
        break; // One match per category is enough
      }
    }
  }
  
  // Generate results HTML with inline styles (no Tailwind)
  let html = '';
  if (findings.length === 0) {
    html = '<p style="color: #6b7280;">No potential violations detected in current data. Add more quotes or details for analysis.</p>';
  } else {
    html = '<div style="display: flex; flex-direction: column; gap: 8px;">';
    findings.forEach(f => {
      html += `
        <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 8px; border-radius: 4px;">
          <div style="font-weight: 600; color: #991b1b;">${f.category}</div>
          <div style="font-size: 12px; color: #b91c1c;">Found: "${f.match}"</div>
          <div style="font-size: 11px; color: #6b7280;">Source: ${f.source}</div>
        </div>
      `;
    });
    html += '</div>';
    html += `<p style="margin-top: 12px; font-size: 12px; color: #6b7280;">Found ${findings.length} potential violation indicator(s). These are pattern-based suggestions - verify with actual legal analysis.</p>`;
  }
  
  console.log('Calling displayAnalysisResults');
  displayAnalysisResults('⚠️ Potential Violations Analysis', html);
}

/**
 * Run timeline analysis - find gaps and issues in dates
 */
function runTimelineAnalysis() {
  console.log('runTimelineAnalysis started');
  const formData = getFormData();
  const quotes = getAllQuotes();
  
  // Extract dates from form and quotes
  const dateFields = {};
  const datePattern = /(\d{4}-\d{2}-\d{2})|(\d{1,2}\/\d{1,2}\/\d{4})|(\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b)/gi;
  
  // From form fields
  for (const [key, value] of Object.entries(formData)) {
    if (key.toLowerCase().includes('date') && value) {
      dateFields[key] = value;
    }
  }
  
  // Extract dates from quotes
  const quoteDates = [];
  quotes.forEach(q => {
    const matches = q.text.match(datePattern);
    if (matches) {
      matches.forEach(m => quoteDates.push({ date: m, source: q.source }));
    }
  });
  
  // Check for timeline issues
  const issues = [];
  
  // Check if death date is before detention date
  if (dateFields.date_of_death && dateFields.date_detained) {
    const death = new Date(dateFields.date_of_death);
    const detained = new Date(dateFields.date_detained);
    if (death < detained) {
      issues.push({ type: 'error', message: 'Death date is before detention date' });
    }
  }
  
  // Check detention duration
  if (dateFields.date_of_death && dateFields.date_detained) {
    const death = new Date(dateFields.date_of_death);
    const detained = new Date(dateFields.date_detained);
    const days = Math.round((death - detained) / (1000 * 60 * 60 * 24));
    if (days >= 0) {
      issues.push({ 
        type: 'info', 
        message: `Detention duration: ${days} day(s)`,
        detail: days < 7 ? 'Short detention - check for rapid health decline' : 
                days > 365 ? 'Long detention - check for prolonged detention issues' : null
      });
    }
  }
  
  // Check for missing critical dates
  const criticalDates = ['date_of_death', 'date_detained', 'incident_date'];
  criticalDates.forEach(field => {
    if (!dateFields[field]) {
      issues.push({ type: 'warning', message: `Missing: ${field.replace(/_/g, ' ')}` });
    }
  });
  
  // Build HTML with inline styles
  let html = '<div style="display: flex; flex-direction: column; gap: 8px;">';
  
  if (Object.keys(dateFields).length > 0) {
    html += '<div style="margin-bottom: 8px;"><strong>Dates in Form:</strong><ul style="list-style: disc; padding-left: 20px; font-size: 12px;">';
    for (const [key, value] of Object.entries(dateFields)) {
      html += `<li>${key.replace(/_/g, ' ')}: ${value}</li>`;
    }
    html += '</ul></div>';
  } else {
    html += '<p style="color: #6b7280; font-size: 12px;">No date fields found in current case data.</p>';
  }
  
  if (quoteDates.length > 0) {
    html += '<div style="margin-bottom: 8px;"><strong>Dates Found in Quotes:</strong><ul style="list-style: disc; padding-left: 20px; font-size: 12px;">';
    quoteDates.forEach(d => {
      html += `<li>${d.date} <span style="color: #6b7280;">(${d.source})</span></li>`;
    });
    html += '</ul></div>';
  }
  
  if (issues.length > 0) {
    html += '<div style="margin-bottom: 8px;"><strong>Analysis:</strong>';
    issues.forEach(i => {
      const bgColor = i.type === 'error' ? '#fef2f2' : i.type === 'warning' ? '#fefce8' : '#eff6ff';
      const borderColor = i.type === 'error' ? '#ef4444' : i.type === 'warning' ? '#eab308' : '#3b82f6';
      const textColor = i.type === 'error' ? '#991b1b' : i.type === 'warning' ? '#854d0e' : '#1e40af';
      html += `<div style="background: ${bgColor}; border-left: 4px solid ${borderColor}; padding: 8px; margin-top: 4px; border-radius: 4px;">
        <span style="color: ${textColor};">${i.message}</span>
        ${i.detail ? `<div style="font-size: 11px; color: ${textColor};">${i.detail}</div>` : ''}
      </div>`;
    });
    html += '</div>';
  }
  
  html += '</div>';
  
  console.log('Timeline analysis complete');
  displayAnalysisResults('📅 Timeline Analysis', html);
}

/**
 * Run key quotes analysis - identify important quotes
 */
function runKeyQuotesAnalysis() {
  console.log('runKeyQuotesAnalysis started');
  const quotes = getAllQuotes();
  
  if (quotes.length === 0) {
    displayAnalysisResults('📝 Key Quotes Analysis', 
      '<p style="color: #6b7280;">No quotes found. Add quotes from source documents to analyze.</p>');
    return;
  }
  
  // Score quotes by relevance
  const keywords = {
    critical: ['died', 'death', 'killed', 'deceased', 'fatal', 'autopsy', 'medical examiner'],
    medical: ['medical', 'doctor', 'nurse', 'hospital', 'treatment', 'medication', 'complaint', 'pain', 'sick', 'ill'],
    legal: ['denied', 'refused', 'violated', 'rights', 'attorney', 'lawyer', 'hearing', 'bond'],
    conditions: ['cell', 'solitary', 'restraint', 'force', 'overcrowded', 'facility'],
    timing: ['hours', 'days', 'delay', 'waited', 'before', 'after', 'prior to']
  };
  
  const scoredQuotes = quotes.map(q => {
    let score = 0;
    const text = q.text.toLowerCase();
    const matched = [];
    
    for (const [category, words] of Object.entries(keywords)) {
      for (const word of words) {
        if (text.includes(word)) {
          score += category === 'critical' ? 3 : 1;
          matched.push({ category, word });
        }
      }
    }
    
    return { ...q, score, matched };
  });
  
  // Sort by score
  scoredQuotes.sort((a, b) => b.score - a.score);
  
  // Build HTML with inline styles
  let html = '<div style="display: flex; flex-direction: column; gap: 12px;">';
  
  scoredQuotes.forEach((q, idx) => {
    const importance = q.score >= 5 ? 'High' : q.score >= 2 ? 'Medium' : 'Low';
    const bgColor = q.score >= 5 ? '#fef2f2' : q.score >= 2 ? '#fefce8' : '#f9fafb';
    const borderColor = q.score >= 5 ? '#ef4444' : q.score >= 2 ? '#eab308' : '#d1d5db';
    const textColor = q.score >= 5 ? '#991b1b' : q.score >= 2 ? '#854d0e' : '#6b7280';
    
    html += `
      <div style="border: 1px solid ${borderColor}; border-radius: 6px; padding: 8px; background: ${bgColor};">
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <span style="font-size: 10px; font-weight: 600; color: ${textColor}; text-transform: uppercase;">${importance} relevance</span>
          <span style="font-size: 10px; color: #6b7280;">Score: ${q.score}</span>
        </div>
        <p style="font-size: 12px; color: #1f2937; margin-top: 4px;">"${q.text.substring(0, 200)}${q.text.length > 200 ? '...' : ''}"</p>
        <div style="font-size: 10px; color: #6b7280; margin-top: 4px;">Source: ${q.source}</div>
        ${q.matched.length > 0 ? `<div style="font-size: 10px; color: #4b5563; margin-top: 4px;">Keywords: ${q.matched.map(m => m.word).join(', ')}</div>` : ''}
      </div>
    `;
  });
  
  html += '</div>';
  html += `<p style="margin-top: 12px; font-size: 12px; color: #6b7280;">Analyzed ${quotes.length} quote(s). Higher scores indicate potentially more important evidence.</p>`;
  
  console.log('Key quotes analysis complete');
  displayAnalysisResults('📝 Key Quotes Analysis', html);
}

/**
 * Run field suggestions analysis - extract potential field values from quotes
 */
function runFieldSuggestionsAnalysis() {
  console.log('runFieldSuggestionsAnalysis started');
  const quotes = getAllQuotes();
  const formData = getFormData();
  
  if (quotes.length === 0) {
    displayAnalysisResults('💡 Field Suggestions', 
      '<p style="color: #6b7280;">No quotes found. Add quotes from source documents to extract field values.</p>');
    return;
  }
  
  const suggestions = [];
  const allText = quotes.map(q => q.text).join(' ');
  
  // Age extraction
  const ageMatch = allText.match(/(\d{1,2})[- ]?years?[- ]?old|age[d]?\s*(\d{1,2})/i);
  if (ageMatch && !formData.age) {
    suggestions.push({
      field: 'age',
      value: ageMatch[1] || ageMatch[2],
      source: 'Extracted from quote'
    });
  }
  
  // Nationality/country of origin
  const countries = ['Mexico', 'Guatemala', 'Honduras', 'El Salvador', 'Cuba', 'Haiti', 'Brazil', 'Colombia', 'Venezuela', 'Nicaragua', 'Ecuador', 'India', 'China'];
  countries.forEach(country => {
    const pattern = new RegExp(`from\\s+${country}|${country}n?\\s+national|citizen\\s+of\\s+${country}`, 'i');
    if (pattern.test(allText) && !formData.country_of_origin) {
      suggestions.push({
        field: 'country_of_origin',
        value: country,
        source: 'Extracted from quote'
      });
    }
  });
  
  // Facility name extraction
  const facilityPatterns = [
    /at\s+([\w\s]+(?:Detention|Processing|Correctional)\s+(?:Center|Facility))/i,
    /held\s+(?:at|in)\s+([\w\s]+(?:County|Federal|Private)\s+(?:Jail|Prison|Facility))/i,
    /([\w\s]+(?:ICE|CBP)\s+(?:facility|center|station))/i
  ];
  facilityPatterns.forEach(pattern => {
    const match = allText.match(pattern);
    if (match && !formData.facility_name) {
      suggestions.push({
        field: 'facility_name',
        value: match[1].trim(),
        source: 'Extracted from quote'
      });
    }
  });
  
  // Cause of death patterns
  const causePatterns = [
    { pattern: /cause\s+of\s+death[:\s]+([^.]+)/i, field: 'cause_of_death' },
    { pattern: /died\s+(?:of|from)\s+([^.]+)/i, field: 'cause_of_death' },
    { pattern: /manner\s+of\s+death[:\s]+(\w+)/i, field: 'manner_of_death' }
  ];
  causePatterns.forEach(({ pattern, field }) => {
    const match = allText.match(pattern);
    if (match && !formData[field]) {
      suggestions.push({
        field,
        value: match[1].trim().substring(0, 100),
        source: 'Extracted from quote'
      });
    }
  });
  
  // Build HTML with inline styles
  let html = '';
  
  if (suggestions.length === 0) {
    html = '<p style="color: #6b7280;">No field suggestions found. The quotes may not contain extractable field data, or form fields may already be filled.</p>';
  } else {
    html = '<div style="display: flex; flex-direction: column; gap: 8px;">';
    suggestions.forEach(s => {
      const escapedValue = s.value.replace(/'/g, "\\'").replace(/"/g, '&quot;');
      html += `
        <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; padding: 8px;">
          <div style="font-weight: 600; color: #1e40af;">${s.field.replace(/_/g, ' ')}</div>
          <div style="font-size: 12px; color: #1f2937;">${s.value}</div>
          <div style="font-size: 10px; color: #6b7280;">${s.source}</div>
          <button onclick="applyFieldSuggestionFromAnalysis('${s.field}', '${escapedValue}')" 
                  style="margin-top: 4px; padding: 2px 8px; background: #2563eb; color: white; font-size: 10px; border: none; border-radius: 4px; cursor: pointer;">
            Apply
          </button>
        </div>
      `;
    });
    html += '</div>';
    html += `<p style="margin-top: 12px; font-size: 12px; color: #6b7280;">Found ${suggestions.length} potential field value(s). Review before applying.</p>`;
  }
  
  console.log('Field suggestions analysis complete');
  displayAnalysisResults('💡 Field Suggestions', html);
}

/**
 * Apply a field suggestion from analysis results
 */
function applyFieldSuggestionFromAnalysis(fieldName, value) {
  const field = document.querySelector(`[name="${fieldName}"], [name*="${fieldName}"]`);
  if (field) {
    field.value = value;
    field.dispatchEvent(new Event('change', { bubbles: true }));
    field.style.backgroundColor = '#dcfce7';
    setTimeout(() => field.style.backgroundColor = '', 2000);
  } else {
    alert(`Field "${fieldName}" not found in form`);
  }
}

// =============================================================================
// SMART AUTO-FILL SYSTEM - Analyzes quotes and fills fields with attribution
// =============================================================================

/**
 * Field definitions with extraction criteria
 */
const FIELD_EXTRACTION_RULES = {
  // NOTE: Auto-fill has limited usefulness for this project.
  // Most fields require human judgment - these are for OBVIOUS extractions only.
  victim_name: {
    label: 'Victim Name',
    type: 'person_name',
    patterns: [
      // Very specific patterns that require context words
      /(?:named|identified\s+as)\s+([A-Z][a-z]+\s+[A-Z][a-z]+)/i,
      /(?:victim|deceased)\s+(?:was\s+)?([A-Z][a-z]+\s+[A-Z][a-z]+)/i,
      /([A-Z][a-z]+\s+[A-Z][a-z]+),?\s+(?:who\s+)?(?:was\s+)?(?:killed|died|shot|found\s+dead)/i
    ],
    validate: (value) => {
      const words = value.trim().split(/\s+/);
      // Exactly 2-3 words, proper name format
      if (words.length < 2 || words.length > 3) return false;
      // Each word must start with capital and be 2+ chars
      if (!words.every(w => /^[A-Z][a-z]+$/.test(w) && w.length >= 2)) return false;
      // Reject common non-name words
      const badWords = ['the', 'said', 'that', 'this', 'officer', 'deputy', 'agent', 'video', 'shows', 'another', 'same', 'while', 'bleeding', 'imminent', 'danger', 'force', 'deadly'];
      return !words.some(w => badWords.includes(w.toLowerCase()));
    },
    description: 'Full legal name (first and last name)',
    priority: 10
  },
  // Disable city/state auto-fill - too error-prone
  // age extraction kept but with strict validation
  age: {
    label: 'Age',
    type: 'number',
    patterns: [
      /(\d{1,2})\s*years?\s*old/i,
      /aged?\s+(\d{1,2})\b/i
    ],
    validate: (value) => {
      const num = parseInt(value);
      return num >= 1 && num <= 110;
    },
    description: 'Age in years',
    priority: 9
  },
  incident_date: {
    label: 'Incident Date',
    patterns: [
      /(?:on|occurred\s+on)\s+((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4})/i,
      /(\d{1,2}\/\d{1,2}\/\d{4})/
    ],
    validate: (value) => {
      // Must contain a year
      return /\d{4}/.test(value) || /\d{1,2}\/\d{1,2}\/\d{2,4}/.test(value);
    },
    description: 'Date the incident occurred',
    priority: 8
  }
};

/**
 * Run Smart Auto-Fill - analyzes all quotes and fills fields with attribution
 */
function runSmartAutoFill() {
  console.log('Running Smart Auto-Fill...');
  const quotes = getAllQuotes();
  const formData = getFormData();
  
  if (quotes.length === 0) {
    displayAnalysisResults('🎯 Smart Auto-Fill Results', 
      '<p style="color: #dc2626;">No quotes found. Add quotes from source documents first.</p>');
    return;
  }
  
  const suggestions = [];
  const filledFields = [];
  
  // Analyze each field
  for (const [fieldName, rule] of Object.entries(FIELD_EXTRACTION_RULES)) {
    // Skip if field already has value or no patterns
    if (!rule.patterns || rule.patterns.length === 0) continue;
    if (formData[fieldName] && formData[fieldName].toString().trim()) {
      continue;
    }
    
    // Try to extract from each quote
    for (const quote of quotes) {
      for (const pattern of rule.patterns) {
        const match = quote.text.match(pattern);
        if (match && match[1]) {
          const extractedValue = match[1].trim();
          
          // Validate if validation function exists
          if (rule.validate && !rule.validate(extractedValue)) {
            console.log(`Rejected ${fieldName}:`, extractedValue, '- failed validation');
            continue; // Skip invalid values
          }
          
          suggestions.push({
            field: fieldName,
            label: rule.label,
            value: extractedValue,
            quoteId: quote.id,
            quoteText: quote.text.substring(0, 150) + (quote.text.length > 150 ? '...' : ''),
            source: quote.source,
            priority: rule.priority,
            confidence: rule.validate ? 'high' : 'medium'
          });
          break; // Found match, move to next quote
        }
      }
    }
  }
  
  // Sort by priority and deduplicate (keep highest priority per field)
  suggestions.sort((a, b) => b.priority - a.priority);
  const uniqueSuggestions = [];
  const seenFields = new Set();
  for (const s of suggestions) {
    if (!seenFields.has(s.field)) {
      seenFields.add(s.field);
      uniqueSuggestions.push(s);
    }
  }
  
  // Build results HTML
  let html = '';
  
  if (uniqueSuggestions.length === 0) {
    html = `
      <p style="color: #6b7280; margin-bottom: 12px;">No extractable field values found in ${quotes.length} quote(s).</p>
      <p style="font-size: 11px; color: #9ca3af;">Try adding more detailed quotes from news articles, official reports, or court documents.</p>
    `;
  } else {
    html = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
        <span style="color: #059669; font-weight: 600;">Found ${uniqueSuggestions.length} field value(s) to fill</span>
        <button data-action="apply-all-suggestions" class="analysis-action-btn" style="background: #059669; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 11px;">
          ✓ Apply All
        </button>
      </div>
      <div id="smartSuggestionsList" style="display: flex; flex-direction: column; gap: 10px;">
    `;
    
    uniqueSuggestions.forEach((s, idx) => {
      const escapedValue = s.value.replace(/"/g, '&quot;');
      html += `
        <div class="smart-suggestion" data-field="${s.field}" data-value="${escapedValue}" data-quote-id="${s.quoteId}" style="background: white; border: 1px solid #d1d5db; border-radius: 6px; padding: 10px;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div>
              <div style="font-weight: 600; color: #1f2937; font-size: 12px;">${s.label}</div>
              <div style="color: #059669; font-size: 14px; margin: 4px 0;">${s.value}</div>
            </div>
            <button data-action="apply-suggestion" data-field="${s.field}" data-value="${escapedValue}" data-quote-id="${s.quoteId}" class="analysis-action-btn"
                    style="background: #2563eb; color: white; border: none; padding: 4px 10px; border-radius: 4px; cursor: pointer; font-size: 10px;">
              Apply
            </button>
          </div>
          <div style="font-size: 10px; color: #6b7280; margin-top: 6px; padding: 6px; background: #f9fafb; border-radius: 4px;">
            <div style="font-style: italic;">"${s.quoteText}"</div>
            <div style="margin-top: 4px; color: #9ca3af;">Source: ${s.source}</div>
          </div>
        </div>
      `;
    });
    
    html += '</div>';
  }
  
  // Store suggestions globally for apply all
  window._smartSuggestions = uniqueSuggestions;
  
  displayAnalysisResults('🎯 Smart Auto-Fill Results', html);
}

/**
 * Apply a single smart suggestion
 */
function applySmartSuggestion(fieldName, value, quoteId) {
  const field = document.querySelector(`[name="${fieldName}"]`);
  if (field) {
    field.value = value;
    field.dispatchEvent(new Event('change', { bubbles: true }));
    field.style.backgroundColor = '#dcfce7';
    setTimeout(() => field.style.backgroundColor = '', 2000);
    
    // Link the quote to the field if we have quote associations
    if (quoteId && typeof linkQuoteToField === 'function') {
      linkQuoteToField(fieldName, quoteId);
    }
    
    // Update the suggestion card to show applied
    const card = document.querySelector(`.smart-suggestion[data-field="${fieldName}"]`);
    if (card) {
      card.style.opacity = '0.5';
      card.querySelector('button').textContent = '✓ Applied';
      card.querySelector('button').disabled = true;
    }
  }
}

/**
 * Apply all smart suggestions
 */
function applyAllSmartSuggestions() {
  const suggestions = window._smartSuggestions || [];
  let applied = 0;
  
  suggestions.forEach(s => {
    const field = document.querySelector(`[name="${s.field}"]`);
    if (field && !field.value.trim()) {
      field.value = s.value;
      field.dispatchEvent(new Event('change', { bubbles: true }));
      applied++;
    }
  });
  
  displayAnalysisResults('🎯 Smart Auto-Fill Results', 
    `<p style="color: #059669; font-size: 14px;">✓ Applied ${applied} field value(s) with source attribution.</p>
     <p style="font-size: 11px; color: #6b7280; margin-top: 8px;">Review the form to verify all values are correct.</p>`);
}

// =============================================================================
// RIGHTS VIOLATION ANALYSIS - Uses legal references and case law
// =============================================================================

/**
 * Run comprehensive rights violation analysis with case law citations
 */
function runRightsAnalysis() {
  console.log('Running Rights Violation Analysis...');
  const quotes = getAllQuotes();
  const formData = getFormData();
  
  if (quotes.length === 0 && !formData.summary) {
    displayAnalysisResults('⚖️ Rights Violation Analysis', 
      '<p style="color: #dc2626;">No data to analyze. Add quotes or case details first.</p>');
    return;
  }
  
  const allText = quotes.map(q => q.text).join(' ') + ' ' + (formData.summary || '');
  const findings = [];
  
  console.log('Rights Analysis - Checking text:', allText.substring(0, 500) + '...');
  
  // Violation detection patterns mapped to amendments
  // These patterns are designed to catch REAL language in news articles
  const violationDetectors = {
    fourth_amendment: {
      name: '4th Amendment - Unreasonable Seizure / Excessive Force',
      patterns: [
        // Force patterns - very broad to catch news language
        { regex: /pepper\s*(ball|spray|gas)/i, indicator: 'Pepper spray/balls used', weight: 2 },
        { regex: /rubber\s*bullet/i, indicator: 'Rubber bullets used', weight: 2 },
        { regex: /tear\s*gas/i, indicator: 'Tear gas used', weight: 2 },
        { regex: /taser|tased|stun\s*gun/i, indicator: 'Taser/stun gun used', weight: 2 },
        { regex: /(shot|shoot|fire|firing|fired)\s*(at|toward|into)/i, indicator: 'Projectiles fired at person', weight: 3 },
        { regex: /beat(en|ing)?|struck|kick(ed|ing)?|punch(ed|ing)?/i, indicator: 'Physical force used', weight: 2 },
        { regex: /blinded|blind|lost\s*(an?\s*)?eye|permanent.*injur/i, indicator: 'Permanent injury caused', weight: 3 },
        { regex: /excessive\s*force/i, indicator: 'Excessive force allegation', weight: 3 },
        { regex: /deadly\s*force/i, indicator: 'Deadly force referenced', weight: 3 },
        { regex: /lying\s*(on\s*the\s*)?(ground|floor|street).*fire|fire.*lying/i, indicator: 'Force used on prone person', weight: 3 },
        { regex: /back\s*of\s*(the\s*)?(head|neck)|head\s*shot/i, indicator: 'Shot to head/neck', weight: 3 },
        { regex: /unarmed/i, indicator: 'Victim was unarmed', weight: 2 },
        { regex: /no\s*(immediate\s*)?threat/i, indicator: 'No threat present', weight: 2 }
      ],
      keyCase: 'Graham v. Connor',
      threshold: 'objective_reasonableness'
    },
    first_amendment: {
      name: '1st Amendment - Freedom of Assembly/Speech',
      patterns: [
        { regex: /protest(er|or|s|ing)?/i, indicator: 'Protest activity', weight: 2 },
        { regex: /demonstrat(ion|or|ing)/i, indicator: 'Demonstration', weight: 2 },
        { regex: /peaceful\s*(protest|assembly|demonstrat)/i, indicator: 'Peaceful assembly', weight: 3 },
        { regex: /first\s*amendment/i, indicator: 'First Amendment referenced', weight: 3 },
        { regex: /freedom\s*of\s*(speech|assembly|press)/i, indicator: 'Constitutional freedom referenced', weight: 3 },
        { regex: /journalist|press|media|reporter/i, indicator: 'Press/media involved', weight: 2 },
        { regex: /arrest.*protest|protest.*arrest/i, indicator: 'Arrest at protest', weight: 3 }
      ],
      keyCase: 'Brandenburg v. Ohio',
      threshold: 'content_based_restriction'
    },
    eighth_amendment: {
      name: '8th Amendment - Cruel & Unusual Punishment',
      patterns: [
        { regex: /cruel|inhuman|degrading/i, indicator: 'Cruel treatment', weight: 3 },
        { regex: /denied\s*(medical|healthcare|treatment|medication)/i, indicator: 'Medical care denied', weight: 3 },
        { regex: /medical\s*(neglect|denial)/i, indicator: 'Medical neglect', weight: 3 },
        { regex: /died\s*(in|while|during)\s*(custody|detention|jail|prison)/i, indicator: 'Death in custody', weight: 3 },
        { regex: /bleeding.*ignored|ignored.*bleeding/i, indicator: 'Bleeding ignored', weight: 3 },
        { regex: /solitary\s*confinement/i, indicator: 'Solitary confinement', weight: 2 }
      ],
      keyCase: 'Estelle v. Gamble',
      threshold: 'deliberate_indifference'
    },
    fifth_amendment: {
      name: '5th Amendment - Due Process',
      patterns: [
        { regex: /due\s*process/i, indicator: 'Due process referenced', weight: 3 },
        { regex: /without\s*(a\s*)?(hearing|trial|notice)/i, indicator: 'No hearing/trial', weight: 3 },
        { regex: /indefinite\s*(detention|custody)/i, indicator: 'Indefinite detention', weight: 3 },
        { regex: /deport.*without|without.*deport/i, indicator: 'Deportation without process', weight: 3 }
      ],
      keyCase: 'Zadvydas v. Davis',
      threshold: 'process_denial'
    },
    fourteenth_amendment: {
      name: '14th Amendment - Equal Protection',
      patterns: [
        { regex: /discriminat/i, indicator: 'Discrimination', weight: 3 },
        { regex: /racial\s*(profil|bias|target)/i, indicator: 'Racial profiling/bias', weight: 3 },
        { regex: /equal\s*protection/i, indicator: 'Equal protection referenced', weight: 3 }
      ],
      keyCase: 'Mathews v. Eldridge',
      threshold: 'equal_protection'
    }
  };
  
  // Analyze each amendment with weighted scoring
  for (const [amendmentKey, detector] of Object.entries(violationDetectors)) {
    const matchedIndicators = [];
    const matchingQuotes = [];
    let totalWeight = 0;
    
    for (const { regex, indicator, weight } of detector.patterns) {
      const testResult = regex.test(allText);
      if (testResult) {
        console.log(`Rights Analysis - MATCH: ${amendmentKey} - "${indicator}" (weight: ${weight})`);
        matchedIndicators.push(indicator);
        totalWeight += weight;
        
        // Find specific quotes that match
        quotes.forEach(q => {
          if (regex.test(q.text) && !matchingQuotes.find(mq => mq.id === q.id)) {
            matchingQuotes.push(q);
          }
        });
      }
    }
    
    if (matchedIndicators.length > 0) {
      // Get the legal reference
      const legalRef = LEGAL_REFERENCES[amendmentKey];
      const keyCase = legalRef?.cases?.find(c => c.name.includes(detector.keyCase));
      
      // Determine strength based on weighted score
      let strength = 'possible';
      if (totalWeight >= 6) strength = 'strong';
      else if (totalWeight >= 4) strength = 'moderate';
      
      findings.push({
        amendment: detector.name,
        amendmentKey,
        indicators: matchedIndicators,
        quotes: matchingQuotes,
        legalRef,
        keyCase,
        strength,
        weight: totalWeight
      });
    }
  }
  
  // Build results HTML
  let html = '';
  
  if (findings.length === 0) {
    html = `
      <p style="color: #6b7280; margin-bottom: 8px;">No clear violation indicators found in the current data.</p>
      <p style="font-size: 11px; color: #9ca3af;">This doesn't mean no violations occurred - add more detailed quotes for better analysis.</p>
    `;
  } else {
    html = `
      <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; padding: 10px; margin-bottom: 12px;">
        <p style="color: #92400e; font-size: 11px; margin: 0;">
          <strong>⚠️ Disclaimer:</strong> This analysis identifies patterns that MAY indicate violations. 
          It is NOT legal advice. All findings require verification by qualified legal professionals.
        </p>
      </div>
      <div style="margin-bottom: 8px; font-weight: 600; color: #1f2937;">
        Found ${findings.length} potential violation area(s):
      </div>
    `;
    
    findings.forEach(f => {
      const strengthColors = {
        strong: { bg: '#fef2f2', border: '#ef4444', text: '#991b1b' },
        moderate: { bg: '#fefce8', border: '#eab308', text: '#854d0e' },
        possible: { bg: '#f0fdf4', border: '#22c55e', text: '#166534' }
      };
      const colors = strengthColors[f.strength];
      
      html += `
        <div style="background: ${colors.bg}; border: 1px solid ${colors.border}; border-radius: 8px; padding: 12px; margin-bottom: 12px;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
            <div style="font-weight: 600; color: ${colors.text}; font-size: 13px;">${f.amendment}</div>
            <span style="background: ${colors.border}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 10px; text-transform: uppercase;">
              ${f.strength}
            </span>
          </div>
          
          <div style="margin-bottom: 8px;">
            <div style="font-size: 11px; color: #374151; font-weight: 500;">Indicators Found:</div>
            <ul style="margin: 4px 0 0 16px; padding: 0; font-size: 11px; color: #4b5563;">
              ${f.indicators.map(i => `<li>${i}</li>`).join('')}
            </ul>
          </div>
      `;
      
      // Add key case law if available
      if (f.keyCase) {
        html += `
          <div style="background: white; border-radius: 4px; padding: 8px; margin-bottom: 8px;">
            <div style="font-size: 10px; color: #6b7280; margin-bottom: 4px;">Relevant Case Law:</div>
            <div style="font-size: 12px; font-weight: 600; color: #1e40af;">${f.keyCase.name}</div>
            <div style="font-size: 10px; color: #6b7280;">${f.keyCase.citation}</div>
            <div style="font-size: 11px; color: #374151; margin-top: 4px; font-style: italic;">
              "${f.keyCase.holding.substring(0, 200)}${f.keyCase.holding.length > 200 ? '...' : ''}"
            </div>
            <a href="${f.keyCase.sourceUrl}" target="_blank" style="font-size: 10px; color: #2563eb;">View Full Case →</a>
          </div>
        `;
      }
      
      // Add supporting quotes
      if (f.quotes.length > 0) {
        html += `
          <div style="font-size: 10px; color: #6b7280; margin-top: 8px;">Supporting Evidence (${f.quotes.length} quote(s)):</div>
        `;
        f.quotes.slice(0, 2).forEach(q => {
          html += `
            <div style="background: white; border-left: 3px solid ${colors.border}; padding: 6px 8px; margin-top: 4px; font-size: 11px;">
              <div style="color: #374151; font-style: italic;">"${q.text.substring(0, 120)}..."</div>
              <div style="color: #9ca3af; font-size: 10px; margin-top: 2px;">— ${q.source}</div>
            </div>
          `;
        });
      }
      
      html += `
        </div>
      `;
    });
  }
  
  displayAnalysisResults('⚖️ Rights Violation Analysis', html);
}

// ============================================
// STATEMENTS QUEUE MANAGEMENT
// ============================================

let statementsQueue = [];
let statementsQueueStats = {};
let statementsQueueFilter = 'pending';

async function loadStatementsQueue(status = 'pending') {
  const statusEl = document.getElementById('statementsQueueStatus');
  const listEl = document.getElementById('statementsQueueList');
  
  if (!statusEl || !listEl) return;
  
  statusEl.style.display = 'block';
  statusEl.textContent = 'Loading statements...';
  listEl.style.display = 'none';
  
  try {
    const params = new URLSearchParams();
    params.append('include_unverified', 'true');
    if (status !== 'all') {
      if (status === 'guest') {
        // Filter for guest submissions in client-side
      } else {
        // Status maps to verification_status in DB
      }
    }
    
    const response = await fetch(`${apiUrl}/api/statements?${params.toString()}&_t=${Date.now()}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'X-API-Key': apiKey,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch statements');
    }
    
    const data = await response.json();
    
    console.log('Statements queue response:', {
      total: data.length,
      sample: data.slice(0, 2)
    });
    
    statementsQueue = data || [];
    
    // Calculate stats
    statementsQueueStats = {
      all: statementsQueue.length,
      pending: statementsQueue.filter(s => s.verification_status === 'pending').length,
      first_review: statementsQueue.filter(s => s.verification_status === 'first_review').length,
      needs_validation: statementsQueue.filter(s => ['first_review', 'first_validation'].includes(s.verification_status)).length,
      verified: statementsQueue.filter(s => s.verification_status === 'verified').length,
      rejected: statementsQueue.filter(s => s.verification_status === 'rejected').length,
      guest: statementsQueue.filter(s => s.is_guest_submission).length
    };
    
    // Update filter counts
    updateStatementsFilterCounts();
    
    // Filter and display
    filterStatementsQueue(status);
    
  } catch (error) {
    console.error('Error loading statements:', error);
    statusEl.textContent = `Error: ${error.message}`;
  }
}

async function loadValidateStatementsQueue() {
  const listEl = document.getElementById('validateStatementsQueueList');
  if (!listEl) return;
  
  listEl.innerHTML = '<div class="empty-state">Loading statements...</div>';
  
  try {
    const response = await fetch(`${apiUrl}/api/statements/queue?include_unverified=true`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'X-API-Key': apiKey
      }
    });
    
    if (!response.ok) throw new Error('Failed to load statements');
    
    const data = await response.json();
    const statements = data.statements.filter(s => s.verification_status === 'first_review');
    
    if (statements.length === 0) {
      listEl.innerHTML = '<div class="empty-state">No statements awaiting validation</div>';
      return;
    }
    
    listEl.innerHTML = statements.map(stmt => `
      <div class="queue-card" data-statement-id="${stmt.id}" style="cursor: pointer;">
        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
          <span style="font-size: 11px; background: #dbeafe; color: #1e40af; padding: 2px 8px; border-radius: 4px; font-weight: 600;">
            ${stmt.statement_type?.replace('_', ' ') || 'Statement'}
          </span>
          <span style="font-size: 10px; color: #6b7280;">ID: ${stmt.id}</span>
        </div>
        <h4 style="font-size: 14px; font-weight: 600; margin: 0 0 6px 0;">${stmt.headline || 'Untitled'}</h4>
        <p style="font-size: 12px; color: #6b7280; margin: 0 0 8px 0;">${stmt.speaker_name || 'Unknown Speaker'}</p>
        <div style="display: flex; gap: 8px; font-size: 11px; color: #9ca3af;">
          <span>📅 ${stmt.statement_date ? new Date(stmt.statement_date).toLocaleDateString() : 'No date'}</span>
        </div>
      </div>
    `).join('');
    
    // Add click listeners to each card
    document.querySelectorAll('#validateStatementsQueueList .queue-card').forEach(card => {
      card.addEventListener('click', () => {
        const statementId = card.getAttribute('data-statement-id');
        if (statementId) {
          loadStatementForValidation(parseInt(statementId));
        }
      });
    });
    
  } catch (error) {
    console.error('Error loading validation statements:', error);
    listEl.innerHTML = '<div class="empty-state">Error loading statements</div>';
  }
}

function updateStatementsFilterCounts() {
  const counts = statementsQueueStats || {};
  
  document.getElementById('statementsFilterAllCount').textContent = counts.all || 0;
  document.getElementById('statementsFilterPendingCount').textContent = counts.pending || 0;
  document.getElementById('statementsFilterFirstReviewCount').textContent = counts.first_review || 0;
  document.getElementById('statementsFilterVerifiedCount').textContent = counts.verified || 0;
  document.getElementById('statementsFilterRejectedCount').textContent = counts.rejected || 0;
  document.getElementById('statementsFilterGuestCount').textContent = counts.guest || 0;
}

function filterStatementsQueue(status) {
  let filtered = [...statementsQueue];
  
  if (status === 'pending') {
    filtered = filtered.filter(s => s.verification_status === 'pending');
  } else if (status === 'first_review') {
    filtered = filtered.filter(s => s.verification_status === 'first_review');
  } else if (status === 'needs_validation') {
    filtered = filtered.filter(s => ['first_review', 'first_validation'].includes(s.verification_status));
  } else if (status === 'verified') {
    filtered = filtered.filter(s => s.verification_status === 'verified');
  } else if (status === 'rejected') {
    filtered = filtered.filter(s => s.verification_status === 'rejected');
  } else if (status === 'guest') {
    filtered = filtered.filter(s => s.is_guest_submission);
  }
  
  // Apply search filter if present
  const searchTerm = document.getElementById('statementsSearchInput')?.value.toLowerCase();
  if (searchTerm) {
    filtered = filtered.filter(s => 
      s.speaker_name?.toLowerCase().includes(searchTerm) ||
      s.headline?.toLowerCase().includes(searchTerm) ||
      s.key_quote?.toLowerCase().includes(searchTerm) ||
      s.statement_type?.toLowerCase().includes(searchTerm)
    );
  }
  
  renderStatementsQueue(filtered);
}

function renderStatementsQueue(statements) {
  const statusEl = document.getElementById('statementsQueueStatus');
  const listEl = document.getElementById('statementsQueueList');
  
  if (!statements || statements.length === 0) {
    statusEl.style.display = 'block';
    statusEl.textContent = 'No statements found';
    listEl.style.display = 'none';
    return;
  }
  
  statusEl.style.display = 'none';
  listEl.style.display = 'block';
  
  const getTypeColor = (type) => {
    const colors = {
      denunciation: { bg: '#fee2e2', text: '#991b1b' },
      support: { bg: '#dbeafe', text: '#1e40af' },
      legal_analysis: { bg: '#e9d5ff', text: '#6b21a8' },
      official_response: { bg: '#fef3c7', text: '#92400e' }
    };
    return colors[type] || { bg: '#f3f4f6', text: '#1f2937' };
  };
  
  const getStatusBadge = (status, isGuest) => {
    const badges = {
      pending: '<span style="background: #fef3c7; color: #92400e; padding: 2px 6px; border-radius: 3px; font-size: 10px; font-weight: 500;">⏳ Pending Review</span>',
      first_review: '<span style="background: #dbeafe; color: #1e40af; padding: 2px 6px; border-radius: 3px; font-size: 10px; font-weight: 500;">🔍 Awaiting Validation</span>',
      first_validation: '<span style="background: #e0e7ff; color: #3730a3; padding: 2px 6px; border-radius: 3px; font-size: 10px; font-weight: 500;">🔍 Awaiting Validation</span>',
      verified: '<span style="background: #d1fae5; color: #065f46; padding: 2px 6px; border-radius: 3px; font-size: 10px; font-weight: 500;">✓ Published</span>',
      rejected: '<span style="background: #fee2e2; color: #991b1b; padding: 2px 6px; border-radius: 3px; font-size: 10px; font-weight: 500;">✗ Rejected</span>'
    };
    const guestBadge = isGuest ? '<span style="background: #e0e7ff; color: #3730a3; padding: 2px 6px; border-radius: 3px; font-size: 10px; font-weight: 500; margin-left: 4px;">📝 Guest</span>' : '';
    return (badges[status] || '') + guestBadge;
  };
  
  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };
  
  listEl.innerHTML = statements.map(stmt => {
    const typeColors = getTypeColor(stmt.statement_type);
    const typeLabel = (stmt.statement_type || '').replace('_', ' ');
    
    return `
      <div class="statement-queue-item queue-item" data-statement-id="${stmt.id}" data-status="${stmt.verification_status}" style="cursor: pointer; padding: 12px; border: 1px solid #e5e7eb; border-radius: 6px; margin-bottom: 8px; background: white; transition: all 0.2s;">
        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 6px;">
          <div style="flex: 1;">
            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
              <span style="background: ${typeColors.bg}; color: ${typeColors.text}; padding: 2px 8px; border-radius: 3px; font-size: 10px; font-weight: 600; text-transform: capitalize;">
                ${typeLabel}
              </span>
              ${getStatusBadge(stmt.verification_status, stmt.is_guest_submission)}
            </div>
            <div style="font-weight: 600; font-size: 13px; color: #1f2937; margin-bottom: 2px;">
              ${stmt.speaker_name || 'Unknown Speaker'}
            </div>
            <div style="font-size: 11px; color: #6b7280;">
              ${stmt.speaker_title || ''} ${stmt.speaker_organization ? '• ' + stmt.speaker_organization : ''}
            </div>
          </div>
          <div style="font-size: 10px; color: #9ca3af; text-align: right;">
            ${formatDate(stmt.statement_date)}
          </div>
        </div>
        <div style="font-size: 12px; color: #374151; font-weight: 500; margin-bottom: 4px;">
          ${stmt.headline || 'No headline'}
        </div>
        <div style="font-size: 11px; color: #6b7280; font-style: italic; border-left: 2px solid #e5e7eb; padding-left: 8px;">
          "${(stmt.key_quote || '').substring(0, 120)}${stmt.key_quote?.length > 120 ? '...' : ''}"
        </div>
      </div>
    `;
  }).join('');
  
  // Add click listeners
  listEl.querySelectorAll('.statement-queue-item').forEach(card => {
    card.addEventListener('click', async () => {
      const statementId = card.dataset.statementId;
      const status = card.dataset.status;
      console.log('Statement card clicked, ID:', statementId, 'status:', status);
      
      // If status is first_review or first_validation, load for validation
      if (['first_review', 'first_validation'].includes(status)) {
        await loadStatementForValidation(parseInt(statementId));
      } else {
        // Load statement for review
        await loadStatementForReview(parseInt(statementId));
      }
    });
  });
}

async function loadStatementForReview(statementId) {
  console.log('[STATEMENT REVIEW] Loading statement for review:', statementId);
  
  try {
    // Fetch statement details
    const response = await fetch(`${apiUrl}/api/statements/${statementId}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'X-API-Key': apiKey
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to load statement details');
    }
    
    const stmt = await response.json();
    console.log('[STATEMENT REVIEW] Statement loaded:', stmt);
    
    // Check if statement is in a status that allows review
    if (stmt.verification_status === 'verified') {
      alert('This statement has already been verified.');
      return;
    }
    
    // Set statement review mode FIRST
    reviewMode = true;
    reviewIncidentId = statementId;  // Reuse same variable
    
    // Clear data arrays (but don't call clearCase() which resets the form)
    verifiedQuotes = [];
    pendingQuotes = [];
    sources = [];
    media = [];
    fieldQuoteAssociations = {};
    
    // Switch to Incident/Case tab
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelector('[data-tab="case"]')?.classList.add('active');
    document.querySelectorAll('.tab-content').forEach(p => p.classList.remove('active'));
    document.getElementById('tab-case')?.classList.add('active');
    
    // Switch to statement content type and wait for UI to update
    const statementRadio = document.querySelector('input[name="content_type"][value="statement"]');
    if (statementRadio) {
      statementRadio.checked = true;
      statementRadio.dispatchEvent(new Event('change', { bubbles: true }));
      
      // Wait a moment for the form sections to update
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Ensure currentContentType is set (should be set by handler, but just in case)
    currentContentType = 'statement';
    console.log('[STATEMENT REVIEW] Form switched to statement mode');
    
    // Show cancel and reject buttons for review
    const cancelBtn = document.getElementById('cancelReviewBtn');
    const rejectBtn = document.getElementById('rejectCaseBtn');
    if (cancelBtn) {
      cancelBtn.style.display = 'inline-block';
      cancelBtn.textContent = 'Cancel Review';
    }
    if (rejectBtn) {
      rejectBtn.style.display = 'inline-block';
      rejectBtn.textContent = 'Reject Statement';
    }
    
    console.log('[STATEMENT REVIEW] Buttons shown:', { cancel: !!cancelBtn, reject: !!rejectBtn });
    
    if (!cancelBtn || !rejectBtn) {
      console.error('[STATEMENT REVIEW] BUTTON ELEMENTS NOT FOUND!');
      console.error('[STATEMENT REVIEW] cancelReviewBtn:', cancelBtn);
      console.error('[STATEMENT REVIEW] rejectCaseBtn:', rejectBtn);
    }
    
    // Scroll to bottom to show footer buttons
    const footer = document.querySelector('.footer');
    if (footer) {
      setTimeout(() => {
        footer.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }, 200);
    }
    
    // Update save button text for statement review
    const saveBtn = document.getElementById('saveCaseBtn');
    if (saveBtn) {
      saveBtn.textContent = 'Submit Review';
      saveBtn.style.display = 'inline-block';
      saveBtn.style.background = '#10b981'; // Green for verification
      console.log('[STATEMENT REVIEW] Save button shown and text updated to Submit Review');
    }
    
    // Populate statement form fields
    const setFieldValue = (id, value) => {
      const field = document.getElementById(id);
      if (field && value !== null && value !== undefined) {
        field.value = value;
        console.log('[STATEMENT REVIEW] Set', id, '=', value);
      } else if (!field) {
        console.warn('[STATEMENT REVIEW] Field not found:', id);
      }
    };
    
    // Core fields
    setFieldValue('statementType', stmt.statement_type);
    setFieldValue('statementDate', stmt.statement_date?.split('T')[0]);
    setFieldValue('statementHeadline', stmt.headline);
    setFieldValue('statementKeyQuote', stmt.key_quote);
    
    // Speaker fields
    setFieldValue('speakerName', stmt.speaker_name);
    setFieldValue('speakerTitle', stmt.speaker_title);
    setFieldValue('speakerType', stmt.speaker_type);
    setFieldValue('politicalAffiliation', stmt.political_affiliation);
    setFieldValue('speakerWikipedia', stmt.speaker_wikipedia_url);
    
    // Context fields
    setFieldValue('statementPlatform', stmt.platform);
    setFieldValue('statementPlatformUrl', stmt.platform_url);
    setFieldValue('statementContext', stmt.context);
    
    // Impact fields
    setFieldValue('statementImpactLevel', stmt.impact_level);
    setFieldValue('statementMediaCoverage', stmt.media_coverage);
    
    // Load sources
    sources = (stmt.sources || []).map(src => ({
      url: src.url,
      title: src.title || '',
      priority: src.priority || 'secondary'
    }));
    renderSources();
    
    // Load main statement quotes
    verifiedQuotes = [];
    pendingQuotes = [];
    
    (stmt.quotes || []).map((q, index) => {
      const quoteData = {
        id: `stmt-${stmt.id}-q-${index}`,
        text: q.text,
        source: q.source_title || q.source_url || 'Statement',
        verified: q.verified || false
      };
      
      if (quoteData.verified) {
        verifiedQuotes.push(quoteData);
      } else {
        pendingQuotes.push(quoteData);
      }
    });
    
    // Load field-quote associations from field_quote_map
    fieldQuoteAssociations = {};
    if (stmt.field_quote_map && typeof stmt.field_quote_map === 'object') {
      console.log('[STATEMENT REVIEW] Processing field_quote_map:', stmt.field_quote_map);
      
      // For each field in field_quote_map, create quotes and link them
      Object.keys(stmt.field_quote_map).forEach(fieldName => {
        const fieldQuotes = stmt.field_quote_map[fieldName];
        if (!Array.isArray(fieldQuotes)) return;
        
        const quoteIds = [];
        fieldQuotes.forEach((quoteObj, idx) => {
          // Try to find matching quote in main quotes by text
          let existingQuote = verifiedQuotes.find(q => q.text === quoteObj.text);
          if (!existingQuote) {
            existingQuote = pendingQuotes.find(q => q.text === quoteObj.text);
          }
          
          if (existingQuote) {
            // Use existing quote ID
            quoteIds.push(existingQuote.id);
          } else {
            // Create a new field-specific quote
            const quoteId = `field-${fieldName}-${idx}`;
            const quoteData = {
              id: quoteId,
              text: quoteObj.text,
              source: quoteObj.source || 'Field quote',
              verified: quoteObj.verified || false
            };
            
            if (quoteData.verified) {
              verifiedQuotes.push(quoteData);
            } else {
              pendingQuotes.push(quoteData);
            }
            
            quoteIds.push(quoteId);
          }
        });
        
        // Map field name to quote IDs
        if (quoteIds.length > 0) {
          fieldQuoteAssociations[fieldName] = quoteIds;
        }
      });
      
      console.log('[STATEMENT REVIEW] Built fieldQuoteAssociations:', fieldQuoteAssociations);
      console.log('[STATEMENT REVIEW] Total quotes:', verifiedQuotes.length, 'verified,', pendingQuotes.length, 'pending');
      
      // Store in local storage
      chrome.storage.local.set({ fieldQuoteAssociations: fieldQuoteAssociations });
    }
    
    console.log('[STATEMENT REVIEW] All fields populated');
    
    // Initialize verifiedFields for all quotes, sources, and form fields
    verifiedFields = {};
    
    // Add form fields to verifiedFields
    const statementFields = ['statement_type', 'statement_date', 'headline', 'key_quote', 
                             'speaker_name', 'speaker_title', 'speaker_type', 'political_affiliation',
                             'speaker_wikipedia', 'platform', 'platform_url', 'context', 
                             'impact_level', 'media_coverage'];
    statementFields.forEach(field => {
      verifiedFields[field] = false;
    });
    
    // Add all quotes to verifiedFields
    verifiedQuotes.forEach(q => {
      verifiedFields[`quote_${q.id}`] = q.verified || false;
    });
    pendingQuotes.forEach(q => {
      verifiedFields[`quote_${q.id}`] = q.verified || false;
    });
    
    // Add all sources to verifiedFields
    sources.forEach((src, idx) => {
      verifiedFields[`source_${idx}`] = false;
    });
    
    console.log('[STATEMENT REVIEW] Initialized verifiedFields with', Object.keys(verifiedFields).length, 'items');
    
    // Show verification checkboxes for statement form
    document.querySelectorAll('.verification-checkbox-wrapper').forEach(wrapper => {
      const field = wrapper.dataset.field;
      if (statementFields.includes(field)) {
        wrapper.style.display = 'inline-block';
      }
    });
    
    // Setup checkbox listeners
    setupVerificationListeners();
    
    // Update verification counter to display initial count
    updateVerificationCounter();
    
    // Render quotes
    renderQuotes();
    
    // Check what's actually in the statement quote list after rendering
    setTimeout(() => {
      const el = document.getElementById('statementQuoteList');
      if (el) {
        console.log('[STATEMENT REVIEW] After 100ms, statementQuoteList innerHTML length:', el.innerHTML.length);
        console.log('[STATEMENT REVIEW] After 100ms, first 50 chars:', el.innerHTML.substring(0, 50));
        console.log('[STATEMENT REVIEW] After 100ms, element children count:', el.children.length);
        console.log('[STATEMENT REVIEW] After 100ms, element HTML:', el.outerHTML.substring(0, 200));
      }
    }, 100);
    
    // Only render pending quotes for incident form (not statements)
    if (currentContentType !== 'statement') {
      renderPendingQuotes();
    }
    
    console.log('[STATEMENT REVIEW] Quotes rendered');
    
    // Update UI to show quote counts on fields
    try {
      updateQuotePickerTriggers();
      console.log('[STATEMENT REVIEW] Quote picker triggers updated');
    } catch (err) {
      console.error('[STATEMENT REVIEW] Error updating quote pickers:', err);
    }
    
    // Show review banner
    try {
      showReviewBanner({
        id: stmt.id,
        speaker_name: stmt.speaker_name,
        headline: stmt.headline,
        statement_type: stmt.statement_type
      });
      console.log('[STATEMENT REVIEW] Review banner shown');
    } catch (err) {
      console.error('[STATEMENT REVIEW] Error showing banner:', err);
    }
    
    console.log('[STATEMENT REVIEW] Statement loaded into form - COMPLETE');
    
  } catch (error) {
    console.error('[STATEMENT REVIEW] Error loading statement:', error);
    showError('Failed to load statement: ' + error.message, '❌ Error');
  }
}

// ============================================
// STATEMENT VALIDATION
// ============================================

let statementValidationMode = false;
let statementValidationId = null;
let statementValidationData = null;

async function loadStatementForValidation(statementId) {
  console.log('[STATEMENT VALIDATION] Loading statement for validation:', statementId);
  
  try {
    // Fetch statement validation data
    const response = await fetch(`${apiUrl}/api/statements/${statementId}/validate`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'X-API-Key': apiKey
      }
    });
    
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Failed to load statement for validation');
    }
    
    const data = await response.json();
    
    // Normalize tags - convert underscores to hyphens and ensure it's an array
    console.log('[DEBUG] Raw data.statement.tags:', data.statement.tags, 'Type:', typeof data.statement.tags);
    
    if (data.statement.tags) {
      if (Array.isArray(data.statement.tags)) {
        data.statement.tags = data.statement.tags.map(tag => {
          if (typeof tag !== 'string') return tag;
          return tag.replace(/_/g, '-');
        });
      } else if (typeof data.statement.tags === 'string') {
        // If it's a string (like "{tag1,tag2}"), parse it
        data.statement.tags = data.statement.tags
          .replace(/^{|}$/g, '')
          .split(',')
          .map((t) => t.trim().replace(/_/g, '-'))
          .filter((t) => t.length > 0);
      }
    } else {
      data.statement.tags = [];
    }
    
    console.log('[DEBUG] Processed data.statement.tags:', data.statement.tags);
    
    statementValidationData = data;
    statementValidationId = statementId;
    statementValidationMode = true;
    
    // Switch to Case tab
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelector('[data-tab="case"]')?.classList.add('active');
    document.querySelectorAll('.tab-content').forEach(p => p.classList.remove('active'));
    document.getElementById('tab-case')?.classList.add('active');
    
    // Render the validation UI
    renderStatementValidationUI(data);
    
  } catch (error) {
    console.error('[STATEMENT VALIDATION] Error:', error);
    showError(error.message, '❌ Cannot Load Statement');
  }
}

function renderStatementValidationUI(data) {
  const stmt = data.statement;
  const quotes = data.quotes || [];
  const sources = data.sources || [];
  
  // Switch to validate tab
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));
  document.querySelector('[data-tab="validate"]')?.classList.add('active');
  document.getElementById('tab-validate')?.classList.add('active');
  
  // Hide validation queue views and sub-tab container
  const validateQueueView = document.getElementById('validateQueueView');
  const validateCaseView = document.getElementById('validateCaseView');
  const validateCasesContainer = document.getElementById('validateCasesContainer');
  const validateStatementsContainer = document.getElementById('validateStatementsContainer');
  const subtabs = document.querySelectorAll('.validate-subtab');
  
  if (validateQueueView) validateQueueView.style.display = 'none';
  if (validateCaseView) validateCaseView.style.display = 'none';
  if (validateCasesContainer) validateCasesContainer.style.display = 'none';
  if (validateStatementsContainer) validateStatementsContainer.style.display = 'none';
  subtabs.forEach(tab => tab.style.display = 'none');
  
  // Create or get validation container
  let container = document.getElementById('statementValidationContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'statementValidationContainer';
    const validateTab = document.getElementById('tab-validate');
    if (validateTab) {
      validateTab.appendChild(container);
    }
  }
  
  // Initialize validation checkboxes state
  if (!window.statementValidationChecks) {
    window.statementValidationChecks = {};
  }
  
  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '-';
  const formatBoolean = (v) => v === true ? '✓ Yes' : v === false ? '✗ No' : '-';
  
  const getTypeColor = (type) => {
    const colors = {
      denunciation: { bg: '#fee2e2', text: '#991b1b' },
      support: { bg: '#dbeafe', text: '#1e40af' },
      legal_analysis: { bg: '#e9d5ff', text: '#6b21a8' },
      official_response: { bg: '#fef3c7', text: '#92400e' }
    };
    return colors[type] || { bg: '#f3f4f6', text: '#1f2937' };
  };
  
  const typeColor = getTypeColor(stmt.statement_type);
  
  container.innerHTML = `
    <div style="margin-bottom: 16px;">
      <button id="statementValidationCancel" style="
        padding: 8px 16px; background: #e5e7eb; color: #374151; border: none;
        border-radius: 6px; font-size: 13px; font-weight: 500; cursor: pointer;
      ">← Back to Queue</button>
    </div>
    
    <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 16px; border-radius: 8px; margin-bottom: 16px;">
      <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
        <span style="font-size: 24px;">🔍</span>
        <div>
          <h2 style="font-size: 18px; font-weight: 700; margin: 0;">Statement Validation</h2>
          <p style="font-size: 12px; opacity: 0.9; margin: 4px 0 0 0;">
            Reviewed by: ${data.first_reviewer || 'Unknown'} • Validate before publishing
          </p>
        </div>
      </div>
    </div>
    
    <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
      <div style="display: flex; gap: 8px; margin-bottom: 12px; flex-wrap: wrap;">
        <span style="background: ${typeColor.bg}; color: ${typeColor.text}; padding: 4px 12px; border-radius: 4px; font-size: 11px; font-weight: 600; text-transform: capitalize;">
          ${(stmt.statement_type || '').replace('_', ' ')}
        </span>
        <span style="background: #dbeafe; color: #1e40af; padding: 4px 12px; border-radius: 4px; font-size: 11px; font-weight: 600;">ID: ${stmt.id}</span>
      </div>
      
      <div style="margin-bottom: 16px;">
        <label style="display: flex; align-items: start; gap: 8px; cursor: pointer;">
          <input type="checkbox" class="validation-checkbox" data-field="headline" style="margin-top: 2px; width: 16px; height: 16px;">
          <div style="flex: 1;">
            <div style="font-size: 11px; color: #6b7280; font-weight: 600; text-transform: uppercase; margin-bottom: 4px;">Headline</div>
            <div style="font-size: 18px; font-weight: 700; color: #1f2937;">${stmt.headline || 'Untitled Statement'}</div>
            ${stmt.field_quote_map?.headline?.length > 0 ? `
              <div style="margin-top: 8px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 4px; padding: 8px;">
                <div style="font-size: 10px; font-weight: 600; color: #1e40af; margin-bottom: 4px;">Linked Sources (${stmt.field_quote_map.headline.length}):</div>
                ${stmt.field_quote_map.headline.map(qid => {
                  const q = quotes.find(quote => quote.id === qid);
                  return q ? `
                    <div style="margin-bottom: 6px;">
                      <button onclick="event.preventDefault(); event.stopPropagation(); this.nextElementSibling.style.display = this.nextElementSibling.style.display === 'none' ? 'block' : 'none'; this.textContent = this.nextElementSibling.style.display === 'none' ? '▶ Show' : '▼ Hide';" style="background: none; border: none; color: #2563eb; cursor: pointer; font-size: 10px; padding: 0;">▶ Show</button>
                      <div style="display: none; margin-top: 4px; padding: 6px; background: white; border: 1px solid #bfdbfe; border-radius: 4px;">
                        <p style="font-size: 10px; font-style: italic; color: #1e40af; word-wrap: break-word; margin: 0 0 4px 0;">"${q.text}"</p>
                        ${q.source_url ? `<a href="${q.source_url}" target="_blank" style="color: #2563eb; font-size: 10px; word-break: break-all;">${q.source_url}</a>` : ''}
                      </div>
                    </div>
                  ` : '';
                }).join('')}
              </div>
            ` : ''}
          </div>
        </label>
      </div>
      
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px;">
        <label style="display: flex; align-items: start; gap: 8px; cursor: pointer;">
          <input type="checkbox" class="validation-checkbox" data-field="speaker_name" style="margin-top: 2px; width: 16px; height: 16px;">
          <div style="flex: 1;">
            <div style="font-size: 11px; color: #6b7280; font-weight: 600; text-transform: uppercase; margin-bottom: 4px;">Speaker Name</div>
            <div style="font-size: 14px; font-weight: 600; color: #1f2937;">${stmt.speaker_name || '-'}</div>
            ${stmt.field_quote_map?.speaker_name?.length > 0 ? `
              <div style="margin-top: 4px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 4px; padding: 6px; font-size: 9px;">
                <div style="font-weight: 600; color: #1e40af; margin-bottom: 2px;">Sources (${stmt.field_quote_map.speaker_name.length}):</div>
                ${stmt.field_quote_map.speaker_name.map(qid => {
                  const q = quotes.find(quote => quote.id === qid);
                  return q ? `
                    <div style="margin-bottom: 4px;">
                      <button onclick="event.preventDefault(); event.stopPropagation(); this.nextElementSibling.style.display = this.nextElementSibling.style.display === 'none' ? 'block' : 'none'; this.textContent = this.nextElementSibling.style.display === 'none' ? '▶ Show' : '▼ Hide';" style="background: none; border: none; color: #2563eb; cursor: pointer; font-size: 9px; padding: 0;">▶ Show</button>
                      <div style="display: none; margin-top: 2px; padding: 4px; background: white; border: 1px solid #bfdbfe; border-radius: 4px;">
                        <p style="font-size: 9px; font-style: italic; color: #1e40af; word-wrap: break-word; margin: 0 0 4px 0;">"${q.text}"</p>
                        ${q.source_url ? `<a href="${q.source_url}" target="_blank" style="color: #2563eb; font-size: 9px; word-break: break-all;">${q.source_url}</a>` : ''}
                      </div>
                    </div>
                  ` : '';
                }).join('')}
              </div>
            ` : ''}
          </div>
        </label>
        <label style="display: flex; align-items: start; gap: 8px; cursor: pointer;">
          <input type="checkbox" class="validation-checkbox" data-field="speaker_title" style="margin-top: 2px; width: 16px; height: 16px;">
          <div style="flex: 1;">
            <div style="font-size: 11px; color: #6b7280; font-weight: 600; text-transform: uppercase; margin-bottom: 4px;">Speaker Title</div>
            <div style="font-size: 14px; color: #1f2937;">${stmt.speaker_title || '-'}</div>
            ${stmt.field_quote_map?.speaker_title?.length > 0 ? `
              <div style="margin-top: 4px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 4px; padding: 6px; font-size: 9px;">
                <div style="font-weight: 600; color: #1e40af; margin-bottom: 2px;">Sources (${stmt.field_quote_map.speaker_title.length}):</div>
                ${stmt.field_quote_map.speaker_title.map(qid => {
                  const q = quotes.find(quote => quote.id === qid);
                  return q ? `
                    <div style="margin-bottom: 4px;">
                      <button onclick="event.preventDefault(); event.stopPropagation(); this.nextElementSibling.style.display = this.nextElementSibling.style.display === 'none' ? 'block' : 'none'; this.textContent = this.nextElementSibling.style.display === 'none' ? '▶ Show' : '▼ Hide';" style="background: none; border: none; color: #2563eb; cursor: pointer; font-size: 9px; padding: 0;">▶ Show</button>
                      <div style="display: none; margin-top: 2px; padding: 4px; background: white; border: 1px solid #bfdbfe; border-radius: 4px;">
                        <p style="font-size: 9px; font-style: italic; color: #1e40af; word-wrap: break-word; margin: 0 0 4px 0;">"${q.text}"</p>
                        ${q.source_url ? `<a href="${q.source_url}" target="_blank" style="color: #2563eb; font-size: 9px; word-break: break-all;">${q.source_url}</a>` : ''}
                      </div>
                    </div>
                  ` : '';
                }).join('')}
              </div>
            ` : ''}
          </div>
        </label>
        <label style="display: flex; align-items: start; gap: 8px; cursor: pointer;">
          <input type="checkbox" class="validation-checkbox" data-field="statement_date" style="margin-top: 2px; width: 16px; height: 16px;">
          <div style="flex: 1;">
            <div style="font-size: 11px; color: #6b7280; font-weight: 600; text-transform: uppercase; margin-bottom: 4px;">Date</div>
            <div style="font-size: 14px; color: #1f2937;">${formatDate(stmt.statement_date)}</div>
            ${stmt.field_quote_map?.statement_date?.length > 0 ? `
              <div style="margin-top: 4px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 4px; padding: 6px; font-size: 9px;">
                <div style="font-weight: 600; color: #1e40af; margin-bottom: 2px;">Sources (${stmt.field_quote_map.statement_date.length}):</div>
                ${stmt.field_quote_map.statement_date.map(qid => {
                  const q = quotes.find(quote => quote.id === qid);
                  return q ? `
                    <div style="margin-bottom: 4px;">
                      <button onclick="event.preventDefault(); event.stopPropagation(); this.nextElementSibling.style.display = this.nextElementSibling.style.display === 'none' ? 'block' : 'none'; this.textContent = this.nextElementSibling.style.display === 'none' ? '▶ Show' : '▼ Hide';" style="background: none; border: none; color: #2563eb; cursor: pointer; font-size: 9px; padding: 0;">▶ Show</button>
                      <div style="display: none; margin-top: 2px; padding: 4px; background: white; border: 1px solid #bfdbfe; border-radius: 4px;">
                        <p style="font-size: 9px; font-style: italic; color: #1e40af; word-wrap: break-word; margin: 0 0 4px 0;">"${q.text}"</p>
                        ${q.source_url ? `<a href="${q.source_url}" target="_blank" style="color: #2563eb; font-size: 9px; word-break: break-all;">${q.source_url}</a>` : ''}
                      </div>
                    </div>
                  ` : '';
                }).join('')}
              </div>
            ` : ''}
          </div>
        </label>
        <label style="display: flex; align-items: start; gap: 8px; cursor: pointer;">
          <input type="checkbox" class="validation-checkbox" data-field="speaker_type" style="margin-top: 2px; width: 16px; height: 16px;">
          <div style="flex: 1;">
            <div style="font-size: 11px; color: #6b7280; font-weight: 600; text-transform: uppercase; margin-bottom: 4px;">Speaker Type</div>
            <div style="font-size: 14px; color: #1f2937;">${(stmt.speaker_type || '-').replace('_', ' ')}</div>
            ${stmt.field_quote_map?.speaker_type?.length > 0 ? `
              <div style="margin-top: 4px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 4px; padding: 6px; font-size: 9px;">
                <div style="font-weight: 600; color: #1e40af; margin-bottom: 2px;">Sources (${stmt.field_quote_map.speaker_type.length}):</div>
                ${stmt.field_quote_map.speaker_type.map(qid => {
                  const q = quotes.find(quote => quote.id === qid);
                  return q ? `
                    <div style="margin-bottom: 4px;">
                      <button onclick="event.preventDefault(); event.stopPropagation(); this.nextElementSibling.style.display = this.nextElementSibling.style.display === 'none' ? 'block' : 'none'; this.textContent = this.nextElementSibling.style.display === 'none' ? '▶ Show' : '▼ Hide';" style="background: none; border: none; color: #2563eb; cursor: pointer; font-size: 9px; padding: 0;">▶ Show</button>
                      <div style="display: none; margin-top: 2px; padding: 4px; background: white; border: 1px solid #bfdbfe; border-radius: 4px;">
                        <p style="font-size: 9px; font-style: italic; color: #1e40af; word-wrap: break-word; margin: 0 0 4px 0;">"${q.text}"</p>
                        ${q.source_url ? `<a href="${q.source_url}" target="_blank" style="color: #2563eb; font-size: 9px; word-break: break-all;">${q.source_url}</a>` : ''}
                      </div>
                    </div>
                  ` : '';
                }).join('')}
              </div>
            ` : ''}
          </div>
        </label>
        <label style="display: flex; align-items: start; gap: 8px; cursor: pointer;">
          <input type="checkbox" class="validation-checkbox" data-field="political_affiliation" style="margin-top: 2px; width: 16px; height: 16px;">
          <div style="flex: 1;">
            <div style="font-size: 11px; color: #6b7280; font-weight: 600; text-transform: uppercase; margin-bottom: 4px;">Affiliation</div>
            <div style="font-size: 14px; color: #1f2937;">${(stmt.political_affiliation || '-').replace('_', ' ')}</div>
            ${stmt.field_quote_map?.political_affiliation?.length > 0 ? `
              <div style="margin-top: 4px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 4px; padding: 6px; font-size: 9px;">
                <div style="font-weight: 600; color: #1e40af; margin-bottom: 2px;">Sources (${stmt.field_quote_map.political_affiliation.length}):</div>
                ${stmt.field_quote_map.political_affiliation.map(qid => {
                  const q = quotes.find(quote => quote.id === qid);
                  return q ? `
                    <div style="margin-bottom: 4px;">
                      <button onclick="event.preventDefault(); event.stopPropagation(); this.nextElementSibling.style.display = this.nextElementSibling.style.display === 'none' ? 'block' : 'none'; this.textContent = this.nextElementSibling.style.display === 'none' ? '▶ Show' : '▼ Hide';" style="background: none; border: none; color: #2563eb; cursor: pointer; font-size: 9px; padding: 0;">▶ Show</button>
                      <div style="display: none; margin-top: 2px; padding: 4px; background: white; border: 1px solid #bfdbfe; border-radius: 4px;">
                        <p style="font-size: 9px; font-style: italic; color: #1e40af; word-wrap: break-word; margin: 0 0 4px 0;">"${q.text}"</p>
                        ${q.source_url ? `<a href="${q.source_url}" target="_blank" style="color: #2563eb; font-size: 9px; word-break: break-all;">${q.source_url}</a>` : ''}
                      </div>
                    </div>
                  ` : '';
                }).join('')}
              </div>
            ` : ''}
          </div>
        </label>
        <label style="display: flex; align-items: start; gap: 8px; cursor: pointer;">
          <input type="checkbox" class="validation-checkbox" data-field="platform" style="margin-top: 2px; width: 16px; height: 16px;">
          <div style="flex: 1;">
            <div style="font-size: 11px; color: #6b7280; font-weight: 600; text-transform: uppercase; margin-bottom: 4px;">Platform</div>
            <div style="font-size: 14px; color: #1f2937;">${stmt.platform || '-'}</div>
            ${stmt.field_quote_map?.platform?.length > 0 ? `
              <div style="margin-top: 4px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 4px; padding: 6px; font-size: 9px;">
                <div style="font-weight: 600; color: #1e40af; margin-bottom: 2px;">Sources (${stmt.field_quote_map.platform.length}):</div>
                ${stmt.field_quote_map.platform.map(qid => {
                  const q = quotes.find(quote => quote.id === qid);
                  return q ? `
                    <div style="margin-bottom: 4px;">
                      <button onclick="event.preventDefault(); event.stopPropagation(); this.nextElementSibling.style.display = this.nextElementSibling.style.display === 'none' ? 'block' : 'none'; this.textContent = this.nextElementSibling.style.display === 'none' ? '▶ Show' : '▼ Hide';" style="background: none; border: none; color: #2563eb; cursor: pointer; font-size: 9px; padding: 0;">▶ Show</button>
                      <div style="display: none; margin-top: 2px; padding: 4px; background: white; border: 1px solid #bfdbfe; border-radius: 4px;">
                        <p style="font-size: 9px; font-style: italic; color: #1e40af; word-wrap: break-word; margin: 0 0 4px 0;">"${q.text}"</p>
                        ${q.source_url ? `<a href="${q.source_url}" target="_blank" style="color: #2563eb; font-size: 9px; word-break: break-all;">${q.source_url}</a>` : ''}
                      </div>
                    </div>
                  ` : '';
                }).join('')}
              </div>
            ` : ''}
          </div>
        </label>
        <label style="display: flex; align-items: start; gap: 8px; cursor: pointer;">
          <input type="checkbox" class="validation-checkbox" data-field="statement_type" style="margin-top: 2px; width: 16px; height: 16px;">
          <div style="flex: 1;">
            <div style="font-size: 11px; color: #6b7280; font-weight: 600; text-transform: uppercase; margin-bottom: 4px;">Statement Type</div>
            <div style="font-size: 14px; color: #1f2937;">${(stmt.statement_type || '-').replace('_', ' ')}</div>
            ${stmt.field_quote_map?.statement_type?.length > 0 ? `
              <div style="margin-top: 4px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 4px; padding: 6px; font-size: 9px;">
                <div style="font-weight: 600; color: #1e40af; margin-bottom: 2px;">Sources (${stmt.field_quote_map.statement_type.length}):</div>
                ${stmt.field_quote_map.statement_type.map(qid => {
                  const q = quotes.find(quote => quote.id === qid);
                  return q ? `
                    <div style="margin-bottom: 4px;">
                      <button onclick="event.preventDefault(); event.stopPropagation(); this.nextElementSibling.style.display = this.nextElementSibling.style.display === 'none' ? 'block' : 'none'; this.textContent = this.nextElementSibling.style.display === 'none' ? '▶ Show' : '▼ Hide';" style="background: none; border: none; color: #2563eb; cursor: pointer; font-size: 9px; padding: 0;">▶ Show</button>
                      <div style="display: none; margin-top: 2px; padding: 4px; background: white; border: 1px solid #bfdbfe; border-radius: 4px;">
                        <p style="font-size: 9px; font-style: italic; color: #1e40af; word-wrap: break-word; margin: 0 0 4px 0;">"${q.text}"</p>
                        ${q.source_url ? `<a href="${q.source_url}" target="_blank" style="color: #2563eb; font-size: 9px; word-break: break-all;">${q.source_url}</a>` : ''}
                      </div>
                    </div>
                  ` : '';
                }).join('')}
              </div>
            ` : ''}
          </div>
        </label>
      </div>
      
      <div style="margin-bottom: 16px;">
        <label style="display: flex; align-items: start; gap: 8px; cursor: pointer;">
          <input type="checkbox" class="validation-checkbox" data-field="key_quote" style="margin-top: 2px; width: 16px; height: 16px;">
          <div style="flex: 1;">
            <div style="font-size: 11px; color: #6b7280; font-weight: 600; text-transform: uppercase; margin-bottom: 4px;">Key Quote</div>
            <div style="background: #f9fafb; border-left: 3px solid #3b82f6; padding: 12px; font-style: italic; color: #374151;">
              "${stmt.key_quote || '-'}"
            </div>
            ${stmt.field_quote_map?.key_quote?.length > 0 ? `
              <div style="margin-top: 8px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 4px; padding: 8px;">
                <div style="font-size: 10px; font-weight: 600; color: #1e40af; margin-bottom: 4px;">Linked Sources (${stmt.field_quote_map.key_quote.length}):</div>
                ${stmt.field_quote_map.key_quote.map(qid => {
                  const q = quotes.find(quote => quote.id === qid);
                  return q ? `
                    <div style="margin-bottom: 6px;">
                      <button onclick="event.preventDefault(); event.stopPropagation(); this.nextElementSibling.style.display = this.nextElementSibling.style.display === 'none' ? 'block' : 'none'; this.textContent = this.nextElementSibling.style.display === 'none' ? '▶ Show' : '▼ Hide';" style="background: none; border: none; color: #2563eb; cursor: pointer; font-size: 10px; padding: 0;">▶ Show</button>
                      <div style="display: none; margin-top: 4px; padding: 6px; background: white; border: 1px solid #bfdbfe; border-radius: 4px;">
                        <p style="font-size: 10px; font-style: italic; color: #1e40af; word-wrap: break-word; margin: 0 0 4px 0;">"${q.text}"</p>
                        ${q.source_url ? `<a href="${q.source_url}" target="_blank" style="color: #2563eb; font-size: 10px; word-break: break-all;">${q.source_url}</a>` : ''}
                      </div>
                    </div>
                  ` : '';
                }).join('')}
              </div>
            ` : ''}
          </div>
        </label>
      </div>
    </div>
    
    <!-- Tags (Editable) -->
    <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
      <h4 style="font-size: 14px; font-weight: 600; color: #1f2937; margin: 0 0 12px 0;">
        🏷️ Tags (Editable)
      </h4>
      <div id="statementTags" style="display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 12px;">
        ${(stmt.tags || []).map((tag) => `
          <span class="tag-chip" data-tag="${tag}" style="display: inline-flex; align-items: center; gap: 4px; background: #dbeafe; color: #1e40af; padding: 4px 10px; border-radius: 12px; font-size: 12px;">
            ${tag.replace(/-/g, ' ')}
            <button class="tag-remove" data-tag="${tag}" style="background: none; border: none; color: #1e40af; font-weight: bold; cursor: pointer; padding: 0 4px; font-size: 14px;">×</button>
          </span>
        `).join('')}
      </div>
      <div style="margin-top: 12px;">
        <p style="font-size: 11px; color: #6b7280; font-weight: 600; margin: 0 0 8px 0; text-transform: uppercase;">Topic</p>
        <div style="display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 12px;">
          ${['family-separation', 'detention-conditions', 'deportation', 'border-enforcement', 'workplace-raids', 'racial-profiling', 'legal-rights', 'medical-care', 'mental-health'].map(tag => `
            <button class="preset-tag-btn" data-tag="${tag}" style="padding: 6px 12px; background: ${(stmt.tags || []).includes(tag) ? '#3b82f6' : '#f3f4f6'}; color: ${(stmt.tags || []).includes(tag) ? 'white' : '#374151'}; border: 1px solid ${(stmt.tags || []).includes(tag) ? '#3b82f6' : '#d1d5db'}; border-radius: 4px; font-size: 11px; font-weight: 500; cursor: pointer; transition: all 200ms;">${tag.replace(/-/g, ' ')}</button>
          `).join('')}
        </div>
        <p style="font-size: 11px; color: #6b7280; font-weight: 600; margin: 0 0 8px 0; text-transform: uppercase;">Speaker Type</p>
        <div style="display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 12px;">
          ${['politician', 'religious-leader', 'medical-professional', 'legal-expert', 'law-enforcement', 'immigrant-advocate', 'civil-rights-leader', 'business-leader', 'affected-person'].map(tag => `
            <button class="preset-tag-btn" data-tag="${tag}" style="padding: 6px 12px; background: ${(stmt.tags || []).includes(tag) ? '#3b82f6' : '#f3f4f6'}; color: ${(stmt.tags || []).includes(tag) ? 'white' : '#374151'}; border: 1px solid ${(stmt.tags || []).includes(tag) ? '#3b82f6' : '#d1d5db'}; border-radius: 4px; font-size: 11px; font-weight: 500; cursor: pointer; transition: all 200ms;">${tag.replace(/-/g, ' ')}</button>
          `).join('')}
        </div>
        <p style="font-size: 11px; color: #6b7280; font-weight: 600; margin: 0 0 8px 0; text-transform: uppercase;">Characteristic</p>
        <div style="display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 12px;">
          ${['breaking-ranks', 'cross-party', 'first-hand-account', 'emergency-response', 'viral'].map(tag => `
            <button class="preset-tag-btn" data-tag="${tag}" style="padding: 6px 12px; background: ${(stmt.tags || []).includes(tag) ? '#3b82f6' : '#f3f4f6'}; color: ${(stmt.tags || []).includes(tag) ? 'white' : '#374151'}; border: 1px solid ${(stmt.tags || []).includes(tag) ? '#3b82f6' : '#d1d5db'}; border-radius: 4px; font-size: 11px; font-weight: 500; cursor: pointer; transition: all 200ms;">${tag.replace(/-/g, ' ')}</button>
          `).join('')}
        </div>
        <p style="font-size: 11px; color: #6b7280; font-weight: 600; margin: 0 0 8px 0; text-transform: uppercase;">Values</p>
        <div style="display: flex; flex-wrap: wrap; gap: 6px;">
          ${['humanitarian', 'religious-moral', 'economic', 'constitutional', 'human-dignity'].map(tag => `
            <button class="preset-tag-btn" data-tag="${tag}" style="padding: 6px 12px; background: ${(stmt.tags || []).includes(tag) ? '#3b82f6' : '#f3f4f6'}; color: ${(stmt.tags || []).includes(tag) ? 'white' : '#374151'}; border: 1px solid ${(stmt.tags || []).includes(tag) ? '#3b82f6' : '#d1d5db'}; border-radius: 4px; font-size: 11px; font-weight: 500; cursor: pointer; transition: all 200ms;">${tag.replace(/-/g, ' ')}</button>
          `).join('')}
        </div>
      </div>
    </div>
    
    <!-- Sources -->
    <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
      <h4 style="font-size: 14px; font-weight: 600; color: #1f2937; margin: 0 0 12px 0;">
        📎 Sources (${sources.length})
      </h4>
      ${sources.length > 0 ? sources.map((src, idx) => `
        <label style="display: flex; align-items: start; gap: 8px; background: #f9fafb; padding: 10px; border-radius: 4px; margin-bottom: 8px; cursor: pointer;">
          <input type="checkbox" class="validation-checkbox-source" data-source-id="${src.id}" style="margin-top: 2px; width: 16px; height: 16px;">
          <div style="flex: 1;">
            <div style="font-size: 13px; font-weight: 500; color: #1f2937;">${src.title || 'Untitled'}</div>
            <a href="${src.url}" target="_blank" onclick="event.stopPropagation();" style="font-size: 11px; color: #3b82f6; word-break: break-all;">${src.url}</a>
            <span style="font-size: 10px; background: #e5e7eb; padding: 2px 6px; border-radius: 3px; margin-left: 8px;">${src.priority || 'secondary'}</span>
          </div>
        </label>
      `).join('') : '<div style="color: #9ca3af; font-size: 12px;">No sources linked</div>'}
    </div>
    
    <!-- Quotes -->
    <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
      <h4 style="font-size: 14px; font-weight: 600; color: #1f2937; margin: 0 0 12px 0;">
        💬 Supporting Quotes (${quotes.length})
      </h4>
      ${quotes.length > 0 ? quotes.map((q, idx) => `
        <label style="display: flex; align-items: start; gap: 8px; background: #f9fafb; padding: 10px; border-radius: 4px; margin-bottom: 8px; border-left: 3px solid ${q.verified ? '#10b981' : '#f59e0b'}; cursor: pointer;">
          <input type="checkbox" class="validation-checkbox-quote" data-quote-id="${q.id}" style="margin-top: 2px; width: 16px; height: 16px;">
          <div style="flex: 1;">
            <div style="font-size: 12px; color: #374151; font-style: italic;">"${q.text}"</div>
            <div style="font-size: 10px; color: #6b7280; margin-top: 4px;">
              Source: ${q.source_url ? `<a href="${q.source_url}" target="_blank" onclick="event.stopPropagation();" style="color: #3b82f6; text-decoration: underline;">${q.source_title || q.source_url}</a>` : (q.source_title || 'Unknown')}
              ${q.verified ? ' <span style="color: #10b981;">✓ Verified</span>' : ' <span style="color: #f59e0b;">⏳ Pending</span>'}
            </div>
          </div>
        </label>
        </div>
      `).join('') : '<div style="color: #9ca3af; font-size: 12px;">No supporting quotes</div>'}
    </div>
    
    <!-- Validation Notes -->
    <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
      <h4 style="font-size: 14px; font-weight: 600; color: #1f2937; margin: 0 0 12px 0;">
        📝 Validation Notes (Optional)
      </h4>
      <textarea id="statementValidationNotes" 
        placeholder="Add notes about your validation decision..."
        style="width: 100%; height: 80px; border: 1px solid #e5e7eb; border-radius: 4px; padding: 10px; font-size: 13px; resize: vertical;"></textarea>
    </div>
    
    <!-- Action Buttons -->
    <div style="display: flex; gap: 12px; justify-content: center; padding: 16px 0;">
      <button id="statementValidationReject" style="
        padding: 12px 24px; background: #ef4444; color: white; border: none;
        border-radius: 6px; font-size: 14px; font-weight: 500; cursor: pointer;
      ">✗ Reject Statement</button>
      <button id="statementValidationApprove" style="
        padding: 12px 24px; background: #10b981; color: white; border: none;
        border-radius: 6px; font-size: 14px; font-weight: 500; cursor: pointer;
      ">✓ Approve & Publish</button>
    </div>
  `;
  
  container.style.display = 'block';
  
  // Add checkbox event listeners
  document.querySelectorAll('.validation-checkbox').forEach(checkbox => {
    checkbox.addEventListener('change', function() {
      window.statementValidationChecks[this.dataset.field] = this.checked;
    });
  });
  
  // Add quote checkbox event listeners
  document.querySelectorAll('.validation-checkbox-quote').forEach(checkbox => {
    checkbox.addEventListener('change', function() {
      if (!window.statementValidationChecks.quotes) {
        window.statementValidationChecks.quotes = {};
      }
      window.statementValidationChecks.quotes[this.dataset.quoteId] = this.checked;
    });
  });
  
  // Add source checkbox event listeners
  document.querySelectorAll('.validation-checkbox-source').forEach(checkbox => {
    checkbox.addEventListener('change', function() {
      if (!window.statementValidationChecks.sources) {
        window.statementValidationChecks.sources = {};
      }
      window.statementValidationChecks.sources[this.dataset.sourceId] = this.checked;
    });
  });
  
  // Initialize tags array
  if (!window.statementValidationTags) {
    window.statementValidationTags = [...(stmt.tags || [])];
  }
  
  // Add preset tag button event listeners
  document.querySelectorAll('.preset-tag-btn').forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      const tag = this.getAttribute('data-tag');
      const tagsContainer = document.getElementById('statementTags');
      
      if (window.statementValidationTags.includes(tag)) {
        // Remove tag
        window.statementValidationTags = window.statementValidationTags.filter(t => t !== tag);
        document.querySelector(`.tag-chip[data-tag="${tag}"]`)?.remove();
        this.style.background = '#f3f4f6';
        this.style.color = '#374151';
        this.style.borderColor = '#d1d5db';
      } else {
        // Add tag
        window.statementValidationTags.push(tag);
        const tagChip = document.createElement('span');
        tagChip.className = 'tag-chip';
        tagChip.setAttribute('data-tag', tag);
        tagChip.style.cssText = 'display: inline-flex; align-items: center; gap: 4px; background: #dbeafe; color: #1e40af; padding: 4px 10px; border-radius: 12px; font-size: 12px;';
        tagChip.innerHTML = `
          ${tag.replace(/_/g, ' ')}
          <button class="tag-remove" data-tag="${tag}" style="background: none; border: none; color: #1e40af; font-weight: bold; cursor: pointer; padding: 0 4px; font-size: 14px;">×</button>
        `;
        tagsContainer.appendChild(tagChip);
        this.style.background = '#3b82f6';
        this.style.color = 'white';
        this.style.borderColor = '#3b82f6';
        
        // Add remove listener to new chip
        tagChip.querySelector('.tag-remove').addEventListener('click', function(e) {
          e.stopPropagation();
          const tagToRemove = this.getAttribute('data-tag');
          window.statementValidationTags = window.statementValidationTags.filter(t => t !== tagToRemove);
          tagChip.remove();
          document.querySelector(`.preset-tag-btn[data-tag="${tagToRemove}"]`).style.background = '#f3f4f6';
          document.querySelector(`.preset-tag-btn[data-tag="${tagToRemove}"]`).style.color = '#374151';
          document.querySelector(`.preset-tag-btn[data-tag="${tagToRemove}"]`).style.borderColor = '#d1d5db';
        });
      }
    });
  });
  
  // Add remove listeners to existing tags
  document.querySelectorAll('.tag-remove').forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      const tag = this.getAttribute('data-tag');
      window.statementValidationTags = window.statementValidationTags.filter(t => t !== tag);
      this.closest('.tag-chip').remove();
      const btn = document.querySelector(`.preset-tag-btn[data-tag="${tag}"]`);
      if (btn) {
        btn.style.background = '#f3f4f6';
        btn.style.color = '#374151';
        btn.style.borderColor = '#d1d5db';
      }
    });
  });
  
  // Add event listeners
  document.getElementById('statementValidationCancel')?.addEventListener('click', exitStatementValidation);
  document.getElementById('statementValidationReject')?.addEventListener('click', () => submitStatementValidation('reject'));
  document.getElementById('statementValidationApprove')?.addEventListener('click', () => {
    // Check if all required fields are validated
    const requiredFields = ['statement_type', 'statement_date', 'headline', 'key_quote', 'platform', 'speaker_name', 'speaker_title', 'speaker_type', 'political_affiliation'];
    const uncheckedFields = requiredFields.filter(field => !window.statementValidationChecks[field]);
    
    if (uncheckedFields.length > 0) {
      showModal({
        title: '⚠️ Incomplete Validation',
        message: 'You must check all field validation checkboxes before approving. Please verify each field has correct data and linked quotes/sources.',
        type: 'warning',
        buttons: [{ label: 'OK', action: 'ok', style: 'primary' }]
      });
      return;
    }
    
    submitStatementValidation('approve');
  });
}

async function submitStatementValidation(action) {
  const notes = document.getElementById('statementValidationNotes')?.value || '';
  
  const actionLabel = action === 'approve' ? 'Approve & Publish' : 'Reject';
  const confirmed = await showModal({
    title: action === 'approve' ? '✓ Approve Statement' : '✗ Reject Statement',
    message: action === 'approve' 
      ? 'This will publish the statement to the public website. Are you sure?'
      : 'This will reject the statement. Are you sure?',
    type: action === 'approve' ? 'question' : 'warning',
    buttons: [
      { label: 'Cancel', action: 'cancel', style: 'secondary' },
      { label: actionLabel, action: 'confirm', style: action === 'approve' ? 'success' : 'danger' }
    ]
  });
  
  if (confirmed !== 'confirm') return;
  
  try {
    // First update tags if changed
    if (window.statementValidationTags) {
      await fetch(`${apiUrl}/api/statements/${statementValidationId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'X-API-Key': apiKey
        },
        body: JSON.stringify({ tags: window.statementValidationTags })
      });
    }
    
    const response = await fetch(`${apiUrl}/api/statements/${statementValidationId}/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'X-API-Key': apiKey
      },
      body: JSON.stringify({ action, notes })
    });
    
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Validation failed');
    }
    
    const result = await response.json();
    
    if (action === 'approve') {
      showAlert('Statement approved and published!', '✅ Published');
    } else {
      showAlert('Statement rejected.', '❌ Rejected');
    }
    
    // Exit validation mode
    exitStatementValidation();
    
    // Reload queue
    loadStatementsQueue(statementsQueueFilter);
    
  } catch (error) {
    showError(error.message, '❌ Validation Failed');
  }
}

function exitStatementValidation() {
  statementValidationMode = false;
  statementValidationId = null;
  statementValidationData = null;
  window.statementValidationChecks = {};
  window.statementValidationTags = null;
  
  // Hide and clear validation container
  const container = document.getElementById('statementValidationContainer');
  if (container) {
    container.style.display = 'none';
    container.innerHTML = '';
  }
  
  // Show validation queue views again and sub-tabs
  const validateStatementsContainer = document.getElementById('validateStatementsContainer');
  const subtabs = document.querySelectorAll('.validate-subtab');
  
  if (validateStatementsContainer) validateStatementsContainer.style.display = 'block';
  subtabs.forEach(tab => tab.style.display = 'inline-block');
  
  // Switch back to statements tab
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelector('[data-tab="statements"]')?.classList.add('active');
  document.querySelectorAll('.tab-content').forEach(p => p.classList.remove('active'));
  document.getElementById('tab-statements')?.classList.add('active');
}

async function viewStatementDetails(statementId) {
  const detailsSection = document.getElementById('statementDetails');
  const contentDiv = document.getElementById('statementDetailContent');
  
  if (!detailsSection || !contentDiv) return;
  
  detailsSection.style.display = 'block';
  contentDiv.innerHTML = '<div style="padding: 20px; text-align: center; color: #666;">Loading...</div>';
  
  try {
    const response = await fetch(`${apiUrl}/api/statements/${statementId}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'X-API-Key': apiKey
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to load statement details');
    }
    
    const stmt = await response.json();
    
    const typeColors = {
      denunciation: { bg: '#fee2e2', text: '#991b1b' },
      support: { bg: '#dbeafe', text: '#1e40af' },
      legal_analysis: { bg: '#e9d5ff', text: '#6b21a8' },
      official_response: { bg: '#fef3c7', text: '#92400e' }
    };
    const colors = typeColors[stmt.statement_type] || { bg: '#f3f4f6', text: '#1f2937' };
    
    let html = `
      <div style="background: white; padding: 16px; border-radius: 8px;">
        <div style="display: flex; gap: 6px; margin-bottom: 12px; flex-wrap: wrap;">
          <span style="background: ${colors.bg}; color: ${colors.text}; padding: 4px 12px; border-radius: 4px; font-size: 11px; font-weight: 600; text-transform: capitalize;">
            ${(stmt.statement_type || '').replace('_', ' ')}
          </span>
          ${stmt.is_guest_submission ? '<span style="background: #e0e7ff; color: #3730a3; padding: 4px 12px; border-radius: 4px; font-size: 11px; font-weight: 600;">📝 Guest Submission</span>' : ''}
        </div>
        
        <h3 style="font-size: 16px; font-weight: 700; color: #1f2937; margin-bottom: 12px;">
          ${stmt.headline || 'Untitled Statement'}
        </h3>
        
        <div style="margin-bottom: 16px;">
          <div style="font-size: 13px; font-weight: 600; color: #1f2937;">
            ${stmt.speaker_name}
          </div>
          ${stmt.speaker_title ? `<div style="font-size: 12px; color: #6b7280;">${stmt.speaker_title}</div>` : ''}
          ${stmt.speaker_organization ? `<div style="font-size: 12px; color: #6b7280;">${stmt.speaker_organization}</div>` : ''}
          ${stmt.political_affiliation ? `<div style="font-size: 11px; color: #9ca3af; margin-top: 2px;">${stmt.political_affiliation}</div>` : ''}
        </div>
        
        <div style="background: #f9fafb; border-left: 3px solid ${colors.text}; padding: 12px; margin-bottom: 16px; border-radius: 4px;">
          <div style="font-size: 11px; font-weight: 600; color: #6b7280; margin-bottom: 6px;">KEY QUOTE</div>
          <div style="font-size: 13px; color: #374151; font-style: italic;">
            "${stmt.key_quote}"
          </div>
        </div>
        
        ${stmt.full_text ? `
          <div style="margin-bottom: 16px;">
            <div style="font-size: 11px; font-weight: 600; color: #6b7280; margin-bottom: 6px;">FULL STATEMENT</div>
            <div style="font-size: 12px; color: #374151; line-height: 1.6; white-space: pre-wrap;">
              ${stmt.full_text}
            </div>
          </div>
        ` : ''}
        
        ${stmt.context ? `
          <div style="margin-bottom: 16px;">
            <div style="font-size: 11px; font-weight: 600; color: #6b7280; margin-bottom: 6px;">CONTEXT</div>
            <div style="font-size: 12px; color: #374151;">
              ${stmt.context}
            </div>
          </div>
        ` : ''}
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; font-size: 11px;">
          <div>
            <div style="color: #9ca3af; margin-bottom: 2px;">Date</div>
            <div style="color: #1f2937; font-weight: 500;">${stmt.statement_date ? new Date(stmt.statement_date).toLocaleDateString() : '-'}</div>
          </div>
          <div>
            <div style="color: #9ca3af; margin-bottom: 2px;">Platform</div>
            <div style="color: #1f2937; font-weight: 500;">${stmt.platform || '-'}</div>
          </div>
          ${stmt.impact_level ? `
            <div>
              <div style="color: #9ca3af; margin-bottom: 2px;">Impact</div>
              <div style="color: #1f2937; font-weight: 500; text-transform: capitalize;">${stmt.impact_level}</div>
            </div>
          ` : ''}
          ${stmt.media_coverage ? `
            <div>
              <div style="color: #9ca3af; margin-bottom: 2px;">Coverage</div>
              <div style="color: #1f2937; font-weight: 500; text-transform: capitalize;">${stmt.media_coverage}</div>
            </div>
          ` : ''}
        </div>
        
        ${stmt.sources && stmt.sources.length > 0 ? `
          <div style="margin-bottom: 16px;">
            <div style="font-size: 11px; font-weight: 600; color: #6b7280; margin-bottom: 6px;">SOURCES (${stmt.sources.length})</div>
            ${stmt.sources.map(src => `
              <div style="padding: 6px; background: #f9fafb; border-radius: 4px; margin-bottom: 4px; font-size: 11px;">
                <a href="${src.url}" target="_blank" style="color: #2563eb; text-decoration: none; word-break: break-word;">
                  ${src.title || src.url}
                </a>
              </div>
            `).join('')}
          </div>
        ` : ''}
        
        ${stmt.quotes && stmt.quotes.length > 0 ? `
          <div style="margin-bottom: 16px;">
            <div style="font-size: 11px; font-weight: 600; color: #6b7280; margin-bottom: 6px;">QUOTES (${stmt.quotes.length})</div>
            ${stmt.quotes.slice(0, 3).map(q => `
              <div style="padding: 8px; background: #f9fafb; border-left: 2px solid #d1d5db; border-radius: 4px; margin-bottom: 6px; font-size: 11px;">
                <div style="font-style: italic; color: #374151; margin-bottom: 4px;">"${q.text}"</div>
                ${q.source_title ? `<div style="color: #9ca3af; font-size: 10px;">— ${q.source_title}</div>` : ''}
              </div>
            `).join('')}
            ${stmt.quotes.length > 3 ? `<div style="font-size: 10px; color: #9ca3af; text-align: center;">+ ${stmt.quotes.length - 3} more</div>` : ''}
          </div>
        ` : ''}
        
        <div style="display: flex; gap: 8px; padding-top: 16px; border-top: 1px solid #e5e7eb;">
          ${stmt.platform_url ? `
            <a href="${stmt.platform_url}" target="_blank" class="btn btn-sm btn-secondary" style="flex: 1; text-align: center; text-decoration: none;">
              View Original
            </a>
          ` : ''}
          <a href="${apiUrl}/dashboard/statements/${stmt.id}" target="_blank" class="btn btn-sm btn-primary" style="flex: 1; text-align: center; text-decoration: none;">
            Review in Dashboard
          </a>
        </div>
      </div>
    `;
    
    contentDiv.innerHTML = html;
    
  } catch (error) {
    console.error('Error loading statement details:', error);
    contentDiv.innerHTML = `<div style="padding: 20px; text-align: center; color: #ef4444;">Error: ${error.message}</div>`;
  }
}

// Setup statements tab event listeners
function setupStatementsTabListeners() {
  // Refresh button
  const refreshBtn = document.getElementById('refreshStatementsQueue');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => loadStatementsQueue(statementsQueueFilter));
  }
  
  // Search input
  const searchInput = document.getElementById('statementsSearchInput');
  if (searchInput) {
    searchInput.addEventListener('input', () => filterStatementsQueue(statementsQueueFilter));
  }
  
  // Filter toggle
  const filterToggle = document.getElementById('statementsFilterToggle');
  const filterDropdown = document.getElementById('statementsFilterDropdown');
  if (filterToggle && filterDropdown) {
    filterToggle.addEventListener('click', () => {
      const isVisible = filterDropdown.style.display !== 'none';
      filterDropdown.style.display = isVisible ? 'none' : 'block';
    });
  }
  
  // Filter buttons
  const filterButtons = document.querySelectorAll('#statementsFilterDropdown .filter-btn');
  filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const filter = btn.dataset.filter;
      const label = btn.dataset.label;
      
      // Update active states
      filterButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      // Update toggle button
      const labelEl = document.getElementById('statementsFilterLabel');
      if (labelEl) labelEl.textContent = label;
      
      // Update active count
      const activeCountEl = document.getElementById('statementsFilterActiveCount');
      const countEl = btn.querySelector('div');
      if (activeCountEl && countEl) {
        activeCountEl.textContent = countEl.textContent;
      }
      
      // Filter and hide dropdown
      statementsQueueFilter = filter;
      filterStatementsQueue(filter);
      if (filterDropdown) filterDropdown.style.display = 'none';
    });
  });
  
  // Close statement details
  const closeBtn = document.getElementById('closeStatementDetails');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      const detailsSection = document.getElementById('statementDetails');
      if (detailsSection) detailsSection.style.display = 'none';
    });
  }
}

// Make global for inline onclick handlers
window.viewStatementDetails = viewStatementDetails;

// Make new functions globally available (for backward compatibility only - these are suggestions only)
window.runSmartAutoFill = runSmartAutoFill;
window.applySmartSuggestion = applySmartSuggestion;
window.applyAllSmartSuggestions = applyAllSmartSuggestions;
window.runRightsAnalysis = runRightsAnalysis;

// Backward compatibility stubs (these features removed - analysis is suggestion-only now)
window.runViolationsAnalysis = () => console.warn('runViolationsAnalysis removed - use runRightsAnalysis instead');
window.runTimelineAnalysis = () => console.warn('runTimelineAnalysis removed');
window.runKeyQuotesAnalysis = () => console.warn('runKeyQuotesAnalysis removed');
window.runFieldSuggestionsAnalysis = () => console.warn('runFieldSuggestionsAnalysis removed - use runSmartAutoFill instead');
window.applyFieldSuggestionFromAnalysis = () => console.warn('applyFieldSuggestionFromAnalysis removed - use applySmartSuggestion instead');
window.suggestViolation = () => console.warn('suggestViolation removed - analysis is suggestions only, user must manually check boxes');
