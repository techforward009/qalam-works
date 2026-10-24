import { expect, it } from "vitest";
import { caretGeometry } from "../app/tools/document-studio/utils/caretGeometry";
const input={x:700,top:48,height:24,scale:1,rtl:true,blockLeft:48,blockRight:700,contentRight:700,contentTop:48};
it.each([1,1.5,3.333,0.625])("keeps RTL ink two screen pixels wide and one inside the guide at scale %s",scale=>{
 const box=caretGeometry({...input,scale});
 expect(box.width*scale).toBeCloseTo(2,8);
 expect((700-box.left-box.width)*scale).toBeCloseTo(1,8);
 expect((box.top-48)*scale).toBeCloseTo(1,8);
});
it("draws RTL leftwards and LTR rightwards from an interior caret point",()=>{
 expect(caretGeometry({...input,x:300}).left).toBe(297);
 expect(caretGeometry({...input,x:300,rtl:false}).left).toBe(301);
});
it.each([true,false])("clamps outside positions to the block and content box, RTL=%s",rtl=>{
 expect(caretGeometry({...input,rtl,x:-100}).left).toBe(rtl?49:50);
 expect(caretGeometry({...input,rtl,x:1000,blockRight:800}).left).toBe(697);
 expect(caretGeometry({...input,rtl,x:1000,blockRight:650}).left).toBe(647);
});

it.each([.5,1,1.5])("clears the full LTR guide ink at scale %s without changing RTL",scale=>{
 const box=caretGeometry({...input,x:48,rtl:false,contentLeft:48,scale});
 expect((box.left-48)*scale).toBeCloseTo(2,8);expect(box.width*scale).toBeCloseTo(2,8);
 const rtl=caretGeometry({...input,scale});expect((700-rtl.left-rtl.width)*scale).toBeCloseTo(1,8);
});
