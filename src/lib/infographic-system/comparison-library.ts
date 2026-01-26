/**
 * Human-Scale Comparison Library
 * 
 * A comprehensive library of relatable comparisons to make large numbers
 * viscerally understandable. Each comparison includes multiple phrasings
 * and is categorized for intelligent selection.
 * 
 * Categories:
 * - vehicles: Buses, planes, cars
 * - spaces: Stadiums, classrooms, buildings
 * - time: Frequency calculations  
 * - geography: Cities, neighborhoods
 * - events: Historical references, disasters
 * - daily: Everyday objects/activities
 * - population: Towns, groups
 */

// Types for the comparison system
export interface ComparisonUnit {
  id: string;
  category: 'vehicles' | 'spaces' | 'time' | 'geography' | 'events' | 'daily' | 'population';
  singular: string;
  plural: string;
  capacity: number;
  icon: string; // Lucide icon name
  descriptions: string[];
  phrasings: string[]; // Different ways to phrase the comparison
  minValue: number; // Minimum value this makes sense for
  maxValue: number; // Maximum value this works well for
  emotionalWeight: 'neutral' | 'somber' | 'urgent' | 'shocking';
}

export interface TimeComparison {
  id: string;
  template: string; // "One every {rate}" or "{count} per {period}"
  periods: { name: string; seconds: number }[];
}

// =============================================================================
// COMPREHENSIVE COMPARISON UNITS
// =============================================================================

