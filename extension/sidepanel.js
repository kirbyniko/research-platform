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
  // Death-specific
  deathCause: '',
  deathManner: '',
  deathCustodyDuration: '',
  deathMedicalDenied: false,
  // Injury-specific
  injuryType: '',
  injurySeverity: 'moderate',
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
let isConnected = false;
let apiUrl = 'https://ice-deaths.vercel.app';
let apiKey = '';
let currentSelectors = {};
let isExtracting = false;
let currentPageIsPdf = false;
let userRole = null;  // For analyst workflow
let reviewQueue = [];  // Cases awaiting review
let reviewMode = false;  // Are we reviewing an existing incident?
let reviewIncidentId = null;  // ID of incident being reviewed

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
  elements.caseOccupation = document.getElementById('caseOccupation');
  elements.caseFacility = document.getElementById('caseFacility');
  elements.caseLocation = document.getElementById('caseLocation');
  elements.caseCause = document.getElementById('caseCause');
  elements.caseImageUrl = document.getElementById('caseImageUrl');
  elements.caseImagePreview = document.getElementById('caseImagePreview');
  elements.imagePreviewContainer = document.getElementById('imagePreviewContainer');
  elements.removeImageBtn = document.getElementById('removeImageBtn');
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
  elements.pendingList = document.getElementById('pendingList');
  elements.pendingCount = document.getElementById('pendingCount');
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
  // Settings elements
  elements.apiKey = document.getElementById('apiKey');
  elements.testConnectionBtn = document.getElementById('testConnectionBtn');
  elements.exportJsonBtn = document.getElementById('exportJsonBtn');
  elements.exportMdBtn = document.getElementById('exportMdBtn');
  elements.copyAllQuotesBtn = document.getElementById('copyAllQuotesBtn');
  elements.caseSearchInput = document.getElementById('caseSearchInput');
  elements.caseSearchResults = document.getElementById('caseSearchResults');
  elements.clearAllDataBtn = document.getElementById('clearAllDataBtn');
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
  // Protest detail fields
  elements.protestTopic = document.getElementById('protestTopic');
  elements.protestSize = document.getElementById('protestSize');
  elements.protestPermitted = document.getElementById('protestPermitted');
  elements.dispersalMethod = document.getElementById('dispersalMethod');
  elements.arrestsMade = document.getElementById('arrestsMade');
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
  ['caseName', 'caseDod', 'caseAge', 'caseCountry', 'caseOccupation', 'caseFacility', 'caseLocation', 'caseCause'].forEach(id => {
    if (elements[id]) {
      elements[id].addEventListener('input', () => {
        updateCaseFromForm();
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
    }
  });
  if (elements.deathMedicalDenied) {
    elements.deathMedicalDenied.addEventListener('change', updateCaseFromForm);
  }
  
  // Injury-specific fields
  ['injuryType', 'injurySeverity', 'injuryWeapon', 'injuryCause'].forEach(id => {
    if (elements[id]) {
      elements[id].addEventListener('input', updateCaseFromForm);
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
  
  // Violation select dropdowns (three-tier system)
  document.querySelectorAll('.violation-select').forEach(select => {
    select.addEventListener('change', (e) => {
      updateViolationSelectStyle(e.target);
      updateViolationBasisVisibility();
      updateCaseFromForm();
    });
  });
  
  // Violation basis save button
  const saveViolationBasisBtn = document.getElementById('saveViolationBasis');
  if (saveViolationBasisBtn) {
    saveViolationBasisBtn.addEventListener('click', saveViolationBasis);
  }
  
  // Violation basis type dropdown - populate case law when changed
  const violationBasisType = document.getElementById('violationBasisType');
  if (violationBasisType) {
    violationBasisType.addEventListener('change', populateCaseLawDropdown);
  }
  
  // Case law dropdown - show custom input when "custom" selected
  const caseLawSelect = document.getElementById('violationCaseLawSelect');
  if (caseLawSelect) {
    caseLawSelect.addEventListener('change', handleCaseLawSelection);
  }
  
  // View selected case law button
  const viewCaseLawBtn = document.getElementById('viewSelectedCaseLaw');
  console.log('View case law button found:', !!viewCaseLawBtn);
  if (viewCaseLawBtn) {
    viewCaseLawBtn.addEventListener('click', () => {
      console.log('View button clicked');
      viewSelectedCaseLaw();
    });
  }
  
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
  
  // New case button
  elements.newCaseBtn.addEventListener('click', newCase);
  
  // Clear case button
  elements.clearCaseBtn.addEventListener('click', clearCase);
  
  // Add source button
  elements.addSourceBtn.addEventListener('click', addCurrentPageAsSource);
  
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
  elements.exportJsonBtn.addEventListener('click', exportAsJson);
  elements.exportMdBtn.addEventListener('click', exportAsMarkdown);
  elements.copyAllQuotesBtn.addEventListener('click', copyAllQuotes);
  elements.caseSearchInput.addEventListener('input', debounce(searchCases, 300));
  elements.clearAllDataBtn.addEventListener('click', clearAllData);
  
  // Event delegation for quote actions (avoids inline handlers blocked by CSP)
  document.addEventListener('click', (e) => {
    const action = e.target.dataset.action;
    if (!action) return;
    
    const id = e.target.dataset.id;
    const isVerified = e.target.dataset.verified === 'true';
    const page = e.target.dataset.page;
    
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
        const isAnalyst = userRole === 'analyst' || userRole === 'admin';
        reviewTab.style.display = isAnalyst ? '' : 'none';
        
        // If analyst, load review queue
        if (isAnalyst) {
          loadReviewQueue();
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
    userStatusEl.textContent = '👤 Guest';
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
  elements.caseLocation.value = currentCase.location || '';
  elements.caseCause.value = currentCase.causeOfDeath || '';
  
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
  
  // Populate occupation
  if (elements.caseOccupation) {
    elements.caseOccupation.value = currentCase.occupation || '';
  }
  
  // Populate incident type
  if (elements.incidentType) {
    elements.incidentType.value = currentCase.incidentType || 'death';
    handleIncidentTypeChange();
  }
  
  // Populate agencies
  document.querySelectorAll('[id^="agency-"]').forEach(checkbox => {
    const agency = checkbox.value;
    checkbox.checked = currentCase.agencies && currentCase.agencies.includes(agency);
  });
  
  // Populate violations (new three-tier system)
  document.querySelectorAll('.violation-select').forEach(select => {
    const violation = select.dataset.violation;
    let classification = '';
    
    // Check each tier
    if (currentCase.violations_alleged && currentCase.violations_alleged.includes(violation)) {
      classification = 'alleged';
    } else if (currentCase.violations_potential && currentCase.violations_potential.includes(violation)) {
      classification = 'potential';
    } else if (currentCase.violations_possible && currentCase.violations_possible.includes(violation)) {
      classification = 'possible';
    } else if (currentCase.violations && currentCase.violations.includes(violation)) {
      // Legacy support - treat as alleged
      classification = 'alleged';
    }
    
    select.value = classification;
    updateViolationSelectStyle(select);
  });
  
  // Show/hide violation basis section
  updateViolationBasisVisibility();
  
  // Populate type-specific fields
  if (elements.deathCause) elements.deathCause.value = currentCase.deathCause || '';
  if (elements.deathManner) elements.deathManner.value = currentCase.deathManner || '';
  if (elements.deathCustodyDuration) elements.deathCustodyDuration.value = currentCase.deathCustodyDuration || '';
  if (elements.deathMedicalDenied) elements.deathMedicalDenied.checked = currentCase.deathMedicalDenied || false;
  
  if (elements.injuryType) elements.injuryType.value = currentCase.injuryType || '';
  if (elements.injurySeverity) elements.injurySeverity.value = currentCase.injurySeverity || 'moderate';
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
}

// ============================================
// VIOLATION CLASSIFICATION (THREE-TIER SYSTEM)
// ============================================

// Update violation select dropdown styling based on value
function updateViolationSelectStyle(select) {
  select.classList.remove('has-value-alleged', 'has-value-potential', 'has-value-possible');
  const violationItem = select.closest('.violation-item');
  
  if (select.value) {
    select.classList.add(`has-value-${select.value}`);
    if (violationItem) violationItem.classList.add('has-violation');
  } else {
    if (violationItem) violationItem.classList.remove('has-violation');
  }
}

// Show/hide violation basis section based on whether potential/possible is selected
function updateViolationBasisVisibility() {
  const basisSection = document.getElementById('violationBasisSection');
  if (!basisSection) return;
  
  let hasPotentialOrPossible = false;
  document.querySelectorAll('.violation-select').forEach(select => {
    if (select.value === 'potential' || select.value === 'possible') {
      hasPotentialOrPossible = true;
    }
  });
  
  basisSection.classList.toggle('hidden', !hasPotentialOrPossible);
  
  // Update the violation type dropdown to only show selected violations
  if (hasPotentialOrPossible) {
    populateViolationTypeDropdown();
  }
}

// Populate the violation type dropdown with only selected potential/possible violations
function populateViolationTypeDropdown() {
  const violationBasisType = document.getElementById('violationBasisType');
  if (!violationBasisType) return;
  
  const currentValue = violationBasisType.value;
  
  // Clear and rebuild
  violationBasisType.innerHTML = '<option value="">Select violation...</option>';
  
  // Map of violation data-violation values to display names and LEGAL_REFERENCES keys
  const violationMap = {
    'first_amendment': { display: '1st Amendment (Speech/Assembly)', refKey: 'first_amendment' },
    'fourth_amendment': { display: '4th Amendment (Search & Seizure)', refKey: 'fourth_amendment' },
    'fifth_amendment': { display: '5th Amendment (Due Process)', refKey: 'fifth_amendment' },
    'sixth_amendment': { display: '6th Amendment (Right to Counsel)', refKey: 'sixth_amendment' },
    'eighth_amendment': { display: '8th Amendment (Cruel & Unusual)', refKey: 'eighth_amendment' },
    '14th_amendment': { display: '14th Amendment (Equal Protection)', refKey: 'fourteenth_amendment' },
    'civil_rights': { display: 'Civil Rights (§ 1983/Bivens)', refKey: 'civil_rights' },
    'excessive_force': { display: 'Excessive Force', refKey: 'excessive_force' },
    'wrongful_death': { display: 'Wrongful Death', refKey: 'wrongful_death' },
    'asylum_violation': { display: 'Asylum Violation', refKey: 'asylum_violation' }
  };
  
  // Find which violations are set to potential or possible
  document.querySelectorAll('.violation-select').forEach(select => {
    if (select.value === 'potential' || select.value === 'possible') {
      const violationType = select.dataset.violation;
      const mapping = violationMap[violationType];
      
      if (mapping) {
        const option = document.createElement('option');
        option.value = mapping.refKey;
        option.textContent = `${mapping.display} [${select.value}]`;
        violationBasisType.appendChild(option);
      }
    }
  });
  
  // Try to restore previous selection if still valid
  if (currentValue) {
    const options = Array.from(violationBasisType.options);
    const stillValid = options.some(opt => opt.value === currentValue);
    if (stillValid) {
      violationBasisType.value = currentValue;
    } else {
      // Reset case law dropdown too
      populateCaseLawDropdown();
    }
  }
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
  
  // Hide all type-specific sections
  [elements.deathFields, elements.injuryFields, elements.arrestFields, elements.violationFields,
   elements.shootingSection, elements.excessiveForceSection, elements.protestSection].forEach(el => {
    if (el) el.classList.add('hidden');
  });
  
  // Show violations section for relevant types
  if (elements.violationsSection) {
    const showViolations = ['rights_violation', 'arrest', 'shooting', 'excessive_force', 
                            'death_in_custody', 'death_during_operation', 'death_at_protest',
                            'protest_suppression', 'retaliation'].includes(type);
    elements.violationsSection.classList.toggle('hidden', !showViolations);
  }
  
  // Show type-specific section
  switch (type) {
    case 'death':
    case 'death_in_custody':
    case 'death_during_operation':
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
  
  // Collect violations
  // Collect violations by classification (three-tier system)
  const violations_alleged = [];
  const violations_potential = [];
  const violations_possible = [];
  
  document.querySelectorAll('.violation-select').forEach(select => {
    const violation = select.dataset.violation;
    const classification = select.value;
    
    if (classification === 'alleged') {
      violations_alleged.push(violation);
    } else if (classification === 'potential') {
      violations_potential.push(violation);
    } else if (classification === 'possible') {
      violations_possible.push(violation);
    }
  });
  
  // Legacy violations array (for backwards compatibility, combine all)
  const violations = [...violations_alleged, ...violations_potential, ...violations_possible];
  
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
    occupation: elements.caseOccupation ? elements.caseOccupation.value : '',
    facility: elements.caseFacility.value,
    location: elements.caseLocation.value,
    causeOfDeath: elements.caseCause.value,
    imageUrl: elements.caseImageUrl ? elements.caseImageUrl.value.trim() : '',
    agencies: agencies,
    violations: violations,
    violations_alleged: violations_alleged,
    violations_potential: violations_potential,
    violations_possible: violations_possible,
    violation_details_map: currentCase.violation_details_map || {},
    // Death-specific
    deathCause: elements.deathCause ? elements.deathCause.value : '',
    deathManner: elements.deathManner ? elements.deathManner.value : '',
    deathCustodyDuration: elements.deathCustodyDuration ? elements.deathCustodyDuration.value : '',
    deathMedicalDenied: elements.deathMedicalDenied ? elements.deathMedicalDenied.checked : false,
    // Injury-specific
    injuryType: elements.injuryType ? elements.injuryType.value : '',
    injurySeverity: elements.injurySeverity ? elements.injurySeverity.value : 'moderate',
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
    <div class="quote-picker-item ${currentValue === quote.id ? 'selected' : ''} ${!quote.isVerified ? 'unverified' : ''}" data-id="${quote.id}" data-field="${field}">
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
  const preview = trigger.querySelector('.selected-quote-preview');
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
      
      const quoteId = item.dataset.id;
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
  'caseOccupation': 'occupation',
  'caseFacility': 'facility',
  'caseLocation': 'location'
};

// Get the value from a form field for a quote picker field name
function getFieldValueForQuotePicker(pickerField) {
  const reverseMap = {
    'name': 'caseName',
    'date': 'caseDod',
    'age': 'caseAge',
    'nationality': 'caseCountry',
    'occupation': 'caseOccupation',
    'facility': 'caseFacility',
    'location': 'caseLocation',
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
  
  // Use for legal basis button
  html += `
    <div class="legal-ref-section">
      <h4>Use in This Case</h4>
      <p style="font-size: 11px; color: #6b7280; margin-bottom: 8px;">
        Click below to automatically fill the Legal Framework field with this violation's primary case law.
      </p>
      <button class="btn btn-sm" style="background: #3b82f6; color: white;" onclick="useLegalFramework('${violationType}')">
        Use as Legal Framework
      </button>
    </div>
  `;
  
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
    
    if (quoteId) {
      // Check in both verified and pending quotes
      let quote = verifiedQuotes.find(q => q.id === quoteId);
      let isVerified = true;
      
      if (!quote) {
        quote = pendingQuotes.find(q => q.id === quoteId);
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

// Render verified quotes list
function renderQuotes() {
  elements.quoteCount.textContent = verifiedQuotes.length;
  
  if (verifiedQuotes.length === 0) {
    elements.quoteList.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon"></div>
        <p>No verified quotes yet</p>
        <p style="font-size: 11px; margin-top: 4px;">
          Go to Extract tab to pull quotes from the page
        </p>
      </div>
    `;
    return;
  }
  
  elements.quoteList.innerHTML = verifiedQuotes.map(quote => `
    <div class="quote-card verified" data-id="${quote.id}">
      <div class="quote-text ${quote.text.length > 200 ? 'truncated' : ''}">"${escapeHtml(quote.text)}"</div>
      <div class="quote-meta">
        <span class="quote-category ${quote.category}">${quote.category}</span>
        ${quote.pageNumber ? `<span class="quote-page" data-action="goToPage" data-page="${quote.pageNumber}" title="Go to page">Page ${quote.pageNumber}</span>` : ''}
      </div>
      ${quote.sourceUrl ? `<div class="quote-source"><a href="${escapeHtml(quote.sourceUrl)}" target="_blank" class="source-link" title="${escapeHtml(quote.sourceUrl)}">${escapeHtml(quote.sourceTitle || new URL(quote.sourceUrl).hostname)}</a></div>` : ''}
      <div class="quote-actions">
        <button class="btn btn-sm btn-icon" data-action="copy" data-id="${quote.id}" data-verified="true" title="Copy quote">Copy</button>
        ${!currentPageIsPdf ? `<button class="btn btn-sm btn-icon" data-action="find" data-id="${quote.id}" data-verified="true" title="Find & scroll to on page">Find</button>
        <button class="btn btn-sm btn-icon pin-btn" data-action="pin" data-id="${quote.id}" data-verified="true" title="Pin highlight on page">Pin</button>` : ''}
        <button class="btn btn-sm btn-danger" data-action="removeVerified" data-id="${quote.id}" title="Remove">X</button>
      </div>
    </div>
  `).join('');
  
  // Update quote association dropdowns with new quotes
  updateQuoteAssociationDropdowns();
  updateAgencyQuoteLinks();
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
    return;
  }
  
  elements.sourceList.innerHTML = sources.map((source, index) => `
    <div class="source-item" style="display: flex; align-items: center; gap: 8px; padding: 8px; border: 1px solid #e0e0e0; border-radius: 4px; margin-bottom: 4px;">
      <a href="${escapeHtml(source.url)}" target="_blank" title="${escapeHtml(source.title || '')}" style="flex: 1; color: #2563eb; text-decoration: none; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
        ${escapeHtml(truncate(source.title || source.url, 40))}
      </a>
      <button class="btn btn-sm btn-danger" onclick="deleteSource(${index})" title="Delete source and all associated quotes">✕</button>
    </div>
  `).join('');
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

// Truncate text
function truncate(text, maxLength) {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
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
        severity: currentCase.injurySeverity || 'moderate',
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
  }
  
  return incident;
}

// Save case to API
async function saveCase() {
  // If in review mode, submit verification instead
  if (reviewMode && reviewIncidentId) {
    return submitVerification();
  }
  
  if (!isConnected) {
    alert('Not connected to API. Please ensure the server is running.');
    return;
  }
  
  if (!currentCase.name && currentCase.incidentType === 'death') {
    alert('Please enter a name for the case.');
    return;
  }
  
  // Determine if this is a guest submission (no API key)
  const isGuestSubmission = !apiKey;
  
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
  
  // Warn guest users about rate limits
  if (isGuestSubmission) {
    const proceed = confirm(
      'You are submitting as a guest.\n\n' +
      '• Guest submissions are limited to 5 per hour\n' +
      '• Your submission will be marked for priority review\n' +
      '• Create an account for higher limits and to track your submissions\n\n' +
      'Continue with guest submission?'
    );
    if (!proceed) return;
  }
  
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
    
    // Then add sources and quotes if we have an ID
    if (incidentDbId && (sources.length > 0 || verifiedQuotes.length > 0)) {
      const patchData = {};
      
      if (sources.length > 0) {
        patchData.sources = sources.map(s => ({
          url: s.url,
          title: s.title,
          publication: s.publication || undefined,
          source_type: 'news_article'
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
        
        patchData.quotes = verifiedQuotes.map(q => ({
          text: q.text,
          category: q.category,
          page_number: q.pageNumber || undefined,
          confidence: q.confidence || undefined,
          verified: false,
          linked_fields: quoteFieldMap[q.id] || []
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
    if (submissionType === 'analyst') {
      alert(`Incident saved and auto-verified as first review!\nID: ${incident.incident_id}\n\nAnother analyst can now provide second verification.`);
    } else if (submissionType === 'guest') {
      alert(`Incident submitted as guest!\nID: ${incident.incident_id}\n\n${result.message}\n\nNote: ${result.rate_limit_info}`);
    } else {
      alert(`Incident saved successfully!\nID: ${incident.incident_id}\n\nAwaiting analyst review.`);
    }
  } catch (error) {
    console.error('Save error:', error);
    alert('Failed to save incident: ' + error.message);
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
      saveBtn.textContent = 'Submit Verification';
      saveBtn.style.background = '#10b981'; // Green for verification
    } else {
      saveBtn.textContent = 'Save Incident';
      saveBtn.style.background = ''; // Default blue
    }
  }
}

// Submit verification (called from save button when in review mode)
async function submitVerification() {
  if (!reviewIncidentId) {
    alert('No incident loaded for review');
    return;
  }
  
  const saveBtn = document.getElementById('saveCaseBtn');
  if (!saveBtn) return;
  
  saveBtn.disabled = true;
  saveBtn.innerHTML = '<div class="spinner white"></div> Submitting...';
  
  try {
    const incident = buildIncidentObject();
    
    // Update the incident details
    const updateResponse = await fetch(`${apiUrl}/api/incidents/${reviewIncidentId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'X-API-Key': apiKey
      },
      body: JSON.stringify(incident)
    });
    
    if (!updateResponse.ok) {
      const error = await updateResponse.json();
      throw new Error(error.error || 'Failed to update incident');
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
  if (verifiedQuotes.length > 0 || currentCase.name) {
    if (!confirm('Start a new incident? Current data will be cleared.')) {
      return;
    }
  }
  
  clearCase();
}

// Clear current case
function clearCase() {
  currentCase = {
    incidentType: 'death',
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
    deathCause: '',
    deathManner: '',
    deathCustodyDuration: '',
    deathMedicalDenied: false,
    injuryType: '',
    injurySeverity: 'moderate',
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
  fieldQuoteAssociations = {};
  chrome.storage.local.set({ fieldQuoteAssociations: {} });
  
  // Clear agency checkboxes
  document.querySelectorAll('[id^="agency-"]').forEach(checkbox => {
    checkbox.checked = false;
  });
  
  // Clear violation checkboxes
  document.querySelectorAll('[id^="violation-"]').forEach(checkbox => {
    checkbox.checked = false;
  });
  
  populateCaseForm();
  renderQuotes();
  renderPendingQuotes();
  renderSources();
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

// Load review queue from API (unverified cases needing first verification)
async function loadReviewQueue() {
  const statusEl = document.getElementById('reviewQueueStatus');
  const listEl = document.getElementById('reviewQueueList');
  
  if (!statusEl || !listEl) return;
  
  statusEl.style.display = 'block';
  statusEl.textContent = 'Loading cases...';
  listEl.style.display = 'none';
  
  try {
    const response = await fetch(`${apiUrl}/api/analyst/unverified-cases?limit=100`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'X-API-Key': apiKey
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch unverified cases');
    }
    
    const data = await response.json();
    reviewQueue = data.incidents || [];
    
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

// Render review queue list
function renderReviewQueue() {
  const listEl = document.getElementById('reviewQueueList');
  if (!listEl) return;
  
  listEl.innerHTML = reviewQueue.map(incident => `
    <div class="review-case-card" data-incident-id="${incident.id}" style="
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 8px;
      cursor: pointer;
      transition: border-color 0.2s;
    ">
      <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
        <div>
          <div style="font-weight: 600; font-size: 13px;">${escapeHtml(incident.victim_name || 'Unknown')}</div>
          <div style="font-size: 11px; color: #666;">
            ${escapeHtml(incident.incident_type?.replace(/_/g, ' ') || 'Incident')}
          </div>
        </div>
        <span style="
          padding: 2px 8px;
          background: #fee2e2;
          color: #991b1b;
          font-size: 10px;
          border-radius: 4px;
        ">Needs Verification</span>
      </div>
      
      <div style="font-size: 11px; color: #888; margin-bottom: 8px;">
        ${escapeHtml(incident.city ? incident.city + ', ' : '')}${escapeHtml(incident.state || '')}
        ${incident.incident_date ? ' • ' + new Date(incident.incident_date).toLocaleDateString() : ''}
      </div>
      
      <div style="display: flex; gap: 8px; font-size: 10px;">
        <span style="color: #22c55e;">✓ ${incident.fields_needing_review || 0} fields to review</span>
        <span style="color: #666;">${incident.fields_verified || 0} verified</span>
      </div>
      
      ${incident.first_verifier_name || incident.first_verifier_email ? `
        <div style="margin-top: 8px; font-size: 10px; color: #888;">
          1st Review: ${incident.first_verifier_name || incident.first_verifier_email}
        </div>
      ` : `
        <div style="margin-top: 8px; font-size: 10px; color: #f59e0b;">
          ⚠ Not yet reviewed
        </div>
      `}
    </div>
  `).join('');
  
  // Add click listeners
  listEl.querySelectorAll('.review-case-card').forEach(card => {
    card.addEventListener('click', () => {
      const incidentId = card.dataset.incidentId;
      console.log('Card clicked, incident ID:', incidentId);
      loadReviewCaseDetails(parseInt(incidentId));
    });
    
    card.addEventListener('mouseenter', () => {
      card.style.borderColor = '#3b82f6';
    });
    card.addEventListener('mouseleave', () => {
      card.style.borderColor = '#e0e0e0';
    });
  });
}

// Load full case details for review
async function loadReviewCaseDetails(incidentId) {
  console.log('loadReviewCaseDetails called with ID:', incidentId);
  
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
    
    // Set review mode
    reviewMode = true;
    reviewIncidentId = incidentId;
    
    const incident = data.incident;
    const quotes = data.quotes || [];
    const incidentSources = data.sources || [];
    const timeline = data.timeline || [];
    
    // Populate currentCase from incident
    currentCase = {
      incidentType: incident.incident_type || 'death_in_custody',
      name: incident.victim_name || '',
      dateOfDeath: incident.incident_date ? incident.incident_date.split('T')[0] : '',
      age: incident.subject_age?.toString() || '',
      country: incident.subject_nationality || '',
      occupation: incident.subject_occupation || '',
      facility: incident.facility || '',
      location: `${incident.city || ''}, ${incident.state || ''}`.trim(),
      causeOfDeath: incident.cause_of_death || '',
      agencies: incident.agencies_involved || [],
      violations: incident.legal_violations || [],
      deathCause: incident.cause_of_death || '',
      deathManner: incident.manner_of_death || '',
      deathCustodyDuration: incident.custody_duration || '',
      deathMedicalDenied: incident.medical_care_denied || false,
      summary: incident.summary || ''
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
    
    // Clear pending quotes in review mode
    pendingQuotes = [];
    
    // Update the UI
    populateCaseForm();
    renderQuotes();
    renderPendingQuotes();
    renderSources();
    
    // Update submit button text
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
        const canVerify = status === 'first_review' && verif?.first_verified_by !== null;
        
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
              ">${status === 'first_review' ? 'Needs 2nd' : status}</span>
            </div>
            
            <div style="font-size: 13px; color: #374151; margin-bottom: 8px; word-break: break-word;">
              ${value ? escapeHtml(value) : '<em style="color: #9ca3af;">Not provided</em>'}
            </div>
            
            ${verif?.first_verifier_name ? `
              <div style="font-size: 10px; color: #6b7280; margin-bottom: 6px;">
                1st: ${escapeHtml(verif.first_verifier_name)} 
                ${verif.first_verification_notes ? `- "${escapeHtml(verif.first_verification_notes)}"` : ''}
              </div>
            ` : ''}
            
            ${canVerify ? `
              <button onclick="verifyField(${incident.id}, '${field.key}')" style="
                width: 100%;
                padding: 6px;
                background: #2563eb;
                color: white;
                border: none;
                border-radius: 4px;
                font-size: 11px;
                cursor: pointer;
              ">Verify This Field</button>
            ` : status === 'verified' ? `
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
}

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
});
