export type SupportMode = 'personal' | 'school' | 'industry';

export type BudgetTier =
  | 'Zero-Cost Household Changes'
  | 'Mid-Range'
  | 'HEPA Purifiers';

export type HealthSensitivity = 'None' | 'Asthma/Respiratory' | 'Cardiac';

export type CommuteType =
  | 'Two-Wheeler/Walk'
  | 'Car'
  | 'Metro/Bus'
  | 'Work From Home';

export type ExerciseHabit =
  | 'Daily Outdoor'
  | '3x/Week'
  | 'Indoor Only'
  | 'Minimal';

export interface UserLocation {
  state: string;
  city: string;
  town: string;
}

export interface PersonalProfile {
  adults: number;
  children: number;
  seniors: number;
  sensitivity: HealthSensitivity;
  commute: CommuteType;
  exerciseHabit: ExerciseHabit;
}

export interface SchoolProfile {
  studentGroup: 'Primary (Ages 5-10)' | 'Middle & High (Ages 11-17)' | 'College & University';
  indoorSportsHall: 'Yes' | 'No';
  outdoorSportsSchedule: 'Morning Assembly & PT' | 'Afternoon Games' | 'Suspended in Smog';
  dropoffType: 'School Bus Fleet' | 'Private Cars & Vans' | 'Walk / Cycle';
}

export interface IndustryProfile {
  facilityType: 'Office & IT Park' | 'Manufacturing & Warehouse' | 'Construction & Logistics';
  shiftSchedule: 'Day Shift (9 AM - 6 PM)' | '24/7 Rotating Shifts' | 'Early Morning / Night';
  dieselFleetUsage: 'None / Electric' | 'Backup DG Only' | 'Heavy Fleet & DG';
}

export interface UserProfile {
  mode: SupportMode;
  location: UserLocation;
  personal?: PersonalProfile;
  school?: SchoolProfile;
  industry?: IndustryProfile;
  budget: BudgetTier;
  updatedAt: string;
}

export type AqiCategory =
  | 'Good'
  | 'Satisfactory'
  | 'Moderate'
  | 'Poor'
  | 'Very Poor'
  | 'Severe';

export interface PollutantLevels {
  pm25: number;
  pm10: number;
  no2: number;
  o3: number;
}

export interface GrapAdvisory {
  stage: string;
  title: string;
  summary: string;
  actions: string[];
}

export interface AqiResponse {
  stationName: string;
  locationLabel: string;
  aqi: number;
  category: AqiCategory;
  pollutants: PollutantLevels;
  source: string;
  timestamp: string;
  advisories: GrapAdvisory[];
  simulated: boolean;
}

export interface RecommendationPayload {
  officialWarnings: {
    grapStage: string;
    headline: string;
    restrictions: string[];
  };
  healthHazardImpact: {
    riskLevel: string;
    summary: string;
    groupImpacts: Array<{
      group: string;
      risk: string;
      guidance: string;
    }>;
  };
  commuteAndTransportPlan: {
    dayPlan: string;
    weekPlan: string;
    safeTimeWindows: string[];
    maskGuidance: string;
    emissionSavings: string;
  };
  subtleHouseholdChanges: {
    summary: string;
    adjustments: Array<{
      title: string;
      description: string;
      exposureDropPercent: number;
      co2SavedKgPerWeek: number;
    }>;
  };
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}