export const COMPARISON_UNITS: ComparisonUnit[] = [
  // VEHICLES
  {
    id: 'school-bus',
    category: 'vehicles',
    singular: 'school bus',
    plural: 'school buses',
    capacity: 72,
    icon: 'Bus',
    descriptions: [
      'Standard yellow school buses (72 seats)',
      'The buses that take children to school each day'
    ],
    phrasings: [
      "That's {count} school buses full of people",
      "Enough to fill {count} school buses",
      "Imagine {count} school buses, completely full",
      "Picture {count} yellow school buses, packed"
    ],
    minValue: 50,
    maxValue: 10000,
    emotionalWeight: 'somber'
  },
  {
    id: 'commercial-flight',
    category: 'vehicles',
    singular: 'commercial airplane',
    plural: 'commercial airplanes',
    capacity: 180,
    icon: 'Plane',
    descriptions: [
      'Boeing 737 or Airbus A320 (average 180 passengers)',
      'A typical domestic flight'
    ],
    phrasings: [
      "{count} full airplane flights",
      "Enough to fill {count} commercial flights",
      "That's {count} airplane crashes worth of people",
      "Every seat on {count} airplanes"
    ],
    minValue: 100,
    maxValue: 50000,
    emotionalWeight: 'shocking'
  },
  {
    id: 'jumbo-jet',
    category: 'vehicles',
    singular: 'jumbo jet',
    plural: 'jumbo jets',
    capacity: 400,
    icon: 'Plane',
    descriptions: [
      'Boeing 747 fully loaded (400+ passengers)',
      'The iconic "Queen of the Skies"'
    ],
    phrasings: [
      "{count} fully-loaded jumbo jets",
      "Like crashing {count} 747s with no survivors",
      "Every passenger on {count} jumbo jets"
    ],
    minValue: 300,
    maxValue: 100000,
    emotionalWeight: 'shocking'
  },
  {
    id: 'city-bus',
    category: 'vehicles',
    singular: 'city bus',
    plural: 'city buses',
    capacity: 40,
    icon: 'Bus',
    descriptions: [
      'Standard city transit bus (40 seats)',
      'A typical commuter bus'
    ],
    phrasings: [
      "{count} city buses",
      "Enough to fill {count} commuter buses",
      "The capacity of {count} public transit buses"
    ],
    minValue: 30,
    maxValue: 5000,
    emotionalWeight: 'neutral'
  },
  {
    id: 'subway-car',
    category: 'vehicles',
    singular: 'subway car',
    plural: 'subway cars',
    capacity: 150,
    icon: 'Train',
    descriptions: [
      'A single subway or metro car at rush hour',
      'One car of a subway train'
    ],
    phrasings: [
      "{count} packed subway cars",
      "Like {count} rush-hour subway cars",
      "Fill {count} metro cars completely"
    ],
    minValue: 100,
    maxValue: 30000,
    emotionalWeight: 'neutral'
  },
  {
    id: 'cruise-ship',
    category: 'vehicles',
    singular: 'cruise ship',
    plural: 'cruise ships',
    capacity: 3000,
    icon: 'Ship',
    descriptions: [
      'A large cruise liner (3,000+ passengers)',
      'A floating city at sea'
    ],
    phrasings: [
      "{count} entire cruise ships",
      "More than {count} cruise ships can hold",
      "The population of {count} cruise ships"
    ],
    minValue: 2000,
    maxValue: 500000,
    emotionalWeight: 'neutral'
  },
  
  // SPACES
  {
    id: 'classroom',
    category: 'spaces',
    singular: 'classroom',
    plural: 'classrooms',
    capacity: 25,
    icon: 'GraduationCap',
    descriptions: [
      'Average American classroom (25 students)',
      'A typical elementary school class'
    ],
    phrasings: [
      "{count} entire classrooms of children",
      "Enough to fill {count} classrooms",
      "Every student in {count} classrooms",
      "{count} classroom-sized groups"
    ],
    minValue: 20,
    maxValue: 3000,
    emotionalWeight: 'somber'
  },
  {
    id: 'football-stadium',
    category: 'spaces',
    singular: 'football stadium',
    plural: 'football stadiums',
    capacity: 70000,
    icon: 'Trophy',
    descriptions: [
      'NFL stadium at full capacity (70,000)',
      'A sold-out Sunday game'
    ],
    phrasings: [
      "More than {count} Super Bowl crowds",
      "Fill {count} NFL stadiums",
      "Every seat in {count} football stadiums"
    ],
    minValue: 50000,
    maxValue: 1000000,
    emotionalWeight: 'neutral'
  },
  {
    id: 'basketball-arena',
    category: 'spaces',
    singular: 'basketball arena',
    plural: 'basketball arenas',
    capacity: 20000,
    icon: 'Trophy',
    descriptions: [
      'NBA arena at capacity (20,000)',
      'A sold-out basketball game'
    ],
    phrasings: [
      "{count} sold-out NBA games",
      "Every fan at {count} basketball games",
      "Fill {count} arenas to capacity"
    ],
    minValue: 15000,
    maxValue: 500000,
    emotionalWeight: 'neutral'
  },
  {
    id: 'movie-theater',
    category: 'spaces',
    singular: 'movie theater',
    plural: 'movie theaters',
    capacity: 200,
    icon: 'Film',
    descriptions: [
      'A typical multiplex theater room',
      'One sold-out movie showing'
    ],
    phrasings: [
      "{count} sold-out movie showings",
      "Every seat in {count} theaters",
      "Like {count} packed movie premieres"
    ],
    minValue: 100,
    maxValue: 50000,
    emotionalWeight: 'neutral'
  },
  {
    id: 'concert-venue',
    category: 'spaces',
    singular: 'concert venue',
    plural: 'concert venues',
    capacity: 5000,
    icon: 'Music',
    descriptions: [
      'A medium concert hall (5,000 capacity)',
      'A popular live music venue'
    ],
    phrasings: [
      "{count} sold-out concerts",
      "Every fan at {count} shows",
      "Fill {count} concert venues"
    ],
    minValue: 3000,
    maxValue: 200000,
    emotionalWeight: 'neutral'
  },
  {
    id: 'church',
    category: 'spaces',
    singular: 'church congregation',
    plural: 'church congregations',
    capacity: 300,
    icon: 'Church',
    descriptions: [
      'A typical Sunday service (300 people)',
      'An average church congregation'
    ],
    phrasings: [
      "{count} entire church congregations",
      "Everyone at {count} Sunday services",
      "Fill {count} churches"
    ],
    minValue: 200,
    maxValue: 30000,
    emotionalWeight: 'somber'
  },
  {
    id: 'apartment-building',
    category: 'spaces',
    singular: 'apartment building',
    plural: 'apartment buildings',
    capacity: 200,
    icon: 'Building2',
    descriptions: [
      'A large apartment complex (~200 residents)',
      'A typical city residential building'
    ],
    phrasings: [
      "Every resident of {count} apartment buildings",
      "{count} entire apartment complexes",
      "Evacuate {count} residential buildings"
    ],
    minValue: 150,
    maxValue: 50000,
    emotionalWeight: 'neutral'
  },
  
  // POPULATION
  {
    id: 'small-town',
    category: 'population',
    singular: 'small town',
    plural: 'small towns',
    capacity: 5000,
    icon: 'MapPin',
    descriptions: [
      'A typical small American town',
      'The kind of place where everyone knows everyone'
    ],
    phrasings: [
      "An entire small town",
      "The population of {count} small towns",
      "Wipe {count} towns off the map",
      "Every person in {count} small towns"
    ],
    minValue: 3000,
    maxValue: 200000,
    emotionalWeight: 'shocking'
  },
  {
    id: 'village',
    category: 'population',
    singular: 'village',
    plural: 'villages',
    capacity: 1000,
    icon: 'Home',
    descriptions: [
      'A small rural village',
      'A close-knit community'
    ],
    phrasings: [
      "{count} entire villages",
      "The population of {count} villages",
      "Everyone in {count} small communities"
    ],
    minValue: 500,
    maxValue: 50000,
    emotionalWeight: 'somber'
  },
  {
    id: 'neighborhood',
    category: 'population',
    singular: 'neighborhood',
    plural: 'neighborhoods',
    capacity: 2500,
    icon: 'MapPin',
    descriptions: [
      'A typical city neighborhood',
      'The block where you grew up'
    ],
    phrasings: [
      "Everyone in {count} neighborhoods",
      "{count} entire neighborhoods",
      "Empty {count} city blocks of all residents"
    ],
    minValue: 1500,
    maxValue: 100000,
    emotionalWeight: 'somber'
  },
  {
    id: 'high-school',
    category: 'population',
    singular: 'high school',
    plural: 'high schools',
    capacity: 1500,
    icon: 'School',
    descriptions: [
      'Every student in a large high school',
      'An entire high school student body'
    ],
    phrasings: [
      "Every student at {count} high schools",
      "{count} entire high schools",
      "The student bodies of {count} schools"
    ],
    minValue: 1000,
    maxValue: 50000,
    emotionalWeight: 'somber'
  },
  {
    id: 'family',
    category: 'population',
    singular: 'family',
    plural: 'families',
    capacity: 4,
    icon: 'Users',
    descriptions: [
      'An average American family of 4',
      'Parents and two children'
    ],
    phrasings: [
      "{count} entire families",
      "That's {count} families destroyed",
      "{count} homes left empty"
    ],
    minValue: 4,
    maxValue: 1000,
    emotionalWeight: 'somber'
  },
  
  // DAILY OBJECTS
  {
    id: 'office-floor',
    category: 'daily',
    singular: 'office floor',
    plural: 'office floors',
    capacity: 100,
    icon: 'Briefcase',
    descriptions: [
      'A typical corporate office floor',
      'One floor of a company'
    ],
    phrasings: [
      "Everyone on {count} office floors",
      "{count} entire office floors laid off",
      "Close {count} floors of workers"
    ],
    minValue: 50,
    maxValue: 10000,
    emotionalWeight: 'neutral'
  },
  {
    id: 'restaurant',
    category: 'daily',
    singular: 'restaurant',
    plural: 'restaurants',
    capacity: 80,
    icon: 'UtensilsCrossed',
    descriptions: [
      'A full restaurant at dinner rush',
      'Every table occupied'
    ],
    phrasings: [
      "Everyone dining at {count} restaurants",
      "{count} packed restaurants",
      "Fill {count} restaurants at capacity"
    ],
    minValue: 50,
    maxValue: 10000,
    emotionalWeight: 'neutral'
  },
  {
    id: 'yoga-class',
    category: 'daily',
    singular: 'yoga class',
    plural: 'yoga classes',
    capacity: 20,
    icon: 'Heart',
    descriptions: [
      'A typical fitness class',
      'An intimate group exercise session'
    ],
    phrasings: [
      "{count} fitness classes",
      "Everyone in {count} yoga sessions",
      "Fill {count} exercise studios"
    ],
    minValue: 15,
    maxValue: 2000,
    emotionalWeight: 'neutral'
  }
];

