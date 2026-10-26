/** Arabic-Indic (٠١٢) and Persian (۰۱۲) digits as 0-9, so a phone keyboard set to Arabic works. */
export const latinDigits = (text: string) =>
  text
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0));

/**
 * The national part of a Saudi mobile number as typed or pasted in any common way:
 * "0551234567", "551234567", "+966 55 123 4567", "00966551234567", "٠٥٥١٢٣٤٥٦٧". Answers up to
 * nine digits; a complete number is `isSaudiMobile`.
 */
export function nationalMobile(text: string): string {
  let d = latinDigits(text).replace(/\D/g, '');
  if (d.startsWith('00966')) d = d.slice(5);
  else if (d.startsWith('966') && d.length > 9) d = d.slice(3);
  d = d.replace(/^0+/, '');
  return d.slice(0, 9);
}

/** Nine digits starting with 5: what follows +966 on a Saudi mobile. */
export const isSaudiMobile = (national: string) => /^5\d{8}$/.test(national);
