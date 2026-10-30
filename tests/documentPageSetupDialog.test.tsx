/** @vitest-environment happy-dom */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import StudioPageSetupDialog from '../app/tools/document-studio/components/StudioPageSetupDialog';
import { defaultDocumentSettings } from '../app/tools/document-studio/utils/documentSettings';
afterEach(cleanup);
function setup(){const onApply=vi.fn(),onClose=vi.fn();const settings=defaultDocumentSettings();settings.page.margins={preset:'narrow',topMm:12.7,bottomMm:12.7,startMm:12.7,endMm:12.7};render(<StudioPageSetupDialog settings={settings} direction="rtl" columns={1} gutter={4.23} onApply={onApply} onClose={onClose}/>);return{onApply,onClose};}
it('shows the InPage paper list and existing margins with no unrelated view controls',()=>{
 setup();expect([...screen.getByLabelText('Page size').querySelectorAll('option')].map(el=>el.textContent)).toEqual(['A4 210x297mm','A5 148x210mm','B4 250x353mm','B5 176x250mm','Folio 8.5x13"','Quarto 215x275mm','Custom Size']);
 expect((screen.getByLabelText('Width') as HTMLInputElement).value).toBe('210mm');expect((screen.getByLabelText('left margin') as HTMLInputElement).value).toBe('12.7mm');
 expect(screen.queryByLabelText('Facing Pages')).toBeNull();expect(screen.queryByLabelText('Double Sided')).toBeNull();
});
it('chooses sizes, swaps orientation and stores custom portrait dimensions without losing edits',()=>{
 const{onApply}=setup();fireEvent.change(screen.getByLabelText('Page size'),{target:{value:'b4'}});expect((screen.getByLabelText('Width') as HTMLInputElement).value).toBe('250mm');
 fireEvent.click(screen.getByLabelText('Landscape'));expect((screen.getByLabelText('Width') as HTMLInputElement).value).toBe('353mm');expect((screen.getByLabelText('Height') as HTMLInputElement).value).toBe('250mm');
 fireEvent.change(screen.getByLabelText('Width'),{target:{value:'320mm'}});expect((screen.getByLabelText('Page size') as HTMLSelectElement).value).toBe('custom');
 fireEvent.submit(screen.getByRole('dialog'));expect(onApply).toHaveBeenCalledWith(expect.objectContaining({orientation:'landscape',customSizeMm:{widthMm:250,heightMm:320}}));
});
it.each([['a5','148mm','210mm'],['b5','176mm','250mm'],['folio','215.9mm','330.2mm'],['quarto','215mm','275mm']])('fills %s dimensions', (size,width,height)=>{
 setup();fireEvent.change(screen.getByLabelText('Page size'),{target:{value:size}});expect((screen.getByLabelText('Width') as HTMLInputElement).value).toBe(width);expect((screen.getByLabelText('Height') as HTMLInputElement).value).toBe(height);
});
it('rejects invalid dimensions and margins without applying',()=>{const{onApply}=setup();fireEvent.change(screen.getByLabelText('Width'),{target:{value:'bad'}});fireEvent.submit(screen.getByRole('dialog'));expect(onApply).not.toHaveBeenCalled();expect(screen.getByRole('alert')).toBeTruthy();});
it('applies physical margins without relabeling them as mirrored margins',()=>{const{onApply}=setup();fireEvent.change(screen.getByLabelText('left margin'),{target:{value:'15mm'}});fireEvent.change(screen.getByLabelText('right margin'),{target:{value:'20mm'}});fireEvent.submit(screen.getByRole('dialog'));expect(onApply).toHaveBeenCalledWith(expect.objectContaining({left:15,right:20}));});
it('Cancel and Escape do not apply changes',()=>{const{onApply,onClose}=setup();fireEvent.keyDown(screen.getByRole('dialog'),{key:'Escape'});fireEvent.click(screen.getByRole('button',{name:'Cancel'}));expect(onClose).toHaveBeenCalledTimes(2);expect(onApply).not.toHaveBeenCalled();});
it('rejects out-of-range column guides',()=>{const{onApply}=setup();fireEvent.change(screen.getByLabelText('Columns'),{target:{value:'7'}});fireEvent.submit(screen.getByRole('dialog'));expect(onApply).not.toHaveBeenCalled();expect(screen.getByRole('alert').textContent).toMatch(/1–4/);});
