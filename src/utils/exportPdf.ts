import { jsPDF } from 'jspdf';
import type { KtTransaction } from '../types/kasTonase';
import type { PayrollRecord } from '../types/payroll';
import {
  formatDateFullID,
  formatNumberWithDots,
  formatRupiah,
  normalizeInvoiceCode,
} from './format';
import { calculateTHP, getPeriodeDisplay, getStatusDisplay } from './payrollCalc';

export function downloadSingleSlipPDF(item: PayrollRecord): void {
  const c = calculateTHP(item);
  const periode = getPeriodeDisplay(item);
  const status = getStatusDisplay(item).toUpperCase();

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: [220, 110],
  });

  const left = 8;
  const width = 204;
  let y = 8;

  // Outer border
  doc.setDrawColor(0);
  doc.setLineWidth(0.5);
  doc.rect(left - 2, 5, width + 4, 100);

  // Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('PT. SARANA PUTRA DAERAH', left, y + 3);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`SLIP GAJI RESMI KARYAWAN  •  PERIODE: ${periode}`, left, y + 7.5);

  // Division badge box
  doc.setFillColor(237, 242, 247);
  doc.setLineWidth(0.3);
  doc.rect(left + width - 58, y - 0.5, 58, 7.5, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(`DIVISI: ${c.skema.toUpperCase()}`, left + width - 29, y + 4.3, { align: 'center' });

  y += 11;

  // Employee Info Grid
  const infoH = 12;
  doc.setFillColor(247, 250, 252);
  doc.rect(left, y, width, 6, 'FD');
  doc.rect(left, y + 6, width, 6, 'S');
  doc.line(left + 32, y, left + 32, y + infoH);
  doc.line(left + 102, y, left + 102, y + infoH);
  doc.line(left + 134, y, left + 134, y + infoH);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('Nama Karyawan', left + 2, y + 4.2);
  doc.text(`: ${item.nama || '-'}`, left + 34, y + 4.2);
  doc.text('Divisi', left + 104, y + 4.2);
  doc.setFont('helvetica', 'normal');
  doc.text(`: ${c.skema}`, left + 136, y + 4.2);

  const rincianKerja = c.isTrip
    ? `${c.unitPokok} Trip • ${c.breakdownText}`
    : `${c.unitPokok} HR • ${c.breakdownText}`;

  doc.setFont('helvetica', 'bold');
  doc.text('No / NIK', left + 2, y + 10.2);
  doc.setFont('helvetica', 'normal');
  doc.text(`: ${item.nik || '-'}`, left + 34, y + 10.2);
  doc.setFont('helvetica', 'bold');
  doc.text('Rincian Kerja', left + 104, y + 10.2);
  doc.setFont('helvetica', 'normal');
  doc.text(`: ${rincianKerja}`, left + 136, y + 10.2);

  y += infoH + 3;

  // Components table
  const col1 = 68;
  const col2 = 34;
  const col3 = 68;
  const col4 = 34;
  const rowH = 6.2;

  const drawRow = (
    cells: [string, string, string, string],
    opts?: { header?: boolean; bold?: boolean; fill?: [number, number, number] },
  ) => {
    if (opts?.fill) {
      doc.setFillColor(...opts.fill);
      doc.rect(left, y, width, rowH, 'FD');
    } else {
      doc.rect(left, y, width, rowH, 'S');
    }
    doc.line(left + col1, y, left + col1, y + rowH);
    doc.line(left + col1 + col2, y, left + col1 + col2, y + rowH);
    doc.line(left + col1 + col2 + col3, y, left + col1 + col2 + col3, y + rowH);

    doc.setFont('helvetica', opts?.header || opts?.bold ? 'bold' : 'normal');
    doc.setFontSize(opts?.header ? 7.5 : 7.8);

    if (opts?.header) {
      doc.text(cells[0], left + col1 / 2, y + 4.2, { align: 'center' });
      doc.text(cells[1], left + col1 + col2 / 2, y + 4.2, { align: 'center' });
      doc.text(cells[2], left + col1 + col2 + col3 / 2, y + 4.2, { align: 'center' });
      doc.text(cells[3], left + col1 + col2 + col3 + col4 / 2, y + 4.2, { align: 'center' });
    } else {
      doc.text(cells[0], left + 2, y + 4.2, { maxWidth: col1 - 4 });
      doc.text(cells[1], left + col1 + col2 - 2, y + 4.2, { align: 'right' });
      doc.text(cells[2], left + col1 + col2 + 2, y + 4.2, { maxWidth: col3 - 4 });
      doc.text(cells[3], left + width - 2, y + 4.2, { align: 'right' });
    }
    y += rowH;
  };

  drawRow(['KOMPONEN PENGHASILAN', 'JUMLAH (Rp)', 'KOMPONEN POTONGAN', 'JUMLAH (Rp)'], {
    header: true,
    fill: [237, 242, 247],
  });

  const pokokLabel = c.isTrip
    ? `Gaji Pokok (${c.unitPokok} Trip x ${formatRupiah(c.tarifPokok)})`
    : `Gaji Pokok (${c.unitPokok} HR x ${formatRupiah(c.tarifPokok)})`;

  drawRow([
    pokokLabel,
    formatRupiah(c.gapok),
    `Potongan Kasbon (${c.keterangan})`,
    formatRupiah(c.kasbon),
  ]);
  drawRow([
    `Lembur (${c.breakdownText})`,
    formatRupiah(c.lemburNominal),
    'Iuran BPJS',
    formatRupiah(c.bpjs),
  ]);
  drawRow([
    `Harian ${formatRupiah(c.nomHari)} | Jam ${formatRupiah(c.nomJam)} | Inap ${formatRupiah(c.nomInap)}`,
    '-',
    '-',
    '-',
  ]);
  drawRow(
    ['GAJI KOTOR', formatRupiah(c.gajiKotor), 'JUMLAH POTONGAN', formatRupiah(c.totalPot)],
    { bold: true, fill: [247, 250, 252] },
  );

  y += 2.5;

  // THP Banner
  doc.setFillColor(237, 242, 247);
  doc.rect(left, y, width, 8, 'FD');
  doc.line(left + 122, y, left + 122, y + 8);
  doc.line(left + 170, y, left + 170, y + 8);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text('GAJI BERSIH (TAKE HOME PAY)', left + 3, y + 5.3);
  doc.setFontSize(10.5);
  doc.text(formatRupiah(c.thp), left + 168, y + 5.4, { align: 'right' });
  doc.setFontSize(8);
  doc.text(`STATUS: ${status}`, left + 187, y + 5.2, { align: 'center' });

  y += 14;

  // Signatures
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Diterima Oleh,', left + 51, y, { align: 'center' });
  doc.text('Disetujui Oleh, HR / Finance', left + 153, y, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text(`( ${item.nama || 'Karyawan'} )`, left + 51, y + 14, { align: 'center' });
  doc.text('( PT. SARANA PUTRA DAERAH )', left + 153, y + 14, { align: 'center' });

  const safeName = (item.nama || 'Karyawan').replace(/[^a-zA-Z0-9]/g, '_');
  const safePeriode = periode.replace(/[^a-zA-Z0-9-]/g, '_');
  doc.save(`Slip_Gaji_${safeName}_${safePeriode}.pdf`);
}

export function getNotaPdfFilename(trx: KtTransaction): string {
  const invCode = normalizeInvoiceCode(trx.nota || trx.id || '001');
  const safeNota = invCode.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  const prefix = trx.tipe === 'Jual' ? 'Invoice' : 'Nota_Beli';
  return `${prefix}_${safeNota}.pdf`;
}

function drawHorizontalGradientRect(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  fromRgb: [number, number, number],
  toRgb: [number, number, number],
  steps = 36,
): void {
  const sliceW = w / steps;
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1);
    const r = Math.round(fromRgb[0] + (toRgb[0] - fromRgb[0]) * t);
    const g = Math.round(fromRgb[1] + (toRgb[1] - fromRgb[1]) * t);
    const b = Math.round(fromRgb[2] + (toRgb[2] - fromRgb[2]) * t);
    doc.setFillColor(r, g, b);
    // Slight overlap (+0.15mm) prevents anti-aliasing hairline seams
    doc.rect(x + i * sliceW, y, sliceW + 0.2, h, 'F');
  }
}