// =============================================================================
// TIME-BASED COMPARISONS
// =============================================================================

export interface TimeFrame {
  name: string;
  label: string;
  seconds: number;
}

export const TIME_FRAMES: TimeFrame[] = [
  { name: 'minute', label: 'minute', seconds: 60 },
  { name: 'hour', label: 'hour', seconds: 3600 },
  { name: 'day', label: 'day', seconds: 86400 },
  { name: 'week', label: 'week', seconds: 604800 },
  { name: 'month', label: 'month', seconds: 2592000 },
  { name: 'year', label: 'year', seconds: 31536000 },
];

/**
 * Generate a time-based comparison
 * @param count - Total number of events/cases
 * @param timeSpanYears - How many years the data covers
 * @returns Human-readable frequency string
 */
export function generateTimeComparison(count: number, timeSpanYears: number): string[] {
  const totalSeconds = timeSpanYears * 31536000;
  const secondsPerEvent = totalSeconds / count;
  
  const comparisons: string[] = [];
  
  // Find the best time unit
  if (secondsPerEvent < 60) {
    const perMinute = 60 / secondsPerEvent;
    comparisons.push(`${perMinute.toFixed(1)} every minute`);
  } else if (secondsPerEvent < 3600) {
    const minutes = secondsPerEvent / 60;
    if (minutes < 10) {
      comparisons.push(`One every ${Math.round(minutes)} minutes`);
    } else {
      const perHour = 3600 / secondsPerEvent;
      comparisons.push(`${perHour.toFixed(1)} per hour`);
    }
  } else if (secondsPerEvent < 86400) {
    const hours = secondsPerEvent / 3600;
    if (hours < 12) {
      comparisons.push(`One every ${Math.round(hours)} hours`);
    } else {
      const perDay = 86400 / secondsPerEvent;
      comparisons.push(`${perDay.toFixed(1)} per day`);
    }
  } else if (secondsPerEvent < 604800) {
    const days = secondsPerEvent / 86400;
    comparisons.push(`One every ${Math.round(days)} days`);
    comparisons.push(`One every ${Math.round(days)} days, without pause`);
  } else if (secondsPerEvent < 2592000) {
    const weeks = secondsPerEvent / 604800;
    comparisons.push(`One every ${weeks.toFixed(1)} weeks`);
    comparisons.push(`About ${Math.round(52 / weeks)} per year`);
  } else {
    const months = secondsPerEvent / 2592000;
    comparisons.push(`One every ${months.toFixed(1)} months`);
  }
  
  // Add evocative variations
  const days = secondsPerEvent / 86400;
  if (days >= 1 && days <= 14) {
    comparisons.push(`Another one, every ${Math.round(days)} days`);
    comparisons.push(`While you lived your life this week, another one happened`);
  }
  
  return comparisons;
}

