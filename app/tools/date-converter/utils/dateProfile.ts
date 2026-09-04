
import { convert, type DateParts } from "./dateEngine";
import { getRichDateIntelligence } from "./dateIntelligence";
import { resolveRegionalHijriReference, type RegionalReference } from "./regionalDateEvidence";

const weekdays = [
  { en: "Sunday", ur: "اتوار" },
  { en: "Monday", ur: "پیر" },
  { en: "Tuesday", ur: "منگل" },
  { en: "Wednesday", ur: "بدھ" },
  { en: "Thursday", ur: "جمعرات" },
  { en: "Friday", ur: "جمعہ" },
  { en: "Saturday", ur: "ہفتہ" },
];

const gregorianMonths = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const hijriMonths = ["Muharram","Safar","Rabi al-Awwal","Rabi al-Thani","Jumada al-Awwal","Jumada al-Thani","Rajab","Sha'ban","Ramadan","Shawwal","Dhu al-Qadah","Dhu al-Hijjah"];
const solarMonths = ["Farvardin","Ordibehesht","Khordad","Tir","Mordad","Shahrivar","Mehr","Aban","Azar","Dey","Bahman","Esfand"];

export interface DateProfile {
  gregorian: DateParts;
  hijri: DateParts;
  solar: DateParts | null;
  weekday: { en:string; ur:string };
  leapYear:boolean;
  dayOfYear:number;
  isoWeek:number;
  julianDayNumber:number;
  elapsedDays:number;
  age:{years:number;months:number;days:number}|null;
  futureState:"past"|"today"|"future";
  relatedCalendarLinks:Array<{label:string;href:string}>;
  regionalReference:RegionalReference|null;
}

export function formatGregorianDate(date:DateParts) {
 return `${date.day} ${gregorianMonths[date.month-1]} ${date.year}`;
}
export function formatHijriDate(date:DateParts) {
 return `${date.day} ${hijriMonths[date.month-1]} ${date.year} AH`;
}
export function formatSolarDate(date:DateParts|null) {
 return date ? `${date.day} ${solarMonths[date.month-1]} ${date.year} SH` : "—";
}

export function buildDateProfile(gregorian:DateParts,countryId?:string):DateProfile {
 const converted=convert("gregorian",gregorian);
 const intelligence=getRichDateIntelligence(gregorian);
 return {
  gregorian,
  hijri:converted.hijri,
  solar:converted.solar ?? null,
  weekday:weekdays[(intelligence.weekdayIndex + 1) % 7] ?? weekdays[0],
  leapYear:intelligence.leapYear,
  dayOfYear:intelligence.dayOfYear,
  isoWeek:intelligence.isoWeek,
  julianDayNumber:intelligence.julianDayNumber,
  elapsedDays:intelligence.wholeDayDistance,
  age:intelligence.age,
  futureState:intelligence.relation,
  relatedCalendarLinks:[
   {label:"Calendar Maker",href:"/tools/calendar-maker"},
   {label:"Date Converter",href:"/tools/date-converter"}
  ],
  regionalReference:countryId ? resolveRegionalHijriReference(countryId,converted.hijri):null
 };
}
