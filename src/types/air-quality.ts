export type SupportMode = 'personal' | 'school' | 'industry';

export const INDIAN_CITIES = [
  'New Delhi',
  'Mumbai',
  'Bengaluru',
  'Hyderabad',
  'Chennai',
  'Kolkata',
  'Pune',
  'Ahmedabad',
  'Jaipur',
  'Lucknow',
  'Patna',
  'Chandigarh',
] as const;

export type IndianCity = (typeof INDIAN_CITIES)[number];

export const STEP_OUT_WINDOWS = [
  'Early Morning (6–9 AM)',
  'Office / College Hours (9 AM–6 PM)',
  'Evening Rush (6–10 PM)',
  'Late Night',
  'Mostly Indoors / WFH',
] as const;

export type StepOutWindow = (typeof STEP_OUT_WINDOWS)[number];

export const TRAVEL_MODES = [
  'Two-Wheeler / Bike',
  'Auto / Open Cab',
  'AC Car / Cab',
  'Metro / Local Train',
  'Bus / Walk',
] as const;

export type TravelMode = (typeof TRAVEL_MODES)[number];

export const HOUSEHOLD_MEMBERS = [
  'Just Me',
  'Kids Under 10',
  'School / Teenagers',
  'Seniors (60+)',
  'Pregnant Member',
] as const;

export type HouseholdMember = (typeof HOUSEHOLD_MEMBERS)[number];

export const HEALTH_SENSITIVITIES = [
  'None',
  'Asthma / Wheezing',
  'Dust / Sinus Allergy',
  'Heart / BP Condition',
  'Frequent Throat / Eye Irritation',
] as const;

export type HealthSensitivity = (typeof HEALTH_SENSITIVITIES)[number];

export const HOME_SURROUNDINGS = [
  'Main Road / Heavy Traffic',
  'Construction Nearby',
  'Quiet Residential / Gated',
  'High-Rise Floor',
  'Ground / Lower Floor',
] as const;

export type HomeSurrounding = (typeof HOME_SURROUNDINGS)[number];

export const EXISTING_PROTECTIONS = [
  'Air Purifier',
  'N95 / KN95 Masks',
  'Kitchen Chimney / Exhaust',
  'AC with Recirculation',
  'None (Zero-Cost Tips Only)',
] as const;

export type ExistingProtection = (typeof EXISTING_PROTECTIONS)[number];

export interface UserLocation {
  city: IndianCity | string;
  town?: string;
}

export interface SchoolProfile {
  studentGroup:
    | 'Primary (Ages 5-10)'
    | 'Middle & High (Ages 11-17)'
    | 'College & University';
  indoorSportsHall: 'Yes' | 'No';
  outdoorSportsSchedule:
    | 'Morning Assembly & PT'
    | 'Afternoon Games'
    | 'Suspended in Smog';
}

export interface IndustryProfile {
  facilityType:
    | 'Office & IT Park'
    | 'Manufacturing & Warehouse'
    | 'Construction & Logistics';
  shiftSchedule:
    | 'Day Shift (9 AM - 6 PM)'
    | '24/7 Rotating Shifts'
    | 'Early Morning / Night';
  dieselFleetUsage: 'None / Electric' | 'Backup DG Only' | 'Heavy Fleet & DG';
}

export interface UserProfile {
  mode: SupportMode;
  location: UserLocation;
  stepOutWindows: StepOutWindow[];
  travelModes: TravelMode[];
  householdMembers: HouseholdMember[];
  healthSensitivities: HealthSensitivity[];
  homeSurroundings: HomeSurrounding[];
  existingProtection: ExistingProtection[];
  school?: SchoolProfile;
  industry?: IndustryProfile;
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

export interface RegionalAdvisory {
  isGrapRegion: boolean;
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
  advisories: RegionalAdvisory[];
  simulated: boolean;
}

export interface RecommendationPayload {
  officialWarnings: {
    isGrapRegion: boolean;
    advisoryTitle: string;
    stageOrLevel: string;
    headline: string;
    bullets: string[];
  };
  clockWindows: {
    bestWindowToStepOut: string;
    bestWindowReason: string;
    peakSmokeHours: string;
    peakSmokeReason: string;
  };
  todaysPracticalMoves: {
    onTheMove: string;
    atHome: string;
    forYourHousehold: string;
    quickChecklist: string[];
  };
  futureLifestyleUpgrades: {
    summary: string;
    upgrades: Array<{
      title: string;
      description: string;
      whyItHelps: string;
    }>;
  };
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}
