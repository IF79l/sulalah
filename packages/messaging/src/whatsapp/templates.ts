/**
 * Every message سُلالة sends on WhatsApp, as the templates Meta has to approve before the
 * first send. Business-initiated messages must be approved templates, so the words live here
 * once: `metaTemplates()` turns them into what is submitted to Meta, and `render()` gives the
 * same words for the mock channel and the admin desk.
 *
 * Nothing here names a family member: the database holds no names (the tree file does), so a
 * message carries who acted (their first and father's name from their account), how many, and
 * a link into the app, where the device fills in the rest.
 */

/** What a person can turn off. The login code is never optional. */
export type Topic = 'review' | 'members' | 'billing';
export const topics: Topic[] = ['review', 'members', 'billing'];

export type TemplateKey =
  | 'login_code'
  | 'additions_submitted'
  | 'additions_approved'
  | 'additions_partly_approved'
  | 'additions_changes'
  | 'additions_rejected'
  | 'member_joined'
  | 'made_reviewer'
  | 'made_contributor'
  | 'owner_now'
  | 'payment_received'
  | 'renewal_failed'
  | 'plan_ending'
  | 'plan_ended';

/** One message waiting to go, as the outbox hands it over. */
export interface MessageInput {
  /** The person who acted, "فيصل بن خالد"; empty when nobody did (billing). */
  actor: string;
  count: number;
  treeId: string | null;
  /** Per template: invoice number, amounts, plan, dates. Never a family member's name. */
  data: Record<string, unknown>;
}

export interface TemplateDef {
  key: TemplateKey;
  /** The template's name on Meta. Lowercase and underscores, as Meta requires. */
  name: string;
  category: 'UTILITY' | 'AUTHENTICATION';
  topic: Topic | 'login';
  /** The body with {{1}}, {{2}}… A variable may not open or close the body (Meta's rule). */
  body: string;
  /** A call-to-action button whose link ends in {{1}}, filled with an app path. */
  button?: { text: string };
  /** Sample values Meta's reviewers see, one per variable. */
  examples: string[];
  buttonExample?: string;
  params(m: MessageInput): string[];
  /** The app path the button opens, without a leading slash. */
  link?(m: MessageInput): string;
}

// ---------- Words ----------

const digits = (n: number) => n.toLocaleString('en-US');

/** "إضافة واحدة", "إضافتين", "3 إضافات", "11 إضافة". */
export function additions(n: number) {
  if (n <= 1) return 'إضافة واحدة';
  if (n === 2) return 'إضافتين';
  if (n <= 10) return `${digits(n)} إضافات`;
  return `${digits(n)} إضافة`;
}

export const planNames = {
  family: 'العائلة',
  extended: 'العائلة الممتدة',
  tribe: 'القبيلة',
} as const;

/** "باقة العائلة الشهرية". */
export function planLabel(plan: unknown, cycle?: unknown) {
  const name = planNames[plan as keyof typeof planNames] ?? 'سُلالة';
  const c = cycle === 'annual' ? ' السنوية' : cycle === 'monthly' ? ' الشهرية' : '';
  return `باقة ${name}${c}`;
}

/** Halalas as riyals: 4900 → "49", 4950 → "49.50". */
export function riyals(halalas: unknown) {
  const h = Number(halalas) || 0;
  return h % 100 === 0 ? digits(h / 100) : (h / 100).toFixed(2);
}

/** "الخميس 29 أكتوبر", in Riyadh time. */
export function day(at: unknown) {
  const d = new Date(String(at));
  if (Number.isNaN(d.getTime())) return 'قريبًا';
  return new Intl.DateTimeFormat('ar-SA-u-ca-gregory-nu-latn', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'Asia/Riyadh',
  }).format(d);
}

/**
 * Meta refuses a parameter with a new line, a tab or four spaces in a row, and long ones read
 * badly on a phone.
 */
export function clean(value: string, max = 60) {
  const v = value
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/ {2,}/g, ' ')
    .trim();
  return v.length > max ? `${v.slice(0, max - 1)}…` : v;
}

const who = (m: MessageInput) => clean(m.actor) || 'فرد من العائلة';
const tree = (m: MessageInput, path = '') => `trees/${m.treeId ?? ''}${path}`;

// ---------- The templates ----------

