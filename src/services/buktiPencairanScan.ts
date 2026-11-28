export interface BuktiPencairanScanResult {
  nominal: number | null;
  tanggal: string | null;
  metode: 'Transfer' | 'Tunai' | null;
  bankAtauSumber: string | null;
  catatan: string | null;
}

/**
 * Prepares a higher-clarity Data URL for OCR/vision detection (up to 1600px JPEG)
 * while keeping payload size compact for fast upload.
 */
export function prepareProofForScan(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Gagal membaca file bukti untuk pemindaian.'));
    reader.onload = () => {
      const rawUrl = String(reader.result || '');
      if (!file.type.startsWith('image/') || file.size <= 350 * 1024) {
        resolve(rawUrl);
        return;
      }

      const img = new Image();
      img.onload = () => {
        const maxDim = 1600;
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.86));
          return;
        }
        resolve(rawUrl);
      };
      img.onerror = () => resolve(rawUrl);
      img.src = rawUrl;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Calls server-side Gemini endpoint to extract nominal, tanggal, and metode from a proof image/PDF.
 */
export async function scanBuktiPencairan(dataUrl: string): Promise<BuktiPencairanScanResult> {
  const response = await fetch('/api/armada/scan-bukti-pencairan', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ dataUrl }),
  });

  const payload = (await response.json().catch(() => null)) as
    | { ok?: boolean; data?: BuktiPencairanScanResult; error?: string }
    | null;

  if (!response.ok || !payload?.ok || !payload.data) {
    throw new Error(
      payload?.error || 'Gagal mendeteksi data dari bukti pembayaran. Silakan isi manual.',
    );
  }

  return payload.data;
}
