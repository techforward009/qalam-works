/**
 * Audit records for fonts inspected locally. None of these files are bundled.
 * productionEnabled is false until a later, separate decision.
 * "observed" means read from the attached TTF. It is not a web-embedding grant.
 */
export type FontLicenseStatus = "restricted" | "unconfirmed" | "unknown";

export type FontCandidate = {
  id: string;
  filename: string;
  family: string;
  version: string;
  licenseStatus: FontLicenseStatus;
  productionEnabled: false;
};

export const FONT_CANDIDATES: readonly FontCandidate[] = [
  {
    id: "pdms-saleem",
    filename: "PDMS_Saleem_Quran.ttf",
    family: "_PDMS_Saleem_QuranFont",
    version: "Version 1.00 March 10, 2007",
    licenseStatus: "restricted",
    productionEnabled: false,
  },
  {
    id: "al-qalam-quran",
    filename: "Al Qalam Quran.ttf",
    family: "Al Qalam Quran",
    version: "1.10, 17 August, 2008",
    licenseStatus: "restricted",
    productionEnabled: false,
  },
  {
    id: "al-mushaf",
    filename: "Al_Mushaf.ttf",
    family: "Al_Mushaf",
    version: "September, 2008",
    licenseStatus: "unknown",
    productionEnabled: false,
  },
  {
    id: "attari-quran",
    filename: "Attari_Quran_Shipped.ttf",
    family: "Attari_Quran",
    version: "Version 2.00 March 10, 2009",
    licenseStatus: "restricted",
    productionEnabled: false,
  },
  {
    id: "noor-e-quran",
    filename: "Noor_e_Quran.ttf",
    family: "Noor e Quran",
    version: "December 2007",
    licenseStatus: "unknown",
    productionEnabled: false,
  },
  {
    id: "noorehira",
    filename: "noorehira.ttf",
    family: "noorehira",
    version: "Version 2.000 2009 initial release",
    licenseStatus: "unconfirmed",
    productionEnabled: false,
  },
  {
    id: "al-majeed",
    filename: "Al Majeed Quranic Font_shiped.ttf",
    family: "Al Majeed Quranic Font",
    version: "Version 1.00 March 24, 2009",
    licenseStatus: "restricted",
    productionEnabled: false,
  },
];
