/**
 * AI Infographic Generation - Example Library
 * 
 * Multiple diverse examples for the AI to learn from.
 * Rotated randomly to prevent repetitive outputs.
 */

export interface ExampleInfographic {
  id: string;
  name: string;
  description: string;
  style: string;
  example: string;
}

// Diverse example outputs for the AI
export const EXAMPLE_INFOGRAPHICS: ExampleInfographic[] = [
  {
    id: 'impact-focused',
    name: 'Maximum Impact',
    description: 'Stark, emotional, uses historical comparisons',
    style: 'impact',
    example: `{
  "title": "The Hidden Toll",
  "theme": "dark",
  "scenes": [
    {
      "id": "scene-1",
      "narrativeText": "275.",
      "narrativeSubtext": "Two hundred and seventy-five documented deaths.",
      "visualizationType": "counter",
      "dataBinding": { "type": "count" },
      "visualizationConfig": { "suffix": "", "fontSize": "12rem" },
      "emotionalTone": "somber"
    },
    {
      "id": "scene-2",
      "narrativeText": "Each square is a person who didn't come home.",
      "narrativeSubtext": "Color reveals how they died. Red: medical neglect. Blue: suicide. Gray: unknown.",
      "visualizationType": "humanGrid",
      "dataBinding": { "type": "records" },
      "visualizationConfig": { 
        "dotsPerRow": 20, 
        "dotSize": 16,
        "dotGap": 6,
        "colorBy": "cause_of_death",
        "colorMap": { "Medical": "#EF4444", "Suicide": "#3B82F6", "Unknown": "#6B7280", "Homicide": "#F97316" },
        "showLegend": true,
        "legendPosition": "bottom"
      },
      "emotionalTone": "somber"
    },
    {
      "id": "scene-3",
      "narrativeText": "More than the Titanic.",
      "narrativeSubtext": "The Titanic sinking killed 1,517 people and shocked the world. This is happening in silence.",
      "visualizationType": "humanScale",
      "dataBinding": { "type": "count" },
      "visualizationConfig": { "comparison": "More deaths than some of history's most infamous disasters combined" },
      "emotionalTone": "urgent"
    },
    {
      "id": "scene-4",
      "narrativeText": "One every 8 days.",
      "narrativeSubtext": "For years, without pause, without headlines.",
      "visualizationType": "counter",
      "dataBinding": { "type": "count" },
      "visualizationConfig": { "suffix": " days between deaths", "prefix": "1 every ", "fontSize": "4rem" },
      "emotionalTone": "urgent"
    }
  ]
}`
  },
  {
    id: 'analytical',
    name: 'Data Deep-Dive',
    description: 'Multiple breakdowns, journalistic, thorough',
    style: 'analytical',
    example: `{
  "title": "Detention Incidents: A Breakdown",
  "theme": "light",
  "scenes": [
    {
      "id": "scene-1",
      "narrativeText": "114 documented incidents.",
      "narrativeSubtext": "Since records began, 114 incidents have been formally documented at detention facilities.",
      "visualizationType": "counter",
      "dataBinding": { "type": "count" },
      "visualizationConfig": { "suffix": " incidents", "fontSize": "8rem" },
      "emotionalTone": "neutral"
    },
    {
      "id": "scene-2",
      "narrativeText": "Severity breakdown reveals patterns.",
      "narrativeSubtext": "23% classified as Critical, 31% as High severity.",
      "visualizationType": "pieChart",
      "dataBinding": { "type": "groupBy", "field": "severity" },
      "visualizationConfig": { 
        "groupBy": "severity",
        "colorMap": { "Critical": "#EF4444", "High": "#F97316", "Medium": "#F59E0B", "Low": "#3B82F6" }
      },
      "emotionalTone": "neutral"
    },
    {
      "id": "scene-3",
      "narrativeText": "Regional distribution varies widely.",
      "narrativeSubtext": "Southwest leads with 42 incidents. Northeast: 28. Southeast: 23. Central: 21.",
      "visualizationType": "barChart",
      "dataBinding": { "type": "groupBy", "field": "region" },
      "visualizationConfig": { 
        "groupBy": "region",
        "orientation": "horizontal"
      },
      "emotionalTone": "neutral"
    },
    {
      "id": "scene-4",
      "narrativeText": "Medical neglect: the leading category.",
      "narrativeSubtext": "47 of 114 incidents (41%) involve medical care failures.",
      "visualizationType": "dotGrid",
      "dataBinding": { "type": "records" },
      "visualizationConfig": { 
        "dotsPerRow": 15, 
        "dotSize": 14,
        "colorBy": "incident_type",
        "showLegend": true
      },
      "emotionalTone": "neutral"
    },
    {
      "id": "scene-5",
      "narrativeText": "The trend continues.",
      "narrativeSubtext": "Incidents by year show no significant decline.",
      "visualizationType": "timeline",
      "dataBinding": { "type": "groupBy", "field": "incident_date" },
      "visualizationConfig": { "dateField": "incident_date", "groupBy": "year" },
      "emotionalTone": "neutral"
    }
  ]
}`
  },
  {
    id: 'time-frequency',
    name: 'Time & Frequency',
    description: 'Emphasizes relentless frequency and duration',
    style: 'timeline',
    example: `{
  "title": "Six Years. 275 Deaths.",
  "theme": "dark",
  "scenes": [
    {
      "id": "scene-1",
      "narrativeText": "Since 2020.",
      "narrativeSubtext": "That's when the first death in this dataset was recorded.",
      "visualizationType": "counter",
      "dataBinding": { "type": "count" },
      "visualizationConfig": { "prefix": "Since ", "suffix": "", "fontSize": "6rem", "value": 2020 },
      "emotionalTone": "somber"
    },
    {
      "id": "scene-2",
      "narrativeText": "275 people didn't make it out.",
      "narrativeSubtext": "Each dot below represents someone who entered but never left.",
      "visualizationType": "dotGrid",
      "dataBinding": { "type": "records" },
      "visualizationConfig": { 
        "dotsPerRow": 25, 
        "dotSize": 12,
        "colorBy": "year",
        "showLegend": true,
        "legendPosition": "bottom"
      },
      "emotionalTone": "somber"
    },
    {
      "id": "scene-3",
      "narrativeText": "One every 8 days.",
      "narrativeSubtext": "On average, another person dies every 8 days. This week. Last week. The week before that.",
      "visualizationType": "humanScale",
      "dataBinding": { "type": "count" },
      "visualizationConfig": { "comparison": "One person, every 8 days, for six straight years" },
      "emotionalTone": "urgent"
    },
    {
      "id": "scene-4",
      "narrativeText": "45 deaths per year.",
      "narrativeSubtext": "Nearly one per week, every week, every year.",
      "visualizationType": "counter",
      "dataBinding": { "type": "count" },
      "visualizationConfig": { "suffix": " per year", "fontSize": "6rem" },
      "emotionalTone": "urgent"
    },
    {
      "id": "scene-5",
      "narrativeText": "And it's still happening.",
      "narrativeSubtext": "The most recent death in this dataset: [latest date]",
      "visualizationType": "timeline",
      "dataBinding": { "type": "groupBy", "field": "date_of_death" },
      "visualizationConfig": { "dateField": "date_of_death", "groupBy": "month" },
      "emotionalTone": "urgent"
    }
  ]
}`
  },
  {
    id: 'human-centered',
    name: 'Human Stories',
    description: 'Focus on individual humanity, families affected',
    style: 'personal',
    example: `{
  "title": "275 People",
  "theme": "dark",
  "scenes": [
    {
      "id": "scene-1",
      "narrativeText": "These are not statistics.",
      "narrativeSubtext": "Each number represents a person with a name, a family, a story.",
      "visualizationType": "counter",
      "dataBinding": { "type": "count" },
      "visualizationConfig": { "suffix": " people", "fontSize": "8rem" },
      "emotionalTone": "somber"
    },
    {
      "id": "scene-2",
      "narrativeText": "275 families changed forever.",
      "narrativeSubtext": "At least 4 people grieve each loss: parents, siblings, children, partners.",
      "visualizationType": "humanGrid",
      "dataBinding": { "type": "records" },
      "visualizationConfig": { 
        "dotsPerRow": 15, 
        "dotSize": 20,
        "dotGap": 8,
        "useHumanIcons": true,
        "colorBy": "age_group",
        "colorMap": { "Under 30": "#3B82F6", "30-50": "#10B981", "Over 50": "#8B5CF6", "Unknown": "#6B7280" },
        "showLegend": true
      },
      "emotionalTone": "somber"
    },
    {
      "id": "scene-3",
      "narrativeText": "69 entire families.",
      "narrativeSubtext": "If each person was a family of 4, that's 69 complete families erased.",
      "visualizationType": "humanScale",
      "dataBinding": { "type": "count" },
      "visualizationConfig": { "comparison": "69 families. 69 empty dinner tables. 69 sets of memories that will never be made." },
      "emotionalTone": "somber"
    },
    {
      "id": "scene-4",
      "narrativeText": "9 full classrooms.",
      "narrativeSubtext": "Enough to fill 9 elementary school classrooms with empty desks.",
      "visualizationType": "humanScale",
      "dataBinding": { "type": "count" },
      "visualizationConfig": { "comparison": "Picture 9 classrooms. Every desk, empty. That's how many we've lost." },
      "emotionalTone": "somber"
    }
  ]
}`
  },
  {
    id: 'comparison-focused',
    name: 'Scale Comparisons',
    description: 'Multiple comparison types to make scale concrete',
    style: 'comparative',
    example: `{
  "title": "Making Sense of 275",
  "theme": "light",
  "scenes": [
    {
      "id": "scene-1",
      "narrativeText": "275",
      "narrativeSubtext": "A number that's hard to grasp. Let's put it in perspective.",
      "visualizationType": "counter",
      "dataBinding": { "type": "count" },
      "visualizationConfig": { "fontSize": "10rem" },
      "emotionalTone": "neutral"
    },
    {
      "id": "scene-2",
      "narrativeText": "4 school buses.",
      "narrativeSubtext": "Line up 4 yellow school buses. Fill every seat. That's 275 people.",
      "visualizationType": "humanScale",
      "dataBinding": { "type": "count" },
      "visualizationConfig": { "comparison": "4 school buses, packed to capacity" },
      "emotionalTone": "neutral"
    },
    {
      "id": "scene-3",
      "narrativeText": "A sold-out movie premiere.",
      "narrativeSubtext": "Imagine everyone at a large movie theater screening. Gone.",
      "visualizationType": "humanScale",
      "dataBinding": { "type": "count" },
      "visualizationConfig": { "comparison": "Every seat in a large cinema, filled and then emptied" },
      "emotionalTone": "somber"
    },
    {
      "id": "scene-4",
      "narrativeText": "11 classrooms of children.",
      "narrativeSubtext": "If these were students: 11 classrooms. 11 teachers reading roll call to silence.",
      "visualizationType": "humanScale",
      "dataBinding": { "type": "count" },
      "visualizationConfig": { "comparison": "11 classrooms of 25 students each" },
      "emotionalTone": "somber"
    },
    {
      "id": "scene-5",
      "narrativeText": "But they weren't numbers.",
      "narrativeSubtext": "Each dot is a real person. Color shows their region.",
      "visualizationType": "humanGrid",
      "dataBinding": { "type": "records" },
      "visualizationConfig": { 
        "dotsPerRow": 20,
        "dotSize": 14,
        "colorBy": "region",
        "showLegend": true
      },
      "emotionalTone": "somber"
    }
  ]
}`
  },
  {
    id: 'minimal-stark',
    name: 'Stark Minimal',
    description: 'Only 3 scenes, maximum white space, pure impact',
    style: 'minimal',
    example: `{
  "title": "275",
  "theme": "dark",
  "scenes": [
    {
      "id": "scene-1",
      "narrativeText": "275",
      "narrativeSubtext": "",
      "visualizationType": "counter",
      "dataBinding": { "type": "count" },
      "visualizationConfig": { "fontSize": "14rem" },
      "emotionalTone": "somber"
    },
    {
      "id": "scene-2",
      "narrativeText": "One every 8 days.",
      "narrativeSubtext": "",
      "visualizationType": "humanScale",
      "dataBinding": { "type": "count" },
      "visualizationConfig": { "comparison": "" },
      "emotionalTone": "somber"
    },
    {
      "id": "scene-3",
      "narrativeText": "",
      "narrativeSubtext": "Each one was a person.",
      "visualizationType": "humanGrid",
      "dataBinding": { "type": "records" },
      "visualizationConfig": { 
        "dotsPerRow": 25,
        "dotSize": 10,
        "dotGap": 4,
        "showLegend": false
      },
      "emotionalTone": "somber"
    }
  ]
}`
  }
];

