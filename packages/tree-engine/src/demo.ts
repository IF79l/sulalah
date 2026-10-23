import type { LineagePerson } from './types';

/** Fictional family from the acceptance scenario; never written to real trees. */
export const demoFamily: LineagePerson[] = [
  { id: 'mohammed', name: 'محمد بن عبدالله', gender: 'male', status: 'approved' },
  { id: 'matrouk', name: 'متروك', gender: 'male', fatherId: 'mohammed', status: 'approved' },
  { id: 'daifallah', name: 'ضيف الله', gender: 'male', fatherId: 'mohammed', status: 'approved' },
  { id: 'abdullah', name: 'عبدالله', gender: 'male', fatherId: 'mohammed', status: 'approved' },
  { id: 'salem', name: 'سالم', gender: 'male', fatherId: 'matrouk', status: 'approved' },
  { id: 'ahmed', name: 'أحمد', gender: 'male', fatherId: 'matrouk', status: 'approved' },
  { id: 'nasser', name: 'ناصر', gender: 'male', fatherId: 'daifallah', status: 'approved' },
  { id: 'noura', name: 'نورة', gender: 'female', fatherId: 'daifallah', status: 'approved' },
  { id: 'khaled', name: 'خالد', gender: 'male', fatherId: 'abdullah', status: 'approved' },
];
