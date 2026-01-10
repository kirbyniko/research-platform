# Habeas Corpus Request Helper - Implementation Plan

## Overview
A public-facing tool to help families and advocates prepare habeas corpus petitions for individuals in ICE detention.

## Core Features

### 1. Educational Section
- **What is Habeas Corpus?**
  - Plain language explanation
  - When it applies
  - What it can/cannot do
  - Success rates and timelines

- **Requirements Checklist**
  - Standing (who can file)
  - Jurisdiction requirements
  - Exhaustion of administrative remedies
  - Statute of limitations

### 2. Information Gathering Form
**Petitioner Information:**
- Name, relationship to detainee
- Contact information
- Attorney representation status

**Detainee Information:**
- Full legal name, A-number
- Current detention facility
- Date of detention
- Immigration status
- Prior deportation orders
- Criminal history (if any)

**Detention Details:**
- Length of detention
- Bond hearing status
- Previous habeas filings
- Administrative appeals status

**Legal Grounds:**
- Prolonged detention without bond hearing
- Constitutional violations (4th, 5th, 8th, 14th amendments)
- Statutory violations (INA sections)
- Due process violations
- Medical neglect/conditions

### 3. Document Generation
**Petition Template Sections:**
1. Caption and case information
2. Jurisdiction and venue
3. Parties
4. Facts (auto-populated from form)
5. Legal claims
   - Prolonged detention claim (Rodriguez/Jennings)
   - Due process claim (Zadvydas)
   - Conditions of confinement (8th Amendment)
   - Administrative Procedure Act claims
6. Prayer for relief
7. Verification/declaration
8. Exhibits list

**Supporting Documents:**
- Declaration template
- Exhibit cover sheet
- Filing instructions by district

### 4. Legal Reference Database
**Case Law Library:**
- Rodriguez v. Robbins (bond hearings)
- Jennings v. Rodriguez (prolonged detention)
- Zadvydas v. Davis (indefinite detention)
- Demore v. Kim (mandatory detention)
- Recent circuit court decisions
- District court decisions by jurisdiction

**Statutory References:**
- INA § 236(a) - Discretionary detention
- INA § 236(c) - Mandatory detention  
- INA § 241(a) - Post-removal detention
- 8 CFR regulations
- IIRIRA provisions

**Constitutional Arguments:**
- 4th Amendment - Unreasonable seizure
- 5th Amendment - Due process
- 8th Amendment - Cruel and unusual punishment
- 14th Amendment - Equal protection

### 5. Filing Instructions
**By District:**
- Court addresses and clerk info
- Local rules and requirements
- E-filing procedures
- Filing fees and fee waiver forms
- Service requirements
- Response deadlines

**Post-Filing:**
- Expected timeline
- What to expect at hearing
- How to find pro bono counsel
- Emergency TRO procedures

## Technical Implementation

### Page Structure
```
/legal-help
  /habeas-corpus-guide       # Educational overview
  /habeas-corpus-form        # Form wizard
  /habeas-corpus-preview     # Review & download
  /case-law-database         # Searchable cases
  /district-info             # Court-specific info
```

### Database Schema
```sql
-- Store incomplete forms for return visits
CREATE TABLE habeas_form_drafts (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(255),
  form_data JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Track which resources are most used
CREATE TABLE habeas_resource_views (
  id SERIAL PRIMARY KEY,
  resource_type VARCHAR(50),
  resource_id VARCHAR(255),
  viewed_at TIMESTAMP DEFAULT NOW()
);
```

### Security & Privacy
- **No PII storage** - Forms generated client-side only
- Session-based draft saving (optional, encrypted)
- No logging of detainee names or A-numbers
- HTTPS required
- Privacy policy prominently displayed

### User Flow
1. **Landing page** - Overview, disclaimers, when to use
2. **Eligibility quiz** - Quick assessment
3. **Form wizard** - Step-by-step (5-7 pages)
4. **Legal grounds selector** - Checkboxes with explanations
5. **Case law suggester** - Auto-suggest based on facts
6. **Document preview** - Editable PDF
7. **Download package** - Petition + supporting docs + instructions

## Content Requirements

### Disclaimers
- Not legal advice
- Strongly recommend attorney
- Links to pro bono resources
- Limitations of self-representation

### Pro Bono Resources
- ACLU
- National Immigration Law Center
- Immigration Advocates Network
- Local legal aid societies
- Law school clinics
- Pro bono panels by circuit

### Language Support
- Spanish translation (priority)
- Haitian Creole
- Simplified Chinese
- Vietnamese
- Arabic

## Metrics to Track
- Form completion rate
- Download counts
- Most common legal grounds selected
- District distribution
- Drop-off points in wizard
- Resource page views

## Phase 1 MVP (2-3 weeks)
- [ ] Educational landing page
- [ ] Basic form (detainee info + detention details)
- [ ] Simple template generation (prolonged detention only)
- [ ] Case law reference page (top 10 cases)
- [ ] Filing instructions (top 5 districts)

## Phase 2 (4-6 weeks)
- [ ] Full form wizard (all claim types)
- [ ] Advanced template with multiple claims
- [ ] Complete case law database (50+ cases)
- [ ] All district filing info
- [ ] Draft saving functionality

## Phase 3 (8-10 weeks)
- [ ] Spanish translation
- [ ] PDF form filling (interactive)
- [ ] Attorney finder integration
- [ ] Email reminder system
- [ ] Analytics dashboard

## Legal Review Requirements
- Constitutional law expert review
- Immigration attorney review
- Civil rights organization partnership
- Ongoing updates for new case law

## Partnership Opportunities
- ACLU Immigrants' Rights Project
- National Immigration Project
- Detention Watch Network
- Freedom for Immigrants
- Local immigrant rights coalitions
