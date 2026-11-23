import type {
  KtBarang,
  KtCustomer,
  KtKasOps,
  KtPiutangMitra,
  KtTransaction,
} from '../types/kasTonase';
import type { PayrollRecord } from '../types/payroll';
import { getDaysAgoISO, getTodayISO } from '../utils/format';

export function createSampleKtData(): {
  barang: KtBarang[];
  customers: KtCustomer[];
  transactions: KtTransaction[];
  kasOps: KtKasOps[];
  piutangMitra: KtPiutangMitra[];
} {
  const today = getTodayISO();

  const barang: KtBarang[] = [
    {
      id: 'BRG1',
      nama: 'Kardus OCC',
      hargaBeli: 2200,
      hargaJual: 2950,
      potDefault: 2,
      stokKg: 6100,
      minKg: 1000,
    },
    {
      id: 'BRG2',
      nama: 'Duplex',
      hargaBeli: 1500,
      hargaJual: 2100,
      potDefault: 0,
      stokKg: 3200,
      minKg: 800,
    },
    {
      id: 'BRG3',
      nama: 'Besi tua',
      hargaBeli: 4200,
      hargaJual: 5100,
      potDefault: 0,
      stokKg: 400,
      minKg: 1000,
    },
    {
      id: 'BRG4',
      nama: 'Plastik PET',
      hargaBeli: 3500,
      hargaJual: 4600,
      potDefault: 3,
      stokKg: 2700,
      minKg: 500,
    },
  ];

  const customers: KtCustomer[] = [
    {
      id: 'CST1',
      nama: 'CV Maju Jaya',
      tipe: 'Supplier & Buyer',
      plat: 'B 1234 XY',
      telp: '0812-8890-1122',
    },
    {
      id: 'CST2',
      nama: 'PT Kertas Nusantara',
      tipe: 'Buyer',
      plat: 'B 9021 SPD',
      telp: '0813-4455-7788',
    },
    {
      id: 'CST3',
      nama: 'Lapak Sumber Rejeki',
      tipe: 'Supplier',
      plat: 'T 8832 AB',
      telp: '0857-1122-3344',
    },
  ];

  const transactions: KtTransaction[] = [
    {
      id: 'TRX1',
      nota: 'INV/1115/004',
      tanggal: today,
      tipe: 'Beli',
      customer: 'CV Maju Jaya',
      plat: 'B 1234 XY',
      metode: 'Tunai',
      items: [
        {
          barangId: 'BRG1',
          nama: 'Kardus OCC',
          harga: 2200,
          bruto: 1850,
          tara: 350,
          pot: 2,
          netto: 1470,
          subtotal: 3234000,
        },
        {
          barangId: 'BRG2',
          nama: 'Duplex',
          harga: 1500,
          bruto: 400,
          tara: 0,
          pot: 0,
          netto: 400,
          subtotal: 600000,
        },
      ],
      totalNetto: 1870,
      totalBayar: 3834000,
      potongUtang: 0,
      dibayar: 3000000,
      sisa: 834000,
    },
    {
      id: 'TRX2',
      nota: 'INV/1115/003',
      tanggal: getDaysAgoISO(1),
      tipe: 'Jual',
      customer: 'PT Kertas Nusantara',
      plat: 'B 9021 SPD',
      metode: 'Transfer',
      items: [
        {
          barangId: 'BRG1',
          nama: 'Kardus OCC',
          harga: 2950,
          bruto: 4200,
          tara: 0,
          pot: 0,
          netto: 4200,
          subtotal: 12390000,
        },
      ],
      totalNetto: 4200,
      totalBayar: 12390000,
      dibayar: 12390000,
      sisa: 0,
    },
    {
      id: 'TRX3',
      nota: 'INV/1115/002',
      tanggal: getDaysAgoISO(2),
      tipe: 'Beli',
      customer: 'Lapak Sumber Rejeki',
      plat: 'T 8832 AB',
      metode: 'Tunai',
      items: [
        {
          barangId: 'BRG4',
          nama: 'Plastik PET',
          harga: 3500,
          bruto: 2400,
          tara: 0,
          pot: 0,
          netto: 2400,
          subtotal: 8400000,
        },
      ],
      totalNetto: 2400,
      totalBayar: 8400000,
      potongUtang: 0,
      dibayar: 8400000,
      sisa: 0,
    },
    {
      id: 'TRX4',
      nota: 'INV/1115/001',
      tanggal: getDaysAgoISO(3),
      tipe: 'Jual',
      customer: 'PT Kertas Nusantara',
      plat: 'B 9021 SPD',
      metode: 'Transfer',
      items: [
        {
          barangId: 'BRG2',
          nama: 'Duplex',
          harga: 2100,
          bruto: 2000,
          tara: 0,
          pot: 0,
          netto: 2000,
          subtotal: 4200000,
        },
      ],
      totalNetto: 2000,
      totalBayar: 4200000,
      dibayar: 4200000,
      sisa: 0,
    },
  ];

  const kasOps: KtKasOps[] = [
    {
      id: 'KOPS1',
      tanggal: today,
      jenis: 'Keluar',
      ket: 'Uang jalan & solar armada B 1234 XY',
      nominal: 350000,
    },
  ];

  const piutangMitra: KtPiutangMitra[] = [
    {
      id: 'PM1',
      kode: 'PM-001',
      tanggal: getDaysAgoISO(5),
      customer: 'CV Maju Jaya',
      keterangan: 'Pinjaman / Kasbon Pemasok Kardus',
      nominalAwal: 1000000,
      terbayar: 0,
      sisa: 1000000,
      cicilan: [],
    },
  ];

  return { barang, customers, transactions, kasOps, piutangMitra };
}

