export interface TypographicPreferences { firstSpaceWidth:number; subsequentSpaceWidth:number; reduceLatinFontsize:number }
export const DEFAULT_TYPOGRAPHIC_PREFERENCES:TypographicPreferences={firstSpaceWidth:0,subsequentSpaceWidth:25,reduceLatinFontsize:18};
/** Missing preferences identify an existing document, whose appearance is kept. */
export const LEGACY_TYPOGRAPHIC_PREFERENCES:TypographicPreferences={firstSpaceWidth:0,subsequentSpaceWidth:100,reduceLatinFontsize:0};
export function parseTypographicPreferences(raw:unknown):TypographicPreferences {
 if(!raw||typeof raw!=='object')return {...LEGACY_TYPOGRAPHIC_PREFERENCES};
 const value=raw as Record<string,unknown>,number=(key:keyof TypographicPreferences,max:number)=>typeof value[key]==='number'&&Number.isFinite(value[key])&&value[key]>=0&&value[key]<=max?value[key] as number:DEFAULT_TYPOGRAPHIC_PREFERENCES[key];
 return {firstSpaceWidth:number('firstSpaceWidth',500),subsequentSpaceWidth:number('subsequentSpaceWidth',500),reduceLatinFontsize:number('reduceLatinFontsize',50)};
}