/**
 * Get a random example for the AI prompt
 * Ensures variety by cycling through examples
 */
let lastExampleIndex = -1;

export function getRandomExample(): ExampleInfographic {
  // Ensure we don't repeat the same example twice in a row
  let newIndex = Math.floor(Math.random() * EXAMPLE_INFOGRAPHICS.length);
  if (newIndex === lastExampleIndex) {
    newIndex = (newIndex + 1) % EXAMPLE_INFOGRAPHICS.length;
  }
  lastExampleIndex = newIndex;
  return EXAMPLE_INFOGRAPHICS[newIndex];
}

/**
 * Get example for a specific style
 */
export function getExampleByStyle(style: string): ExampleInfographic {
  return EXAMPLE_INFOGRAPHICS.find(e => e.style === style) || EXAMPLE_INFOGRAPHICS[0];
}

/**
 * Get multiple diverse examples for the prompt
 */
export function getExampleSet(count: number = 2): ExampleInfographic[] {
  const shuffled = [...EXAMPLE_INFOGRAPHICS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/**
 * Format examples for inclusion in the AI prompt
 */
export function formatExamplesForPrompt(examples: ExampleInfographic[]): string {
  return examples.map((ex, i) => `
### Example ${i + 1}: ${ex.name}
${ex.description}
\`\`\`json
${ex.example}
\`\`\`
`).join('\n');
}

export default {
  EXAMPLE_INFOGRAPHICS,
  getRandomExample,
  getExampleByStyle,
  getExampleSet,
  formatExamplesForPrompt
};
