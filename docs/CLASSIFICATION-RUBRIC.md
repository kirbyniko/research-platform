# Classification Rubric: Constitutional Violations & Editorial Standards

## Purpose

This document establishes clear, consistent criteria for classifying incidents and alleged violations in the ICE Deaths database. It ensures:
- Accuracy over advocacy
- Consistency across contributors
- Defensible editorial decisions
- Separation of documented facts from analysis

---

## Part 1: Constitutional Amendments Quick Reference

### 4th Amendment - Unreasonable Search & Seizure

**Protects against:** Unreasonable searches, seizures, and arrests without probable cause

**Applies when:**
- Warrantless raids on homes
- Stops without reasonable suspicion
- Excessive force during arrest/apprehension
- Unlawful detention without probable cause
- Property seizure without due process

**ICE context examples:**
- Home raid without warrant
- Workplace raid targeting individuals by appearance
- Vehicle stop based solely on ethnicity
- Shooting someone fleeing (seizure via deadly force)

**Key case law:** *Tennessee v. Garner* - deadly force to prevent escape is a "seizure" under 4th Amendment

---

### 5th Amendment - Due Process (Federal)

**Protects against:** Deprivation of life, liberty, or property without due process of law

**Applies when:**
- Federal actors (ICE, CBP, federal detention)
- Denial of legal process before punishment
- Coerced confessions or statements
- Self-incrimination compulsion
- Taking of property without compensation

**ICE context examples:**
- Deportation without hearing
- Detention without bond hearing
- Denial of access to attorney
- Death during federal custody without accountability
- Coerced signing of voluntary departure

---

### 8th Amendment - Cruel & Unusual Punishment

**Protects against:** Excessive bail, excessive fines, cruel and unusual punishment

**Applies when:**
- Person is in custody/detained (post-conviction OR civil detention)
- Deliberate indifference to serious medical needs
- Conditions of confinement that cause harm
- Excessive force against detained persons
- Prolonged solitary confinement

**ICE context examples:**
- Denial of medical care in detention
- Inadequate mental health treatment leading to suicide
- Unsanitary or dangerous facility conditions
- Use of force against compliant detainees
- Denial of medication for known conditions

**Important:** 8th Amendment applies to *punishment* - courts have debated whether civil immigration detention qualifies. However, the standard of "deliberate indifference" has been applied.

---

### 14th Amendment - Due Process & Equal Protection (State)

**Protects against:** State deprivation of life, liberty, property without due process; denial of equal protection

**Applies when:**
- State/local actors involved (local police, county jails, state facilities)
- Discrimination based on race, national origin, etc.
- State facilities housing ICE detainees
- Joint operations with local law enforcement

**ICE context examples:**
- Death in county jail under ICE detainer
- Local police cooperation leading to harm
- Discriminatory enforcement patterns
- State hospital denial of care to detainee

---

### Other Relevant Laws

| Law | Applies When |
|-----|--------------|
| **Immigration and Nationality Act** | Procedural violations, improper deportation |
| **Prison Rape Elimination Act (PREA)** | Sexual abuse in detention |
| **Rehabilitation Act § 504** | Disability discrimination in federal programs |
| **Religious Freedom Restoration Act** | Denial of religious practice in detention |
| **Torture Victim Protection Act** | Deportation to country where torture likely |

---

## Part 2: Classification Decision Framework

### When Multiple Amendments Could Apply

**Example:** Person shot while fleeing in a vehicle

| Amendment | Argument For | Argument Against |
|-----------|--------------|------------------|
| 4th | Seizure via deadly force; excessive force | Person was fleeing, not yet "seized" |
| 5th | Deprivation of life without due process | Imminent threat doctrine may apply |
| 8th | Cruel treatment | Not yet in custody/detained |

**Our approach:** List ALL potentially applicable amendments. Use "alleged" prefix. Let the documented facts speak.

### Decision Tree

```
1. Was the person in custody/detention at the time?
   YES → 8th Amendment likely applies
   NO → Go to step 2

2. Was deadly or excessive force used?
   YES → 4th Amendment likely applies (seizure)
   NO → Go to step 3

3. Was there a procedural violation (no hearing, no access to counsel)?
   YES → 5th Amendment (federal) or 14th (state) applies
   NO → Go to step 4

4. Were state/local actors involved?
   YES → 14th Amendment applies
   NO → 5th Amendment (federal actors)

5. Was there discrimination based on protected class?
   YES → 14th Amendment Equal Protection
```

