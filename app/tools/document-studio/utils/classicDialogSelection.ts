/** Dialog chrome is not authored text. Keep native input selection and any
 * existing story range; never redirect Ctrl+A or a chrome drag to the story. */
export function installClassicDialogSelection(document:Document){
 const scope='[data-studio-dialog],[data-inpage2009-dialog],[data-studio-new-document],[data-studio-pdf-recovery],[data-studio-find-ui],[data-studio-root] [role="dialog"]';
 const chrome=(target:EventTarget|null)=>target instanceof Element&&target.closest(scope)&&!target.closest('input,textarea,select,[contenteditable="true"]');
 const key=(event:KeyboardEvent)=>{if(chrome(event.target)&&(event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='a'){event.preventDefault();event.stopPropagation();}};
 const select=(event:Event)=>{if(chrome(event.target))event.preventDefault();};
 document.addEventListener('keydown',key,true);document.addEventListener('selectstart',select,true);
 return()=>{document.removeEventListener('keydown',key,true);document.removeEventListener('selectstart',select,true);};
}
