/** InPage displays table lengths in millimetres and stroke widths in points. */
export const TABLE_PX_PER_MM=96/25.4;
export const mmToTablePx=(mm:number)=>mm*TABLE_PX_PER_MM;
export const tablePxToMm=(px:number)=>px/TABLE_PX_PER_MM;
export function formatTableLength(value:number,unit:"mm"|"pt"):string{
 const fixed=Math.round(value*100)/100;
 return `${fixed}${unit}`;
}
export function parseTableLength(text:string,unit:"mm"|"pt",min:number,max:number):number{
 const match=text.trim().match(/^([0-9]+(?:\.[0-9]+)?)\s*(mm|pt)?$/i);
 if(!match|| (match[2]&&match[2].toLowerCase()!==unit))throw Error(`Enter a length in ${unit}.`);
 const value=Number(match[1]);
 if(!Number.isFinite(value)||value<min||value>max)throw Error(`Length must be between ${min}${unit} and ${max}${unit}.`);
 return value;
}
export function tableFormatAlignedMargins(alignment:"left"|"center"|"right",indentMm:number):{marginLeft:string; marginRight:string}{
 if(alignment==="left")return {marginLeft:`${indentMm}mm`,marginRight:"auto"};
 if(alignment==="right")return {marginLeft:"auto",marginRight:`${indentMm}mm`};
 return {marginLeft:"auto",marginRight:"auto"};
}
