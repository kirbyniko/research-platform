// Legal references for constitutional violations
// Matches the extension's LEGAL_REFERENCES structure

export interface LegalCase {
  name: string;
  citation: string;
  sourceUrl: string;
  holding: string;
}

export interface LegalReference {
  name: string;
  text: string;
  textSource: string | null;
  cases: LegalCase[];
  applicationNotes?: string;
}

export const LEGAL_REFERENCES: Record<string, LegalReference> = {
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
    applicationNotes: "Consider when: arrests target journalists, protesters, or activists; retaliation for criticism; suppression of peaceful assembly."
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
    applicationNotes: "Consider when: arrests without probable cause; excessive force during arrests; warrantless searches; prolonged detention."
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
    applicationNotes: "Consider when: prolonged detention without hearing; deportation without adequate process; denial of opportunity to contest charges."
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
    applicationNotes: "Consider when: denial of legal representation; inadequate legal counsel; lack of interpreter services."
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
    applicationNotes: "Consider when: denial of medical care in detention; inhumane conditions; excessive force against detainees."
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
    applicationNotes: "Consider when: discrimination based on nationality; selective enforcement; denial of equal legal protections."
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
    applicationNotes: "Consider when: any constitutional violation by government officials; basis for § 1983 or Bivens lawsuits."
  },
  excessive_force: {
    name: "Excessive Force Standards",
    text: "[Derived from 4th/8th/14th Amendment case law]",
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
    applicationNotes: "Consider when: force used beyond what is necessary; force against compliant individuals; use of deadly force when not justified."
  },
  wrongful_death: {
    name: "Wrongful Death",
    text: "[Derived from state tort law and federal civil rights statutes]",
    textSource: null,
    cases: [
      {
        name: "County of Sacramento v. Lewis (1998)",
        citation: "523 U.S. 833",
        sourceUrl: "https://www.law.cornell.edu/supremecourt/text/523/833",
        holding: "Conduct intended to injure in some way unjustifiable by any government interest is the sort of official action most likely to rise to the conscience-shocking level."
      },
      {
        name: "Daniels v. Williams (1986)",
        citation: "474 U.S. 327",
        sourceUrl: "https://www.law.cornell.edu/supremecourt/text/474/327",
        holding: "The Due Process Clause is simply not implicated by a negligent act of an official causing unintended loss of or injury to life, liberty, or property."
      }
    ],
    applicationNotes: "Consider when: death results from government action; deliberate indifference to known risks; failure to provide necessary care."
  },
  medical_neglect: {
    name: "Medical Neglect",
    text: "[Derived from 8th/14th Amendment case law on deliberate indifference]",
    textSource: null,
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
        name: "Gordon v. Cty. of Orange (9th Cir. 2018)",
        citation: "888 F.3d 1118",
        sourceUrl: "https://casetext.com/case/gordon-v-cty-of-orange-1",
        holding: "Jail officials cannot simply ignore an inmate's serious medical needs or delay treatment for non-medical reasons."
      }
    ],
    applicationNotes: "Consider when: known medical conditions ignored; requests for care denied; inadequate medical staffing; death from preventable causes."
  }
};

// Mapping from violation types used in the UI to LEGAL_REFERENCES keys
export const VIOLATION_TO_LEGAL_KEY: Record<string, string> = {
  '1st': 'first_amendment',
  '1st_amendment': 'first_amendment',
  '4th': 'fourth_amendment', 
  '4th_amendment': 'fourth_amendment',
  '5th': 'fifth_amendment',
  '5th_amendment': 'fifth_amendment',
  '6th': 'sixth_amendment',
  '6th_amendment': 'sixth_amendment',
  '8th': 'eighth_amendment',
  '8th_amendment': 'eighth_amendment',
  '14th': 'fourteenth_amendment',
  '14th_amendment': 'fourteenth_amendment',
  'civil_rights': 'civil_rights',
  'civil_rights_violation': 'civil_rights',
  'excessive_force': 'excessive_force',
  'wrongful_death': 'wrongful_death',
  'medical_neglect': 'medical_neglect',
  'false_imprisonment': 'civil_rights'
};

// Alias for backward compatibility
export const VIOLATION_TYPE_TO_LEGAL_REF = VIOLATION_TO_LEGAL_KEY;

// Classification options for violations
export const VIOLATION_CLASSIFICATIONS = [
  { value: 'alleged', label: 'Alleged' },
  { value: 'potential', label: 'Potential' },
  { value: 'possible', label: 'Possible' },
  { value: 'confirmed', label: 'Confirmed' }
];

// Get case law options for a violation type (for dropdowns)
export function getCaseLawOptions(violationType: string): { value: string; label: string; citation: string }[] {
  const refKey = VIOLATION_TO_LEGAL_KEY[violationType];
  if (!refKey || !LEGAL_REFERENCES[refKey]) {
    return [];
  }
  
  return LEGAL_REFERENCES[refKey].cases.map(c => ({
    value: `${c.name} (${c.citation})`,
    label: c.name,
    citation: c.citation
  }));
}

// Get the full legal reference for a violation type
export function getLegalReference(violationType: string): LegalReference | null {
  const refKey = VIOLATION_TO_LEGAL_KEY[violationType];
  if (!refKey || !LEGAL_REFERENCES[refKey]) {
    return null;
  }
  return LEGAL_REFERENCES[refKey];
}

// Get relevant case law for a violation type
export function getCaseLawForViolation(violationType: string): LegalCase[] {
  const legalKey = VIOLATION_TO_LEGAL_KEY[violationType] || violationType;
  const ref = LEGAL_REFERENCES[legalKey];
  if (!ref) return [];
  
  const cases = [...ref.cases];
  
  // Add cross-referenced cases
  const crossRefMap: Record<string, string[]> = {
    'fourth_amendment': ['excessive_force'],
    'excessive_force': ['fourth_amendment', 'eighth_amendment'],
    'eighth_amendment': ['fourteenth_amendment'],
    'wrongful_death': ['fourth_amendment', 'eighth_amendment', 'excessive_force'],
    'fourteenth_amendment': ['fifth_amendment'],
    'civil_rights': ['fourth_amendment', 'eighth_amendment'],
    'medical_neglect': ['eighth_amendment']
  };
  
  const relatedTypes = crossRefMap[legalKey] || [];
  relatedTypes.forEach(relType => {
    const relRef = LEGAL_REFERENCES[relType];
    if (relRef) {
      relRef.cases.forEach(c => {
        if (!cases.some(existing => existing.name === c.name)) {
          cases.push(c);
        }
      });
    }
  });
  
  return cases;
}