export function buildNotaPdf(trx: KtTransaction): {
  doc: jsPDF;
  blob: Blob;
  file: File;
  filename: string;
} {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageW = 210;
  const pageH = 297;
  const marginX = 18;
  const contentW = pageW - marginX * 2;
  const isJual = trx.tipe === 'Jual';
  const isLunas = (trx.sisa || 0) === 0;
  const statusText = isLunas ? 'Lunas' : 'Belum Lunas';
  const formattedDate = formatDateFullID(trx.tanggal);

  // Brand Invoice Palette matching uploaded spd. logo & Mockup Invoice
  const NAVY: [number, number, number] = [30, 58, 110]; // #1E3A6E
  const NAVY_DARK: [number, number, number] = [24, 49, 90]; // #18315A
  const NAVY_LIGHT: [number, number, number] = [43, 89, 156]; // #2B599C
  const AMBER_DOT: [number, number, number] = [245, 179, 36]; // #F5B324
  const GOLD_START: [number, number, number] = [246, 216, 118]; // #F6D876
  const GOLD_END: [number, number, number] = [245, 176, 56]; // #F5B038
  const CHARCOAL: [number, number, number] = [30, 41, 59]; // #1E293B
  const MUTED: [number, number, number] = [100, 116, 139]; // #64748B
  const DIVIDER: [number, number, number] = [226, 232, 240]; // #E2E8F0
  const STATUS_OK: [number, number, number] = [21, 128, 61];
  const STATUS_WARN: [number, number, number] = [180, 83, 9];

  // Header Left: lowercase bold "spd" (deep navy) + golden amber dot "."
  let y = 22;
  doc.setTextColor(...NAVY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(30);
  doc.text('spd', marginX, y + 6);
  const spdWidth = doc.getTextWidth('spd');
  doc.setFillColor(...AMBER_DOT);
  doc.circle(marginX + spdWidth + 2.3, y + 4.9, 1.55, 'F');

  doc.setTextColor(...NAVY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.2);
  doc.text('PT. SARANA PUTRA DAERAH', marginX, y + 13.5);

  doc.setTextColor(...MUTED);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.2);
  doc.text('Kp. Walahir, RT.08/RW.04, Nambo, Kec. Klapanunggal', marginX, y + 18.2);
  doc.text('Kabupaten Bogor, Jawa Barat 16820', marginX, y + 22.3);

  // Header Right: INVOICE / NOTA BELI + No. Nota
  doc.setTextColor(...NAVY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(23);
  doc.text(isJual ? 'INVOICE' : 'NOTA BELI', pageW - marginX, y + 6, { align: 'right' });

  const invCode = normalizeInvoiceCode(trx.nota) || '-';
  doc.setTextColor(...MUTED);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.text(`No. ${invCode}`, pageW - marginX, y + 12.8, { align: 'right' });

  y += 32;

  // Clean Two-Column Info Row (matching mockup)
  const leftInfoW = contentW * 0.52;
  const custLines = doc.splitTextToSize(trx.customer || '-', leftInfoW);

  doc.setTextColor(...NAVY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(isJual ? 'Ditagihkan kepada' : 'Pemasok', marginX, y);

  doc.setTextColor(...CHARCOAL);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.5);
  doc.text(custLines, marginX, y + 6);

  const subInfoY = y + 6 + custLines.length * 5;
  doc.setTextColor(...MUTED);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(
    isJual ? 'Transaksi Penjualan Tonase' : 'Transaksi Pembelian Tonase',
    marginX,
    subInfoY,
  );

  // Right Info Column: Hari / Tanggal + Status (right-aligned, zero overlap)
  doc.setTextColor(...NAVY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Hari / Tanggal', pageW - marginX, y, { align: 'right' });

  doc.setTextColor(...CHARCOAL);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text(formattedDate, pageW - marginX, y + 5.6, { align: 'right' });

  doc.setTextColor(...(isLunas ? STATUS_OK : STATUS_WARN));
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.8);
  doc.text(`Status: ${statusText}`, pageW - marginX, y + 11.4, { align: 'right' });

  y = Math.max(subInfoY + 6, y + 18);
  doc.setDrawColor(...DIVIDER);
  doc.setLineWidth(0.3);
  doc.line(marginX, y, pageW - marginX, y);

  y += 8;

  // Table Header Bar (Full-width Deep Navy)
  const colNo = marginX + 4.5;
  const colBarang = marginX + 15.5;
  const colNetto = marginX + contentW * 0.57;
  const colHarga = marginX + contentW * 0.77;
  const colJumlah = pageW - marginX - 4.5;
  const barangMaxW = colNetto - colBarang - 22;

  doc.setFillColor(...NAVY);
  doc.rect(marginX, y, contentW, 10, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('No', colNo, y + 6.4);
  doc.text('Barang / Deskripsi', colBarang, y + 6.4);
  doc.text('Berat Netto', colNetto, y + 6.4, { align: 'right' });
  doc.text('Harga / Kg', colHarga, y + 6.4, { align: 'right' });
  doc.text('Jumlah', colJumlah, y + 6.4, { align: 'right' });

  y += 10;

  // Table Item Rows (multi-line safe)
  const items = trx.items || [];
  items.forEach((it, idx) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.3);
    const nameLines = doc.splitTextToSize(it.nama || '-', barangMaxW);
    const rowH = Math.max(12.2, nameLines.length * 4.6 + 7.2);

    if (y + rowH > pageH - 82) {
      doc.addPage();
      y = 20;
    }

    const textY = y + 7.4;

    doc.setTextColor(...MUTED);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(String(idx + 1), colNo, textY);

    doc.setTextColor(...CHARCOAL);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.3);
    doc.text(nameLines, colBarang, textY);

    doc.setTextColor(...CHARCOAL);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`${formatNumberWithDots(it.netto || 0)} kg`, colNetto, textY, { align: 'right' });
    doc.text(formatRupiah(it.harga || 0), colHarga, textY, { align: 'right' });

    doc.setFont('helvetica', 'bold');
    doc.text(formatRupiah(it.subtotal || 0), colJumlah, textY, { align: 'right' });

    y += rowH;
    doc.setDrawColor(...DIVIDER);
    doc.setLineWidth(0.3);
    doc.line(marginX, y, pageW - marginX, y);
  });

  y += 8;

  // Totals Block (Right-aligned + Signature Golden Amber Gradient Total Bar)
  const summaryX = marginX + contentW * 0.51;
  const summaryW = contentW * 0.49;
  const sumLabelX = summaryX + 5;
  const sumValX = pageW - marginX - 5;

  const summaryLines: Array<{
    label: string;
    value: string;
    color?: [number, number, number];
    bold?: boolean;
  }> = [{ label: 'Total Netto', value: `${formatNumberWithDots(trx.totalNetto || 0)} kg` }];

  if (!isJual && (trx.potongUtang || 0) > 0) {
    summaryLines.push({
      label: 'Potong Utang Pemasok',
      value: `-${formatRupiah(trx.potongUtang || 0)}`,
      color: NAVY,
      bold: true,
    });
  }

  summaryLines.push({
    label: `Dibayar (${trx.metode})`,
    value: formatRupiah(trx.dibayar || 0),
  });

  if ((trx.sisa || 0) > 0) {
    summaryLines.push({
      label: 'Sisa Tagihan',
      value: formatRupiah(trx.sisa || 0),
      color: STATUS_WARN,
      bold: true,
    });
  }

  summaryLines.forEach((line) => {
    doc.setTextColor(...MUTED);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(line.label, sumLabelX, y + 4);

    doc.setTextColor(...(line.color || CHARCOAL));
    doc.setFont('helvetica', line.bold ? 'bold' : 'normal');
    doc.setFontSize(9);
    doc.text(line.value, sumValX, y + 4, { align: 'right' });
    y += 6.8;
  });

  y += 3;

  // Golden Amber Gradient TOTAL Banner (matching mockup)
  drawHorizontalGradientRect(doc, summaryX, y, summaryW, 13.5, GOLD_START, GOLD_END);
  doc.setTextColor(...NAVY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text('Total', sumLabelX, y + 8.6);
  doc.setFontSize(13.5);
  doc.text(formatRupiah(trx.totalBayar || 0), sumValX, y + 8.8, { align: 'right' });

  y += 26;

  // Bottom Payment Info (Left) & Signature (Right)
  const sigY = Math.min(Math.max(y, 198), pageH - 60);

  doc.setTextColor(...NAVY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.4);
  doc.text('INFORMASI PEMBAYARAN', marginX, sigY);

  doc.setTextColor(...MUTED);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.7);
  doc.text(`Metode Pembayaran: ${trx.metode}`, marginX, sigY + 6.4);
  doc.text(`Status Pembayaran: ${statusText}`, marginX, sigY + 11.7);
  doc.text('Atas Nama: PT. Sarana Putra Daerah', marginX, sigY + 17);

  if (!isJual && (trx.potongUtang || 0) > 0 && typeof trx.sisaUtangMitraSetelah === 'number') {
    doc.text(
      `Sisa Utang Pemasok: ${formatRupiah(trx.sisaUtangMitraSetelah)}`,
      marginX,
      sigY + 22.3,
    );
  }

  // Signature block on right
  const sigCenterX = pageW - marginX - 31;
  doc.setTextColor(...MUTED);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Hormat kami,', sigCenterX, sigY + 0.5, { align: 'center' });

  doc.setDrawColor(...NAVY);
  doc.setLineWidth(0.45);
  doc.line(sigCenterX - 28, sigY + 22, sigCenterX + 28, sigY + 22);

  doc.setTextColor(...NAVY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.2);
  doc.text('PT. Sarana Putra Daerah', sigCenterX, sigY + 27.5, { align: 'center' });

  doc.setTextColor(...MUTED);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.4);
  doc.text('Admin / Keuangan', sigCenterX, sigY + 32.3, { align: 'center' });

  // Bottom Full-Width Deep Navy Gradient Footer Bar (matching mockup)
  drawHorizontalGradientRect(doc, 0, pageH - 16, pageW, 16, NAVY_DARK, NAVY_LIGHT, 48);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.3);
  doc.text('PT. Sarana Putra Daerah', marginX, pageH - 6.8);

  doc.setFont('helvetica', 'normal');
  doc.text('Kp. Walahir, Klapanunggal, Kab. Bogor', pageW / 2, pageH - 6.8, {
    align: 'center',
  });
  doc.text('Portal Kas & Tonase', pageW - marginX, pageH - 6.8, { align: 'right' });

  const filename = getNotaPdfFilename(trx);
  const blob = doc.output('blob');
  const file = new File([blob], filename, { type: 'application/pdf' });

  return { doc, blob, file, filename };
}

