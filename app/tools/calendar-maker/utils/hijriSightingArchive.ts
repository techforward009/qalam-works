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
    offsets: [-1, -2, -1, -2, -1, -1, -1, -1, -1, -1, -1, -1],
    note: "Possible Pakistani moon-sighting arrangement for 2027. Edit this archive if later confirmation differs.",
    builtin: true,
  },
];
