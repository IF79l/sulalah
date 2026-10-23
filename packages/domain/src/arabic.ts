const DIACRITICS = /[ً-ٰٟـ]/g;

/** Normalizes Arabic names for search: hamza forms, taa marbuta, alef maqsura, diacritics, tatweel. */
export function normalizeArabic(text: string): string {
  return text
    .replace(DIACRITICS, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function matchesArabic(source: string, query: string): boolean {
  return normalizeArabic(source).includes(normalizeArabic(query));
}