export function canSharePdfFile(): boolean {
  if (typeof navigator === 'undefined') return false;
  if (typeof navigator.share !== 'function' || typeof navigator.canShare !== 'function') {
    return false;
  }
  try {
    const testFile = new File(['%PDF-1.4'], 'nota.pdf', { type: 'application/pdf' });
    return navigator.canShare({ files: [testFile] });
  } catch {
    return false;
  }
}

export function downloadNotaPdf(trx: KtTransaction): string {
  const { doc, filename } = buildNotaPdf(trx);
  doc.save(filename);
  return filename;
}

export async function shareNotaPdf(
  trx: KtTransaction,
): Promise<'shared' | 'cancelled' | 'unsupported'> {
  if (!canSharePdfFile()) return 'unsupported';
  const { file } = buildNotaPdf(trx);

  try {
    if (!navigator.canShare({ files: [file] })) {
      return 'unsupported';
    }
    const invCode = normalizeInvoiceCode(trx.nota || trx.id);
    await navigator.share({
      title: `${trx.tipe === 'Jual' ? 'Invoice' : 'Nota Beli'} ${invCode} - ${trx.customer}`,
      text: `${trx.tipe === 'Jual' ? 'Invoice' : 'Nota Beli'} ${invCode} (${trx.customer}) — Total ${formatRupiah(trx.totalBayar)}`,
      files: [file],
    });
    return 'shared';
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      return 'cancelled';
    }
    throw err;
  }
}
