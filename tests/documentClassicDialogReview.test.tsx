/** @vitest-environment happy-dom */
import {readFileSync} from 'node:fs';
import {cleanup,render,screen} from '@testing-library/react';
import {afterEach,expect,it} from 'vitest';
import {Editor} from '@tiptap/core';
import {StudioParagraphDialog} from '../app/tools/document-studio/components/StudioParagraphDialog';
import {createDocumentStudioExtensions} from '../app/tools/document-studio/utils/documentSchema';
import {defaultDocumentSettings} from '../app/tools/document-studio/utils/documentSettings';
import {useMovableStudioDialog} from '../app/tools/document-studio/components/useMovableStudioDialog';
let editor:Editor|undefined;afterEach(()=>{cleanup();editor?.destroy();});
it('restores main Paragraph layout and all its existing named fields',()=>{
 editor=new Editor({extensions:createDocumentStudioExtensions(),content:'<p>Text</p>'});
 render(<StudioParagraphDialog editor={editor} settings={defaultDocumentSettings()} onClose={()=>{}}/>);
 const dialog=screen.getByRole('dialog',{name:'Paragraph Preferences'});
 // happy-dom drops CSS min(); real viewport geometry is covered in Playwright.
 expect(readFileSync('app/tools/document-studio/components/StudioParagraphDialog.tsx','utf8')).toContain('width: "min(448px, 100%)"');
 expect([...dialog.querySelectorAll('[data-paragraph-field][name]')].map(el=>el.getAttribute('name'))).toEqual(['alignment','beginning','end','firstLine','breaks','keepTogether','keepWithNext','widows','orphans','lineHeight','interlineGap','before','after','tabStop','characterAlign','characterAlign','toc']);
});
it('movable title bars retain the normal arrow cursor',()=>{
 function Probe(){const drag=useMovableStudioDialog<HTMLDivElement>();return <div ref={drag.dialogRef}><div {...drag.handleProps}>Title</div></div>;}
 render(<Probe/>);expect(screen.getByText('Title').style.cursor).toBe('default');
});
