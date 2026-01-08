import fs from 'fs';
import path from 'path';
import { Case, CaseStats } from '@/types/case';

const CASES_DIR = path.join(process.cwd(), 'data', 'cases');

export function getAllCases(): Case[] {
  if (!fs.existsSync(CASES_DIR)) {
    return [];
  }

  const files = fs.readdirSync(CASES_DIR);
  const cases: Case[] = [];

  for (const file of files) {
    if (file.endsWith('.json') && !file.startsWith('_')) {
      const filePath = path.join(CASES_DIR, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      const caseData = JSON.parse(content) as Case;
      cases.push(caseData);
    }
  }

  // Sort by date of death, most recent first
  return cases.sort((a, b) => 
    new Date(b.date_of_death).getTime() - new Date(a.date_of_death).getTime()
  );
}

export function getCaseById(id: string): Case | null {
  const cases = getAllCases();
  return cases.find(c => c.id === id) || null;
}

export function getCasesByYear(year: number): Case[] {
  const cases = getAllCases();
  return cases.filter(c => new Date(c.date_of_death).getFullYear() === year);
}

export function getCasesByFacility(facilityName: string): Case[] {
  const cases = getAllCases();
  return cases.filter(c => c.facility.name === facilityName);
}

export function getCasesByState(state: string): Case[] {
  const cases = getAllCases();
  return cases.filter(c => c.facility.state === state);
}

export function getCasesByCategory(category: string): Case[] {
  const cases = getAllCases();
  return cases.filter(c => c.category.includes(category));
}

export function getCaseStats(cases: Case[]): CaseStats {
  const currentYear = new Date().getFullYear();
  const deathsThisYear = cases.filter(
    c => new Date(c.date_of_death).getFullYear() === currentYear
  ).length;

  const facilities = new Set(cases.map(c => c.facility.name));
  const states = new Set(cases.map(c => c.facility.state));

  let daysSinceLastDeath = 0;
  if (cases.length > 0) {
    const lastDeath = new Date(cases[0].date_of_death);
    const today = new Date();
    daysSinceLastDeath = Math.floor(
      (today.getTime() - lastDeath.getTime()) / (1000 * 60 * 60 * 24)
    );
  }

  return {
    totalDeaths: cases.length,
    deathsThisYear,
    daysSinceLastDeath,
    facilitiesCount: facilities.size,
    statesCount: states.size,
  };
}

export function getAllYears(cases: Case[]): number[] {
  const years = new Set(cases.map(c => new Date(c.date_of_death).getFullYear()));
  return Array.from(years).sort((a, b) => b - a);
}

export function getAllFacilities(cases: Case[]): string[] {
  const facilities = new Set(cases.map(c => c.facility.name));
  return Array.from(facilities).sort();
}

export function getAllStates(cases: Case[]): string[] {
  const states = new Set(cases.map(c => c.facility.state));
  return Array.from(states).sort();
}

export function getAllCategories(cases: Case[]): string[] {
  const categories = new Set(cases.flatMap(c => c.category));
  return Array.from(categories).sort();
}

// Pattern analysis functions
export function getDeathsAfterMedicalComplaints(cases: Case[]): Case[] {
  return cases.filter(c => 
    c.category.includes('Medical neglect') ||
    c.timeline.some(t => 
      t.event.toLowerCase().includes('medical') ||
      t.event.toLowerCase().includes('pain') ||
      t.event.toLowerCase().includes('symptom')
    )
  );
}

export function getFacilitiesWithMultipleDeaths(cases: Case[]): { facility: string; count: number; cases: Case[] }[] {
  const facilityMap = new Map<string, Case[]>();

  for (const c of cases) {
    const existing = facilityMap.get(c.facility.name) || [];
    existing.push(c);
    facilityMap.set(c.facility.name, existing);
  }

  return Array.from(facilityMap.entries())
    .filter(([, cases]) => cases.length > 1)
    .map(([facility, cases]) => ({ facility, count: cases.length, cases }))
    .sort((a, b) => b.count - a.count);
}

export function getDeathsWithin30Days(cases: Case[]): Case[] {
  return cases.filter(c => {
    const detentionStart = c.timeline.find(t => 
      t.event.toLowerCase().includes('custody') ||
      t.event.toLowerCase().includes('detained') ||
      t.event.toLowerCase().includes('transferred')
    );
    
    if (!detentionStart) return false;
    
    const startDate = new Date(detentionStart.date);
    const deathDate = new Date(c.date_of_death);
    const daysDiff = Math.floor(
      (deathDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    return daysDiff <= 30 && daysDiff >= 0;
  });
}
