import { normalizeBookSearch } from './bookCorpus';
export type SearchTopic = { id: string; labelUr: string; labelEn: string };
type Concept = SearchTopic & { terms: string[] };
const rows: readonly [string, string, string, string][] = [
 ['patience','صبر','Patience','صبر|patience|patient|sabr|الصبر|الصابرين|صابر'],
 ['prayer','دعا','Supplication','دعا|دعاء|prayer|supplication|dua|ادع|دعوت'],
 ['repentance','توبہ','Repentance','توبہ|توبه|repentance|repent|tauba|توب|استغفار|اغفر'],
 ['death','موت','Death','موت|death|die|maut|الموت|اموات'],
 ['hereafter','آخرت','Hereafter','آخرت|اخره|hereafter|akhirat|قيامه|القيامه|الاخره'],
 ['justice','عدل و انصاف','Justice','عدل|justice|انصاف|العدل|insaf'],
 ['hope','امید','Hope','امید|hope|رجاء|يرجو|umeed'],
 ['gratitude','شکر','Gratitude','شکر|gratitude|grateful|شكور|تشكرون|shukr'],
 ['piety','تقویٰ','Piety','تقویٰ|تقوي|piety|متقين|تقوا|اتقوا|taqwa'],
 ['faith','ایمان','Faith','ایمان|faith|belief|مومن|مؤمن|امنوا|iman'],
 ['charity','صدقہ و انفاق','Charity','صدقہ|charity|انفاق|صدقات|ينفقون|sadaqa'],
 ['forgiveness','معافی','Forgiveness','معافی|forgiveness|forgive|عفو|صفح|معاف|maafi'],
 ['sincerity','اخلاص','Sincerity','اخلاص|sincerity|مخلص|مخلصين|ikhlas'],
 ['knowledge','علم و تعلیم','Knowledge','علم|knowledge|learning|education|تعليم|يعلمون|ilm'],
 ['anger','غصہ','Anger','غصہ|anger|غضب|غيظ|الغضب|gussa|ghussa'],
 ['parents','والدین','Parents','والدین|parents|والدي|والد|والده|الوالدين|والديك|الوالد|الوالده|ابويه|ماں باپ|والدہ|ماں|والد|باپ|walidain'],
 ['upbringing','تربیت','Upbringing','تربیت|تربيه|تربية|upbringing|parenting|تاديب|ادب|discipline|tarbiyat'],
 ['children','اولاد','Children','اولاد|بچے|بچوں|bachon|bachay|child|children|الولد|الاولاد|البنين|البنات|بچہ|اولاد کی|بچوں کی|aulad'],
 ['kindness','نرمی و حسنِ سلوک','Kindness','نرمی|نرم|kindness|gentleness|رفق|الرفق|حسن سلوک|حسنِ سلوک|حسن الخلق'],
 ['mercy','رحم و شفقت','Mercy','رحم|رحمت|شفقت|mercy|compassion|رحمه|رحيم'],
 ['truth','سچائی','Truthfulness','سچ|سچائی|truthfulness|honesty|صدق|صادق|sach'],
 ['lying','جھوٹ','Lying','جھوٹ|lying|lies|الكذب|كذب|jhoot'],
 ['trust','امانت','Trustworthiness','امانت|trustworthiness|امانه|الامانه|خيانة|خيانت'],
 ['promise','وعدہ','Promises','وعدہ|وعدے|promise|promises|وعد|الوفاء|عهد'],
 ['envy','حسد','Envy','حسد|envy|jealousy|الحسد|حاسد|hasad'],
 ['pride','تکبر','Arrogance','تکبر|غرور|arrogance|pride|تكبر|كبر|الكبر|متكبر'],
 ['humility','عاجزی','Humility','عاجزی|تواضع|humility|تواضع|خضوع|خاشع'],
 ['backbiting','غیبت','Backbiting','غیبت|backbiting|غيبه|اغتياب|غیبت کرنا'],
 ['brotherhood','بھائی چارہ','Brotherhood','بھائی چارہ|brotherhood|اخوه|اخوان|اخيه'],
 ['neighbors','پڑوسی','Neighbors','پڑوسی|ہمسایہ|neighbors|neighbour|neighbor|جار|الجيران'],
 ['kinship','صلۂ رحمی','Kinship','رشتہ دار|رشتہ داری|صلہ رحمی|صلۂ رحمی|kinship|relatives|صلة الرحم|الارحام|ارحام'],
 ['service','خدمت و مدد','Helping others','خدمت|مدد|khidmat|madad|help|service|خدمه|اعانه|قضاء الحوائج|عون'],
 ['rights','حقوق','Rights','حقوق|rights|حق|الحقوق'],
 ['marriage','ازدواجی زندگی','Marriage','شادی|ازدواج|نکاح|marriage|زوج|زوجه|نكاح'],
 ['family','خاندان','Family','خاندان|family|اہل خانہ|اهل البيت|الاهل'],
 ['livelihood','رزق','Livelihood','رزق|روزی|livelihood|provision|الرزق|يرزق|rizq'],
 ['work','محنت و کسب','Work','محنت|کسب|work|earning|الكسب|طلب الرزق|تجاره'],
 ['poverty','غربت','Poverty','غربت|تنگ دستی|poverty|فقر|الفقر|فقير'],
 ['wealth','مال و دولت','Wealth','مال|دولت|wealth|المال|الغنى|غني'],
 ['debt','قرض','Debt','قرض|debt|الدين|قضاء الدين|قروض'],
 ['generosity','سخاوت','Generosity','سخاوت|generosity|سخاء|جود|السخاء'],
 ['greed','حرص','Greed','حرص|لالچ|greed|طمع|الحرص|الطمع'],
 ['remembrance','ذکر','Remembrance','ذکر|remembrance|zikr|ذكر|اذكر|اذكار'],
 ['worship','عبادت','Worship','عبادت|worship|عباده|العباده|اعبد'],
 ['prayer-ritual','نماز','Ritual prayer','نماز|salah|salat|نمازوں|صلاه|الصلاه|صلوات'],
 ['fasting','روزہ','Fasting','روزہ|روزے|fasting|صوم|الصيام|الصوم'],
 ['trust-god','توکل','Reliance on God','توکل|tawakkul|reliance|توكل|يتوكل'],
 ['grief','غم اور مصیبت','Grief and hardship','غم|مصیبت|صدمہ|grief|hardship|مصيبه|حزن|محنه|بلاء'],
 ['illness','بیماری','Illness','بیماری|مرض|illness|sickness|المرض|مريض'],
 ['self-restraint','ضبطِ نفس','Self-restraint','ضبط نفس|ضبطِ نفس|خواہش|خواہشات|self restraint|desire|هوي|شهوه|شهوات'],
 ['youth','نوجوان','Youth','نوجوان|جوان|youth|young|شاب|شباب'],
 ['leadership','امامت و رہنمائی','Leadership','امامت|leadership|imamate|امامه|الامامه'],
 ['oppression','ظلم','Oppression','ظلم|oppression|ظالم|الظلم|مظلوم'],
 ['peace','صلح و اصلاح','Reconciliation','صلح|اصلاح|reconciliation|peace|اصلاح ذات البين|صلح'],
];
const concepts: Concept[] = rows.map(([id,labelUr,labelEn,terms]) => ({id,labelUr,labelEn,terms:[...new Set(terms.split('|').map(normalizeBookSearch))]}));
const stop = new Set(normalizeBookSearch('کے کی کا کو سے میں پر اور ہے ہیں تھا کیا کیسے بارے متعلق بتائیں نے ایک ہمیں کس وہ یہ اپنے اپنی اس ان فرماتے فرمایا تعلیمات قرآن قران نہج البلاغہ صحیفہ سجادیہ امام علی اللہ مجھے واضح وضاحت عملی روزمرہ مثال مثالیں زندگی اطلاق تعلق ربط موازنہ تقابل اسی موضوع مزید خلاصہ چاہتا چاہتی چاہیے کریں بتاتا کہ سکتے سکتا سکیں ہوتا ہوتی کریں کرنا کرنے کریں چاہئے کون کہا جاتا جاتا بھی ساتھ کتاب کتابوں روشنی کردار اہمیت طریقہ طریقے نظر پیش حوالے حدیث احادیث روایات متون مواد رہنمائی aur ki ka ke se mein the a an of in on about what how does did say said tell me and or is are to from please explain practical everyday daily life examples example application compare comparison relationship connection this topic further summarize summary source sources passages passage discuss material available books book related provide show quran nahj balagha sahifa sajjadiyya teachings should can why me us according role importance way ways guidance').split(' '));
export const knowledgeTopicCatalog: readonly SearchTopic[] = concepts.map(({id,labelUr,labelEn})=>({id,labelUr,labelEn}));
export function planKnowledgeQuery(question: string, inferredTopicIds: readonly string[] = []): {direct: string[]; groups: string[][]; topics: SearchTopic[]} {
 const normalized=normalizeBookSearch(question); const words=normalized.split(' ');
 const inferred=concepts.filter(c=>inferredTopicIds.includes(c.id));
 const found=inferred.length ? inferred : concepts.filter(c=>c.terms.some(term=>(' '+normalized+' ').includes(' '+term+' ')));
 const consumed=new Set(found.flatMap(c=>c.terms.filter(term=>(' '+normalized+' ').includes(' '+term+' ')).flatMap(t=>t.split(' '))));
 const direct=[...new Set(words.filter(t=>t.length>1&&!stop.has(t)&&!/^\d+$/.test(t)))].slice(0,24);
 const groups=[...found.map(c=>c.terms),...(inferred.length ? [] : direct.filter(t=>!consumed.has(t)).map(t=>[t]))];
 return {direct,groups,topics:found.map(({id,labelUr,labelEn})=>({id,labelUr,labelEn}))};
}
