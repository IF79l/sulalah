/**
 * Utility functions for Arabic text normalization, genealogical relations, and formatting.
 */

export function normalizeArabic(text: string): string {
  if (!text) return '';
  return text
    // Remove diacritics (tashkeel)
    .replace(/[\u064B-\u065F\u0670]/g, '')
    // Remove tatweel (kashida)
    .replace(/\u0640/g, '')
    // Normalize Alif forms (أ, إ, آ, ٱ -> ا)
    .replace(/[أإآٱ]/g, 'ا')
    // Normalize Taa Marbuta (ة -> ه)
    .replace(/ة/g, 'ه')
    // Normalize Yaa (ى -> ي)
    .replace(/ى/g, 'ي')
    // Normalize Waw with Hamza (ؤ -> و)
    .replace(/ؤ/g, 'و')
    // Normalize Yaa with Hamza (ئ -> ي)
    .replace(/ئ/g, 'ي')
    .trim()
    .toLowerCase();
}

export function searchArabicMatch(source: string, query: string): boolean {
  if (!query) return true;
  const normSource = normalizeArabic(source);
  const normQuery = normalizeArabic(query);
  return normSource.includes(normQuery);
}

export function formatArabicCurrency(amount: number): string {
  return `${amount.toLocaleString('ar-SA')} ر.س`;
}

export function formatArabicDate(dateString: string): string {
  try {
    const d = new Date(dateString);
    return d.toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return dateString;
  }
}

export function formatArabicRelativeTime(dateString: string): string {
  try {
    const d = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'الآن';
    if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
    if (diffHours < 24) return `منذ ${diffHours} ساعة`;
    if (diffDays === 1) return 'أمس';
    if (diffDays < 30) return `منذ ${diffDays} يوم`;
    return formatArabicDate(dateString);
  } catch {
    return dateString;
  }
}
