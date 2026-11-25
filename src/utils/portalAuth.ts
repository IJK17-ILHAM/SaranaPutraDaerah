import { STORAGE_KEYS } from '../config/constants';
import type { UserSession } from '../types/auth';

export type AllowedRedirectTarget = 'armada';

export function readStoredUserSession(): UserSession | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.USER);
    if (!saved) return null;
    const parsed = JSON.parse(saved) as UserSession;
    if (parsed && (parsed.username || parsed.email || parsed.nama)) {
      return parsed;
    }
  } catch {
    return null;
  }
  return null;
}

export function clearStoredUserSession(): void {
  localStorage.removeItem(STORAGE_KEYS.USER);
}

export function isSuperAdminRole(role?: string | null): boolean {
  const normalized = (role || '').toString().trim().toLowerCase().replace(/\s+/g, ' ');
  return normalized === 'super admin' || normalized === 'superadmin';
}

export function isActiveSuperAdminSession(user: UserSession | null): boolean {
  if (!user) return false;
  if ((user.status || '').toString().trim().toLowerCase() === 'nonaktif') return false;
  return isSuperAdminRole(user.role);
}

/**
 * Strictly allowlists redirect targets from query params to prevent open redirects.
 */
export function getRequestedRedirectTarget(): AllowedRedirectTarget | null {
  try {
    const params = new URLSearchParams(window.location.search);
    const target = (params.get('redirect') || '').trim().toLowerCase();
    if (target === 'armada') return 'armada';
  } catch {
    return null;
  }
  return null;
}

/**
 * Computes the portal root URL relative to the current /armada/ path
 * (works on both root dev servers and GitHub Pages subpaths like /repo/armada/).
 */
export function getPortalBaseUrlFromArmada(): string {
  const path = window.location.pathname || '/';
  if (/\/armada\/?$/i.test(path) && !path.endsWith('/')) {
    return './';
  }
  return '../';
}

export function getPortalLoginUrlFromArmada(): string {
  return `${getPortalBaseUrlFromArmada()}?redirect=armada`;
}

export function getArmadaUrlFromPortal(): string {
  return './armada/';
}