const defs: TemplateDef[] = [
  {
    key: 'login_code',
    name: 'sulalah_login_code',
    category: 'AUTHENTICATION',
    topic: 'login',
    // Meta writes the words of authentication templates itself; this is what it shows in Arabic.
    body: '{{1}} هو رمز التحقق الخاص بك. لأمانك، لا تشارك هذا الرمز.',
    examples: ['123456'],
    params: (m) => [String(m.data.code ?? '')],
  },
  {
    key: 'additions_submitted',
    name: 'sulalah_additions_submitted',
    category: 'UTILITY',
    topic: 'review',
    body: 'وصلتك {{1}} من {{2}} على شجرة العائلة في سُلالة، وتنتظر مراجعتك قبل أن تظهر في الشجرة.',
    button: { text: 'راجع الإضافات' },
    examples: ['3 إضافات', 'محمد بن سعد'],
    buttonExample: 'trees/00000000-0000-4000-8000-000000000000/review',
    params: (m) => [additions(m.count), who(m)],
    link: (m) => tree(m, '/review'),
  },
  {
    key: 'additions_approved',
    name: 'sulalah_additions_approved',
    category: 'UTILITY',
    topic: 'review',
    body: 'اعتمد {{1}} {{2}} من إضافاتك في سُلالة، وصارت ظاهرة في شجرة العائلة.',
    button: { text: 'افتح الشجرة' },
    examples: ['فيصل بن خالد', '3 إضافات'],
    buttonExample: 'trees/00000000-0000-4000-8000-000000000000',
    params: (m) => [who(m), additions(m.count)],
    link: (m) => tree(m),
  },
  {
    key: 'additions_partly_approved',
    name: 'sulalah_additions_partly_approved',
    category: 'UTILITY',
    topic: 'review',
    body: 'راجع {{1}} إضافاتك في سُلالة واعتمد {{2}} منها، ولم يعتمد الباقي.',
    button: { text: 'شوف التفاصيل' },
    examples: ['فيصل بن خالد', 'إضافتين'],
    buttonExample: 'trees/00000000-0000-4000-8000-000000000000/contributions',
    params: (m) => [who(m), additions(m.count)],
    link: (m) => tree(m, '/contributions'),
  },
  {
    key: 'additions_changes',
    name: 'sulalah_additions_changes',
    category: 'UTILITY',
    topic: 'review',
    body: 'طلب {{1}} تعديلًا على إضافاتك في سُلالة. عدّلها وأرسلها مرة ثانية للمراجعة.',
    button: { text: 'عدّل الإضافات' },
    examples: ['فيصل بن خالد'],
    buttonExample: 'trees/00000000-0000-4000-8000-000000000000/contributions',
    params: (m) => [who(m)],
    link: (m) => tree(m, '/contributions'),
  },
  {
    key: 'additions_rejected',
    name: 'sulalah_additions_rejected',
    category: 'UTILITY',
    topic: 'review',
    body: 'راجع {{1}} إضافاتك في سُلالة ولم يعتمدها. تقدر تشوف ملاحظاته من صفحة إضافاتك.',
    button: { text: 'شوف الملاحظات' },
    examples: ['فيصل بن خالد'],
    buttonExample: 'trees/00000000-0000-4000-8000-000000000000/contributions',
    params: (m) => [who(m)],
    link: (m) => tree(m, '/contributions'),
  },
  {
    key: 'member_joined',
    name: 'sulalah_member_joined',
    category: 'UTILITY',
    topic: 'members',
    body: 'انضم {{1}} إلى شجرة العائلة في سُلالة عن طريق رابط الدعوة.',
    button: { text: 'افتح الشجرة' },
    examples: ['محمد بن سعد'],
    buttonExample: 'trees/00000000-0000-4000-8000-000000000000',
    params: (m) => [who(m)],
    link: (m) => tree(m),
  },
  {
    key: 'made_reviewer',
    name: 'sulalah_made_reviewer',
    category: 'UTILITY',
    topic: 'members',
    body: 'أضافك {{1}} مدققًا في شجرة العائلة على سُلالة، وصار بإمكانك مراجعة الإضافات واعتمادها.',
    button: { text: 'افتح الشجرة' },
    examples: ['فيصل بن خالد'],
    buttonExample: 'trees/00000000-0000-4000-8000-000000000000',
    params: (m) => [who(m)],
    link: (m) => tree(m),
  },
  {
    key: 'made_contributor',
    name: 'sulalah_made_contributor',
    category: 'UTILITY',
    topic: 'members',
    body: 'غيّر {{1}} دورك في شجرة العائلة على سُلالة إلى مساهم، وإضافاتك تمر على المراجعة.',
    button: { text: 'افتح الشجرة' },
    examples: ['فيصل بن خالد'],
    buttonExample: 'trees/00000000-0000-4000-8000-000000000000',
    params: (m) => [who(m)],
    link: (m) => tree(m),
  },
  {
    key: 'owner_now',
    name: 'sulalah_owner_now',
    category: 'UTILITY',
    topic: 'members',
    body: 'نقل {{1}} ملكية شجرة العائلة في سُلالة إليك، وصرت المالك والمدقق الرئيسي لها.',
    button: { text: 'افتح الشجرة' },
    examples: ['فيصل بن خالد'],
    buttonExample: 'trees/00000000-0000-4000-8000-000000000000',
    params: (m) => [who(m)],
    link: (m) => tree(m),
  },
  {
    key: 'payment_received',
    name: 'sulalah_payment_received',
    category: 'UTILITY',
    topic: 'billing',
    body: 'وصلنا {{1}} ريال مقابل {{2}} في سُلالة، ورقم الفاتورة {{3}}. شكرًا لك.',
    button: { text: 'اعرض الفاتورة' },
    examples: ['49', 'باقة العائلة الممتدة الشهرية', 'SUL-2026-000001'],
    buttonExample:
      'trees/00000000-0000-4000-8000-000000000000/plan/invoices/00000000-0000-4000-8000-000000000001',
    params: (m) => [
      riyals(m.data.amount_halalas),
      planLabel(m.data.plan, m.data.cycle),
      clean(String(m.data.number ?? ''), 30),
    ],
    link: (m) => tree(m, `/plan/invoices/${String(m.data.invoice_id ?? '')}`),
  },
  {
    key: 'renewal_failed',
    name: 'sulalah_renewal_failed',
    category: 'UTILITY',
    topic: 'billing',
    body: 'ما قدرنا نجدد {{1}} في سُلالة من بطاقتك المحفوظة. الباقة شغالة، وبنحاول مرة ثانية يوم {{2}}، أو حدّث بطاقتك من صفحة الباقة.',
    button: { text: 'صفحة الباقة' },
    examples: ['باقة العائلة الشهرية', 'الخميس 29 أكتوبر'],
    buttonExample: 'trees/00000000-0000-4000-8000-000000000000/plan',
    params: (m) => [planLabel(m.data.plan, m.data.cycle), day(m.data.next_retry_at)],
    link: (m) => tree(m, '/plan'),
  },
  {
    key: 'plan_ending',
    name: 'sulalah_plan_ending',
    category: 'UTILITY',
    topic: 'billing',
    body: 'تنتهي {{1}} على شجرتك في سُلالة يوم {{2}}، والتجديد التلقائي متوقف. جدّدها لتستمر الإضافات.',
    button: { text: 'جدّد الباقة' },
    examples: ['باقة العائلة السنوية', 'الخميس 29 أكتوبر'],
    buttonExample: 'trees/00000000-0000-4000-8000-000000000000/plan',
    params: (m) => [planLabel(m.data.plan, m.data.cycle), day(m.data.period_end)],
    link: (m) => tree(m, '/plan'),
  },
  {
    key: 'plan_ended',
    name: 'sulalah_plan_ended',
    category: 'UTILITY',
    topic: 'billing',
    body: 'انتهت {{1}} على شجرتك في سُلالة. الشجرة محفوظة وتنعرض كما هي، والإضافات متوقفة حتى تجدد.',
    button: { text: 'جدّد الباقة' },
    examples: ['باقة العائلة السنوية'],
    buttonExample: 'trees/00000000-0000-4000-8000-000000000000/plan',
    params: (m) => [planLabel(m.data.plan, m.data.cycle)],
    link: (m) => tree(m, '/plan'),
  },
];

