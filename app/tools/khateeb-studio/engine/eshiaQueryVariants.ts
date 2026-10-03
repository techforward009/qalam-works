const STOP = new Set([
  "میں","کے","کی","کا","کو","سے","اور","پر","ایک","ہیں","ہے","اس","کے","طریقے","اسلامی","ذمہ داری","پانے","کرنے",
]);

const CONCEPTS: readonly { match: readonly string[]; queries: readonly string[] }[] = [
  { match: ["رزق","روزی"], queries: ["الرزق","أسباب الرزق"] },
  { match: ["برکت","برکتیں"], queries: ["البركة","البركة في الرزق"] },
  { match: ["غصہ","غضب"], queries: ["الغضب","كظم الغيظ","الحلم"] },
  { match: ["اولاد","بچے","بچوں"], queries: ["تربية الأولاد","حقوق الأولاد"] },
  { match: ["تربیت"], queries: ["التربية","تربية الأولاد"] },
  { match: ["والدین"], queries: ["بر الوالدين","حقوق الوالدين"] },
  { match: ["دعا"], queries: ["الدعاء"] },
  { match: ["صبر"], queries: ["الصبر"] },
  { match: ["توکل"], queries: ["التوكل"] },
  { match: ["حلال"], queries: ["الحلال","طلب الحلال"] },
  { match: ["اخلاق"], queries: ["الأخلاق"] },
  { match: ["حلم"], queries: ["الحلم"] },
  { match: ["شکر","شکرگزاری"], queries: ["الشكر"] },
];

function normalize(value: string): string {
  return value.normalize("NFKC").replace(/\s+/g," ").trim().toLowerCase();
}

export function eShiaQueryVariants(query: string): readonly string[] {
  const q=normalize(query);
  const found:string[]=[];
  const push=(value:string)=>{
    const clean=value.trim();
    if(clean.length>=2 && !found.includes(clean)) found.push(clean);
  };

  push(q);

  for(const concept of CONCEPTS){
    if(concept.match.some(term=>q.includes(normalize(term)))){
      for(const candidate of concept.queries) push(candidate);
    }
  }

  const content=q
    .split(" ")
    .filter(token=>token.length>=3 && !STOP.has(token));
  for(const token of content.slice(0,3)) push(token);

  return found.slice(0,6);
}
