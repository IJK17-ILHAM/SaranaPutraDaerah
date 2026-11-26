import { STORAGE_KEYS } from '../config/constants';
import type {
  ArmadaMaintenanceRequest,
  ArmadaP2HRecord,
  ArmadaPelanggan,
  ArmadaPerjalanan,
  ArmadaSewaUnit,
  ArmadaUnit,
} from '../types/armada';
import type { KtKasOps } from '../types/kasTonase';
import { syncTonaseAction } from '../services/tonaseApi';
import { formatDateFullID } from './format';

export interface ScheduleConflict {
  kind: 'Perjalanan' | 'Sewa Unit';
  refNumber: string;
  unitLabel: string;
  customerName: string;
  startLabel: string;
  endLabel: string;
  reason: string;
}

export function toLocalDateTimeMs(dateISO: string, timeHHMM: string): number {
  if (!dateISO) return NaN;
  const cleanTime = (timeHHMM || '00:00').trim();
  const [y, m, d] = dateISO.split('-').map(Number);
  const [hh, mm] = cleanTime.split(':').map(Number);
  if (!y || !m || !d) return NaN;
  return new Date(y, m - 1, d, isNaN(hh) ? 0 : hh, isNaN(mm) ? 0 : mm, 0, 0).getTime();
}

export function isSewaOverdue(sewa: ArmadaSewaUnit): boolean {
  if (sewa.status !== 'Sedang Disewa') return false;
  const endMs = toLocalDateTimeMs(sewa.tanggalSelesai, sewa.jamSelesai);
  if (isNaN(endMs)) return false;
  return Date.now() > endMs;
}

/**
 * Checks whether a unit has an overlapping Perjalanan or Sewa Unit schedule.
 * - Active Perjalanan (`Dijadwalkan` or `Berjalan`) blocks its scheduled window.
 * - Active Sewa Unit (`Dipesan` or `Sedang Disewa`) blocks its scheduled window;
 *   and if `Sedang Disewa` has passed its scheduled end time without being returned,
 *   it continues blocking until actually returned (`Dikembalikan`).
 */
