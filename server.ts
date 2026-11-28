import 'dotenv/config';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const IS_PROD = process.env.NODE_ENV === 'production';

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
  'image/heif',
  'application/pdf',
]);

interface DetectedBuktiPencairan {
  nominal: number | null;
  tanggal: string | null;
  metode: 'Transfer' | 'Tunai' | null;
  bankAtauSumber: string | null;
  catatan: string | null;
}

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function parseDataUrl(dataUrl: string): { mimeType: string; base64: string } | null {
  const match = /^data:([a-zA-Z0-9.+/-]+);base64,([A-Za-z0-9+/=\s]+)$/.exec(dataUrl.trim());
  if (!match) return null;
  let mimeType = match[1].toLowerCase();
  if (mimeType === 'image/jpg') mimeType = 'image/jpeg';
  if (!ALLOWED_MIME_TYPES.has(mimeType)) return null;
  const base64 = match[2].replace(/\s+/g, '');
  if (!base64) return null;
  return { mimeType, base64 };
}

function sanitizeIsoDate(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
  const [y, m, d] = trimmed.split('-').map(Number);
  if (y < 2000 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) return null;
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (
    dt.getUTCFullYear() !== y ||
    dt.getUTCMonth() !== m - 1 ||
    dt.getUTCDate() !== d
  ) {
    return null;
  }
  return trimmed;
}

function sanitizeNominal(raw: unknown): number | null {
  if (typeof raw === 'number' && Number.isFinite(raw) && raw > 0) {
    return Math.round(raw);
  }
  if (typeof raw === 'string') {
    const cleaned = raw.replace(/[^\d.,]/g, '').trim();
    if (!cleaned) return null;
    // Handle Indonesian format like "1.500.000,00" or "1,500,000.00"
    let normalized = cleaned;
    if (/^\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(cleaned)) {
      normalized = cleaned.replace(/\./g, '').replace(',', '.');
    } else if (/^\d{1,3}(,\d{3})+(\.\d{1,2})?$/.test(cleaned)) {
      normalized = cleaned.replace(/,/g, '');
    } else {
      normalized = cleaned.replace(/[.,]\d{2}$/, '').replace(/[^\d]/g, '');
    }
    const parsed = Number(normalized);
    if (Number.isFinite(parsed) && parsed > 0) {
      return Math.round(parsed);
    }
  }
  return null;
}

function sanitizeMetode(raw: unknown): 'Transfer' | 'Tunai' | null {
  if (typeof raw !== 'string') return null;
  const lower = raw.trim().toLowerCase();
  if (lower === 'transfer' || lower.includes('transfer') || lower.includes('bank') || lower.includes('qris')) {
    return 'Transfer';
  }
  if (lower === 'tunai' || lower.includes('cash') || lower.includes('kas tunai')) {
    return 'Tunai';
  }
  return null;
}

function isTransientError(err: unknown): boolean {
  const status = Number((err as { status?: number; code?: number })?.status ?? (err as { code?: number })?.code ?? 0);
  if (status === 429 || status === 500 || status === 502 || status === 503 || status === 504) {
    return true;
  }
  const msg = String((err as Error)?.message || '').toLowerCase();
  return msg.includes('timeout') || msg.includes('network') || msg.includes('unavailable') || msg.includes('overloaded');
}

