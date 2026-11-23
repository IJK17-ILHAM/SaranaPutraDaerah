import { GOOGLE_SPS_URL } from '../config/constants';

export function jsonpRequest<T = unknown>(
  params: Record<string, unknown> = {},
  timeoutMs = 15000,
  targetUrl = GOOGLE_SPS_URL,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const cbName = `spd_cb_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
    const script = document.createElement('script');
    let timer: ReturnType<typeof setTimeout> | null = null;

    const cleanup = () => {
      if (timer) clearTimeout(timer);
      try {
        delete (window as unknown as Record<string, unknown>)[cbName];
      } catch {
        (window as unknown as Record<string, unknown>)[cbName] = undefined;
      }
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };

    (window as unknown as Record<string, unknown>)[cbName] = (data: T) => {
      cleanup();
      resolve(data);
    };

    const query = new URLSearchParams();
    query.set('callback', cbName);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query.set(key, String(value));
      }
    });

    script.src = `${targetUrl}?${query.toString()}`;
    script.onerror = () => {
      cleanup();
      reject(new Error('Gagal memuat koneksi JSONP ke Google SPS'));
    };

    timer = setTimeout(() => {
      cleanup();
      reject(new Error('Timeout koneksi ke Google SPS'));
    }, timeoutMs);

    document.body.appendChild(script);
  });
}