// =============================================================================
// SMART COMPARISON GENERATOR
// =============================================================================

export interface GeneratedComparison {
  text: string;
  unit: ComparisonUnit | null;
  count: number;
  category: string;
  emotionalWeight: string;
}

/**
 * Generate the best comparison for a given number
 * @param value - The number to make relatable
 * @param preferredCategories - Optional categories to prefer
 * @param emotionalTone - Preferred emotional weight
 * @returns Array of generated comparisons, ranked by fit
 */
export function generateComparisons(
  value: number,
  preferredCategories?: string[],
  emotionalTone?: 'neutral' | 'somber' | 'urgent' | 'shocking'
): GeneratedComparison[] {
  const comparisons: GeneratedComparison[] = [];
  
  // Filter units that work for this value
  const viableUnits = COMPARISON_UNITS.filter(
    unit => value >= unit.minValue && value <= unit.maxValue
  );
  
  // Score and sort units
  const scoredUnits = viableUnits.map(unit => {
    const count = Math.round(value / unit.capacity);
    let score = 0;
    
    // Prefer counts between 3-50 (easy to visualize)
    if (count >= 3 && count <= 50) score += 50;
    else if (count >= 2 && count <= 100) score += 30;
    
    // Prefer whole numbers
    const remainder = value % unit.capacity;
    if (remainder === 0) score += 20;
    else if (remainder < unit.capacity * 0.1) score += 10;
    
    // Category preference
    if (preferredCategories?.includes(unit.category)) score += 40;
    
    // Emotional tone matching
    if (emotionalTone && unit.emotionalWeight === emotionalTone) score += 30;
    
    return { unit, count, score };
  });
  
  // Sort by score
  scoredUnits.sort((a, b) => b.score - a.score);
  
  // Generate text for top units
  scoredUnits.slice(0, 8).forEach(({ unit, count }) => {
    // Pick a random phrasing
    const phrasings = unit.phrasings.map(p => p.replace('{count}', count.toLocaleString()));
    
    phrasings.forEach(text => {
      comparisons.push({
        text,
        unit,
        count,
        category: unit.category,
        emotionalWeight: unit.emotionalWeight
      });
    });
  });
  
  return comparisons;
}