export const templates: Record<TemplateKey, TemplateDef> = Object.fromEntries(
  defs.map((d) => [d.key, d]),
) as Record<TemplateKey, TemplateDef>;

export const isTemplateKey = (k: string): k is TemplateKey => k in templates;

/** The words a person reads, for the mock channel and the admin desk. */
export function render(key: TemplateKey, m: MessageInput, appUrl = '') {
  const t = templates[key];
  const p = t.params(m);
  const text = t.body.replace(/\{\{(\d+)\}\}/g, (_, i: string) => p[Number(i) - 1] ?? '');
  const link = t.link ? `${appUrl.replace(/\/$/, '')}/${t.link(m)}` : null;
  return { text, link };
}

/**
 * The templates as Meta's "create message template" call takes them. The button's base
 * address is the app's own (`appUrl`), so templates are made per domain: staging and
 * production each submit their own under the same names.
 */
export function metaTemplates(
  appUrl: string,
  language = 'ar',
  names: Partial<Record<TemplateKey, string>> = {},
) {
  const base = appUrl.replace(/\/$/, '');
  return defs.map((t) => {
    if (t.category === 'AUTHENTICATION')
      return {
        name: names[t.key] ?? t.name,
        language,
        category: t.category,
        components: [
          { type: 'BODY', add_security_recommendation: true },
          { type: 'FOOTER', code_expiration_minutes: 10 },
          { type: 'BUTTONS', buttons: [{ type: 'OTP', otp_type: 'COPY_CODE', text: 'نسخ الرمز' }] },
        ],
      };
    return {
      name: names[t.key] ?? t.name,
      language,
      category: t.category,
      components: [
        { type: 'BODY', text: t.body, example: { body_text: [t.examples] } },
        ...(t.button
          ? [
              {
                type: 'BUTTONS',
                buttons: [
                  {
                    type: 'URL',
                    text: t.button.text,
                    url: `${base}/{{1}}`,
                    example: [`${base}/${t.buttonExample ?? ''}`],
                  },
                ],
              },
            ]
          : []),
      ],
    };
  });
}
