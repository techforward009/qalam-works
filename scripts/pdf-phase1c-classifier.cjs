/* Phase 1C experiment ONLY. Never imported by production PDF exporter.
 * Fail closed unless an exact ASCII period within the originally validated
 * Digital Khatt run is the only non-Digital painted glyph. */
function cp(ch){return "U+"+ch.codePointAt(0).toString(16).toUpperCase().padStart(4,"0")}
function ar(cp){return (cp>=0x600&&cp<=0x6ff)||(cp>=0x750&&cp<=0x77f)||(cp>=0x8a0&&cp<=0x8ff)||(cp>=0xfb50&&cp<=0xfdff)||(cp>=0xfe70&&cp<=0xfeff)||(cp>=0x10e60&&cp<=0x10e7f)||(cp>=0x1ee00&&cp<=0x1eeff)||cp===0x200c||cp===0x200d||cp===0x200e||cp===0x200f||cp===0x061c;
}
function kind(ch){const n=ch.codePointAt(0);if(ar(n))return "arabic-or-joining";if(n===0x2e)return "ascii-period";return "unclassified"}
function digital(f){return /digitalkhatt/i.test((f.familyName||"").replace(/[^a-z0-9]/gi,""))}
function expectedAllowed(face){return /^Liberation Serif$/i.test(face.familyName||"")}
function decision({char,faces,context,declared,sourceCodepointPresent=true}){
 const classification=kind(char),painted=faces.filter(x=>x.glyphCount>0),actual=painted.map(x=>x.familyName);
 if(!sourceCodepointPresent)return {status:"REJECT",reason:"codepoint-not-in-source",classification};
 if(!painted.length)return {status:"REJECT",reason:"no-painted-glyph-proof",classification};
 if(painted.every(digital))return {status:"ACCEPT",reason:"painted-by-digital-khatt",classification};
 if(classification==="ascii-period"&&context==="inline-literal-full-stop"&&declared==="Digital Khatt Indo-Pak"&&painted.length===1&&expectedAllowed(painted[0]))
   return {status:"ACCEPT",reason:"exact-U+002E-context-verified-non-arabic-fallback",classification};
 return {status:"REJECT",reason:classification==="arabic-or-joining"?"prohibited-arabic-script-fallback":"unclassified-or-unapproved-fallback",classification,actual};
}
module.exports={cp,kind,decision,digital};
