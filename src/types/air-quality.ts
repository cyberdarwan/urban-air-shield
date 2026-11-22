export type SupportMode = 'personal' | 'school' | 'industry';

export const TOP_METRO_CITIES = [
  'New Delhi',
  'Mumbai',
  'Bengaluru',
  'Hyderabad',
  'Chennai',
  'Kolkata',
  'Pune',
  'Ahmedabad',
] as const;

export const EXPANDED_INDIAN_CITIES = [
  'New Delhi',
  'Mumbai',
  'Bengaluru',
  'Hyderabad',
  'Chennai',
  'Kolkata',
  'Pune',
  'Ahmedabad',
  'Secunderabad',
  'Visakhapatnam',
  'Vijayawada',
  'Coimbatore',
  'Kochi',
  'Thiruvananthapuram',
  'Mysuru',
  'Mangaluru',
  'Madurai',
  'Tiruchirappalli',
  'Nagpur',
  'Nashik',
  'Thane',
  'Navi Mumbai',
  'Surat',
  'Vadodara',
  'Rajkot',
  'Indore',
  'Bhopal',
  'Jabalpur',
  'Gwalior',
  'Jaipur',
  'Jodhpur',
  'Udaipur',
  'Kota',
  'Lucknow',
  'Kanpur',
  'Varanasi',
  'Prayagraj',
  'Agra',
  'Meerut',
  'Noida',
  'Greater Noida',
  'Gurugram',
  'Ghaziabad',
  'Faridabad',
  'Chandigarh',
  'Amritsar',
  'Ludhiana',
  'Jalandhar',
  'Dehradun',
  'Patna',
  'Gaya',
  'Ranchi',
  'Jamshedpur',
  'Raipur',
  'Bhubaneswar',
  'Cuttack',
  'Guwahati',
  'Shillong',
  'Imphal',
  'Srinagar',
  'Jammu',
] as const;

export const STEP_OUT_WINDOWS = [
  'Early Morning (6–9 AM)',
  'Office / College Hours (9 AM–6 PM)',
  'Evening Rush (6–10 PM)',
  'Late Night',
  'Mostly Indoors / WFH',
] as const;

export const TRAVEL_MODES = [
  'Two-Wheeler / Bike',
  'Auto / Open Cab',
  'AC Car / Cab',
  'Metro / Local Train',
  'Bus / Walk',
] as const;

export const HOUSEHOLD_MEMBERS = [
  'Just Me',
  'Kids Under 10',
  'School / Teenagers',
  'Seniors (60+)',
  'Pregnant Member',
] as const;

export const HEALTH_SENSITIVITIES = [
  'None',
  'Asthma / Wheezing',
  'Dust / Sinus Allergy',
  'Heart / BP Condition',
  'Frequent Throat / Eye Irritation',
] as const;

export const HOME_SURROUNDINGS = [
  'Main Road / Heavy Traffic',
  'Construction Nearby',
  'Quiet Residential / Gated',
  'High-Rise Floor',
  'Ground / Lower Floor',
] as const;

export const EXISTING_PROTECTIONS = [
  'Air Purifier',
  'N95 / KN95 Masks',
  'Kitchen Chimney / Exhaust',
  'AC with Recirculation',
  'None (Zero-Cost Tips Only)',
] as const;

export interface UserLocation {
  city: string;
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
  stepOutWindows: string[];
  travelModes: string[];
  householdMembers: string[];
  healthSensitivities: string[];
  homeSurroundings: string[];
  existingProtection: string[];
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
  co?: number;
  so2?: number;
}

export interface MappedPollutantDebug {
  rawValue: number;
  rawUnit: string;
  convertedValue: number;
  cpcbUnit: string;
  subIndex: number;
}

export interface AqiDebugInfo {
  source: 'OpenAQ Live' | 'CPCB Live' | 'Fallback';
  upstreamStatus: number | null;
  stationId: number | string | null;
  stationName: string;
  mappedPollutants: Record<string, MappedPollutantDebug>;
  fallbackReason: string | null;
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
  debug?: AqiDebugInfo;
}

export interface RecommendationPayload {
  heroVerdict: string;
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

export interface CareSpaceProfile {
  id: string;
  label: string;
  city: string;
  safeAqiLimit: number;
  profile: UserProfile;
  updatedAt: string;
}

export interface CareSpacesStore {
  careSpaces: CareSpaceProfile[];
  activeCareSpaceId: string;
}