export function checkUnitScheduleConflict(params: {
  unitId: string;
  tanggalMulai: string;
  jamMulai: string;
  tanggalSelesai: string;
  jamSelesai: string;
  perjalananList: ArmadaPerjalanan[];
  sewaList: ArmadaSewaUnit[];
  units: ArmadaUnit[];
  pelangganList: ArmadaPelanggan[];
  excludePerjalananId?: string;
  excludeSewaId?: string;
}): ScheduleConflict | null {
  const reqStart = toLocalDateTimeMs(params.tanggalMulai, params.jamMulai);
  const reqEnd = toLocalDateTimeMs(params.tanggalSelesai, params.jamSelesai);
  if (isNaN(reqStart) || isNaN(reqEnd)) return null;

  const unit = params.units.find((u) => u.id === params.unitId);
  const unitLabel = unit ? `${unit.kodeUnit} (${unit.nomorPolisi})` : params.unitId;
  const plgName = (id: string) =>
    params.pelangganList.find((p) => p.id === id)?.namaPt || 'Pelanggan';

  // 1. Check against active Perjalanan
  for (const prj of params.perjalananList) {
    if (prj.id === params.excludePerjalananId) continue;
    if (prj.unitId !== params.unitId) continue;
    if (prj.status === 'Selesai' || prj.status === 'Dibatalkan') continue;

    const pStart = toLocalDateTimeMs(prj.tanggalMulai, prj.jamMulai);
    const pEnd = toLocalDateTimeMs(prj.tanggalSelesai, prj.jamSelesai);
    if (isNaN(pStart) || isNaN(pEnd)) continue;

    if (reqStart < pEnd && pStart < reqEnd) {
      const startLabel = `${formatDateFullID(prj.tanggalMulai)} ${prj.jamMulai}`;
      const endLabel =
        prj.tanggalMulai === prj.tanggalSelesai
          ? prj.jamSelesai
          : `${formatDateFullID(prj.tanggalSelesai)} ${prj.jamSelesai}`;
      return {
        kind: 'Perjalanan',
        refNumber: prj.nomorPenugasan,
        unitLabel,
        customerName: plgName(prj.pelangganId),
        startLabel,
        endLabel,
        reason: `Unit ${unitLabel} sudah dijadwalkan untuk Perjalanan ${prj.nomorPenugasan} (${plgName(
          prj.pelangganId,
        )}) pada ${startLabel}–${endLabel}.`,
      };
    }
  }

  // 2. Check against active Sewa Unit
  for (const sewa of params.sewaList) {
    if (sewa.id === params.excludeSewaId) continue;
    if (sewa.unitId !== params.unitId) continue;
    if (sewa.status === 'Dikembalikan') continue;

    const sStart = toLocalDateTimeMs(sewa.tanggalMulai, sewa.jamMulai);
    const scheduledEnd = toLocalDateTimeMs(sewa.tanggalSelesai, sewa.jamSelesai);
    // If still Sedang Disewa and past scheduled end, it still occupies the unit right now
    const effectiveEnd =
      sewa.status === 'Sedang Disewa' && !isNaN(scheduledEnd)
        ? Math.max(scheduledEnd, Date.now() + 24 * 60 * 60 * 1000)
        : scheduledEnd;
    if (isNaN(sStart) || isNaN(effectiveEnd)) continue;

    if (reqStart < effectiveEnd && sStart < reqEnd) {
      const startLabel = `${formatDateFullID(sewa.tanggalMulai)} ${sewa.jamMulai}`;
      const endLabel =
        sewa.tanggalMulai === sewa.tanggalSelesai
          ? sewa.jamSelesai
          : `${formatDateFullID(sewa.tanggalSelesai)} ${sewa.jamSelesai}`;
      const overdueNote = isSewaOverdue(sewa)
        ? ' (Sedang Disewa — melewati jadwal & belum dikembalikan)'
        : ` (${sewa.status})`;
      return {
        kind: 'Sewa Unit',
        refNumber: sewa.nomorSewa,
        unitLabel,
        customerName: plgName(sewa.pelangganId),
        startLabel,
        endLabel,
        reason: `Unit ${unitLabel} sedang terpakai pada Sewa Unit ${sewa.nomorSewa} (${plgName(
          sewa.pelangganId,
        )}) ${startLabel}–${endLabel}${overdueNote}.`,
      };
    }
  }

  return null;
}

/**
 * Evaluates whether a Perjalanan is blocked from starting due to an unresolved critical P2H finding.
 * Rule:
 * - Look at the latest P2H for that Perjalanan.
 * - If the latest P2H has `adaTemuanKritis === true`, then `Mulai Perjalanan` is HELD until:
 *   1) any linked Maintenance request is marked `Selesai`, AND
 *   2) a re-inspection P2H (`pemeriksaan ulang`) with zero critical findings is submitted!
 */
