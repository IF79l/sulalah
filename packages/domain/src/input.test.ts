import { describe, expect, it } from 'vitest';
import { cleanName, latinDigits, nameProblem, yearsProblem } from './input';

describe('what people type', () => {
  it('reads Arabic and Persian digits', () => {
    expect(latinDigits('٠٥٥١٢٣٤٥٦٧')).toBe('0551234567');
    expect(latinDigits('۱۹۸۵')).toBe('1985');
  });

  it('tidies names and refuses blank or overlong ones', () => {
    expect(cleanName('  محمد   بن  علي ')).toBe('محمد بن علي');
    expect(nameProblem('   ')).toBe('اكتب الاسم');
    expect(nameProblem('ا'.repeat(61))).not.toBeNull();
    expect(nameProblem('نورة')).toBeNull();
  });

  it('catches years that cannot be right', () => {
    const now = new Date('2026-10-26T00:00:00Z');
    expect(yearsProblem({ birthYear: 1985 }, now)).toBeNull();
    expect(yearsProblem({ birthYear: 1405 }, now)).toBeNull();
    expect(yearsProblem({ birthYear: 2030 }, now)).toBe('سنة الميلاد غير صحيحة');
    expect(yearsProblem({ birthYear: 19 }, now)).toBe('سنة الميلاد غير صحيحة');
    expect(yearsProblem({ deathYear: 2001 }, now)).toBe('سنة الوفاة لمتوفى فقط');
    expect(yearsProblem({ deceased: true, birthYear: 1990, deathYear: 1980 }, now)).toBe(
      'سنة الوفاة قبل سنة الميلاد',
    );
  });
});