export const SAMPLE_PAYROLL_FALLBACK: PayrollRecord[] = [
  {
    nama: 'Siti Rahmawati',
    nik: '001',
    divisi: 'Karyawan limbah',
    skema: 'Karyawan limbah',
    satuanPokok: 'hari',
    periodeTanggal: '31 Okt - 06 Nov 2026',
    hariKerja: 6,
    upahPerHari: 125000,
    jamLembur: 8,
    tambahanJamLembur: 2,
    upahPerJam: 11250,
    nominalLemburJam: 112500,
    lemburNominal: 112500,
    lemburBreakdown: '10 Jam',
    gapok: 750000,
    gajiKotor: 862500,
    kasbon: 200000,
    bpjs: 35000,
    keterangan: 'Cicilan Ke 1',
    totalPotongan: 235000,
    thp: 627500,
    status: 'Approved',
  },
  {
    nama: 'Dedi Kurniawan',
    nik: '014',
    divisi: 'Supir B3',
    skema: 'Supir B3',
    satuanPokok: 'trip',
    periodeTanggal: '31 Okt - 06 Nov 2026',
    trip: 7,
    upahPerTrip: 150000,
    inap: 2,
    upahPerInap: 100000,
    nominalLemburInap: 200000,
    lemburNominal: 200000,
    lemburBreakdown: '2 Inap',
    gapok: 1050000,
    gajiKotor: 1250000,
    kasbon: 0,
    bpjs: 50000,
    keterangan: '-',
    totalPotongan: 50000,
    thp: 1200000,
    status: 'Paid',
  },
  {
    nama: 'Hendra Wijaya',
    nik: '021',
    divisi: 'Supir SPD',
    skema: 'Supir SPD',
    satuanPokok: 'trip',
    periodeTanggal: '31 Okt - 06 Nov 2026',
    trip: 6,
    upahPerTrip: 150000,
    inap: 1,
    upahPerInap: 100000,
    nominalLemburInap: 100000,
    lemburNominal: 100000,
    lemburBreakdown: '1 Inap',
    gapok: 900000,
    gajiKotor: 1000000,
    kasbon: 150000,
    bpjs: 35000,
    keterangan: 'Ke 2',
    totalPotongan: 185000,
    thp: 815000,
    status: 'Draft',
  },
];
