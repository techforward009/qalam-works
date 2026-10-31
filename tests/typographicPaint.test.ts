/** @vitest-environment happy-dom */
import {afterEach,expect,it,vi} from 'vitest';
import {collectTypographicPaint} from '../app/tools/document-studio/utils/typographicPaint';
import {LEGACY_TYPOGRAPHIC_PREFERENCES} from '../app/tools/document-studio/utils/typographicPreferences';
afterEach(()=>{vi.restoreAllMocks();document.body.replaceChildren();});
function root(text:string){vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue({font:'',measureText:()=>({width:8})} as unknown as CanvasRenderingContext2D);const el=document.createElement('div');el.innerHTML='<p style="direction:rtl;font-size:32px"></p>';el.firstElementChild!.textContent=text;document.body.append(el);return el;}
it('adds one normal advance across a whole Urdu run without rewriting or splitting words',()=>{const el=root('جمعۃ المبارک'),html=el.innerHTML,jobs=collectTypographicPaint(el,{...LEGACY_TYPOGRAPHIC_PREFERENCES,firstSpaceWidth:100});expect(jobs).toHaveLength(1);expect(jobs[0].style).toBe('word-spacing:8px');expect(jobs[0].from).toBe(0);expect(jobs[0].to).toBe('جمعۃ المبارک'.length);expect(el.innerHTML).toBe(html);});
it('legacy preferences do not decorate text and Latin phrases are not spaced',()=>{const el=root('یہ Hello 123 ہے');expect(collectTypographicPaint(el,LEGACY_TYPOGRAPHIC_PREFERENCES)).toEqual([]);expect(collectTypographicPaint(el,{...LEGACY_TYPOGRAPHIC_PREFERENCES,firstSpaceWidth:100})).toEqual([]);});
