import * as XLSX from 'xlsx';
import type { KtBarang, KtKasOps, KtPiutangMitra, KtTransaction } from '../types/kasTonase';
import type { PayrollRecord } from '../types/payroll';
import { getTodayISO } from './format';
import { calculateTHP, getPeriodeDisplay, getSkemaDisplay, getStatusDisplay } from './payrollCalc';

export function exportPayrollToExcelMultiSheet(items: PayrollRecord[]): boolean {
  if (!items.length) return false;

  const mapRows = (list: PayrollRecord[]) =>
    list.map((d, idx) => {
      const c = calculateTHP(d);
      return {
        No: idx + 1,
        'NIK / No': d.nik || '',
        Nama: d.nama || '',
        Divisi: c.skema,
        Periode: getPeriodeDisplay(d),
        Satuan: c.isTrip ? 'Trip' : 'HR',
        'HR/Trip': c.unitPokok,
        Upah: c.tarifPokok,
        Gapok: c.gapok,
        'Lembur Hari': c.lemburHari,
        'Sub Hari': c.nomHari,
        'Lembur Jam': c.jamUtama,
        'Tmb Jam': c.tambahanJam,
        'Sub Jam': c.nomJam,
        Inap: c.inap,
        'Sub Inap': c.nomInap,
        'Tot Lembur': c.lemburNominal,
        'Gaji Kotor': c.gajiKotor,
        Kasbon: c.kasbon,
        BPJS: c.bpjs,
        Ket: c.keterangan,
        'Tot Pot': c.totalPot,
        'Gaji Bersih': c.thp,
        Status: getStatusDisplay(d),
      };
    });

  const wb = XLSX.utils.book_new();
  const limbah = items.filter((d) => getSkemaDisplay(d) === 'Karyawan limbah');
  const b3 = items.filter((d) => getSkemaDisplay(d) === 'Supir B3');
  const spd = items.filter((d) => getSkemaDisplay(d) === 'Supir SPD');

  if (limbah.length) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(mapRows(limbah)), 'Karyawan Limbah');
  }
  if (b3.length) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(mapRows(b3)), 'Supir B3');
  }
  if (spd.length) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(mapRows(spd)), 'Supir SPD');
  }
  if (!limbah.length && !b3.length && !spd.length) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(mapRows(items)), 'Rekap Gaji');
  }

  XLSX.writeFile(wb, `Rekap_Gaji_SPD_${getTodayISO()}.xlsx`);
  return true;
}

export function exportKasTonaseToExcel(
  transactions: KtTransaction[],
  barangList: KtBarang[],
  kasOps: KtKasOps[],
  piutangMitra?: KtPiutangMitra[],
): void {
  const wb = XLSX.utils.book_new();

  const trxRows = transactions.map((t, i) => ({
    No: i + 1,
    Nota: t.nota,
    Tanggal: t.tanggal,
    Tipe: t.tipe,
    Customer: t.customer,
    Plat: t.plat,
    Metode: t.metode,
    Rincian: (t.items || []).map((x) => `${x.nama} (${x.netto}kg x ${x.harga})`).join('; '),
    'Total Netto (Kg)': t.totalNetto,
    'Total Bayar (Rp)': t.totalBayar,
    'Potong Utang (Rp)': t.potongUtang || 0,
    'Dibayar (Rp)': t.dibayar,
    'Sisa (Rp)': t.sisa,
    'Sisa Utang Pemasok (Rp)':
      typeof t.sisaUtangMitraSetelah === 'number' ? t.sisaUtangMitraSetelah : '',
    'Catatan Internal': t.catatan || '',
  }));

  const stokRows = barangList.map((b) => ({
    Barang: b.nama,
    'Stok (Kg)': b.stokKg,
    'Stok (Ton)': Number(((b.stokKg || 0) / 1000).toFixed(2)),
    'Harga Beli/Kg': b.hargaBeli,
    'Harga Jual/Kg': b.hargaJual,
    'Batas Min (Kg)': b.minKg,
  }));

  const kasRows = kasOps.map((k, i) => ({
    No: i + 1,
    Tanggal: k.tanggal,
    Jenis: k.jenis,
    Uraian: k.ket,
    'Nominal (Rp)': k.nominal,
  }));

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(trxRows.length ? trxRows : [{ Info: 'Kosong' }]),
    'Transaksi Tonase',
  );
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(stokRows.length ? stokRows : [{ Info: 'Kosong' }]),
    'Stok & Harga',
  );
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(kasRows.length ? kasRows : [{ Info: 'Kosong' }]),
    'Kas Operasional',
  );

  if (piutangMitra) {
    const pmRows = piutangMitra.map((pm, i) => ({
      No: i + 1,
      Kode: pm.kode,
      Tanggal: pm.tanggal,
      Mitra: pm.customer,
      Keterangan: pm.keterangan,
      'Nominal Awal (Rp)': pm.nominalAwal,
      'Total Cicilan (Rp)': pm.terbayar,
      'Sisa Utang PT (Rp)': pm.sisa,
      Status: pm.sisa === 0 ? 'Lunas' : 'Belum Lunas',
      'Jumlah Cicilan': (pm.cicilan || []).length,
    }));
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(pmRows.length ? pmRows : [{ Info: 'Kosong' }]),
      'Piutang Mitra',
    );
  }

  XLSX.writeFile(wb, `Laporan_Kas_Tonase_SPD_${getTodayISO()}.xlsx`);
}
