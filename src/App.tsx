import { useEffect } from 'react';
import { ConfirmModal } from './components/common/ConfirmModal';
import { ToastContainer } from './components/common/ToastContainer';
import { Sidebar } from './components/layout/Sidebar';
import { BatchSlipModal } from './components/payroll/BatchSlipModal';
import { SlipModal } from './components/payroll/SlipModal';
import { PrintPortal } from './components/print/PrintPortal';
import { AppProvider, useApp } from './context/AppContext';
import {
  canAccessArmadaSession,
  getArmadaUrlFromPortal,
  getRequestedRedirectTarget,
  isArmadaOnlySession,
} from './utils/portalAuth';
import { KasTonaseProvider } from './context/KasTonaseContext';
import { PayrollProvider } from './context/PayrollContext';
import { LoginPage } from './pages/LoginPage';
import { KtCustomerPage } from './pages/kasTonase/KtCustomerPage';
import { KtDashboardPage } from './pages/kasTonase/KtDashboardPage';
import { KtHargaPage } from './pages/kasTonase/KtHargaPage';
import { KtHutangPage } from './pages/kasTonase/KtHutangPage';
import { KtLaporanPage } from './pages/kasTonase/KtLaporanPage';
import { KtPengaturanPage } from './pages/kasTonase/KtPengaturanPage';
import { KtStokPage } from './pages/kasTonase/KtStokPage';
import { KtTransaksiPage } from './pages/kasTonase/KtTransaksiPage';
import { InputGajiPage } from './pages/payroll/InputGajiPage';
import { KaryawanPage } from './pages/payroll/KaryawanPage';
import { KelolaAkunPage } from './pages/payroll/KelolaAkunPage';
import { LaporanPayrollPage } from './pages/payroll/LaporanPayrollPage';
import { RingkasanPage } from './pages/payroll/RingkasanPage';
import { SlipGajiPage } from './pages/payroll/SlipGajiPage';

function ActivePageRouter() {
  const { activeMenu } = useApp();

  switch (activeMenu) {
    case 'menu-ringkasan':
      return <RingkasanPage />;
    case 'menu-input':
      return <InputGajiPage />;
    case 'menu-karyawan':
      return <KaryawanPage />;
    case 'menu-slip':
      return <SlipGajiPage />;
    case 'menu-laporan':
      return <LaporanPayrollPage />;
    case 'menu-akun':
      return <KelolaAkunPage />;
    case 'menu-kt-dashboard':
      return <KtDashboardPage />;
    case 'menu-kt-transaksi':
      return <KtTransaksiPage />;
    case 'menu-kt-stok':
      return <KtStokPage />;
    case 'menu-kt-harga':
      return <KtHargaPage />;
    case 'menu-kt-customer':
      return <KtCustomerPage />;
    case 'menu-kt-hutang':
      return <KtHutangPage />;
    case 'menu-kt-laporan':
      return <KtLaporanPage />;
    case 'menu-kt-pengaturan':
      return <KtPengaturanPage />;
    default:
      return <RingkasanPage />;
  }
}

function PortalShell() {
  const { user, showToast } = useApp();

  useEffect(() => {
    if (!user) return;
    if (getRequestedRedirectTarget() === 'armada') {
      if (canAccessArmadaSession(user)) {
        window.location.replace(getArmadaUrlFromPortal());
      } else {
        const cleanUrl = `${window.location.pathname}${window.location.hash}`;
        window.history.replaceState({}, '', cleanUrl);
        showToast('Akun ini tidak memiliki akses ke modul Armada.', 'warning');
      }
      return;
    }
    if (isArmadaOnlySession(user)) {
      window.location.replace(getArmadaUrlFromPortal());
    }
  }, [showToast, user]);

  return (
    <>
      <div id="app-root-ui">
        {!user ? (
          <LoginPage />
        ) : (
          <div className="min-h-screen flex flex-col lg:flex-row">
            <Sidebar />
            <main className="flex-1 p-5 sm:p-6 lg:p-8 overflow-y-auto">
              <div className="max-w-7xl mx-auto">
                <ActivePageRouter />
              </div>
            </main>
          </div>
        )}
      </div>

      <SlipModal />
      <BatchSlipModal />
      <ConfirmModal />
      <ToastContainer />
      <PrintPortal />
    </>
  );
}

export default function App() {
  return (
    <AppProvider>
      <PayrollProvider>
        <KasTonaseProvider>
          <PortalShell />
        </KasTonaseProvider>
      </PayrollProvider>
    </AppProvider>
  );
}
