import { buttonClass } from '@sulalah/ui';
import Link from 'next/link';
import { StatePage } from '@/components/States';

export default function NotFound() {
  return (
    <StatePage
      icon="search_off"
      title="هذا الغصن غير موجود"
      body="يمكن الرابط قديم، أو الصفحة انتقلت."
      action={
        <Link href="/trees" className={buttonClass('primary')}>
          ارجع لأشجاري
        </Link>
      }
    />
  );
}
