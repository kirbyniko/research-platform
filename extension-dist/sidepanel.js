// ICE Incident Documentation - Sidebar Panel Script

// State
let currentCase = {
  incidentType: 'death_in_custody',
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
  deathMedicalDenied: false,
  // Injury-specific
  injuryType: '',
  injurySeverity: '',
  injuryWeapon: '',
  injuryCause: '',
  // Arrest-specific
  arrestReason: '',
  arrestContext: '',
  arrestCharges: '',
  arrestTimingSuspicious: false,
  arrestPretext: false,
  arrestSelective: false,
  // Violation-specific
  violationJournalism: false,
  violationProtest: false,
  violationActivism: false,
  violationSpeech: '',
  violationRuling: '',
  // Shooting-specific
  shootingFatal: false,
  shotsFired: '',
  weaponType: '',
  bodycamAvailable: false,
  victimArmed: false,
  warningGiven: false,
  shootingContext: '',
  // Excessive force-specific
  forceTypes: [],
  victimRestrained: false,
  victimComplying: false,
  videoEvidence: false,
  // Protest-specific
  protestTopic: '',
  protestSize: '',
  protestPermitted: false,
  dispersalMethod: '',
  arrestsMade: ''
};
let verifiedQuotes = [];
let pendingQuotes = [];
let sources = [];
let media = [];  // Array of {url, media_type, title?, description?}
let isConnected = false;
let apiUrl = 'https://ice-deaths.vercel.app';
let apiKey = '';
let currentSelectors = {};
let isExtracting = false;
let currentPageIsPdf = false;
let userRole = null;  // For analyst workflow
let reviewQueue = [];  // Cases awaiting review
let reviewQueueStats = {};  // Stats from API
let guestSubmissionsQueue = [];  // Guest submissions awaiting review
let guestSubmissionsCount = 0;  // Count of pending guest submissions
let reviewMode = false;  // Are we reviewing an existing incident?
let reviewIncidentId = null;  // ID of incident being reviewed
let isNewIncidentFromGuest = false;  // Are we creating a new incident from guest submission?
let currentGuestSubmissionId = null;  // ID of guest submission being reviewed
let verifiedFields = {};  // Track which fields have been verified in review mode
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
  
  // Initialize violation case law dropdowns
  initializeAllCaseLawDropdowns();
  updateViolationCount();
  
  // Check if opened in wide mode popup
  if (window.location.search.includes('wide=true')) {
    enableWideMode();
  }
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
  elements.dispersalMethod = document.getElementById('dispersalMethod');
  elements.arrestsMade = document.getElementById('arrestsMade');
  // Medical neglect section
  elements.medicalNeglectSection = document.getElementById('medicalNeglectSection');
  elements.medicalCondition = document.getElementById('medicalCondition');
  elements.treatmentDenied = document.getElementById('treatmentDenied');
  elements.requestsDocumented = document.getElementById('requestsDocumented');
  elements.resultedInDeath = document.getElementById('resultedInDeath');
  // Death section additions
  elements.officialCause = document.getElementById('officialCause');
  elements.autopsyAvailable = document.getElementById('autopsyAvailable');
  elements.deathCircumstances = document.getElementById('deathCircumstances');
  // Arrest section additions
  elements.warrantPresent = document.getElementById('warrantPresent');
}

// Load settings from storage
async function loadSettings() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['apiKey', 'customSelectors'], (result) => {
      if (result.apiKey) {
        apiKey = result.apiKey;
        elements.apiKey.value = apiKey;
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
        } else if (response.pendingQuotes) {
          verifiedQuotes = response.pendingQuotes.filter(q => q.status === 'verified');
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

// Setup tab navigation
function setupTabs() {
  const tabs = document.querySelectorAll('.tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
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
      
      // Update selectors when config tab is opened
      if (tab.dataset.tab === 'config') {
        loadSelectorsForCurrentDomain();
      }
    });
  });
}

