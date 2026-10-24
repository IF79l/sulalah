# البيئات

ثلاث بيئات منفصلة تمامًا، لكل منها قاعدة بيانات ومفاتيح ورسائل SMS خاصة بها. لا تنتقل بيانات من بيئة لأخرى.

| البيئة             | قاعدة البيانات                                          | الموقع                                 | من يدخلها | البيانات                                               |
| ------------------ | ------------------------------------------------------- | -------------------------------------- | --------- | ------------------------------------------------------ |
| محلي `local`       | Supabase على جهازك (`pnpm db:start`)، أو مفاتيح التجربة | `localhost:3000`                       | المطوّر   | أرقام اختبار برمز ثابت `123456`                        |
| تجربة `staging`    | مشروع Supabase باسم `sulalah-staging`                   | معاينات Vercel (كل فرع وكل PR)         | الفريق    | عائلة السهلي التجريبية وأرقام اختبار، بلا رسائل حقيقية |
| إنتاج `production` | مشروع Supabase باسم `sulalah-production`                | الدومين الرسمي (فرع `main` على Vercel) | الناس     | حقيقية فقط، بلا بيانات تجريبية أبدًا                   |

## كيف يصل التغيير للإنتاج

1. كل فرع وكل PR ينشره Vercel معاينةً على **التجربة** تلقائيًا.
2. الدمج في `main` قرار فيصل وحده. بعده ينشر Vercel الإنتاج.
3. تغييرات قاعدة البيانات (`supabase/migrations`) تُطبَّق على التجربة فور الدمج، ثم تنتظر موافقة فيصل في GitHub قبل الإنتاج (workflow `Database`، بيئة `production` بمراجع إلزامي).

## الإعداد لأول مرة (مرة واحدة)

### Supabase

1. أنشئ مشروعين في [supabase.com](https://supabase.com): `sulalah-staging` و `sulalah-production`، في منطقة قريبة (مثل `eu-central-1` فرانكفورت أو `me-central-1` إن توفرت).
2. في كل مشروع: **Authentication > Sign In / Providers > Phone**: فعّله، واختر مزود الرسائل.
   - التجربة: يكفي إضافة أرقام اختبار في **Test Phone Numbers and OTPs** (مثل `966500000001=123456`) بلا رسائل حقيقية.
   - الإنتاج: مزود رسائل حقيقي يغطي السعودية (Twilio Verify للبداية، أو مزود محلي عبر Send SMS Hook لاحقًا).
   - أوقف التسجيل بالبريد (**Email > Disable**)، فالدخول بالجوال فقط.
3. خذ من **Project Settings > API Keys**: رابط المشروع و **Publishable key**. المفتاح السري (Secret key) لا يدخل Vercel الآن.

### GitHub (للمايغريشن)

في **Settings > Secrets and variables > Actions**:

- Repository secret: `SUPABASE_ACCESS_TOKEN` (من supabase.com > Account > Access Tokens).
- Repository variables: `STAGING_PROJECT_REF` و `PRODUCTION_PROJECT_REF` (معرف كل مشروع)، و `STAGING_PUBLISHABLE_KEY`، و `STAGING_DEMO_PHONE` (رقم الاختبار).
- Environments: أنشئ `staging` و `production`، وفي كل منهما secret باسم `SUPABASE_DB_PASSWORD` (كلمة مرور قاعدة ذلك المشروع). في `production` فعّل **Required reviewers** وضع فيصل.
- في `staging` أيضًا: `STAGING_DEMO_OTP` (رمز رقم الاختبار) واختياريًا `STAGING_DEMO_TREE_KEY`.

لزرع العائلة التجريبية: **Actions > Database > Run workflow** مع خيار "Plant the sample family on staging". يطبع رمز الاسترجاع لفتح الشجرة.

### Vercel

1. استورد الريبو، و **Root Directory** = `apps/web`.
2. **Settings > Environment Variables**:

| المتغير                                | Production         | Preview            |
| -------------------------------------- | ------------------ | ------------------ |
| `NEXT_PUBLIC_APP_ENV`                  | `production`       | `staging`          |
| `NEXT_PUBLIC_SUPABASE_URL`             | رابط مشروع الإنتاج | رابط مشروع التجربة |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | مفتاح الإنتاج      | مفتاح التجربة      |

3. في Supabase لكل مشروع: **Authentication > URL Configuration**، أضف رابط موقعه (الإنتاج: الدومين؛ التجربة: `https://*-<team>.vercel.app`).

## محليًا

```bash
cp .env.example apps/web/.env.local   # ضع مفاتيح التجربة، أو اتركها فارغة للنسخة التجريبية
pnpm dev
```

أو Supabase كامل على جهازك (يحتاج Docker Desktop): `pnpm db:start` يطبع الرابط والمفتاح، و `pnpm db:reset` يعيد القاعدة من المايغريشن. أرقام الدخول المحلية في `supabase/config.toml` برمز `123456`.

`pnpm db:test` يشغّل اختبارات الصلاحيات على أي Postgres يشير له `DATABASE_URL`، وتعمل نفسها في CI.
