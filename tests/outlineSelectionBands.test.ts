import {expect,it} from 'vitest';
import {outlineSelectionBands,type OutlineBandPiece} from '../app/tools/document-studio/utils/outlineSelection';
const frame={left:0,top:10,width:400,height:100};
const piece=(x:number,y:number,w:number,h:number,line=40,group=0):OutlineBandPiece=>({block:0,group,line,clip:{left:x,top:y,width:w,height:h},box:{left:x,top:10,width:w,height:50},frame});
it('unifies mixed glyph heights and bridges spaces into one full-height rectangle per line',()=>{
 const bands=outlineSelectionBands([piece(30,15,40,30),piece(75,25,20,18),piece(97,18,50,28)]);
 expect(bands).toEqual([{left:30,top:10,width:117,height:50}]);
});
it('clips first/last line bands to their text-frame top/bottom',()=>{
 const first={...piece(10,0,40,40),box:{left:10,top:-5,width:40,height:50}},last={...piece(10,80,40,50,100),box:{left:10,top:75,width:40,height:60}};
 expect(outlineSelectionBands([first,last])).toEqual([{left:10,top:10,width:40,height:35},{left:10,top:75,width:40,height:35}]);
});
it('keeps normal-text ownership gaps and separate text blocks apart',()=>{
 expect(outlineSelectionBands([piece(10,20,20,20),piece(80,20,20,20,40,1)])).toHaveLength(2);
 expect(outlineSelectionBands([piece(10,20,20,20),{...piece(80,20,20,20),block:1}])).toHaveLength(2);
});

it("does not join same-height lines in separate facing frames",()=>{expect(outlineSelectionBands([piece(10,20,20,20),{...piece(500,20,20,20),frame:{...frame,left:450}}])).toHaveLength(2);});
