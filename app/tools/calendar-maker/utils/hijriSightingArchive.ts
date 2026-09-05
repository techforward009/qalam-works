export interface HijriSightingProfile {
  id: string;
  name: string;
  nameUr: string;
  year: number;
  offsets: number[];
  note: string;
  builtin?: boolean;
}

export const SIGHTING_ARCHIVE_STORAGE_KEY = "qalam-works-hijri-sighting-archive";

export const BUILTIN_SIGHTING_PROFILES: HijriSightingProfile[] = [
  {
    id: "pk-2027-provisional",
    name: "Pakistan 2027 (provisional)",
    nameUr: "پاکستان ۲۰۲۷ (عارضی)",
    year: 2027,
    offsets: [-1, -2, -2, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    note: "Possible Pakistani moon-sighting arrangement for 2027. Edit this archive if later confirmation differs.",
    builtin: true,
  },
];

const BUILTIN_SIGHTING_IDS = new Set(BUILTIN_SIGHTING_PROFILES.map((profile) => profile.id));

export function isSightingProfile(value: unknown): value is HijriSightingProfile {
  if (!value || typeof value !== "object") return false;
  const profile = value as HijriSightingProfile;
  return (
    typeof profile.id === "string" &&
    typeof profile.name === "string" &&
    typeof profile.nameUr === "string" &&
    Number.isInteger(profile.year) &&
    Array.isArray(profile.offsets) &&
    profile.offsets.length === 12 &&
    profile.offsets.every((offset) => Number.isInteger(offset) && offset >= -2 && offset <= 2)
  );
}

export function isBuiltinSightingId(id: string): boolean {
  return BUILTIN_SIGHTING_IDS.has(id);
}

export function readStoredSightingProfiles(): HijriSightingProfile[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(SIGHTING_ARCHIVE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isSightingProfile).map((profile) => ({ ...profile, builtin: false }));
  } catch {
    return [];
  }
}

export function writeStoredSightingProfiles(profiles: HijriSightingProfile[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    SIGHTING_ARCHIVE_STORAGE_KEY,
    JSON.stringify(profiles.map((profile) => ({
      id: profile.id,
      name: profile.name,
      nameUr: profile.nameUr,
      year: profile.year,
      offsets: profile.offsets,
      note: profile.note,
    }))),
  );
}

export function listSightingProfiles(stored: HijriSightingProfile[] = []): HijriSightingProfile[] {
  const storedById = new Map(stored.map((profile) => [profile.id, profile]));
  const builtins = BUILTIN_SIGHTING_PROFILES.map((builtin) => {
    const override = storedById.get(builtin.id);
    return override
      ? { ...builtin, ...override, id: builtin.id, builtin: true }
      : builtin;
  });
  const custom = stored.filter((profile) => !BUILTIN_SIGHTING_IDS.has(profile.id));
  return [...builtins, ...custom];
}
