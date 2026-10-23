# سُلالة | SULALAH

منصة عربية لبناء شجرات العائلات والقبائل كشجرة ثلاثية الأبعاد حيّة: كل غصن فرد حقيقي، والضغط على غصن يحرّك الكاميرا إليه، والإضافة الجديدة تنمو غصنًا من موضعها الصحيح وتنتظر الاعتماد.

## البنية

| المسار                 | الدور                                                                        |
| ---------------------- | ---------------------------------------------------------------------------- |
| `apps/web`             | تطبيق Next.js: الصفحات، Server Actions، Webhooks                             |
| `packages/tree-engine` | محرك الشجرة: النسب، التخطيط الثلاثي الحتمي، لقطات الكاميرا (TypeScript خالص) |
| `packages/tree-3d`     | مشهد `<LivingTree>` بـ React Three Fiber                                     |
| `packages/domain`      | قواعد الصلاحيات `can()`، البحث العربي، الباقات، مخططات Zod                   |
| `packages/db`          | مخطط Drizzle لـ PostgreSQL والمايغريشن                                       |
| `packages/ui`          | نظام التصميم                                                                 |
| `legacy/aghsan`        | النموذج الأولي السابق، للمرجعية فقط ولا يُبنى                                |

التفاصيل في [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## التشغيل

```bash
pnpm install
cp .env.example apps/web/.env.local
pnpm dev        # http://localhost:3000
pnpm test       # اختبارات المحرك والصلاحيات
pnpm typecheck
```

يتطلب Node 22 و pnpm 10.