/**
 * Get a diverse set of comparisons (one from each category)
 */
export function getDiverseComparisons(value: number): GeneratedComparison[] {
  const categories = ['vehicles', 'spaces', 'population', 'daily'];
  const results: GeneratedComparison[] = [];
  
  categories.forEach(category => {
    const catComparisons = generateComparisons(value, [category]);
    if (catComparisons.length > 0) {
      // Pick one random from this category
      const randomIndex = Math.floor(Math.random() * Math.min(catComparisons.length, 3));
      results.push(catComparisons[randomIndex]);
    }
  });
  
  return results;
}

/**
 * Get all available comparison options as a prompt-friendly string
 */
export function getComparisonOptionsForPrompt(value: number): string {
  const comparisons = generateComparisons(value);
  
  // Group by category
  const byCategory: Record<string, string[]> = {};
  comparisons.forEach(c => {
    if (!byCategory[c.category]) byCategory[c.category] = [];
    if (byCategory[c.category].length < 3) {
      byCategory[c.category].push(c.text);
    }
  });
  
  const lines: string[] = [];
  Object.entries(byCategory).forEach(([category, texts]) => {
    lines.push(`${category.toUpperCase()}: ${texts.join(' | ')}`);
  });
  
  return lines.join('\n');
}

// =============================================================================
// HISTORICAL EVENT COMPARISONS
// =============================================================================

export interface HistoricalEvent {
  name: string;
  casualties: number;
  year: number;
  description: string;
  category: 'disaster' | 'conflict' | 'accident' | 'epidemic';
}

export const HISTORICAL_EVENTS: HistoricalEvent[] = [
  { name: 'Titanic sinking', casualties: 1517, year: 1912, description: 'The "unsinkable" ship', category: 'disaster' },
  { name: 'Hindenburg disaster', casualties: 36, year: 1937, description: 'The famous airship', category: 'disaster' },
  { name: '9/11 attacks', casualties: 2977, year: 2001, description: 'September 11th', category: 'disaster' },
  { name: 'Hurricane Katrina', casualties: 1836, year: 2005, description: 'Devastating Gulf Coast hurricane', category: 'disaster' },
  { name: 'Deepwater Horizon', casualties: 11, year: 2010, description: 'Oil rig explosion', category: 'accident' },
  { name: 'Las Vegas shooting', casualties: 60, year: 2017, description: 'Deadliest US mass shooting', category: 'disaster' },
  { name: 'Boeing 737 MAX crashes', casualties: 346, year: 2019, description: 'Two crashes from design flaw', category: 'accident' },
  { name: 'Pearl Harbor attack', casualties: 2403, year: 1941, description: 'Day that lives in infamy', category: 'conflict' },
  { name: 'D-Day landing', casualties: 4414, year: 1944, description: 'Allied D-Day casualties', category: 'conflict' },
  { name: 'Pulse nightclub shooting', casualties: 49, year: 2016, description: 'Orlando massacre', category: 'disaster' },
  { name: 'Sandy Hook shooting', casualties: 28, year: 2012, description: 'Elementary school tragedy', category: 'disaster' },
  { name: 'Oklahoma City bombing', casualties: 168, year: 1995, description: 'Domestic terrorism', category: 'disaster' },
];

