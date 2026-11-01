import {Extension} from "@tiptap/core";
import {Plugin} from "@tiptap/pm/state";

const safeColor=(value:unknown):string|null=>
 typeof value==="string"&&/^#[0-9a-f]{6}$/i.test(value)?value.toLowerCase():null;
const borderTypes=["none","solid","dotted","dashed","double"] as const;
const safeBorder=(value:unknown)=>borderTypes.includes(value as typeof borderTypes[number])?value:"none";
const numeric=(value:unknown,fallback:number,min:number,max:number)=>{
 const n=Number(value);return Number.isFinite(n)&&n>=min&&n<=max?n:fallback;
};
const tableStyles=(attrs:Record<string,unknown>)=>{
 const alignment=attrs.tableAlignment;
 const indent=numeric(attrs.tableIndentMm,0,0,120);
 const width=numeric(attrs.tableFormatWidthPx,0,0,2000);
 const dir=attrs.tableFlow==="ltr"?"ltr":"rtl";
 const styles=[`margin-inline-start:${indent}mm`];
 if(alignment==="center")styles.push("margin-left:auto","margin-right:auto");
 else if(alignment==="left")styles.push("margin-left:0","margin-right:auto");
 else if(alignment==="right")styles.push("margin-left:auto","margin-right:0");
 if(width>0)styles.push(`width:${width}px`,"max-width:100%");
 return {style:styles.join(";"),"data-table-alignment":alignment||"","data-table-indent":String(indent),"data-table-flow":dir};
};
export const QalamTableFormatAttributes=Extension.create({
 name:"qalamTableFormatAttributes",
 addProseMirrorPlugins(){
  return [new Plugin({
   view(view){
    const sync=()=>{
     const tables:Record<string,unknown>[]=[];
     view.state.doc.descendants(node=>{
      if(node.type.name==="table")tables.push(node.attrs);
     });
     view.dom.querySelectorAll<HTMLTableElement>("table.qalam-document-table").forEach((table,index)=>{
      const attrs=tables[index];
      if(!attrs)return;
      const alignment=attrs.tableAlignment;
      const dir=attrs.tableFlow==="ltr"?"ltr":attrs.dir==="ltr"?"ltr":"rtl";
      table.dir=dir;
      table.dataset.tableAlignment=typeof alignment==="string"?alignment:"";
      table.dataset.tableFlow=dir;
      const indent=Number(attrs.tableIndentMm)||0;
      table.dataset.tableIndent=String(indent);
      table.style.marginInlineStart=indent+"mm";
      table.style.marginLeft=alignment==="left"?"0":alignment==="center"||alignment==="right"?"auto":"";
      table.style.marginRight=alignment==="right"?"0":alignment==="center"||alignment==="left"?"auto":"";
      const width=Number(attrs.tableFormatWidthPx)||0;
      if(width>0)table.style.width=width+"px";
      if(width>0)table.style.maxWidth="100%";
     });
    };
    sync();return {update:sync};
   }
  })];
 },
 addGlobalAttributes(){return [
  {types:["table"],attributes:{
   tableAlignment:{default:null,parseHTML:el=>el.getAttribute("data-table-alignment")||null,renderHTML:a=>tableStyles(a)},
   tableIndentMm:{default:0,parseHTML:el=>numeric(el.getAttribute("data-table-indent"),0,0,120)},
   tableFormatWidthPx:{default:null,parseHTML:el=>numeric(el.getAttribute("data-table-width"),0,0,2000),renderHTML:a=>a.tableFormatWidthPx?{"data-table-width":a.tableFormatWidthPx}:{}},
   tableFlow:{default:null,parseHTML:el=>el.getAttribute("data-table-flow")||null,renderHTML:a=>a.tableFlow?{"data-table-flow":a.tableFlow}:{}},
  }},
  {types:["tableCell","tableHeader"],attributes:{
   tableFill:{default:null,parseHTML:el=>safeColor(el.getAttribute("data-table-fill")),renderHTML:a=>a.tableFill?{"data-table-fill":a.tableFill,style:`background-color:${safeColor(a.tableFill)??"transparent"}`}:{}},
   tableBorderColor:{default:"#000000",parseHTML:el=>safeColor(el.getAttribute("data-table-border-color"))??"#000000",renderHTML:a=>({"data-table-border-color":safeColor(a.tableBorderColor)??"#000000"})},
   tableBorderStyle:{default:"none",parseHTML:el=>safeBorder(el.getAttribute("data-table-border-style")),renderHTML:a=>({"data-table-border-style":safeBorder(a.tableBorderStyle),style:safeBorder(a.tableBorderStyle)==="none"?"border:1px dotted #a0a0a0":`border:${numeric(a.tableBorderWidthPt,1,.25,8)}pt ${safeBorder(a.tableBorderStyle)} ${safeColor(a.tableBorderColor)??"#000000"}`})},
   tableBorderWidthPt:{default:1,parseHTML:el=>numeric(el.getAttribute("data-table-border-width"),1,.25,8),renderHTML:a=>({"data-table-border-width":numeric(a.tableBorderWidthPt,1,.25,8)})},
   tableGapMm:{default:1.41,parseHTML:el=>numeric(el.getAttribute("data-table-gap"),1.41,0,20),renderHTML:a=>({"data-table-gap":numeric(a.tableGapMm,1.41,0,20),style:`padding-inline-end:${numeric(a.tableGapMm,1.41,0,20)}mm`})},
  }},
 ];},
});
