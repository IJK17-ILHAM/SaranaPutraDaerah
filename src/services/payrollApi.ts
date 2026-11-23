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

export async function fetchPayrollFromSPS(): Promise<PayrollRecord[]> {
  const json = await jsonpRequest<PayrollRecord[] | GenericSpsResponse>(
    { t: Date.now() },
    15000,
    GOOGLE_SPS_URL,
  );

  if (Array.isArray(json)) return [...json].reverse();
  if (json && Array.isArray(json.data)) return [...json.data].reverse();
  if (json && Array.isArray(json.records)) return [...json.records].reverse();
  return [];
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