/**
 * Find historical events for comparison
 * @param value - Number to compare
 * @param tolerance - How close the match should be (0.5 = within 50%)
 */
export function findHistoricalComparisons(value: number, tolerance = 0.5): { event: HistoricalEvent; ratio: number; text: string }[] {
  const results: { event: HistoricalEvent; ratio: number; text: string }[] = [];
  
  HISTORICAL_EVENTS.forEach(event => {
    const ratio = value / event.casualties;
    
    if (ratio >= 1 - tolerance && ratio <= 1 + tolerance) {
      // Close to equal
      results.push({
        event,
        ratio,
        text: `About the same as ${event.name} (${event.casualties.toLocaleString()} deaths)`
      });
    } else if (ratio > 1) {
      // More than the event
      const multiple = Math.round(ratio);
      if (multiple >= 2 && multiple <= 50) {
        results.push({
          event,
          ratio,
          text: `${multiple}x more than ${event.name}`
        });
      }
    }
  });
  
  return results.sort((a, b) => Math.abs(1 - a.ratio) - Math.abs(1 - b.ratio));
}

// =============================================================================
// STYLE PRESETS
// =============================================================================

export interface InfographicStylePreset {
  id: string;
  name: string;
  description: string;
  thumbnail: string; // CSS gradient or emoji
  characteristics: {
    sceneCount: number;
    primaryVisualization: string;
    emotionalTone: string;
    pacing: 'fast' | 'medium' | 'slow';
    comparisonStyle: 'units' | 'time' | 'historical' | 'mixed';
    density: 'minimal' | 'moderate' | 'dense';
  };
  promptModifier: string;
}

