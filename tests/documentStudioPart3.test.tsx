// @vitest-environment happy-dom
import {afterEach,describe,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {DOCUMENT_ZOOM_PRESETS,functionKeyZoom,parseStoredZoom,resolveZoomFactor,snapStudioGuide} from '../app/tools/document-studio/utils/documentView';
import {TEXT_CONTEXT_ITEMS,CONTEXT_ZOOMS,textContextDisabled,contextMenuPosition} from '../app/tools/document-studio/utils/textContextMenu';
import {StudioHomeButton} from '../app/tools/document-studio/components/StudioHomeButton';
const {push}=vi.hoisted(()=>({push:vi.fn()}));
vi.mock('next/navigation',()=>({useRouter:()=>({push})}));
afterEach(()=>{cleanup();push.mockClear();});
describe('Part 3 zoom',()=>{
 it.each([200,300])('supports and persists %s percent',value=>{expect(DOCUMENT_ZOOM_PRESETS).toContain(value);expect(parseStoredZoom(String(value))).toBe(value);expect(resolveZoomFactor(value as 200|300,800,1100,1200,900)).toBe(value/100);});
 it('uses the InPage function-key mapping only',()=>{expect(['F6','F7','F8','F5'].map(functionKeyZoom)).toEqual([50,100,200,null]);});
 it.each([2,3])('snaps enlarged guides to whole screen pixels at %s',scale=>{expect(snapStudioGuide(745.6875,scale)*scale).toBe(Math.round(745.6875*scale));expect(snapStudioGuide(48,scale)).toBe(48);});
});
describe('text context catalog',()=>{
 it('keeps InPage order, separators and fit choices',()=>{
  expect(TEXT_CONTEXT_ITEMS.map(item=>'label'in item?item.label:'—')).toEqual(['Zoom','—','Import…','—','Select All','Cut','Copy','Clear','Paste','—','Character…','Paragraph…','—','Text To Table…']);
  expect(CONTEXT_ZOOMS.map(item=>item.value)).toEqual([50,75,100,200,300,'fit-width','fit-page']);
 });
 it('disables unimplemented and selection-only actions',()=>{for(const id of ['cut','copy','clear']){expect(textContextDisabled(id,false)).toBe(true);expect(textContextDisabled(id,true)).toBe(false);}expect(textContextDisabled('textToTable',true)).toBe(true);expect(textContextDisabled('paste',false)).toBe(false);});
 it('clamps the popup into the viewport',()=>{expect(contextMenuPosition(389,850,200,310,390,851)).toEqual({left:186,top:537});expect(contextMenuPosition(-10,-10,200,310,390,851)).toEqual({left:4,top:4});});
});
describe('Home guard',()=>{
 it('uses an original house and an accessible Home label',()=>{render(<StudioHomeButton dirty={false}/>);const link=screen.getByRole('link',{name:'Home'});expect(link.getAttribute('title')).toBe('Home');expect(link.querySelector('svg path')?.getAttribute('d')).toContain('14.5');expect(link.getAttribute('href')).toBe('/');});
 it('offers Stay and Leave only when dirty',()=>{render(<StudioHomeButton dirty/>);fireEvent.click(screen.getByRole('link',{name:'Home'}));expect(screen.getByRole('dialog')).toBeTruthy();expect(screen.getByText('You have unsaved changes. Leave Qalam Page?')).toBeTruthy();fireEvent.click(screen.getByRole('button',{name:'Stay'}));expect(screen.queryByRole('dialog')).toBeNull();expect(push).not.toHaveBeenCalled();fireEvent.click(screen.getByRole('link',{name:'Home'}));fireEvent.click(screen.getByRole('button',{name:'Leave'}));expect(push).toHaveBeenCalledWith('/');});
});
