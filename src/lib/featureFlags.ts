export interface FeatureFlags {
  roadTripPlanner: boolean;
  mobilitySponsors: boolean;
  fastTrackKyc: boolean;
}

const FEATURE_FLAGS_KEY = "staynth.feature-flags.v1";

const DEFAULT_FLAGS: FeatureFlags = {
  roadTripPlanner: false, // OFF by default at launch
  mobilitySponsors: true,
  fastTrackKyc: true,
};

export function loadFeatureFlags(): FeatureFlags {
  try {
    const raw = localStorage.getItem(FEATURE_FLAGS_KEY);
    if (!raw) return DEFAULT_FLAGS;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_FLAGS, ...parsed };
  } catch {
    return DEFAULT_FLAGS;
  }
}

export function saveFeatureFlags(flags: FeatureFlags): void {
  try {
    localStorage.setItem(FEATURE_FLAGS_KEY, JSON.stringify(flags));
  } catch {
    // ignore
  }
}