// Setup event listeners
function setupEventListeners() {
  // Incident type selector - show/hide relevant fields
  elements.incidentType.addEventListener('change', handleIncidentTypeChange);
  
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
  ['protestTopic', 'protestSize', 'dispersalMethod', 'arrestsMade'].forEach(id => {
    if (elements[id]) {
      elements[id].addEventListener('input', updateCaseFromForm);
    }
  });
  if (elements.protestPermitted) {
    elements.protestPermitted.addEventListener('change', updateCaseFromForm);
  }
  
  // Extract button
  elements.extractBtn.addEventListener('click', extractArticle);
  
  // Save button
  elements.saveCaseBtn.addEventListener('click', saveCase);
  
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
  
  // Duplicate checker button
  const checkDuplicatesBtn = document.getElementById('checkDuplicatesBtn');
  if (checkDuplicatesBtn) {
    checkDuplicatesBtn.addEventListener('click', checkForDuplicates);
  }
  
  // Add source button
  elements.addSourceBtn.addEventListener('click', addCurrentPageAsSource);
  
  // Add manual source button
  if (elements.addManualSourceBtn) {
    elements.addManualSourceBtn.addEventListener('click', () => {
      sources.push({ 
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
    clearUnverifiedBtn.addEventListener('click', () => {
      if (confirm('Clear all unverified quotes?')) {
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
  
  // API Key change
  elements.apiKey.addEventListener('change', async () => {
    apiKey = elements.apiKey.value;
    chrome.storage.local.set({ apiKey });
    // Re-check role when API key changes
    if (apiKey) {
      await checkUserRole();
    } else {
      userRole = null;
      updateUserStatus();
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
    alert('Please enter a CSS selector');
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
    alert('Please paste some text first');
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
    alert('No element selected. Click "From Element" first.');
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
  
  alert(isConnected ? 'Connection successful!' : 'Connection failed. Is the server running?');
}

// Populate case form from state
function populateCaseForm() {
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
  
  // Populate incident type
  if (elements.incidentType) {
    elements.incidentType.value = currentCase.incidentType || 'death_in_custody';
    handleIncidentTypeChange();
  }
  
  // Populate agencies
  document.querySelectorAll('[id^="agency-"]').forEach(checkbox => {
    const agency = checkbox.value;
    checkbox.checked = currentCase.agencies && currentCase.agencies.includes(agency);
  });
  
  // Populate violations using new checkbox-based system
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
  
  // Populate type-specific fields
  if (elements.deathCause) elements.deathCause.value = currentCase.deathCause || '';
  if (elements.deathManner) elements.deathManner.value = currentCase.deathManner || '';
  if (elements.deathCustodyDuration) elements.deathCustodyDuration.value = currentCase.deathCustodyDuration || '';
  if (elements.deathMedicalDenied) elements.deathMedicalDenied.checked = currentCase.deathMedicalDenied || false;
  
  if (elements.injuryType) elements.injuryType.value = currentCase.injuryType || '';
  if (elements.injurySeverity) elements.injurySeverity.value = currentCase.injurySeverity || '';
  if (elements.injuryWeapon) elements.injuryWeapon.value = currentCase.injuryWeapon || '';
  if (elements.injuryCause) elements.injuryCause.value = currentCase.injuryCause || '';
  
  if (elements.arrestReason) elements.arrestReason.value = currentCase.arrestReason || '';
  if (elements.arrestContext) elements.arrestContext.value = currentCase.arrestContext || '';
  if (elements.arrestCharges) elements.arrestCharges.value = currentCase.arrestCharges || '';
  if (elements.arrestTimingSuspicious) elements.arrestTimingSuspicious.checked = currentCase.arrestTimingSuspicious || false;
  if (elements.arrestPretext) elements.arrestPretext.checked = currentCase.arrestPretext || false;
  if (elements.arrestSelective) elements.arrestSelective.checked = currentCase.arrestSelective || false;
  
  if (elements.violationJournalism) elements.violationJournalism.checked = currentCase.violationJournalism || false;
  if (elements.violationProtest) elements.violationProtest.checked = currentCase.violationProtest || false;
  if (elements.violationActivism) elements.violationActivism.checked = currentCase.violationActivism || false;
  if (elements.violationSpeech) elements.violationSpeech.value = currentCase.violationSpeech || '';
  if (elements.violationRuling) elements.violationRuling.value = currentCase.violationRuling || '';
  
  // Populate shooting-specific fields
  if (elements.shootingFatal) elements.shootingFatal.checked = currentCase.shootingFatal || false;
  if (elements.shotsFired) elements.shotsFired.value = currentCase.shotsFired || '';
  if (elements.weaponType) elements.weaponType.value = currentCase.weaponType || '';
  if (elements.bodycamAvailable) elements.bodycamAvailable.checked = currentCase.bodycamAvailable || false;
  if (elements.victimArmed) elements.victimArmed.checked = currentCase.victimArmed || false;
  if (elements.warningGiven) elements.warningGiven.checked = currentCase.warningGiven || false;
  if (elements.shootingContext) elements.shootingContext.value = currentCase.shootingContext || '';
  
  // Populate excessive force fields
  document.querySelectorAll('[id^="force-"]').forEach(checkbox => {
    const forceType = checkbox.value;
    checkbox.checked = currentCase.forceTypes && currentCase.forceTypes.includes(forceType);
  });
  if (elements.victimRestrained) elements.victimRestrained.checked = currentCase.victimRestrained || false;
  if (elements.victimComplying) elements.victimComplying.checked = currentCase.victimComplying || false;
  if (elements.videoEvidence) elements.videoEvidence.checked = currentCase.videoEvidence || false;
  
  // Populate protest fields
  if (elements.protestTopic) elements.protestTopic.value = currentCase.protestTopic || '';
  if (elements.protestSize) elements.protestSize.value = currentCase.protestSize || '';
  if (elements.protestPermitted) elements.protestPermitted.checked = currentCase.protestPermitted || false;
  if (elements.dispersalMethod) elements.dispersalMethod.value = currentCase.dispersalMethod || '';
  if (elements.arrestsMade) elements.arrestsMade.value = currentCase.arrestsMade || '';
  
  // Populate tags - ensure it's always an array
  if (!currentCase.tags || !Array.isArray(currentCase.tags)) {
    currentCase.tags = [];
  }
  console.log('Populating tags:', currentCase.tags);
  renderTags();
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
    alert('Failed to copy to clipboard');
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

// Handle incident type change - show/hide relevant sections
function handleIncidentTypeChange() {
  const type = elements.incidentType.value;
  
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
  
  // Show type-specific section
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
      if (elements.excessiveForceSection) elements.excessiveForceSection.classList.remove('hidden');
      break;
    case 'arrest':
      if (elements.arrestFields) elements.arrestFields.classList.remove('hidden');
      break;
    case 'rights_violation':
    case 'retaliation':
      if (elements.violationFields) elements.violationFields.classList.remove('hidden');
      break;
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
  
  currentCase = {
    incidentType: elements.incidentType ? elements.incidentType.value : 'death_in_custody',
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
    deathMedicalDenied: elements.deathMedicalDenied ? elements.deathMedicalDenied.checked : false,
    // Injury-specific
    injuryType: elements.injuryType ? elements.injuryType.value : '',
    injurySeverity: elements.injurySeverity ? elements.injurySeverity.value : '',
    injuryWeapon: elements.injuryWeapon ? elements.injuryWeapon.value : '',
    injuryCause: elements.injuryCause ? elements.injuryCause.value : '',
    // Arrest-specific
    arrestReason: elements.arrestReason ? elements.arrestReason.value : '',
    arrestContext: elements.arrestContext ? elements.arrestContext.value : '',
    arrestCharges: elements.arrestCharges ? elements.arrestCharges.value : '',
    arrestTimingSuspicious: elements.arrestTimingSuspicious ? elements.arrestTimingSuspicious.checked : false,
    arrestPretext: elements.arrestPretext ? elements.arrestPretext.checked : false,
    arrestSelective: elements.arrestSelective ? elements.arrestSelective.checked : false,
    // Violation-specific
    violationJournalism: elements.violationJournalism ? elements.violationJournalism.checked : false,
    violationProtest: elements.violationProtest ? elements.violationProtest.checked : false,
    violationActivism: elements.violationActivism ? elements.violationActivism.checked : false,
    violationSpeech: elements.violationSpeech ? elements.violationSpeech.value : '',
    violationRuling: elements.violationRuling ? elements.violationRuling.value : '',
    // Shooting-specific
    shootingFatal: elements.shootingFatal ? elements.shootingFatal.checked : false,
    shotsFired: elements.shotsFired ? elements.shotsFired.value : '',
    weaponType: elements.weaponType ? elements.weaponType.value : '',
    bodycamAvailable: elements.bodycamAvailable ? elements.bodycamAvailable.checked : false,
    victimArmed: elements.victimArmed ? elements.victimArmed.checked : false,
    warningGiven: elements.warningGiven ? elements.warningGiven.checked : false,
    shootingContext: elements.shootingContext ? elements.shootingContext.value : '',
    // Excessive force-specific
    forceTypes: forceTypes,
    victimRestrained: elements.victimRestrained ? elements.victimRestrained.checked : false,
    victimComplying: elements.victimComplying ? elements.victimComplying.checked : false,
    videoEvidence: elements.videoEvidence ? elements.videoEvidence.checked : false,
    // Protest-specific
    protestTopic: elements.protestTopic ? elements.protestTopic.value : '',
    protestSize: elements.protestSize ? elements.protestSize.value : '',
    protestPermitted: elements.protestPermitted ? elements.protestPermitted.checked : false,
    dispersalMethod: elements.dispersalMethod ? elements.dispersalMethod.value : '',
    arrestsMade: elements.arrestsMade ? elements.arrestsMade.value : ''
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

// Field quote associations - stores which quote is linked to which field
let fieldQuoteAssociations = {};

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
  const currentValue = fieldQuoteAssociations[field] || '';
  const search = searchTerm.toLowerCase();
  
  // Combine verified and pending quotes
  const allQuotes = [
    ...verifiedQuotes.map(q => ({ ...q, isVerified: true })),
    ...pendingQuotes.map(q => ({ ...q, isVerified: false }))
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
    <div class="quote-picker-item ${String(currentValue) === String(quote.id) ? 'selected' : ''} ${!quote.isVerified ? 'unverified' : ''}" data-id="${quote.id}" data-field="${field}">
      <div class="quote-picker-item-header">
        <span class="quote-picker-item-status ${quote.isVerified ? 'verified' : 'unverified'}">
          ${quote.isVerified ? 'Verified' : 'Unverified'}
        </span>
        ${!quote.isVerified ? `<button class="quote-picker-verify-btn" data-id="${quote.id}" title="Verify this quote">Verify</button>` : ''}
      </div>
      <div class="quote-picker-item-text">"${escapeHtml(quote.text)}"</div>
      <div class="quote-picker-item-meta">
        <span class="quote-picker-item-category quote-category ${quote.category}">${quote.category}</span>
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

// Update trigger buttons to reflect current selections
function updateQuotePickerTriggers() {
  document.querySelectorAll('.quote-picker-trigger').forEach(trigger => {
    const field = trigger.dataset.field;
    const quoteId = fieldQuoteAssociations[field];
    const preview = trigger.querySelector('.selected-quote-preview');
    
    // Remove existing clear button and verify button
    const existingClear = trigger.querySelector('.clear-btn');
    if (existingClear) existingClear.remove();
    const existingVerify = trigger.querySelector('.inline-verify-btn');
    if (existingVerify) existingVerify.remove();
    
    if (quoteId) {
      // Check in both verified and pending quotes
      let quote = verifiedQuotes.find(q => q.id === quoteId);
      let isVerified = true;
      
      if (!quote) {
        quote = pendingQuotes.find(q => q.id === quoteId);
        isVerified = false;
      }
      
      if (quote) {
        const truncated = quote.text.length > 35 ? quote.text.substring(0, 35) + '...' : quote.text;
        
        if (isVerified) {
          preview.textContent = `[linked] "${truncated}"`;
          trigger.classList.add('has-quote');
          trigger.classList.remove('has-unverified');
        } else {
          preview.textContent = `[unverified] "${truncated}"`;
          trigger.classList.add('has-quote', 'has-unverified');
          
          // Add inline verify button
          const verifyBtn = document.createElement('button');
          verifyBtn.className = 'inline-verify-btn';
          verifyBtn.textContent = 'Verify';
          verifyBtn.onclick = (e) => {
            e.stopPropagation();
            verifyQuoteInline(quoteId);
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
        // Quote no longer exists
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

function clearQuoteAssociation(field) {
  delete fieldQuoteAssociations[field];
  chrome.storage.local.set({ fieldQuoteAssociations });
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
  
  // Quote selection via event delegation
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
      
      // Toggle selection
      if (fieldQuoteAssociations[field] === quoteId) {
        delete fieldQuoteAssociations[field];
      } else {
        fieldQuoteAssociations[field] = quoteId;
      }
      
      // Save and update UI
      chrome.storage.local.set({ fieldQuoteAssociations });
      updateQuotePickerTriggers();
      renderQuotePickerList(list, field, '');
      
      // Close dropdown
      const dropdown = document.querySelector(`.quote-picker-dropdown[data-field="${field}"]`);
      dropdown.classList.remove('open');
    });
  });
  
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
  document.querySelectorAll('.checkbox-quote-link').forEach(link => {
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
  
  // Modal quote selection
  document.getElementById('modalQuoteList').addEventListener('click', (e) => {
    const item = e.target.closest('.quote-picker-item');
    if (!item) return;
    
    const quoteId = item.dataset.id;
    const field = currentModalField;
    
    if (fieldQuoteAssociations[field] === quoteId) {
      delete fieldQuoteAssociations[field];
    } else {
      fieldQuoteAssociations[field] = quoteId;
    }
    
    chrome.storage.local.set({ fieldQuoteAssociations });
    updateAgencyQuoteLinks();
    closeQuotePickerModal();
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
  const currentValue = fieldQuoteAssociations[currentModalField] || '';
  
  // Combine verified and pending quotes
  const allQuotes = [
    ...verifiedQuotes.map(q => ({ ...q, isVerified: true })),
    ...pendingQuotes.map(q => ({ ...q, isVerified: false }))
  ];
  
  const filteredQuotes = allQuotes.filter(q => 
    !search || q.text.toLowerCase().includes(search) || q.category.toLowerCase().includes(search)
  );
  
  if (filteredQuotes.length === 0) {
    list.innerHTML = `
      <div class="quote-picker-empty">
        ${allQuotes.length === 0 ? 'No quotes yet. Add quotes from the Extract tab.' : 'No quotes match your search'}
      </div>
    `;
    return;
  }
  
  list.innerHTML = filteredQuotes.map(quote => `
    <div class="quote-picker-item ${currentValue === quote.id ? 'selected' : ''} ${!quote.isVerified ? 'unverified' : ''}" data-id="${quote.id}">
      <div class="quote-picker-item-header">
        <span class="quote-picker-item-status ${quote.isVerified ? 'verified' : 'unverified'}">
          ${quote.isVerified ? 'Verified' : 'Unverified'}
        </span>
        ${!quote.isVerified ? `<button class="quote-picker-verify-btn" data-id="${quote.id}" title="Verify this quote">Verify</button>` : ''}
      </div>
      <div class="quote-picker-item-text">"${escapeHtml(quote.text)}"</div>
      <div class="quote-picker-item-meta">
        <span class="quote-picker-item-category quote-category ${quote.category}">${quote.category}</span>
        ${quote.sourceTitle ? `<span>${escapeHtml(quote.sourceTitle.substring(0, 30))}...</span>` : ''}
      </div>
    </div>
  `).join('');
  
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
  const pendingIndex = pendingQuotes.findIndex(q => q.id === quoteId);
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
  const linkedQuoteIds = Object.values(fieldQuoteAssociations).filter(id => id);
  
  for (const quoteId of linkedQuoteIds) {
    // Check if it's in verified quotes
    const inVerified = verifiedQuotes.find(q => q.id === quoteId);
    if (!inVerified) {
      // Check if it's in pending quotes (unverified)
      const inPending = pendingQuotes.find(q => q.id === quoteId);
      if (inPending) {
        return { valid: false, unverifiedQuote: inPending };
      }
    }
  }
  
  return { valid: true };
}

// Get list of unverified linked quotes
function getUnverifiedLinkedQuotes() {
  const linkedQuoteIds = Object.values(fieldQuoteAssociations).filter(id => id);
  const unverified = [];
  
  for (const quoteId of linkedQuoteIds) {
    const inPending = pendingQuotes.find(q => q.id === quoteId);
    if (inPending) {
      unverified.push(inPending);
    }
  }
  
  return unverified;
}

// Update agency quote link text/state
function updateAgencyQuoteLinks() {
  document.querySelectorAll('.checkbox-quote-link').forEach(link => {
    const field = link.dataset.field;
    const quoteId = fieldQuoteAssociations[field];
    
    // Remove existing verify button
    const existingVerify = link.parentElement?.querySelector('.checkbox-verify-btn');
    if (existingVerify) existingVerify.remove();
    
    if (quoteId !== undefined && quoteId !== null && quoteId !== '') {
      // Check in both verified and pending quotes
      let quote = verifiedQuotes.find(q => String(q.id) === String(quoteId));
      let isVerified = true;
      
      if (!quote) {
        quote = pendingQuotes.find(q => String(q.id) === String(quoteId));
        isVerified = false;
      }
      
      if (quote) {
        const truncated = quote.text.length > 25 ? quote.text.substring(0, 25) + '...' : quote.text;
        
        if (isVerified) {
          link.textContent = `[linked] "${truncated}"`;
          link.classList.add('has-quote');
          link.classList.remove('has-unverified');
        } else {
          link.textContent = `[unverified] "${truncated}"`;
          link.classList.add('has-quote', 'has-unverified');
          
          // Add verify button next to the link
          const verifyBtn = document.createElement('button');
          verifyBtn.className = 'checkbox-verify-btn';
          verifyBtn.textContent = 'Verify';
          verifyBtn.onclick = (e) => {
            e.stopPropagation();
            verifyQuoteInline(quoteId);
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
  const verifiedList = verifiedQuotes.filter(q => verifiedFields[`quote_${q.id}`]);
  const unverifiedList = verifiedQuotes.filter(q => !verifiedFields[`quote_${q.id}`]);
  
  elements.quoteCount.textContent = verifiedList.length;
  
  // Render verified quotes
  const verifiedQuoteListEl = document.getElementById('verifiedQuoteList');
  if (verifiedList.length === 0) {
    verifiedQuoteListEl.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon"></div>
        <p>No verified quotes yet</p>
        <p style="font-size: 11px; margin-top: 4px;">
          Use extract buttons at the top to pull quotes from the page
        </p>
      </div>
    `;
  } else {
    verifiedQuoteListEl.innerHTML = verifiedList.map(quote => `
      <div class="quote-card verified" data-id="${quote.id}">
        <div style="display: inline-block; background: #dcfce7; color: #166534; padding: 2px 6px; border-radius: 3px; font-size: 10px; font-weight: 600; margin-bottom: 6px;">✓ VERIFIED</div>
        <div class="quote-text" style="${quote.text.length > 200 ? 'max-height: 100px; overflow: hidden;' : ''}">"${escapeHtml(quote.text)}"</div>
        <div class="quote-meta" style="margin-top: 8px;">
          <span class="quote-category ${quote.category}">${quote.category}</span>
          ${quote.pageNumber ? `<span class="quote-page" data-action="goToPage" data-page="${quote.pageNumber}" title="Go to page">Page ${quote.pageNumber}</span>` : ''}
        </div>
        ${quote.sourceUrl ? `<div class="quote-source" style="margin-top: 6px;"><a href="${escapeHtml(quote.sourceUrl)}" target="_blank" class="source-link" title="View source" style="color: #3b82f6; text-decoration: underline; font-size: 11px;">${escapeHtml(quote.sourceTitle || new URL(quote.sourceUrl).hostname)}</a></div>` : ''}
        <div class="quote-actions" style="margin-top: 8px; display: flex; gap: 6px; flex-wrap: wrap;">
          <button class="btn btn-sm btn-icon" data-action="copy" data-id="${quote.id}" data-verified="true" title="Copy quote">Copy</button>
          ${!currentPageIsPdf ? `<button class="btn btn-sm btn-icon" data-action="find" data-id="${quote.id}" data-verified="true" title="Find on page">Find</button>
          <button class="btn btn-sm btn-icon pin-btn" data-action="pin" data-id="${quote.id}" data-verified="true" title="Pin highlight">Pin</button>` : ''}
          <button class="btn btn-sm btn-danger" data-action="removeVerified" data-id="${quote.id}" title="Remove">X</button>
        </div>
      </div>
    `).join('');
  }
  
  // Render unverified quotes dropdown
  const unverifiedDropdown = document.getElementById('unverifiedQuotesDropdown');
  const unverifiedQuoteListContainer = document.getElementById('unverifiedQuoteList');
  const unverifiedCountEl = document.getElementById('unverifiedQuoteCount');
  
  if (unverifiedList.length > 0) {
    unverifiedDropdown.style.display = 'block';
    unverifiedCountEl.textContent = unverifiedList.length;
    
    // Find the actual quote-list div inside the container
    const unverifiedQuoteListEl = unverifiedQuoteListContainer.querySelector('.quote-list');
    
    unverifiedQuoteListEl.innerHTML = unverifiedList.map(quote => `
      <div class="quote-card unverified" data-id="${quote.id}" style="border-left: 3px solid #fbbf24; background: #fffbeb;">
        <div style="display: inline-block; background: #fef3c7; color: #92400e; padding: 2px 6px; border-radius: 3px; font-size: 10px; font-weight: 600; margin-bottom: 6px;">⚠️ UNVERIFIED</div>
        <div class="quote-text" style="${quote.text.length > 200 ? 'max-height: 100px; overflow: hidden;' : ''}">"${escapeHtml(quote.text)}"</div>
        <div class="quote-meta" style="margin-top: 8px;">
          <span class="quote-category ${quote.category}">${quote.category}</span>
          ${quote.pageNumber ? `<span class="quote-page" data-action="goToPage" data-page="${quote.pageNumber}" title="Go to page">Page ${quote.pageNumber}</span>` : ''}
        </div>
        ${quote.sourceUrl ? `<div class="quote-source" style="margin-top: 6px;"><a href="${escapeHtml(quote.sourceUrl)}" target="_blank" class="source-link" title="View source" style="color: #3b82f6; text-decoration: underline; font-size: 11px;">${escapeHtml(quote.sourceTitle || new URL(quote.sourceUrl).hostname)}</a></div>` : ''}
        <div class="quote-actions" style="margin-top: 8px; display: flex; gap: 6px; flex-wrap: wrap;">
          <button class="btn btn-sm btn-success" onclick="verifyQuoteFromList('${quote.id}')" title="Mark as verified" style="font-size: 11px; padding: 4px 10px;">✓ Verify</button>
          <button class="btn btn-sm btn-icon" data-action="copy" data-id="${quote.id}" data-verified="false" title="Copy quote">Copy</button>
          ${!currentPageIsPdf ? `<button class="btn btn-sm btn-icon" data-action="find" data-id="${quote.id}" data-verified="false" title="Find on page">Find</button>
          <button class="btn btn-sm btn-icon pin-btn" data-action="pin" data-id="${quote.id}" data-verified="false" title="Pin highlight">Pin</button>` : ''}
          <button class="btn btn-sm btn-danger" data-action="removeVerified" data-id="${quote.id}" title="Remove">X</button>
        </div>
      </div>
    `).join('');
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
window.verifyQuoteFromList = function(quoteId) {
  verifiedFields[`quote_${quoteId}`] = true;
  updateVerificationCounter();
  renderQuotes();
};

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
  if (!sourceKey) {
    alert('Select a source to link this quote.');
    return;
  }
  const source = sources.find(s => sourceOptionValue(s) === sourceKey);
  if (!source) {
    alert('Selected source could not be found.');
    return;
  }
  const id = `local-quote-${Date.now()}`;
  const quote = {
    id,
    text,
    source_id: source.id || null,
    category: 'context',
    page_number: null,
    paragraph_number: null,
    confidence: null,
    verified: false,
    verified_by: null
  };
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
        <span class="quote-category ${quote.category}">${quote.category}</span>
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
  const idx = pendingQuotes.findIndex(q => q.id === quoteId);
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
  pendingQuotes = pendingQuotes.filter(q => q.id !== quoteId);
  renderPendingQuotes();
  syncQuotesToBackground();
};

// Remove a verified quote
window.removeVerifiedQuote = function(quoteId) {
  verifiedQuotes = verifiedQuotes.filter(q => q.id !== quoteId);
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
  const quote = list.find(q => q.id === quoteId);
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
  const quote = list.find(q => q.id === quoteId);
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
  const quote = list.find(q => q.id === quoteId);
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
  const quote = list.find(q => q.id === quoteId);
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
  const category = elements.manualQuoteCategory.value;
  
  if (!text) {
    alert('Please enter quote text');
    return;
  }
  
  const quote = {
    id: crypto.randomUUID(),
    text: text,
    category: category,
    confidence: 1.0,
    status: 'verified',
    createdAt: new Date().toISOString()
  };
  
  verifiedQuotes.push(quote);
  renderQuotes();
  syncQuotesToBackground();
  
  // Clear form
  elements.manualQuoteText.value = '';
  elements.manualAddHeader.classList.remove('open');
  elements.manualAddContent.classList.remove('open');
}

// Render sources list
function renderSources() {
  elements.sourceCount.textContent = sources.length;
  
  if (sources.length === 0) {
    elements.sourceList.innerHTML = '';
    updateReviewQuoteSourceSelect();
    return;
  }
  
  elements.sourceList.innerHTML = sources.map((source, index) => {
    const priorityColor = source.priority === 'primary' ? '#10b981' : source.priority === 'tertiary' ? '#9ca3af' : '#3b82f6';
    const checked = verifiedFields[`source_${source.id}`] ? 'checked' : '';
    
    // If URL is empty (manual entry mode), show input fields
    if (!source.url || source.url === '') {
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
            <select onchange="updateSourcePriority(${index}, this.value)" style="padding: 2px 4px; font-size: 11px; border: 1px solid #ccc; border-radius: 3px; background: ${priorityColor}; color: white;">
              <option value="primary" ${source.priority === 'primary' ? 'selected' : ''}>Primary</option>
              <option value="secondary" ${source.priority === 'secondary' || !source.priority ? 'selected' : ''}>Secondary</option>
              <option value="tertiary" ${source.priority === 'tertiary' ? 'selected' : ''}>Tertiary</option>
            </select>
            <button class="btn btn-sm btn-danger" onclick="deleteSource(${index})" title="Delete source">✕</button>
          </div>
        </div>
      `;
    }
    
    // Normal display mode with link
    return `
    <div class="source-item" style="display: flex; align-items: center; gap: 8px; padding: 8px; border: 1px solid #e0e0e0; border-radius: 4px; margin-bottom: 4px;">
      ${reviewMode ? `<input type="checkbox" class="source-verify-checkbox" data-source-id="${source.id}" ${checked} title="Verify this source">` : ''}
      <a href="${escapeHtml(source.url)}" target="_blank" title="${escapeHtml(source.title || '')}" style="flex: 1; color: #2563eb; text-decoration: none; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
        ${escapeHtml(truncate(source.title || source.url, 30))}
      </a>
      <select onchange="updateSourcePriority(${index}, this.value)" style="padding: 2px 4px; font-size: 11px; border: 1px solid #ccc; border-radius: 3px; background: ${priorityColor}; color: white;">
        <option value="primary" ${source.priority === 'primary' ? 'selected' : ''}>Primary</option>
        <option value="secondary" ${source.priority === 'secondary' || !source.priority ? 'selected' : ''}>Secondary</option>
        <option value="tertiary" ${source.priority === 'tertiary' ? 'selected' : ''}>Tertiary</option>
      </select>
      <button class="btn btn-sm btn-danger" onclick="deleteSource(${index})" title="Delete source and all associated quotes">✕</button>
    </div>
  `;
  }).join('');
  
  // Add event listeners for source input fields
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

// Delete source and all associated quotes
function deleteSource(index) {
  const source = sources[index];
  if (!source) return;
  
  // Find all quotes from this source
  const quotesFromSource = verifiedQuotes.filter(q => 
    q.source === source.url || q.sourceUrl === source.url
  );
  
  const confirmMsg = quotesFromSource.length > 0 
    ? `Delete this source and ${quotesFromSource.length} associated quote${quotesFromSource.length > 1 ? 's' : ''}?`
    : `Delete this source?`;
  
  if (!confirm(confirmMsg)) return;
  
  // Remove the source
  sources.splice(index, 1);
  
  // Remove all quotes from this source
  if (quotesFromSource.length > 0) {
    verifiedQuotes = verifiedQuotes.filter(q => 
      q.source !== source.url && q.sourceUrl !== source.url
    );
    renderQuotes();
  }
  
  renderSources();
  syncQuotesToBackground();
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
    
    return `
    <div class="media-item" data-media-index="${index}">
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
      <input 
        type="text" 
        class="media-item-description" 
        value="${escapeHtml(m.description || '')}" 
        placeholder="Description / Alt text (what does this show?)"
        data-media-index="${index}"
        data-media-field="description"
      >
      ${m.url ? `
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
function addCurrentPageAsSource() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      const existing = sources.find(s => s.url === tabs[0].url);
      if (!existing) {
        sources.push({
          url: tabs[0].url,
          title: tabs[0].title,
          priority: 'secondary',
          addedAt: new Date().toISOString()
        });
        renderSources();
      }
    }
  });
}

// Build incident object for API
function buildIncidentObject() {
  const incidentType = currentCase.incidentType || 'death';
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
  
  // Add type-specific details
  switch (incidentType) {
    case 'death':
      incident.death_details = {
        cause_of_death: currentCase.deathCause || currentCase.causeOfDeath || '',
        cause_source: 'unknown',
        manner_of_death: currentCase.deathManner || undefined,
        custody_duration: currentCase.deathCustodyDuration || undefined,
        medical_requests_denied: currentCase.deathMedicalDenied || false
      };
      break;
      
    case 'injury':
      incident.injury_details = {
        injury_type: currentCase.injuryType || '',
        severity: currentCase.injurySeverity || undefined,
        cause: currentCase.injuryCause || '',
        weapon_used: currentCase.injuryWeapon || undefined
      };
      break;
      
    case 'arrest':
      incident.arrest_details = {
        stated_reason: currentCase.arrestReason || '',
        actual_context: currentCase.arrestContext || undefined,
        charges: currentCase.arrestCharges ? currentCase.arrestCharges.split(',').map(c => c.trim()) : [],
        timing_suspicious: currentCase.arrestTimingSuspicious || false,
        pretext_arrest: currentCase.arrestPretext || false,
        selective_enforcement: currentCase.arrestSelective || false
      };
      break;
      
    case 'rights_violation':
      incident.violation_details = {
        violation_types: currentCase.violations || [],
        journalism_related: currentCase.violationJournalism || false,
        protest_related: currentCase.violationProtest || false,
        activism_related: currentCase.violationActivism || false,
        speech_content: currentCase.violationSpeech || undefined,
        court_ruling: currentCase.violationRuling || undefined
      };
      break;
      
    case 'shooting':
      incident.shooting_details = {
        fatal: currentCase.shootingFatal || false,
        shots_fired: currentCase.shotsFired ? parseInt(currentCase.shotsFired) : undefined,
        weapon_type: currentCase.weaponType || 'unknown',
        bodycam_available: currentCase.bodycamAvailable || false,
        victim_armed: currentCase.victimArmed || false,
        warning_given: currentCase.warningGiven || false,
        context: currentCase.shootingContext || 'other'
      };
      break;
      
    case 'excessive_force':
      incident.excessive_force_details = {
        force_type: currentCase.forceTypes || [],
        victim_restrained_when_force_used: currentCase.victimRestrained || false,
        victim_complying: currentCase.victimComplying || false,
        video_evidence: currentCase.videoEvidence || false
      };
      break;
      
    case 'death_in_custody':
    case 'death_during_operation':
    case 'death_at_protest':
    case 'detention_death':
      incident.death_details = {
        cause_of_death: currentCase.deathCause || currentCase.causeOfDeath || '',
        cause_source: 'unknown',
        manner_of_death: currentCase.deathManner || undefined,
        custody_duration: currentCase.deathCustodyDuration || undefined,
        medical_requests_denied: currentCase.deathMedicalDenied || false
      };
      break;
      
    case 'protest_suppression':
      incident.protest_details = {
        protest_topic: currentCase.protestTopic || '',
        protest_size: currentCase.protestSize || undefined,
        permitted: currentCase.protestPermitted || false,
        dispersal_method: currentCase.dispersalMethod || undefined,
        arrests_made: currentCase.arrestsMade ? parseInt(currentCase.arrestsMade) : undefined
      };
      break;
  }
  
  return incident;
}

// Save case to API
async function saveCase() {
  // If in review mode, submit verification instead
  if (reviewMode && reviewIncidentId) {
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
    alert('Please enter a name for the case.');
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
    alert(message);
    return;
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
    alert('Please verify at least 2 fields or 1 media item before submitting.');
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
        // Build a reverse map: quoteId -> [fields]
        const quoteFieldMap = {};
        for (const [field, quoteId] of Object.entries(fieldQuoteAssociations)) {
          if (quoteId) {
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
      const input = getFieldInputElement(fieldName);
      if (input) {
        // Check if field is in a hidden section and make it visible
        const hiddenParent = input.closest('.hidden');
        if (hiddenParent) {
          console.log('Field is in hidden section:', fieldName, hiddenParent.id);
          hiddenParent.classList.remove('hidden');
        }
        
        input.classList.add('unverified-highlight');
        setTimeout(() => {
          input.classList.remove('unverified-highlight');
        }, 2000);
        if (index === 0) firstElement = input;
      } else if (fieldName.startsWith('quote_')) {
        const qid = fieldName.replace('quote_', '');
        const card = document.querySelector(`.quote-card[data-id="${qid}"]`);
        if (card) {
          card.classList.add('unverified-highlight');
          setTimeout(() => card.classList.remove('unverified-highlight'), 2000);
          if (index === 0) firstElement = card;
        } else {
          console.warn('Quote card not found:', qid);
        }
      } else if (fieldName.startsWith('timeline_')) {
        const tid = fieldName.replace('timeline_', '');
        const card = document.querySelector(`.timeline-card[data-timeline-id="${tid}"]`);
        if (card) {
          card.classList.add('unverified-highlight');
          setTimeout(() => card.classList.remove('unverified-highlight'), 2000);
          if (index === 0) firstElement = card;
        } else {
          console.warn('Timeline card not found:', tid);
        }
      } else {
        console.warn('Field element not found:', fieldName, 'Label:', getFieldLabel(fieldName));
      }
    });
    
    // Scroll to first unverified field
    if (firstElement) {
      firstElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => {
        if (firstElement.focus) firstElement.focus();
      }, 300);
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
    // Pre-check: require quotes for all fields with data
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
    if (missingQuoteFields.length > 0) {
      // Highlight first missing field and abort
      const first = missingQuoteFields[0];
      const input = document.getElementById(fieldMappings[first]);
      if (input) {
        input.classList.add('unverified-highlight');
        input.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => input.classList.remove('unverified-highlight'), 2000);
      }
      alert('Link quotes to all fields with data before submitting.');
      throw new Error('Missing quotes for fields: ' + missingQuoteFields.join(', '));
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
      throw new Error(error.error || 'Failed to submit verification');
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

// Create new case
function newCase() {
  // Prevent starting new case while reviewing
  if (reviewMode) {
    alert('You are currently reviewing a case. Please finish or cancel that review before starting a new incident.');
    return;
  }
  
  if (verifiedQuotes.length > 0 || currentCase.name) {
    if (!confirm('Start a new incident? Current data will be cleared.')) {
      return;
    }
  }
  
  clearCase();
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

// Helper function to format date
function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
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

// Load review queue from API (unverified cases needing first verification)
async function loadReviewQueue(status = 'all') {
  const statusEl = document.getElementById('reviewQueueStatus');
  const listEl = document.getElementById('reviewQueueList');
  
  if (!statusEl || !listEl) return;
  
  statusEl.style.display = 'block';
  statusEl.textContent = 'Loading cases...';
  listEl.style.display = 'none';
  
  try {
    const response = await fetch(`${apiUrl}/api/verification-queue?status=${status}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'X-API-Key': apiKey
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
    const response = await fetch(`${apiUrl}/api/guest-submissions?status=pending&limit=50`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'X-API-Key': apiKey
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
    const response = await fetch(`${apiUrl}/api/guest-submissions?status=pending&limit=1`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'X-API-Key': apiKey
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      guestSubmissionsCount = data.submissions?.length || 0;
      // Actually we need the full count, let's get it properly
      const fullResponse = await fetch(`${apiUrl}/api/guest-submissions?status=pending&limit=100`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'X-API-Key': apiKey
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
    
    // Card styling based on priority
    const cardClass = isHighPriority ? 'returned-cycle-3plus' : (isReturned ? 'returned-cycle-2' : '');
    
    return `
    <div class="review-case-card queue-item ${cardClass}" data-incident-id="${incident.id}" data-review-cycle="${reviewCycle}" data-status="${status}">
      ${isReturned ? `
        <div class="priority-badge ${isHighPriority ? 'priority-red' : 'priority-orange'}" style="position: absolute; top: 8px; right: 8px; font-size: 10px; padding: 2px 6px; border-radius: 4px; background: ${isHighPriority ? '#fecaca' : '#fed7aa'}; color: ${isHighPriority ? '#b91c1c' : '#c2410c'}; font-weight: 600;">
          ${isHighPriority ? '⚠️ HIGH PRIORITY' : 'PRIORITY'}
        </div>
      ` : ''}
      
      <div class="queue-item-header" style="${isReturned ? 'padding-right: 100px;' : ''}">
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
        ${incident.incident_date ? ' • ' + new Date(incident.incident_date).toLocaleDateString() : ''}
      </div>
      
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
    card.addEventListener('click', () => {
      const incidentId = card.dataset.incidentId;
      const status = card.dataset.status;
      console.log('Card clicked, incident ID:', incidentId, 'status:', status);
      
      // Handle different statuses appropriately
      if (['verified', 'rejected'].includes(status)) {
        // Published/rejected cases - can only view on website
        const action = status === 'verified' ? 'view this published case' : 'view this rejected case';
        alert(`This case is ${status}. You can ${action} on the website:\n\n${apiUrl}/incidents/${incidentId}`);
        return;
      }
      
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
  });
}

// Exit review mode and return to queue
function exitReviewMode() {
  console.log('Exiting review mode');
  
  // Reset review state
  reviewMode = false;
  reviewIncidentId = null;
  
  // Clear form
  document.getElementById('caseName').value = '';
  document.getElementById('caseDod').value = '';
  document.getElementById('caseAge').value = '';
  document.getElementById('caseCountry').value = '';
  document.getElementById('caseGender').value = '';
  document.getElementById('caseImmigrationStatus').value = '';
  document.getElementById('caseFacility').value = '';
  document.getElementById('caseCity').value = '';
  document.getElementById('caseState').value = '';
  document.getElementById('caseCause').value = '';
  document.getElementById('incidentType').value = 'death';
  document.getElementById('deathCause').value = '';
  document.getElementById('deathManner').value = '';
  document.getElementById('deathCustodyDuration').value = '';
  document.getElementById('injuryType').value = '';
  document.getElementById('injurySeverity').value = '';
  document.getElementById('injuryWeapon').value = '';
  document.getElementById('injuryCause').value = '';
  document.getElementById('arrestReason').value = '';
  document.getElementById('arrestContext').value = '';
  document.getElementById('arrestCharges').value = '';
  
  // Reset verification state
  verifiedFields = {};
  verifiedQuotes = [];
  fieldQuoteAssociations = {};
  
  // Update UI
  updateReviewModeUI();
  showSection('formSection');
  
  console.log('Review mode exited, returned to form');
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
    
    // Check if this case is in a status that allows review
    const incidentData = data.incident;
    
    // Cases that have completed review (first_review is now validation, first_validation, verified) cannot be reviewed in extension
    if (['first_review', 'first_validation', 'verified', 'rejected'].includes(incidentData.verification_status)) {
      if (incidentData.verification_status === 'rejected') {
        alert('This case has been rejected and cannot be reviewed.');
      } else if (incidentData.verification_status === 'verified') {
        alert('This case has already been published.');
      } else {
        alert('This case has completed review and is now in validation.\n\nValidation can be done in the Validate tab or in the web browser at:\n' + apiUrl + '/dashboard/validate/' + incidentId);
      }
      return;
    }
    
    // Set review mode
    reviewMode = true;
    reviewIncidentId = incidentId;
    
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
    
    // Populate currentCase from incident - ensure ALL fields are mapped
    currentCase = {
      // Core identity fields
      incidentType: normalizeIncidentType(incident.incident_type),
      name: incident.subject_name || incident.victim_name || '',
      dateOfDeath: incident.incident_date ? incident.incident_date.split('T')[0] : '',
      age: incident.subject_age?.toString() || '',
      country: incident.subject_nationality || '',
      gender: incident.subject_gender || '',
      immigration_status: incident.subject_immigration_status || '',
      occupation: incident.subject_occupation || '',
      
      // Location fields - set BOTH individual fields AND combined location
      city: incident.city || '',
      state: incident.state || '',
      facility: incident.facility || '',
      location: `${incident.city || ''}, ${incident.state || ''}`.trim(),
      
      // Summary and cause
      summary: incident.summary || '',
      causeOfDeath: incident.cause_of_death || '',
      
      // Related entities
      agencies: incident.agencies_involved || [],
      violations: incident.legal_violations || [],
      tags: incident.tags || [],
      
      // Death-specific details
      deathCause: incident.cause_of_death || '',
      deathManner: incident.manner_of_death || '',
      deathCustodyDuration: incident.custody_duration || '',
      deathMedicalDenied: incident.medical_care_denied || false,
      
      // Injury-specific details
      injuryType: incident.injury_type || '',
      injurySeverity: incident.injury_severity || '',
      injuryWeapon: incident.injury_weapon || '',
      injuryCause: incident.injury_cause || '',
      
      // Arrest-specific details  
      arrestReason: incident.arrest_reason || '',
      arrestContext: incident.arrest_context || '',
      arrestCharges: incident.arrest_charges || '',
      arrestTimingSuspicious: incident.arrest_timing_suspicious || false,
      arrestPretext: incident.arrest_pretext || false,
      arrestSelective: incident.arrest_selective || false
    };
    
    // Populate verified quotes
    verifiedQuotes = quotes.map(q => ({
      id: q.id,
      text: q.quote_text || '',
      quote: q.quote_text || '',
      source: q.source_url || incidentSources.find(s => s.id === q.source_id)?.url || '',
      sourceUrl: q.source_url || incidentSources.find(s => s.id === q.source_id)?.url || '',
      sourceTitle: q.source_title || incidentSources.find(s => s.id === q.source_id)?.title || '',
      category: q.category || 'general',
      speaker: q.speaker || '',
      speakerRole: q.speaker_role || '',
      context: q.context || '',
      notes: q.analyst_notes || '',
      pageNumber: q.page_number || null,
      confidence: q.confidence || null
    }));

    // Initialize verification flags for existing quotes and timeline entries
    if (reviewMode) {
      verifiedQuotes.forEach(q => {
        const key = `quote_${q.id}`;
        if (verifiedFields[key] === undefined) verifiedFields[key] = false;
      });
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
    
    // Update the UI
    populateCaseForm();
    renderQuotes(); // Will show verification checkboxes in review mode
    renderTimeline();
    renderPendingQuotes();
    renderSources();
    renderMediaList(); // Render media with verification checkboxes
    
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
      return new Date(incident.incident_date).toLocaleDateString();
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
    refreshBtn.addEventListener('click', loadReviewQueue);
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
  const refreshBtn = document.getElementById('refreshValidateQueueBtn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', loadValidationQueue);
  }
  
  const backBtn = document.getElementById('backToValidateQueueBtn');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      document.getElementById('validateQueueView').style.display = 'block';
      document.getElementById('validateCaseView').style.display = 'none';
      validateMode = false;
      validateIncidentId = null;
      validationState = {};
      validationData = null;
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
    
    // Card styling based on priority
    const cardClass = isHighPriority ? 'returned-cycle-3plus' : (isReturned ? 'returned-cycle-2' : '');
    
    return `
    <div class="queue-item ${cardClass}" data-id="${incident.id}" data-review-cycle="${reviewCycle}">
      ${isReturned ? `
        <div class="priority-badge ${isHighPriority ? 'priority-red' : 'priority-orange'}" style="position: absolute; top: 8px; right: 8px;">
          ${isHighPriority ? '⚠️ HIGH PRIORITY' : '⚡ RE-VALIDATE'}
        </div>
      ` : ''}
      
      <div class="queue-item-header" style="${isReturned ? 'padding-right: 100px;' : ''}">
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
        ${incident.incident_date ? ' • ' + new Date(incident.incident_date).toLocaleDateString() : ''}
      </div>
      
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
      loadValidationCase(incidentId);
    });
  });
}

// Load a case for validation
async function loadValidationCase(incidentId) {
  // Prevent conflict with review mode
  if (reviewMode) {
    alert('You are currently reviewing a case. Please finish or cancel the review before validating a different case.');
    return;
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
    validationData = data;
    validateIncidentId = incidentId;
    validateMode = true;
    
    // Check if case is in correct status for validation
    const incident = data.incident;
    if (!['first_review', 'first_validation'].includes(incident.verification_status)) {
      alert(`Cannot validate case with status: ${incident.verification_status}`);
      return;
    }
    
    // Initialize validation state
    validationState = {};
    
    // Fields
    const displayFields = [
      'subject_name', 'incident_date', 'incident_type', 'city', 'state', 
      'country', 'facility', 'subject_age', 'subject_gender', 
      'subject_nationality', 'subject_immigration_status', 'summary'
    ];
    
    for (const fieldKey of displayFields) {
      const value = incident[fieldKey];
      if (value !== null && value !== undefined && value !== '') {
        validationState[`field_${fieldKey}`] = { checked: false, reason: '' };
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
    
    // Violations
    for (const violation of data.violations || []) {
      validationState[`violation_${violation.id}`] = { checked: false, reason: '' };
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
  
  // Build quote-field link map
  const quoteFieldMap = {};
  for (const link of quote_field_links || []) {
    quoteFieldMap[link.field_name] = link;
  }
  
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
    { key: 'subject_name', label: 'Subject Name' },
    { key: 'incident_date', label: 'Incident Date' },
    { key: 'incident_type', label: 'Incident Type' },
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
    const value = incident[field.key];
    if (value === null || value === undefined || value === '') continue;
    
    const key = `field_${field.key}`;
    const state = validationState[key] || { checked: false, reason: '' };
    const linkedQuote = quoteFieldMap[field.key];
    
    let displayValue = value;
    if (field.key === 'incident_type') {
      displayValue = String(value).replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    } else if (field.key === 'incident_date' && value) {
      displayValue = new Date(value).toLocaleDateString();
    }
    
    html += `
      <div class="validation-item ${state.checked ? 'validated' : ''}" data-key="${key}">
        <div class="validation-item-header">
          <input type="checkbox" class="validation-checkbox" data-key="${key}" ${state.checked ? 'checked' : ''}>
          <div class="validation-content">
            <div class="validation-label">${field.label}</div>
            <div class="validation-value">${escapeHtml(String(displayValue))}</div>
            ${linkedQuote ? `
              <div class="validation-quote">"${escapeHtml(linkedQuote.quote_text)}"</div>
              <div class="validation-source">Source: ${escapeHtml(linkedQuote.source_title || linkedQuote.source_url || 'Unknown')}</div>
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
              <div class="validation-label">${entry.event_date ? new Date(entry.event_date).toLocaleDateString() : 'No date'}</div>
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
      
      html += `
        <div class="validation-item ${state.checked ? 'validated' : ''}" data-key="${key}">
          <div class="validation-item-header">
            <input type="checkbox" class="validation-checkbox" data-key="${key}" ${state.checked ? 'checked' : ''}>
            <div class="validation-content">
              <div class="validation-label">${escapeHtml(typeLabel)}</div>
              <div style="font-size: 12px; color: #6b7280; margin-bottom: 4px;">Classification: ${escapeHtml(classLabel)}</div>
              ${violation.description ? `<div class="validation-value">${escapeHtml(violation.description)}</div>` : ''}
              ${violation.constitutional_basis ? `<div class="validation-source" style="font-size: 11px; margin-top: 4px;">Case Law: ${escapeHtml(violation.constitutional_basis)}</div>` : ''}
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
