import { GOOGLE_SPS_URL } from '../config/constants';
import type { AccountFormPayload, AccountRecord, UserSession } from '../types/auth';
import type { PayrollRecord } from '../types/payroll';
import { jsonpRequest } from './jsonp';

interface LoginResponse {
  status: string;
  message?: string;
  user?: UserSession;
}

interface UsersResponse {
  status: string;
  users?: AccountRecord[];
  message?: string;
}

interface GenericSpsResponse {
  status?: string;
  message?: string;
  data?: PayrollRecord[];
  records?: PayrollRecord[];
}

export async function loginWithSPS(
  email: string,
  password: string,
): Promise<LoginResponse> {
  return jsonpRequest<LoginResponse>(
    { action: 'login', email, password },
    15000,
    GOOGLE_SPS_URL,
  );
}

function isValidPayrollRow(row: unknown): row is PayrollRecord {
  if (!row || typeof row !== 'object') return false;
  const r = row as Record<string, unknown>;
  const hasNama = String(r.nama || '').trim() !== '';
  const hasPeriode = String(r.periodeTanggal || r.periodeBulan || '').trim() !== '';
  if (!hasNama && !hasPeriode) return false;
  return true;
}

export async function fetchPayrollFromSPS(): Promise<PayrollRecord[]> {
  const json = await jsonpRequest<PayrollRecord[] | GenericSpsResponse>(
    { t: Date.now() },
    15000,
    GOOGLE_SPS_URL,
  );

  let rows: PayrollRecord[] = [];
  if (Array.isArray(json)) rows = json;
  else if (json && Array.isArray(json.data)) rows = json.data;
  else if (json && Array.isArray(json.records)) rows = json.records;

  return rows.filter(isValidPayrollRow).reverse();
}

export async function savePayrollToSPS(payload: PayrollRecord): Promise<GenericSpsResponse> {
  return jsonpRequest<GenericSpsResponse>(
    payload as unknown as Record<string, unknown>,
    15000,
    GOOGLE_SPS_URL,
  );
}

export async function fetchUsersFromSPS(): Promise<UsersResponse> {
  return jsonpRequest<UsersResponse>(
    { action: 'getUsers', t: Date.now() },
    15000,
    GOOGLE_SPS_URL,
  );
}

export async function saveUserToSPS(payload: AccountFormPayload): Promise<GenericSpsResponse> {
  return jsonpRequest<GenericSpsResponse>(
    { action: 'saveUser', ...payload },
    15000,
    GOOGLE_SPS_URL,
  );
}

export async function deleteUserFromSPS(email: string): Promise<GenericSpsResponse> {
  return jsonpRequest<GenericSpsResponse>(
    { action: 'deleteUser', email },
    15000,
    GOOGLE_SPS_URL,
  );
}

export async function updatePayrollInSPS(payload: PayrollRecord): Promise<GenericSpsResponse> {
  return jsonpRequest<GenericSpsResponse>(
    { ...payload, action: 'updatePayroll' } as unknown as Record<string, unknown>,
    15000,
    GOOGLE_SPS_URL,
  );
}

export async function deletePayrollFromSPS(
  nik: string,
  nama: string,
  periodeTanggal: string,
): Promise<GenericSpsResponse> {
  return jsonpRequest<GenericSpsResponse>(
    { action: 'deletePayroll', nik, nama, periodeTanggal },
    15000,
    GOOGLE_SPS_URL,
  );
}