export const STYLE_PRESETS: InfographicStylePreset[] = [
  {
    id: 'impact',
    name: 'Maximum Impact',
    description: 'Shocking, visceral. Big numbers, stark contrasts.',
    thumbnail: '🔴',
    characteristics: {
      sceneCount: 4,
      primaryVisualization: 'humanGrid',
      emotionalTone: 'shocking',
      pacing: 'slow',
      comparisonStyle: 'historical',
      density: 'minimal'
    },
    promptModifier: `STYLE: Maximum Impact
- Start with the NUMBER. Giant. Unavoidable.
- Scene 2: Every dot/icon is a PERSON. Make that viscerally clear.
- Use shocking historical comparisons (plane crashes, disasters)
- Minimal text - let silence speak
- End with a gut-punch statistic
- Colors: Black background, red accents only`
  },
  {
    id: 'analytical',
    name: 'Analytical Deep-Dive',
    description: 'Data-rich, thorough breakdown with multiple dimensions.',
    thumbnail: '📊',
    characteristics: {
      sceneCount: 6,
      primaryVisualization: 'barChart',
      emotionalTone: 'neutral',
      pacing: 'medium',
      comparisonStyle: 'units',
      density: 'dense'
    },
    promptModifier: `STYLE: Analytical Deep-Dive
- Show the total, then systematically break it down
- Multiple groupBy visualizations (pie charts, bar charts)
- Include percentages and specific numbers in every scene
- Use all available categorical fields
- Neutral, journalistic tone
- Color-code by actual data categories`
  },
  {
    id: 'timeline',
    name: 'Temporal Journey',
    description: 'Chronological story showing change over time.',
    thumbnail: '📅',
    characteristics: {
      sceneCount: 5,
      primaryVisualization: 'timeline',
      emotionalTone: 'somber',
      pacing: 'medium',
      comparisonStyle: 'time',
      density: 'moderate'
    },
    promptModifier: `STYLE: Temporal Journey  
- Open with the time span: "Over X years..."
- Use time-based comparisons ("One every X days")
- Show cumulative growth or patterns by year/month
- Include a timeline visualization if date field exists
- Emphasize the relentlessness of frequency
- End with: "And it continues today"`
  },
  {
    id: 'personal',
    name: 'Human Stories',
    description: 'Intimate focus on individual cases and stories.',
    thumbnail: '👤',
    characteristics: {
      sceneCount: 4,
      primaryVisualization: 'humanGrid',
      emotionalTone: 'somber',
      pacing: 'slow',
      comparisonStyle: 'units',
      density: 'minimal'
    },
    promptModifier: `STYLE: Human Stories
- Start: "Behind this number are real people"
- Use humanGrid with individual icons prominent
- Reference families, children, communities affected
- Use comparisons like "X families" or "X classrooms"
- Each icon = a life, a story, a loss
- Intentionally sparse to let weight sink in`
  },
  {
    id: 'comparative',
    name: 'Comparisons',
    description: 'Put the data in context with relatable comparisons.',
    thumbnail: '⚖️',
    characteristics: {
      sceneCount: 5,
      primaryVisualization: 'humanScale',
      emotionalTone: 'neutral',
      pacing: 'medium',
      comparisonStyle: 'mixed',
      density: 'moderate'
    },
    promptModifier: `STYLE: Comparative Context
- Open with raw number
- Each subsequent scene: a DIFFERENT comparison type
  - Scene 2: Vehicle comparison (buses, planes)
  - Scene 3: Space comparison (stadiums, classrooms)
  - Scene 4: Time comparison (frequency)
  - Scene 5: Historical event comparison
- Use diverse icons for each comparison
- Make abstract numbers concrete and graspable`
  },
  {
    id: 'minimal',
    name: 'Stark Minimal',
    description: 'Just the essential truth. No decoration.',
    thumbnail: '⚫',
    characteristics: {
      sceneCount: 3,
      primaryVisualization: 'counter',
      emotionalTone: 'somber',
      pacing: 'slow',
      comparisonStyle: 'time',
      density: 'minimal'
    },
    promptModifier: `STYLE: Stark Minimal
- Only 3 scenes. No more.
- Scene 1: The number. Nothing else.
- Scene 2: One devastating comparison or frequency
- Scene 3: Each dot = a person (humanGrid, simple)
- No charts, no breakdowns, no categories
- Maximum white/black space
- Let the number do the work`
  }
];

/**
 * Get a style preset by ID
 */
export function getStylePreset(id: string): InfographicStylePreset | undefined {
  return STYLE_PRESETS.find(p => p.id === id);
}

/**
 * Get recommended style presets based on data characteristics
 */
export function getRecommendedStyles(
  totalRecords: number,
  hasDateField: boolean,
  categoricalFieldCount: number
): InfographicStylePreset[] {
  const recommendations: { preset: InfographicStylePreset; score: number }[] = [];
  
  STYLE_PRESETS.forEach(preset => {
    let score = 0;
    
    // Impact works best with shocking numbers
    if (preset.id === 'impact' && totalRecords >= 100) score += 50;
    
    // Timeline needs date data
    if (preset.id === 'timeline' && hasDateField) score += 70;
    if (preset.id === 'timeline' && !hasDateField) score -= 100;
    
    // Analytical works with lots of categories
    if (preset.id === 'analytical' && categoricalFieldCount >= 3) score += 60;
    
    // Personal works well for human-related data (detected by record count)
    if (preset.id === 'personal' && totalRecords <= 1000) score += 40;
    
    // Minimal works for any size
    if (preset.id === 'minimal') score += 30;
    
    // Comparative works for any meaningful count
    if (preset.id === 'comparative' && totalRecords >= 50) score += 50;
    
    recommendations.push({ preset, score });
  });
  
  return recommendations
    .sort((a, b) => b.score - a.score)
    .filter(r => r.score > 0)
    .map(r => r.preset);
}

export default {
  COMPARISON_UNITS,
  TIME_FRAMES,
  STYLE_PRESETS,
  HISTORICAL_EVENTS,
  generateComparisons,
  getDiverseComparisons,
  generateTimeComparison,
  findHistoricalComparisons,
  getComparisonOptionsForPrompt,
  getStylePreset,
  getRecommendedStyles
};
