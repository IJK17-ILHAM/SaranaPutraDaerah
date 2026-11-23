export interface UserSession {
  id?: string;
  nama: string;
  username?: string;
  email?: string;
  role: string;
  status?: string;
  isDemo?: boolean;
}

export interface AccountRecord {
  id?: string;
  nama: string;
  username?: string;
  email?: string;
  role: string;
  status: 'Aktif' | 'Nonaktif' | string;
}

export interface AccountFormPayload {
  originalEmail: string;
  idAkun: string;
  nama: string;
  email: string;
  password: string;
  role: string;
  status: string;
}

export type AppSuite = 'payroll' | 'kastonase';

export type MenuId =
  | 'menu-ringkasan'
  | 'menu-input'
  | 'menu-karyawan'
  | 'menu-slip'
  | 'menu-laporan'
  | 'menu-akun'
  | 'menu-kt-dashboard'
  | 'menu-kt-transaksi'
  | 'menu-kt-stok'
  | 'menu-kt-harga'
  | 'menu-kt-customer'
  | 'menu-kt-hutang'
  | 'menu-kt-laporan'
  | 'menu-kt-pengaturan';