async function detectBuktiWithRetry(
  ai: GoogleGenAI,
  mimeType: string,
  base64: string,
): Promise<DetectedBuktiPencairan> {
  const prompt = [
    'Anda adalah sistem pembaca bukti pembayaran keuangan (finance) Indonesia.',
    'Analisis gambar/dokumen bukti pembayaran pencairan uang jalan berikut dan ekstrak informasi utamanya:',
    '1. nominal: Total nominal uang yang dibayarkan / ditransfer dalam Rupiah (bilangan bulat, tanpa titik/koma ribuan dan tanpa sen .00). Jika ada kolom Nominal Transfer dan Biaya Admin terpisah, ambil Nominal Transfer utama yang dibayarkan ke penerima. Jika tidak ada nominal jelas, kembalikan null.',
    '2. tanggal: Tanggal transaksi pembayaran dalam format YYYY-MM-DD (misal 2026-11-28). Perhatikan format tanggal Indonesia (DD/MM/YYYY atau DD MMM YYYY seperti 28 Nov 2026). Jika tidak terbaca, kembalikan null.',
    '3. metode: Pilih HANYA "Transfer" atau "Tunai". Pilih "Transfer" jika bukti berasal dari m-banking, internet banking, struk ATM, BI-FAST, Virtual Account, QRIS, atau e-wallet (BCA, BRI, BRImo, Mandiri, Livin, BNI, BSI, Permata, CIMB, Dana, OVO, GoPay, ShopeePay, Flip, dll). Pilih "Tunai" jika berupa kwitansi tunai, nota kas keluar tunai, atau foto serah terima uang cash. Jika tidak dapat ditentukan, kembalikan null.',
    '4. bankAtauSumber: Nama bank, aplikasi, atau jenis bukti singkat jika terlihat (misal "BCA Mobile", "BRImo", "Livin Mandiri", "Kwitansi Tunai"). Jika tidak terlihat, kembalikan null.',
    '5. catatan: Ringkasan sangat singkat (maksimal 12 kata dalam bahasa Indonesia) tentang bukti yang terbaca.',
    'Jangan mengarang data yang tidak terlihat di gambar.',
  ].join('\n');

  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType,
                data: base64,
              },
            },
            { text: prompt },
          ],
        },
        config: {
          thinkingConfig: {
            thinkingLevel: ThinkingLevel.LOW,
          },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              nominal: {
                type: Type.NUMBER,
                nullable: true,
                description: 'Nominal dibayar dalam Rupiah (bilangan bulat). Null jika tidak terbaca.',
              },
              tanggal: {
                type: Type.STRING,
                nullable: true,
                description: 'Tanggal transaksi dalam format YYYY-MM-DD. Null jika tidak terbaca.',
              },
              metode: {
                type: Type.STRING,
                nullable: true,
                description: 'Metode pembayaran: Transfer atau Tunai. Null jika tidak jelas.',
              },
              bankAtauSumber: {
                type: Type.STRING,
                nullable: true,
                description: 'Nama bank, e-wallet, atau jenis bukti jika terbaca.',
              },
              catatan: {
                type: Type.STRING,
                nullable: true,
                description: 'Ringkasan singkat 1 kalimat atas bukti yang dibaca.',
              },
            },
          },
        },
      });

      const rawText = (response.text ?? '{}').trim();
      const parsed = JSON.parse(rawText) as Record<string, unknown>;

      return {
        nominal: sanitizeNominal(parsed.nominal),
        tanggal: sanitizeIsoDate(parsed.tanggal),
        metode: sanitizeMetode(parsed.metode),
        bankAtauSumber:
          typeof parsed.bankAtauSumber === 'string' && parsed.bankAtauSumber.trim()
            ? parsed.bankAtauSumber.trim().slice(0, 80)
            : null,
        catatan:
          typeof parsed.catatan === 'string' && parsed.catatan.trim()
            ? parsed.catatan.trim().slice(0, 160)
            : null,
      };
    } catch (err) {
      lastError = err;
      if (attempt < 2 && isTransientError(err)) {
        await new Promise((resolve) => setTimeout(resolve, 600 * (attempt + 1)));
        continue;
      }
      throw err;
    }
  }

  throw lastError;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '12mb' }));

  app.post('/api/armada/scan-bukti-pencairan', async (req, res) => {
    try {
      const dataUrl = typeof req.body?.dataUrl === 'string' ? req.body.dataUrl : '';
      if (!dataUrl) {
        res.status(400).json({
          ok: false,
          error: 'File bukti pembayaran tidak ditemukan dalam permintaan.',
        });
        return;
      }

      const parsedMedia = parseDataUrl(dataUrl);
      if (!parsedMedia) {
        res.status(400).json({
          ok: false,
          error: 'Format file tidak didukung. Gunakan gambar (JPG, PNG, WEBP) atau PDF.',
        });
        return;
      }

      const ai = getGeminiClient();
      if (!ai) {
        res.status(503).json({
          ok: false,
          error:
            'Layanan deteksi otomatis belum aktif karena GEMINI_API_KEY belum terkonfigurasi di Settings > Secrets.',
        });
        return;
      }

      const detected = await detectBuktiWithRetry(ai, parsedMedia.mimeType, parsedMedia.base64);
      res.json({
        ok: true,
        data: detected,
      });
    } catch (err) {
      const status = Number((err as { status?: number; code?: number })?.status ?? (err as { code?: number })?.code ?? 500);
      const rawMsg = String((err as Error)?.message || '');

      if (status === 400 || status === 403 || rawMsg.includes('API_KEY_INVALID') || rawMsg.includes('PERMISSION_DENIED')) {
        res.status(status >= 400 && status < 500 ? status : 403).json({
          ok: false,
          error: 'Kunci API Gemini tidak valid atau belum memiliki izin. Periksa pengaturan di Settings > Secrets.',
        });
        return;
      }
      if (status === 429 || rawMsg.includes('RESOURCE_EXHAUSTED')) {
        res.status(429).json({
          ok: false,
          error: 'Batas permintaan deteksi gambar sementara penuh. Coba beberapa saat lagi atau isi nominal secara manual.',
        });
        return;
      }

      console.error('[scan-bukti-pencairan] Error:', err);
      res.status(500).json({
        ok: false,
        error: 'Gagal membaca gambar bukti pembayaran. Anda tetap bisa mengisi nominal, tanggal, dan metode secara manual.',
      });
    }
  });

  if (!IS_PROD) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
      },
      appType: 'mpa',
    });

    // Ensure /armada without trailing slash resolves cleanly to /armada/
    app.use((req, res, next) => {
      if (req.path === '/armada') {
        const qs = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
        res.redirect(301, `/armada/${qs}`);
        return;
      }
      next();
    });

    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    const mainIndex = path.join(distDir, 'index.html');
    const armadaIndex = path.join(distDir, 'armada', 'index.html');

    app.use(express.static(distDir));

    app.get('/armada', (_req, res) => {
      res.redirect(301, '/armada/');
    });

    app.get(/^\/armada\/.*$/, (_req, res) => {
      if (fs.existsSync(armadaIndex)) {
        res.sendFile(armadaIndex);
        return;
      }
      res.sendFile(mainIndex);
    });

    app.get(/^(?!\/api\/).*$/, (_req, res) => {
      res.sendFile(mainIndex);
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SPD Portal server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
