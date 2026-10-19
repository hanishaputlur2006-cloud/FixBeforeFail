// Risk scoring configuration.
// Change weights and point tables here; the engine in scoreReport.js reads from this file.
// Each factor's points never exceed its max, and the maxes add up to 100.

export const SCORING_CONFIG = {
  severity: {
    label: 'Severity',
    max: 25,
    points: { minor: 6, moderate: 13, major: 20, critical: 25 },
    labels: { minor: 'Reported as minor', moderate: 'Reported as moderate', major: 'Reported as major', critical: 'Reported as critical' },
  },

  safety: {
    label: 'Safety impact',
    max: 20,
    points: { none: 2, possible: 10, immediate: 20 },
    labels: { none: 'No immediate danger', possible: 'Possible risk to people', immediate: 'Immediate danger to people' },
  },

  publicImpact: {
    label: 'Public impact',
    max: 20,
    // How many people typically depend on this kind of asset...
    categoryPoints: { water: 14, roads: 13, equipment: 11, streetlights: 10, pathways: 9, facilities: 6 },
    // ...plus extra points for busy places.
    footfallBonus: { main_road: 6, transit: 6, market: 6, hospital: 6, school: 6, residential: 3, park: 2, other: 0 },
  },

  repeats: {
    label: 'Repeat reports',
    max: 15,
    // Points per additional independent report, capped at max so volume alone cannot dominate.
    pointsPerExtraReport: 3,
    firstExtraBonus: 3,
  },

  location: {
    label: 'Location importance',
    max: 10,
    points: { school: 10, hospital: 10, transit: 8, main_road: 8, market: 6, park: 5, residential: 4, other: 3 },
    labels: {
      school: 'School zone',
      hospital: 'Hospital zone',
      transit: 'Transit stop or station',
      main_road: 'Main road',
      market: 'Market or commercial area',
      park: 'Park or recreation area',
      residential: 'Residential area',
      other: 'Other location',
    },
  },

  time: {
    label: 'Time unresolved',
    max: 10,
    // Points grow steadily and reach the max after this many days open.
    daysToMax: 14,
  },
}

export const NEUTRAL_SHARE = 0.5 // Missing information scores half the factor's max and is flagged.
