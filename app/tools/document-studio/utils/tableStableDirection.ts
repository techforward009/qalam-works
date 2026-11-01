import {Extension} from "@tiptap/core";

/** A Latin word in the first Urdu cell must not reverse the entire table. */
export const QalamTableStableDirection=Extension.create({
  name:"qalamTableStableDirection",
  addGlobalAttributes(){
    return [{
      types:["table"],
      attributes:{
        dir:{
          default:null,
          parseHTML:element=>{
            const value=element.getAttribute("dir");
            return value==="rtl"||value==="ltr"?value:null;
          },
          renderHTML:attributes=>{
            const value=attributes.dir;
            return value==="rtl"||value==="ltr"?{dir:value}:{};
          },
        },
      },
    }];
  },
});