export function evaluatePerjalananP2HGate(
  perjalananId: string,
  p2hList: ArmadaP2HRecord[],
  maintenanceList: ArmadaMaintenanceRequest[],
): {
  blocked: boolean;
  latestP2H: ArmadaP2HRecord | null;
  reason?: string;
  needsMaintenance?: boolean;
  needsReinspection?: boolean;
} {
  const records = p2hList
    .filter((p) => p.perjalananId === perjalananId)
    .sort((a, b) => (b.tanggalIsi || b.createdAt).localeCompare(a.tanggalIsi || a.createdAt));

  if (records.length === 0) {
    return { blocked: false, latestP2H: null };
  }

  const latest = records[0];
  if (!latest.adaTemuanKritis || latest.statusTinjauan === 'Selesai / Lulus Ulang') {
    return { blocked: false, latestP2H: latest };
  }

  const linkedMaint = maintenanceList.filter(
    (m) => m.p2hId === latest.id || latest.maintenanceIds.includes(m.id),
  );
  const allMaintReleased =
    linkedMaint.length > 0 &&
    linkedMaint.every((m) => m.status === 'Selesai' && Boolean(m.penahananDilepas));

  if (allMaintReleased) {
    return { blocked: false, latestP2H: latest };
  }

  const allMaintDone =
    linkedMaint.length > 0 && linkedMaint.every((m) => m.status === 'Selesai');

  if (!allMaintDone) {
    return {
      blocked: true,
      latestP2H: latest,
      needsMaintenance: true,
      needsReinspection: true,
      reason:
        linkedMaint.length === 0
          ? `Ditahan: ${latest.nomorP2H} mencatat temuan kritis. Buat pengajuan perbaikan, selesaikan perbaikan, lalu catat pemeriksaan ulang.`
          : `Ditahan: Perbaikan (${linkedMaint
              .map((m) => `${m.nomorPengajuan}: ${m.status}`)
              .join(', ')}) belum selesai. Selesaikan perbaikan dan pemeriksaan ulang sebelum melepas penahanan unit.`,
    };
  }

  return {
    blocked: true,
    latestP2H: latest,
    needsMaintenance: false,
    needsReinspection: true,
    reason: `Ditahan: Perbaikan sudah selesai, menunggu pencatatan pemeriksaan ulang & pelepasan penahanan unit oleh Kepala Armada (atau pemeriksaan ulang P2H).`,
  };
}

/**
 * Appends a real cash transaction into Kas & Tonase (STORAGE_KEYS.KT_KASOPS)
 * so Finance disbursements & Uang Jalan settlements appear directly in Buku Kas.
 */
export function recordArmadaKasTonaseTransaction(params: {
  tanggal: string;
  jenis: 'Masuk' | 'Keluar';
  ket: string;
  nominal: number;
  metode: 'Tunai' | 'Transfer';
  mitra: string;
  diinputOleh: string;
}): KtKasOps {
  const entry: KtKasOps = {
    id: `KAS_ARM_${Date.now()}_${Math.random().toString(36).slice(2, 5).toUpperCase()}`,
    tanggal: params.tanggal,
    jenis: params.jenis,
    ket: params.ket,
    nominal: Math.round(Math.abs(params.nominal)),
    metode: params.metode,
    mitra: params.mitra,
    diinputOleh: params.diinputOleh,
  };

  try {
    const raw = localStorage.getItem(STORAGE_KEYS.KT_KASOPS);
    const parsed: KtKasOps[] = raw ? JSON.parse(raw) : [];
    const next = Array.isArray(parsed) ? [entry, ...parsed] : [entry];
    localStorage.setItem(STORAGE_KEYS.KT_KASOPS, JSON.stringify(next));
  } catch {
    localStorage.setItem(STORAGE_KEYS.KT_KASOPS, JSON.stringify([entry]));
  }

  void syncTonaseAction('saveKasOps', entry as unknown as Record<string, unknown>).catch(
    () => undefined,
  );

  return entry;
}

/**
 * Reads an uploaded image/proof file into a compact base64 Data URL for localStorage persistence.
 */
export function readProofFileAsDataUrl(file: File): Promise<{ dataUrl: string; name: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Gagal membaca file bukti.'));
    reader.onload = () => {
      const rawUrl = String(reader.result || '');
      // Compress large images onto a small canvas so localStorage stays lightweight
      if (file.type.startsWith('image/') && file.size > 120 * 1024) {
        const img = new Image();
        img.onload = () => {
          const maxDim = 900;
          const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round(img.width * scale));
          canvas.height = Math.max(1, Math.round(img.height * scale));
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            resolve({ dataUrl: canvas.toDataURL('image/jpeg', 0.72), name: file.name });
            return;
          }
          resolve({ dataUrl: rawUrl, name: file.name });
        };
        img.onerror = () => resolve({ dataUrl: rawUrl, name: file.name });
        img.src = rawUrl;
      } else {
        resolve({ dataUrl: rawUrl, name: file.name });
      }
    };
    reader.readAsDataURL(file);
  });
}
