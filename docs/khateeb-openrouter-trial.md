# خطیب اسٹوڈیو: OpenRouter کی محدود آزمائش

**حیثیت:** صرف تجرباتی شاخ khateeb-sermon-local-validation۔ اصل ویب سائٹ، صارفین کے لیے API، یا پیداواری ماڈل کی تبدیلی نہیں۔ PR #30 کو ضم نہ کریں۔

## مقصد

صبر کی ۲۰ منٹ کی اردو مجلس کے لیے کم خرچ ماڈلز کا تقابل کرنا:

- Qwen: qwen/qwen3.5-flash-02-23
- DeepSeek: deepseek/deepseek-v3.2
- Gemini Lite: google/gemini-3.1-flash-lite

یہ شناختیں اور درج ذیل ابتدائی قیمتیں OpenRouter کی 11 اکتوبر 2026 کی فہرست سے لی گئی ہیں۔ قیمت اور فراہمی بدل سکتی ہے۔ فی دس لاکھ اِن پٹ/آؤٹ پٹ ٹوکن بالترتیب: قوین $0.065/$0.26؛ ڈیپ سیک $0.2088/$0.3096؛ جیمینائی $0.25/$1.50۔

## مفت، بغیر کلید کی جانچ

    npm ci --ignore-scripts --no-audit --no-fund
    npx vitest run tests/openRouterTrial.test.ts tests/sermonStagedGeneration.test.ts tests/sermonComposer.test.ts
    npx tsc --noEmit
    node scripts/evaluate-sermon-free-models.mjs --openrouter-check

اس آخری حکم میں **کوئی ادا شدہ ماڈل درخواست نہیں جاتی**۔ اصلی احمدگراف عربی آیات، شیخ محسن علی نجفی کے مقررہ اردو ترجمے اور آزمائشی کتابی مواد کے انتخاب کی جانچ ہوتی ہے۔ بعض کتابی اردو ترجمے صرف آزمائشی ادارتی مسودے ہیں؛ انہیں مصدقہ ترجمہ نہ سمجھیں۔

## ادا شدہ جانچ: مالک کی واضح اجازت کے بعد

1. OpenRouter پر علیحدہ آزمائشی کلید بنائیں اور اسی کلید کی حقیقی خرچ کی حد **$1 یا اس سے کم** مقرر کریں۔ درخواست سے پہلے OpenRouter کے خود اپنے ریکارڈ سے حد کی تصدیق ہوگی؛ حد موجود نہ ہو یا زیادہ ہو تو پروگرام کام نہیں کرے گا۔
2. کلید صرف مقامی ماحول یا محفوظ GitHub secret میں رکھیں۔ اسے گفتگو، کوڈ، رپورٹ یا GitHub commit میں ہرگز نہ ڈالیں۔
3. واضح مالی اجازت کے بعد ایک ماڈل آزمائیں:

    node scripts/evaluate-sermon-free-models.mjs --openrouter-trial --allow-paid-api --staged --only=qwen

بعد میں qwen کی جگہ deepseek یا lite استعمال ہوسکتا ہے۔ پروگرام اپنی درخواستوں کے لیے **$0.35 فی آزمائش** تک محتاط تخمینی رقم محفوظ رکھتا ہے، لیکن یہ بل کی یقینی حد نہیں۔ اصل حفاظت OpenRouter کلید کی مقررہ $1 خرچ کی حد ہے۔ کلید میں باقی رقم اور اصل چارج دیکھے بغیر دوسری آزمائش نہ چلائیں۔

**متبادل ماڈل:** پہلے ماڈل کی خدمت دستیاب نہ ہونے پر صرف پہلے سے منتخب دوسرے ماڈل کو آزمایا جاتا ہے۔ تحریر کی جانچ الگ ماڈل کرے گا۔ اصل عربی، حوالوں، تحریری روانی اور 18 سے 22 منٹ کے تخمینی دورانیے کی جانچ کے بغیر مسودہ منظور نہیں ہوگا۔

**موجودہ حالت:** فرضی جوابات سے رابطے، خرچ کی رکاوٹ، غلط درخواست، حد اور جانچ کا تجربہ کیا گیا ہے۔ حقیقی ادا شدہ ماڈلز کا تقابلی تجربہ ابھی **نہیں ہوا**؛ یہ تیاری ہے، حتمی تیار شدہ مجلس نہیں۔

## سرکاری حوالے

- https://openrouter.ai/docs/guides/routing/model-fallbacks
- https://openrouter.ai/docs/guides/features/structured-outputs
- https://openrouter.ai/docs/api/api-reference/api-keys/get-current-key
- https://openrouter.ai/qwen/qwen3.5-flash-02-23
- https://openrouter.ai/deepseek/deepseek-v3.2
- https://openrouter.ai/google/gemini-3.1-flash-lite/
