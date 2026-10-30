/** @vitest-environment happy-dom */
import {cleanup,render,screen} from '@testing-library/react';
import {afterEach,expect,it} from 'vitest';
import {Editor} from '@tiptap/core';
import {StudioParagraphDialog} from '../app/tools/document-studio/components/StudioParagraphDialog';
import {createDocumentStudioExtensions} from '../app/tools/document-studio/utils/documentSchema';
import {defaultDocumentSettings} from '../app/tools/document-studio/utils/documentSettings';
import {useMovableStudioDialog} from '../app/tools/document-studio/components/useMovableStudioDialog';
let editor:Editor|undefined;afterEach(()=>{cleanup();editor?.destroy();});
it('keeps every Paragraph field and moves Alignment outside Indents',()=>{
 editor=new Editor({extensions:createDocumentStudioExtensions(),content:'<p>Text</p>'});
 render(<StudioParagraphDialog editor={editor} settings={defaultDocumentSettings()} onClose={()=>{}}/>);
 const dialog=screen.getByRole('dialog',{name:'Paragraph Preferences'});
 expect(dialog.querySelector('fieldset[data-classic-group="Indents"] select[name="alignment"]')).toBeNull();
 expect(dialog.querySelector('[data-studio-dialog-drag-handle]')).not.toBeNull();
 expect([...dialog.querySelectorAll('[data-paragraph-field][name]')].map(el=>el.getAttribute('name'))).toEqual(['alignment','beginning','end','firstLine','breaks','keepTogether','keepWithNext','widows','orphans','lineHeight','interlineGap','before','after','tabStop','characterAlign','characterAlign','toc']);
});
it('movable title bars retain the normal arrow cursor',()=>{
 function Probe(){const drag=useMovableStudioDialog<HTMLDivElement>();return <div ref={drag.dialogRef}><div {...drag.handleProps}>Title</div></div>;}
 render(<Probe/>);expect(screen.getByText('Title').style.cursor).toBe('default');
});
