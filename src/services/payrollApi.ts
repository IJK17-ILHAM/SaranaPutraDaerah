import { GOOGLE_SPS_URL } from '../config/constants';
import type { AccountFormPayload, AccountRecord, UserSession } from '../types/auth';
import type { PayrollCycle, PayrollRecord, PayrollSheetTargetMode } from '../types/payroll';
import { jsonpRequest } from './jsonp';

export const PAYROLL_SHEET_NAME = 'Gajian';
const ACCOUNT_SHEET_NAME = 'Akun';

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

export function sanitizePayrollSheetName(raw?: string): string {
  const cleaned = String(raw || '')
    .replace(/[\\/?*[\]:]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 95);
  if (!cleaned || cleaned.toLowerCase() === ACCOUNT_SHEET_NAME.toLowerCase()) {
    return PAYROLL_SHEET_NAME;
  }
  return cleaned;
}

export function resolvePayrollTargetSheet(
  mode: PayrollSheetTargetMode,
  periodeLabel: string,
  siklusGaji: PayrollCycle | string = 'Mingguan',
  customSheetName = '',
): string {
  const cleanPeriode = String(periodeLabel || '').trim();
  const cleanSiklus = String(siklusGaji || '')
    .toLowerCase()
    .includes('bulan')
    ? 'Bulanan'
    : 'Mingguan';

  if (mode === 'per-periode') {
    return sanitizePayrollSheetName(cleanPeriode ? `Gajian - ${cleanPeriode}` : PAYROLL_SHEET_NAME);
  }
  if (mode === 'per-siklus') {
    return sanitizePayrollSheetName(`Gajian ${cleanSiklus}`);
  }
  if (mode === 'per-siklus-periode') {
    return sanitizePayrollSheetName(
      cleanPeriode ? `${cleanSiklus} - ${cleanPeriode}` : `Gajian ${cleanSiklus}`,
    );
  }
  if (mode === 'custom') {
    return sanitizePayrollSheetName(customSheetName || PAYROLL_SHEET_NAME);
  }
  return PAYROLL_SHEET_NAME;
}

function buildPayrollSpsParams(
  payload: PayrollRecord,
  action: 'save' | 'updatePayroll',
): Record<string, unknown> {
  const { localDraftId: _omitDraftId, ...rest } = payload;
  void _omitDraftId;
  const targetSheet = sanitizePayrollSheetName(payload.sheetName);
  return {
    ...rest,
    action,
    sheet: targetSheet,
    sheetName: targetSheet,
  };
}

export async function loginWithSPS(
  email: string,
  password: string,
): Promise<LoginResponse> {
  return jsonpRequest<LoginResponse>(
    { action: 'login', sheet: ACCOUNT_SHEET_NAME, email, password },
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
  const looksLikeAccountOnly =
    Boolean(String(r.ID_AKUN || r.USERNAME || '').trim()) && !hasNama && !hasPeriode;
  if (looksLikeAccountOnly) return false;
  return true;
}

export async function fetchPayrollFromSPS(): Promise<PayrollRecord[]> {
  const json = await jsonpRequest<PayrollRecord[] | GenericSpsResponse>(
    {
      sheet: PAYROLL_SHEET_NAME,
      sheetName: PAYROLL_SHEET_NAME,
      includeAllPayrollSheets: '1',
      t: Date.now(),
    },
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
    buildPayrollSpsParams(payload, 'save'),
    15000,
    GOOGLE_SPS_URL,
  );
}

export async function fetchUsersFromSPS(): Promise<UsersResponse> {
  return jsonpRequest<UsersResponse>(
    { action: 'getUsers', sheet: ACCOUNT_SHEET_NAME, t: Date.now() },
    15000,
    GOOGLE_SPS_URL,
  );
}

export async function saveUserToSPS(payload: AccountFormPayload): Promise<GenericSpsResponse> {
  return jsonpRequest<GenericSpsResponse>(
    { action: 'saveUser', sheet: ACCOUNT_SHEET_NAME, ...payload },
    15000,
    GOOGLE_SPS_URL,
  );
}

export async function deleteUserFromSPS(email: string): Promise<GenericSpsResponse> {
  return jsonpRequest<GenericSpsResponse>(
    { action: 'deleteUser', sheet: ACCOUNT_SHEET_NAME, email },
    15000,
    GOOGLE_SPS_URL,
  );
}

export async function updatePayrollInSPS(payload: PayrollRecord): Promise<GenericSpsResponse> {
  return jsonpRequest<GenericSpsResponse>(
    buildPayrollSpsParams(payload, 'updatePayroll'),
    15000,
    GOOGLE_SPS_URL,
  );
}

export async function deletePayrollFromSPS(
  nik: string,
  nama: string,
  periodeTanggal: string,
  sheetName?: string,
): Promise<GenericSpsResponse> {
  const targetSheet = sanitizePayrollSheetName(sheetName);
  return jsonpRequest<GenericSpsResponse>(
    {
      action: 'deletePayroll',
      sheet: targetSheet,
      sheetName: targetSheet,
      nik,
      nama,
      periodeTanggal,
    },
    15000,
    GOOGLE_SPS_URL,
  );
}
