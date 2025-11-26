// Centralized branch constants for the application
// All branch dropdowns should use this constant to ensure consistency

export const ALL_BRANCHES = [
  'Computer Engineering',
  'Information Technology',
  'Electronics & Telecommunication',
  'Mechanical Engineering',
  'Electrical Engineering',
  'Civil Engineering',
  'Automobile Engineering',
  'Instrumentation Engineering',
  'Artificial Intelligence & Machine Learning (AIML)',
  'Mechatronics Engineering'
] as const;

export type Branch = typeof ALL_BRANCHES[number];

