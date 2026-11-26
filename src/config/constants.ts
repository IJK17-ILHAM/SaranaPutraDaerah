export const GOOGLE_SPS_URL =
  'https://script.google.com/macros/s/AKfycbw0XfcfCiJk4ip3VWAEsOiO8BFt2ywWvQ5MZd3i8_QhchRCl-Eyrjtu_P6wULwTRsbS/exec';

export const GOOGLE_TONASE_URL =
  'https://script.google.com/macros/s/AKfycbwUCWfARnTuzGZKMJ78fTEvIO-gJ0SoIoEXDU5ovzygbMqCHPIKFZPLLk723gXmXkvWVw/exec';

export const GOOGLE_ARMADA_URL =
  'https://script.google.com/macros/s/AKfycbwqrh6enSeyZCel9Ofu4r7kEuIIbjBaUgAD61n5JlbdQKC_T1UHRr8caWyjUh_v566nQQ/exec';

export const GOOGLE_ARMADA_DRIVE_FOLDER_ID = '1Ch63swBO71_GofpT6BTov3f-O1Q3wjyZ';
export const GOOGLE_ARMADA_DRIVE_FOLDER_URL =
  'https://drive.google.com/drive/folders/1Ch63swBO71_GofpT6BTov3f-O1Q3wjyZ?usp=sharing';


export const STORAGE_KEYS = {
  THEME: 'spd_theme_softui',
  USER: 'spd_logged_user',
  PAYROLL_CACHE: 'spd_payroll_cache',
  PAYROLL_LOCAL_DRAFTS: 'spd_payroll_local_drafts',
  PAYROLL_EMPLOYEES: 'spd_payroll_employees',
  PAYROLL_DELETED_EMPLOYEES: 'spd_payroll_deleted_employees',
  KT_BARANG: 'spd_kt_barang',
  KT_CUSTOMERS: 'spd_kt_customers',
  KT_TRANSACTIONS: 'spd_kt_transactions',
  KT_KASOPS: 'spd_kt_kasops',
  KT_PIUTANG_MITRA: 'spd_kt_piutang_mitra',
  KT_PAYMENTS: 'spd_kt_payments',
  KT_STOCK_MUTATIONS: 'spd_kt_stock_mutations',
  KT_INITIALIZED: 'spd_kt_initialized',
  ARMADA_UNITS: 'spd_armada_units',
  ARMADA_PELANGGAN: 'spd_armada_pelanggan',
  ARMADA_LOKASI: 'spd_armada_lokasi',
  ARMADA_TARIF: 'spd_armada_tarif',
  ARMADA_PERJALANAN: 'spd_armada_perjalanan',
  ARMADA_UANG_JALAN: 'spd_armada_uang_jalan',
  ARMADA_SEWA: 'spd_armada_sewa',
  ARMADA_P2H: 'spd_armada_p2h',
  ARMADA_MAINTENANCE: 'spd_armada_maintenance',
  ARMADA_PERMINTAAN_BARANG: 'spd_armada_permintaan_barang',
  ARMADA_KENDALA: 'spd_armada_kendala',
  ARMADA_ACCOUNTS: 'spd_armada_accounts',
} as const;

export const DIVISIONS = ['Karyawan limbah', 'Supir B3', 'Supir SPD'] as const;

export const PAYROLL_STATUSES = ['Draft', 'Approved', 'Paid'] as const;

export const PAYROLL_CYCLES = ['Mingguan', 'Bulanan'] as const;

export const ACCOUNT_ROLES = [
  'Super Admin',
  'HR & Payroll',
  'Manajer Operasional',
  'Supervisor',
  'Staff',
] as const;

export const ARMADA_ACCOUNT_ROLES = [
  'Super Admin',
  'Admin Armada',
  'Kepala Armada',
  'Finance',
  'Mekanik',
  'Sopir',
] as const;

export const DEFAULT_PAYROLL_RATES = {
  hariKerja: 6,
  upahPerHari: 125000,
  upahPerTrip: 150000,
  upahLemburHari: 100000,
  upahPerJam: 11250,
  upahPerInap: 100000,
} as const;

export type ThemeId = 'spd' | 'eco' | 'dark';

export interface ThemeOption {
  id: ThemeId;
  name: string;
  badge?: string;
  description: string;
  swatches: string[];
}

export const THEME_OPTIONS: ThemeOption[] = [
  {
    id: 'spd',
    name: 'Pilihan A: Soft UI (Cobalt & Ivory)',
    badge: 'Default',
    description: 'Cobalt (#2563EB), Sky (#60A5FA), Mist (#E0E7FF), Ivory (#F4F2ED) & Charcoal (#1F2937).',
    swatches: ['#2563EB', '#60A5FA', '#E0E7FF', '#F4F2ED', '#1F2937'],
  },
  {
    id: 'eco',
    name: 'Pilihan B: Hijau Daur Ulang',
    description: 'Hijau tua (#1F5C4A) & Hijau segar (#248458).',
    swatches: ['#1F5C4A', '#248458', '#F1F5F2', '#6EE7B7', '#1E2A24'],
  },
  {
    id: 'dark',
    name: 'Pilihan C: Dark Mode',
    description: 'Tampilan Charcoal gelap dengan aksen Cobalt & Sky untuk operasional malam.',
    swatches: ['#1F2937', '#2563EB', '#60A5FA', '#111827', '#F9FAFB'],
  },
];