---

## Part 3: The "Alleged" Standard

### What "Alleged" Means in Our Context

**Alleged = Claimed by a credible source but not adjudicated**

We use "alleged" when:
- A lawsuit has been filed claiming the violation
- Family members or advocates have made formal complaints
- News reporting identifies potential violations
- Pattern evidence suggests violation (e.g., repeated medical neglect at a facility)

We do NOT use "alleged" when:
- A court has ruled on the matter (then it's "found" or "ruled")
- Government has officially acknowledged the violation
- The facts themselves are undisputed (only legal characterization is at issue)

### When No One Has Explicitly Named the Violation

**Scenario:** The facts clearly match established case law (e.g., shooting someone fleeing = 4th Amendment under *Tennessee v. Garner*), but no lawsuit has been filed and no organization has called it out.

**Our approach: Use "potential" instead of "alleged"**

| Situation | Classification | Language |
|-----------|----------------|----------|
| Lawsuit filed naming 4th Amendment | `violations_alleged` | "Family alleges 4th Amendment violation" |
| No lawsuit, but facts match case law | `violations_potential` | "Circumstances consistent with 4th Amendment violation per *Tennessee v. Garner*" |
| Disputed facts, unclear if violation | `violations_possible` | "If [fact] is accurate, may constitute..." |

**Implementation in JSON:**

```json
{
  "violations_alleged": [],
  "violations_potential": ["4th_amendment"],
  "violations_potential_basis": {
    "4th_amendment": {
      "legal_framework": "Tennessee v. Garner (1985)",
      "relevant_facts": ["Subject was shot while fleeing", "No weapon was present", "Subject posed no threat to others"],
      "note": "No formal allegation filed as of [date]"
    }
  }
}
```

**Key distinction:**
- **Alleged** = Someone else said it
- **Potential** = The legal framework says it, based on documented facts
- **Possible** = Facts are disputed, but if true would constitute violation

### Why This Is Defensible

We are NOT making a novel legal argument. We are:
1. Documenting facts from sources
2. Citing established Supreme Court precedent
3. Noting the logical application

This is what any law student, journalist, or legal analyst would do. We're not claiming expertise - we're citing the expertise of the courts.

**Example language:**

> "Under the Supreme Court's ruling in *Tennessee v. Garner* (1985), the use of deadly force to prevent the escape of a fleeing suspect constitutes a 'seizure' under the Fourth Amendment and is unconstitutional unless the suspect poses an immediate threat of serious physical harm to officers or others. The documented circumstances of this incident—[specific facts]—appear consistent with this framework. No formal legal complaint has been filed as of [date]."

### What We Must Include

When classifying a potential (not alleged) violation:

1. **The specific case law or legal standard** - Not just "4th Amendment" but WHY
2. **The specific facts that match** - What documented facts lead to this classification
3. **Acknowledgment that no formal allegation exists** - Transparency about our role
4. **Date of our assessment** - So it can be updated if allegations are later filed

### Who Gets to "Allege"?

| Source | Weight | How We Document |
|--------|--------|-----------------|
| Federal lawsuit filed | High | "Alleged in [Case Name], [Court]" |
| State lawsuit filed | High | "Alleged in [Case Name], [Court]" |
| ACLU/Human Rights Watch report | Medium-High | "Alleged by [Organization], [Date]" |
| News investigation | Medium | "Reported by [Publication], [Date]" |
| Family statement | Medium | "Family alleges..." |
| Advocacy group claim | Lower | "According to [Group]..." |
| Social media only | Not used | Do not include without corroboration |

### We Do NOT Decide - We Document

**Wrong approach:** "This was clearly an 8th Amendment violation"

**Correct approach:** "Family lawsuit alleges 8th Amendment violation; ICE statement claims..."

---

## Part 4: Handling Disputed Cases

### When Officials Say "Justified" But Public Sentiment Disagrees

**Document both. Editorialize neither.**

#### Template for Disputed Cases:

```json
{
  "official_position": {
    "agency": "ICE",
    "statement": "Exact quote from official statement",
    "date": "2025-01-15",
    "source_url": "https://..."
  },
  "counterarguments": [
    {
      "source": "ACLU",
      "claim": "Exact quote from counterargument",
      "date": "2025-01-16",
      "source_url": "https://..."
    }
  ],
  "legal_status": {
    "lawsuit_filed": true,
    "case_number": "1:25-cv-12345",
    "current_status": "pending"
  }
}
```

### Red Flags for "Justified" Claims

Document these WITHOUT editorializing:
- Timeline inconsistencies
- Contradictory witness accounts
- Body camera footage contradictions
- Pattern of similar incidents at same facility/by same agents
- Medical examiner findings that differ from official account

---

## Part 5: Specific Scenario Guidance

### Scenario: Shot While Fleeing (Your Example)

**Facts:** Person was supposed to be detained. Shot while driving away.

**Classification approach:**

1. **4th Amendment - YES, alleged**
   - *Tennessee v. Garner* (1985): Deadly force to prevent escape is unconstitutional unless suspect poses immediate threat of death/serious injury to others
   - Fleeing alone does not justify deadly force
   - This is the PRIMARY applicable amendment

2. **5th Amendment - Possibly alleged**
   - Deprivation of life without due process
   - Applicable if federal agents involved

3. **8th Amendment - NO**
   - Person was not yet in custody
   - 8th Amendment requires custodial status

**How to document:**
```json
{
  "violations_alleged": ["4th_amendment", "5th_amendment"],
  "violations_source": "Family lawsuit filed 2025-XX-XX",
  "official_position": "ICE claims subject posed threat to agents",
  "disputed": true
}
```

---

### Scenario: Medical Neglect Death in Detention

**Classification approach:**

1. **8th Amendment - YES, alleged**
   - Deliberate indifference to serious medical needs
   - *Estelle v. Gamble* standard applies

2. **5th Amendment - YES, alleged (if federal facility)**
   - Due process violation

3. **14th Amendment - YES, alleged (if state/county facility)**
   - Due process violation by state actors

---

### Scenario: Suicide in Detention

**Classification approach:**

1. **8th Amendment - Possibly alleged**
   - Did facility know of suicide risk?
   - Were precautions taken?
   - Deliberate indifference standard

2. **5th/14th Amendment - Possibly alleged**
   - Failure to protect from known harm

**Caution:** Suicide cases require careful documentation. Focus on:
- Prior mental health history known to facility
- Requests for mental health care
- Facility's suicide prevention protocols
- Similar incidents at same facility

---

## Part 6: Quality Control Checklist

Before adding any violation to a case:

- [ ] Is there a documented source for this allegation?
- [ ] Is the source type recorded (lawsuit, news report, advocacy report)?
- [ ] Have we included the official response if available?
- [ ] Is the amendment classification legally defensible?
- [ ] Have we avoided editorializing language?
- [ ] If disputed, are both positions documented?
- [ ] Is there a quote directly supporting this classification?

---

## Part 7: Amendment Cheat Sheet

Print this for quick reference:

| Situation | Primary Amendment | Secondary |
|-----------|-------------------|-----------|
| Shot during arrest/apprehension | 4th | 5th |
| Shot while fleeing | 4th | 5th |
| Death in federal detention (medical) | 8th | 5th |
| Death in county jail (medical) | 8th | 14th |
| Suicide in detention | 8th | 5th/14th |
| Deportation without hearing | 5th | INA |
| Excessive force on detainee | 8th | 5th/14th |
| Raid without warrant | 4th | - |
| Discrimination in enforcement | 14th | 5th |
| Denial of attorney access | 5th/6th | 14th |

---

## Part 8: What We Don't Do

1. **We don't determine guilt** - We document allegations and official responses
2. **We don't assign intent** - "Deliberate indifference" is a legal finding, not our assessment
3. **We don't use emotional language** - "Murder" vs "death," "torture" vs "alleged mistreatment"
4. **We don't ignore official positions** - Even if we disagree, we document them verbatim
5. **We don't extrapolate** - One incident doesn't prove a pattern; patterns must be documented individually

---

## Revision History

| Date | Change | Author |
|------|--------|--------|
| 2026-01-08 | Initial rubric created | - |

---

## Questions?

If you encounter a scenario not covered here:
1. Document what you know with sources
2. Flag the case for review
3. Add "classification_uncertain": true to the JSON
4. Note the specific question in the case notes
