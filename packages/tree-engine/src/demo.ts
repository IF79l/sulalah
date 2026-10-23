import type { LineagePerson, LineageUnion } from './types';

type Row = [id: string, name: string, fatherId: string | null, gender?: 'f', deceased?: true];

// Fictional family from the acceptance scenario; never written to real trees.
const rows: Row[] = [
  ['mohammed', 'محمد بن عبدالله', null, undefined, true],
  ['matrouk', 'متروك', 'mohammed'],
  ['daifallah', 'ضيف الله', 'mohammed'],
  ['abdullah', 'عبدالله', 'mohammed'],
  ['salem', 'سالم', 'matrouk'],
  ['ahmed', 'أحمد', 'matrouk'],
  ['saad', 'سعد', 'matrouk', undefined, true],
  ['hessa', 'حصة', 'matrouk', 'f'],
  ['nasser', 'ناصر', 'daifallah'],
  ['noura', 'نورة', 'daifallah', 'f'],
  ['fahd-d', 'فهد', 'daifallah'],
  ['khaled', 'خالد', 'abdullah'],
  ['sultan', 'سلطان', 'abdullah'],
  ['lulwa', 'لولوة', 'abdullah', 'f'],
  ['turki', 'تركي', 'salem'],
  ['reem', 'ريم', 'salem', 'f'],
  ['majed', 'ماجد', 'salem'],
  ['ziyad', 'زياد', 'ahmed'],
  ['layan', 'ليان', 'ahmed', 'f'],
  ['sara', 'سارة', 'ahmed', 'f'],
  ['bandar', 'بندر', 'nasser'],
  ['mishal', 'مشعل', 'nasser'],
  ['hind', 'هند', 'nasser', 'f'],
  ['faisal', 'فيصل', 'khaled'],
  ['abdulaziz', 'عبدالعزيز', 'khaled'],
  ['jawaher', 'الجوهرة', 'khaled', 'f'],
  ['nawaf', 'نواف', 'sultan'],
  ['dana', 'دانة', 'sultan', 'f'],
  ['omar', 'عمر', 'turki'],
  ['yousef', 'يوسف', 'turki'],
  ['salman', 'سلمان', 'bandar'],
  ['ghala', 'غلا', 'bandar', 'f'],
  ['rakan', 'راكان', 'faisal'],
];

export const demoFamily: LineagePerson[] = rows.map(([id, name, fatherId, g, deceased]) => ({
  id,
  name,
  gender: g === 'f' ? 'female' : 'male',
  fatherId,
  status: 'approved',
  deceased: deceased ?? false,
}));

export const demoUnions: LineageUnion[] = [
  { aId: 'mohammed', bId: 'w-moudi' },
  { aId: 'matrouk', bId: 'w-fatima' },
];

export const demoSpouses: LineagePerson[] = [
  { id: 'w-moudi', name: 'موضي', gender: 'female', status: 'approved' },
  { id: 'w-fatima', name: 'فاطمة', gender: 'female', status: 'approved' },
];
