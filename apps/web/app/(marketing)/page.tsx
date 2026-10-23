import { Button } from '@sulalah/ui';
import { DemoTree } from '@/components/DemoTree';

export default function HomePage() {
  return (
    <main className="relative h-dvh overflow-hidden">
      <DemoTree />
      <section className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center gap-4 bg-gradient-to-t from-ivory via-ivory/80 to-transparent px-4 pt-24 pb-12 text-center">
        <h1 className="font-display text-3xl text-forest md:text-5xl">
          كل عائلة لها جذور... وكل غصن يحمل حكاية.
        </h1>
        <p className="max-w-xl text-lg text-bark/80">
          أنشئ شجرة عائلتك، وشاركها مع أفرادها، ودع أغصانكم تنمو جيلًا بعد جيل.
        </p>
        <div className="pointer-events-auto flex gap-3">
          <Button>ابدأ شجرة عائلتك</Button>
          <Button variant="quiet">جرّب الشجرة التفاعلية</Button>
        </div>
      </section>
    </main>
  );
}
