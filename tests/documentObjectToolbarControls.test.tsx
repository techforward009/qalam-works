/** @vitest-environment happy-dom */
import {afterEach,expect,test,vi} from 'vitest';
import {cleanup,render,screen} from '@testing-library/react';
import StudioObjectToolbar from '../app/tools/document-studio/components/StudioObjectToolbar';
import type {StudioFrame} from '../app/tools/document-studio/components/StudioObjectLayer';
afterEach(cleanup);
const frame:StudioFrame={id:'one',kind:'line',page:1,xMm:20,yMm:30,wMm:70,hMm:30,text:'',flip:false};
test('line fill is honestly unavailable rather than accepting a cosmetic no-op',()=>{
 render(<StudioObjectToolbar frames={[frame]} onCommit={vi.fn()}/>);
 expect((screen.getByRole('combobox',{name:'Object fill'}) as HTMLSelectElement).disabled).toBe(true);
 expect(screen.getByRole('combobox',{name:'Object fill'}).title).toContain('not applicable');
});
test('mixed line/rectangle selection does not silently apply fill to only part of the selection',()=>{
 render(<StudioObjectToolbar frames={[frame,{...frame,id:'two',kind:'rect'}]} onCommit={vi.fn()}/>);
 expect((screen.getByRole('combobox',{name:'Object fill'}) as HTMLSelectElement).disabled).toBe(true);
 expect((screen.getByRole('combobox',{name:'Border colour'}) as HTMLSelectElement).disabled).toBe(false);
});
