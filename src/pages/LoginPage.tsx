import { CheckCircle2, Eye, EyeOff, KeyRound, LogIn, Truck } from 'lucide-react';
import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { loginArmadaWithSPS } from '../services/armadaApi';
import { loginWithSPS } from '../services/payrollApi';
import { SPD_NAVY_GRADIENT, SpdLogoWordmark } from '../components/common/SpdLogo';
import type { UserSession } from '../types/auth';
import {
  canAccessArmadaSession,
  getArmadaUrlFromPortal,
  getRequestedRedirectTarget,
  isArmadaOnlySession,
} from '../utils/portalAuth';

export function LoginPage() {
  const { loginUser, showToast } = useApp();
  const isArmadaRedirect = getRequestedRedirectTarget() === 'armada';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [infoTip, setInfoTip] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const completeSignIn = (loggedUser: UserSession, welcomeMessage: string, toastKind: 'success' | 'info') => {
    loginUser(loggedUser);
    if (isArmadaRedirect) {
      if (canAccessArmadaSession(loggedUser)) {
        window.location.replace(getArmadaUrlFromPortal());
        return;
      }
      const cleanUrl = `${window.location.pathname}${window.location.hash}`;
      window.history.replaceState({}, '', cleanUrl);
      showToast(
        'Akun ini tidak memiliki akses ke modul Armada. Anda diarahkan ke Portal Utama.',
        'warning',
      );
      return;
    }
    if (isArmadaOnlySession(loggedUser)) {
      window.location.replace(getArmadaUrlFromPortal());
      return;
    }
    showToast(welcomeMessage, toastKind);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSubmitting(true);
    const cleanUser = email.trim();
    try {
      // When coming from /armada/, check SPS Armada accounts first (Sopir, Admin Armada, Mekanik, etc.)
      if (isArmadaRedirect) {
        const armadaRes = await loginArmadaWithSPS(cleanUser, password);
        if (armadaRes.status === 'ok' && armadaRes.user) {
          completeSignIn(
            armadaRes.user,
            `Selamat datang di Armada, ${armadaRes.user.nama || armadaRes.user.username}.`,
            'success',
          );
          return;
        }
      }

      // Check main Portal SPD SPS account (Super Admin, HR & Payroll, etc.)
      try {
        const json = await loginWithSPS(cleanUser, password);
        if (json && json.status === 'ok' && json.user) {
          completeSignIn(
            json.user,
            `Selamat datang, ${json.user.nama || json.user.username || 'Admin'}.`,
            'success',
          );
          return;
        }
      } catch {
        // Continue to Armada SPS check below
      }

      // If not found in Portal Gajian, also check SPS Armada so Sopir/Admin Armada can log in from root URL
      if (!isArmadaRedirect) {
        const armadaRes = await loginArmadaWithSPS(cleanUser, password);
        if (armadaRes.status === 'ok' && armadaRes.user) {
          completeSignIn(
            armadaRes.user,
            `Selamat datang di Armada, ${armadaRes.user.nama || armadaRes.user.username}.`,
            'success',
          );
          return;
        }
      }

      setErrorMsg('Username/Email atau Password salah. Periksa akun Portal SPD atau SPS Armada.');
    } catch {
      setErrorMsg('Gagal terhubung ke Google SPS. Periksa koneksi atau gunakan Mode Preview.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDemoLogin = () => {
    completeSignIn(
      {
        id: 'DEMO-01',
        nama: 'Admin Preview SPD',
        username: 'superadmin',
        role: 'Super Admin',
        status: 'Aktif',
        isDemo: true,
      },
      'Masuk dengan sesi Preview Admin. Data tetap disinkronkan dari SPS.',
      'info',
    );
  };

  const handleSopirDemoLogin = () => {
    completeSignIn(
      {
        id: 'DEMO-SOPIR-01',
        nama: 'Dedi Kurniawan',
        username: 'dedi.sopir',
        role: 'Sopir',
        status: 'Aktif',
        isDemo: true,
      },
      'Masuk sebagai Sopir (Dedi Kurniawan — ARM-001).',
      'info',
    );
  };

  return (
    <section className="min-h-screen w-full flex items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-4xl rounded-2xl overflow-hidden t-card grid grid-cols-1 md:grid-cols-2 shadow-xl">
        {/* Left Brand Panel */}
        <div className="t-login-panel p-8 sm:p-10 flex flex-col justify-between min-h-[300px] md:min-h-[470px]">
          <div>
            <div
              className="inline-flex items-center px-5 py-3 rounded-2xl border border-white/20 shadow-md"
              style={{ background: SPD_NAVY_GRADIENT }}
            >
              <SpdLogoWordmark variant="on-dark" size="lg" />
            </div>
          </div>

          <div className="my-auto py-8">
            <h1 className="text-[28px] sm:text-[32px] leading-[36px] sm:leading-[40px] font-display text-white">
              PT. Sarana Putra Daerah
            </h1>
            <p className="text-sm mt-3 text-white/75 leading-relaxed">
              Portal terpadu payroll mingguan &amp; bulanan, rekap kas operasional, stok gudang
              &amp; tonase timbangan.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-medium text-[#E0E7FF]">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-[#60A5FA]" />
            <span>Google Sheets / SPS terhubung (JSONP)</span>
          </div>
        </div>

        {/* Right Form Panel */}
        <div className="p-8 sm:p-10 flex flex-col justify-center t-card border-0">
          <div className="mb-6">
            <h2 className="text-[24px] leading-[32px] font-display t-text">Masuk</h2>
          </div>

          {isArmadaRedirect && (
            <div className="mb-4 p-3 rounded-xl t-status-info text-xs font-medium flex items-start gap-2">
              <Truck className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                Masuk dengan akun <b>Super Admin</b> atau <b>Sopir</b> untuk langsung kembali ke{' '}
                <b>Sistem Operasional dan Pemantauan Armada</b>.
              </span>
            </div>
          )}

          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl t-status-bad text-xs font-semibold">
              {errorMsg}
            </div>
          )}

          {infoTip && (
            <div className="mb-4 p-3 rounded-xl t-status-info text-xs font-medium flex items-start gap-2">
              <KeyRound className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                Periksa kolom Username dan PASSWORD_PIN pada tab <b>Akun</b> di Google Sheet SPS
                Anda, atau hubungi Super Admin.
              </span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="login-email" className="block t-field-label mb-1.5">
                Username / Email
              </label>
              <input
                id="login-email"
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="superadmin / hrd_payroll"
                className="w-full px-3.5 py-2.5 rounded-xl t-input text-sm"
              />
            </div>

            <div>
              <label htmlFor="login-password" className="block t-field-label mb-1.5">
                Password / PIN
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Password / PIN"
                  className="w-full px-3.5 py-2.5 pr-11 rounded-xl t-input text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 t-muted hover:t-text p-1"
                  aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Lihat kata sandi'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex justify-between items-center text-xs">
              <button
                type="button"
                onClick={() => setInfoTip((prev) => !prev)}
                className="t-link hover:underline font-medium"
              >
                Lupa kata sandi?
              </button>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 rounded-xl t-btn-primary text-sm inline-flex items-center justify-center gap-2"
            >
              <LogIn className="w-4 h-4" />
              <span>{submitting ? 'Memeriksa akun...' : 'Masuk'}</span>
            </button>
          </form>

          <div className="mt-5 pt-4 border-t t-border space-y-2">
            <button
              type="button"
              onClick={handleDemoLogin}
              className="w-full py-2.5 rounded-xl t-btn-secondary text-xs font-semibold"
            >
              Masuk Mode Preview Admin (Super Admin)
            </button>
            <button
              type="button"
              onClick={handleSopirDemoLogin}
              className="w-full py-2.5 rounded-xl t-btn-secondary text-xs font-semibold"
            >
              Masuk Mode Preview Sopir (Dedi Kurniawan · ARM-001)
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
