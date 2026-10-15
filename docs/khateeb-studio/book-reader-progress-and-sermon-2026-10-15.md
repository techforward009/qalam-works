# کتاب خانہ — مطالعہ، محفوظ نشانات اور میری مجلس

**تاریخ:** ۱۵ اکتوبر ۲۰۲۶ء  
**مسودہ:** PR #74 — صرف تجرباتی شاخ، اصل ویب سائٹ میں تبدیلی نہیں۔

## فراہم کردہ سہولتیں

۱۔ کتاب، جلد اور اصل نسخہ منتخب کرکے فہرست کے ذریعے ترتیب وار مطالعہ۔ صرف اصل متنی پیراگراف دکھائے جاتے ہیں؛ صفحہ بندی براؤزر کی ہے، مطبوعہ کتاب کی نہیں۔

۲۔ کتاب کے اندر تلاش، اصل پیراگراف پر پہنچنا، متن چھوٹا بڑا کرنا اور اصل اعراب سمیت نقل کرنا۔

۳۔ **جہاں مطالعہ چھوڑا تھا:** براؤزر میں صرف `sourceId/sourceSha256/recordId/recordSha256/paragraphId/part` محفوظ ہوتا ہے، کتاب کا متن یا صارف کی پاس ورڈ معلومات نہیں۔ اگلی مرتبہ صرف اسی اصل نسخے اور اسی ریکارڈ کی شناخت ملنے پر مقام بحال ہوگا۔ بدلتے نسخے کو پرانا محفوظ مقام خودکار طور پر نہیں دیا جائے گا۔

۴۔ **نشان لگائیں:** صارف نشان محفوظ کرسکتا ہے، اسی اصل متن کے مقام تک واپس جاسکتا ہے اور اسی نسخے کے نشانات ختم کرسکتا ہے۔ ایک وقت میں زیادہ سے زیادہ ۳۰ نشانات؛ خراب یا حد سے زیادہ مقامی معلومات مسترد ہوجاتی ہیں۔ مقامی براؤزر ذخیرہ بند ہو تو بھی مطالعہ جاری رہتا ہے۔

۵۔ **منتخب عبارت میری مجلس میں شامل کریں:** مطالعے کے موجودہ حصے کے منتخب پیراگراف خفیہ `POST /api/research/book-reader` کے ذریعے اصل ریکارڈ سے دوبارہ ملائے جاتے ہیں۔ جلد، اصل متن، ریکارڈ اور پیراگراف کی شناخت سب موافق ہوں تو موجودہ `createBookExcerpt` کی مدد سے مکمل حوالہ جاتی اقتباس بنتا ہے۔ یہ پہلے سے موجود `onAdd` اور «میری مجلس» کے محفوظ مسودے کا نظام استعمال کرتا ہے؛ غلطی سے کامیاب محفوظ ہونے کا پیغام نہیں دیتا۔

## رسائی اور امتیاز

- اس مطالعہ نظام کی تمام `GET` اور `POST` درخواستوں کے لیے موجودہ **مالک کا تحقیقی داخلہ** ضروری ہے، اور سرور پر جانچ کسی نجی ذخیرے تک پہنچنے سے پہلے ہوتی ہے۔
- پرانی `/api/khateeb/library` کی عوامی `GET` رسائی تبدیل **نہیں** کی گئی؛ اس کے استعمال/اشاعت کی قانونی اور علمی پالیسی الگ جائزے کی محتاج ہے۔
- اصل عربی عبارت، گم شدہ مطبوعہ صفحے، نسخہ جاتی اختلافات اور کتابوں کے نام اس مرحلے میں نہیں بدلے۔
- `localStorage` کے نشان **صرف اسی براؤزر** میں موجود رہتے ہیں، دوسرے کمپیوٹر یا حساب میں منتقل نہیں ہوتے۔ مشترکہ کمپیوٹر پر صرف حوالہ جاتی شناختیں مقامی طور پر رہ سکتی ہیں؛ نجی کتاب کا متن مقامی نشان میں محفوظ نہیں ہوتا۔
- کسی کتاب کے جملے کو خودکار طور پر مستند روایت یا مکمل حوالہ قرار نہیں دیا گیا۔

## آزمائش اور قبولیت

کتابی ترتیب، متن کی نقل، تلاش، نجی اجازت، غلط درخواست، نسخے میں تبدیلی، پرانے نشانات، متن کے بغیر مقامی حفاظت اور «میری مجلس» میں صحیح اقتباس شامل کرنے کی خودکار آزمائشیں۔

**بقیہ:** اصلی آٹھ جلدوں کے محفوظ سرور کے ساتھ مکمل پیش نظارہ، موبائل پر حقیقی تحریری جانچ، مخصوص لفظ کا صفحے پر نمایاں نشان، منتخب متن کی علیحدہ نقل، مکمل کتاب کی اشاعت کی اجازت، اور پیراگراف سے رواں مطالعے کی مزید صفائی۔ یہ کام اصل ویب سائٹ کی منظوری سے پہلے رہیں گے۔

## Public reading decision — 15 October 2026

At the owner's explicit request the **book reader must be open to everyone without a Khateeb/Research owner password**. Remove both the `ResearchStudioGate` wrapper and the owner-session gate on the bounded, read-only `GET /api/research/book-reader` endpoint. The stateless `POST /api/research/book-reader` endpoint assembles a validated `BookExcerpt` and does not persist or import any book or sermon; it is public too, with same-origin/body size/source hash/record hash/paragraph selection checks preserved. Public book reading includes exact copying, searching, bookmarking in one's own browser and use in one's own sermon draft.

**Still protected:** the existing `POST /api/khateeb/library` upload/activation and the owner Research Studio administration routes. This change must not expose storage credentials or enable corpus mutations. Responses are still `no-store` and paragraph/TOC bounds remain. Vercel's **Preview Deployment Protection/SSO is a separate platform-level control**: the test Preview URL may still require Vercel access while the application reader itself no longer requires the owner password. Changing deployment-wide Preview SSO is *not* part of this change.

Publicly released books must have their distribution permissions accounted for in the editorial book catalog; the legacy library GET is already public, so this new public reader follows the existing public-read access model for the same active corpus. This draft branch remains separate from production until review.
