import type { HijriDateAuthority } from "../hijri-authority/types";

/** Product interpretation only; Yallop visibility science remains independent. */
export type DateStudioMonthStartState =
  | "day29_qualifies"
  | "day29_does_not_qualify"
  | "day30_forced_next_month"
  | "not_month_boundary";

export type HijriDayAuthority = HijriDateAuthority;

export interface DateStudioMonthStartInterpretation {
  state: DateStudioMonthStartState;
  authority: HijriDayAuthority;
}

export function interpretDateStudioMonthStart(
  hijriDay: number | null,
  acceptedByPolicy: boolean,
  authority: HijriDayAuthority,
): DateStudioMonthStartInterpretation {
  const state = hijriDay === 29 ? (acceptedByPolicy ? "day29_qualifies" : "day29_does_not_qualify")
    : hijriDay === 30 ? "day30_forced_next_month" : "not_month_boundary";
  return { state, authority };
}
