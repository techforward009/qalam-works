// @vitest-environment happy-dom
import React from 'react';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import CustomSermonWorkspace from '../app/tools/khateeb-studio/CustomSermonWorkspace';
import { loadCustomProjects } from '../app/tools/khateeb-studio/engine/customSermonStorage';
vi.mock('../app/lib/language-context',()=>({useLanguage:()=>({language:'en'})}));
afterEach(()=>{cleanup();localStorage.clear();vi.restoreAllMocks();});
function create(){fireEvent.change(screen.getByRole('textbox',{name:'Title'}),{target:{value:'Patience'}});fireEvent.change(screen.getByRole('textbox',{name:'Objective'}),{target:{value:'Steadfastness'}});fireEvent.click(screen.getByRole('button',{name:'Start draft'}));}
test('immediate edits and last active draft survive an immediate unmount/remount', () => {
 const first=render(<CustomSermonWorkspace locale='en'/>);create(); fireEvent.change(screen.getByRole('textbox',{name:'My core material'}),{target:{value:'Latest personal notes'}});fireEvent.change(screen.getByRole('textbox',{name:'Opening and governing question — my notes'}),{target:{value:'Opening notes'}});first.unmount();render(<CustomSermonWorkspace locale='en'/>);expect((screen.getByRole('textbox',{name:'My core material'}) as HTMLTextAreaElement).value).toBe('Latest personal notes');expect((screen.getByRole('textbox',{name:'Opening and governing question — my notes'}) as HTMLTextAreaElement).value).toBe('Opening notes');
});
test('quota failure keeps edited text and never claims successful saving', () => {
 render(<CustomSermonWorkspace locale='en'/>); create();vi.spyOn(localStorage,'setItem').mockImplementation(()=>{throw Error('quota')});fireEvent.change(screen.getByRole('textbox',{name:'My core material'}),{target:{value:'Unstored but retained'}});expect(screen.getByRole('alert').textContent).toContain('could not be saved');expect(screen.queryByText('Changes saved.')).toBeNull();expect((screen.getByRole('textbox',{name:'My core material'}) as HTMLTextAreaElement).value).toBe('Unstored but retained');expect(loadCustomProjects(localStorage).projects[0].ownMaterial).toBe('');
});
test('manual copy fallback contains the latest complete draft and print targets the same text', async()=>{
 Object.defineProperty(navigator,'clipboard',{configurable:true,value:undefined});render(<CustomSermonWorkspace locale='en'/>);create();fireEvent.change(screen.getByRole('textbox',{name:'My core material'}),{target:{value:'Print and copy this note'}});fireEvent.click(screen.getByRole('button',{name:'Copy full draft'}));await waitFor(()=>expect(document.querySelector('dialog')?.open).toBe(true));expect((screen.getByRole('textbox',{name:'Full text for copying'}) as HTMLTextAreaElement).value).toContain('Print and copy this note');const print=vi.fn();window.print=print;fireEvent.click(screen.getByRole('button',{name:'Close'}));fireEvent.click(screen.getByRole('button',{name:'Print draft / Save PDF'}));expect(print).toHaveBeenCalledOnce();expect(document.documentElement.dataset.khateebPrint).toBe('custom');expect(document.getElementById('khateeb-custom-print-area')?.textContent).toContain('Print and copy this note');
});
