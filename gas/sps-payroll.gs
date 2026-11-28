/**
 * Google Apps Script — SPS Payroll & Akun (PT. Sarana Putra Daerah)
 *
 * Fitur utama:
 * - Mendukung penyimpanan otomatis ke tab/sheet dinamis sesuai pilihan import:
 *   • Per Periode              -> "Gajian - 31 Okt - 06 Nov 2026"
 *   • Per Siklus               -> "Gajian Mingguan" / "Gajian Bulanan"
 *   • Per Siklus + Periode     -> "Mingguan - 31 Okt - 06 Nov 2026" / "Bulanan - Nov 2026"
 *   • Gabung 1 Sheet           -> "Gajian"
 *   • Nama Sheet Custom        -> sesuai nama yang dipilih (sheet otomatis dibuat jika belum ada)
 * - Data Gaji TIDAK PERNAH menulis ke tab "Akun" (diblokir otomatis).
 * - Saat aplikasi membaca data gaji, script menggabungkan semua tab payroll (kecuali tab "Akun")
 *   dan menandai asal sheetName pada setiap baris agar Edit & Hapus tepat sasaran.
 * - Semua data Login & Kelola Akun SELALU membaca/menulis khusus ke tab "Akun".
 *
 * Cara pasang:
 * 1. Buka Google Spreadsheet SPS Gajian -> Ekstensi -> Apps Script.
 * 2. Ganti seluruh isi Code.gs dengan kode ini, lalu Simpan.
 * 3. (Opsional) Jika sebelumnya ada kolom/baris gaji yang terlanjur masuk ke sheet "Akun",
 *    jalankan fungsi `pindahkanDataGajiDariAkunKeGajian` 1x di editor Apps Script.
 * 4. Klik Terapkan -> Kelola deployment -> Edit -> Versi baru -> Terapkan
 *    (Jalankan sebagai: Saya, Yang memiliki akses: Siapa saja).
 */

var DEFAULT_PAYROLL_SHEET_NAME = 'Gajian';
var ACCOUNT_SHEET_NAME = 'Akun';

var PAYROLL_HEADERS = [
  'recordId',
  'periodeTanggal',
  'periodeBulan',
  'periodeWaktu',
  'nik',
  'nama',
  'divisi',
  'skema',
  'tipe',
  'siklusGaji',
  'satuanPokok',
  'hariKerja',
  'hadir',
  'spsHadir',
  'spsAlpha',
  'upahPerHari',
  'trip',
  'upahPerTrip',
  'lemburHari',
  'upahLemburHari',
  'nominalLemburHari',
  'jamLembur',
  'tambahanJamLembur',
  'upahPerJam',
  'nominalLemburJam',
  'inap',
  'upahPerInap',
  'nominalLemburInap',
  'lemburJenis',
  'lemburVolume',
  'lemburTarif',
  'lemburNominal',
  'lemburBreakdown',
  'gapok',
  'tunjangan',
  'potAbsen',
  'pph',
  'gajiKotor',
  'kasbon',
  'saldoKasbonAwal',
  'sisaKasbonSetelah',
  'bpjs',
  'keterangan',
  'totalPotongan',
  'thp',
  'status',
  'statusBayar',
  'namaBank',
  'noRekening',
  'diinputOleh',
  'savedAt',
];

var ACCOUNT_HEADERS = [
  'ID_AKUN',
  'NAMA_LENGKAP',
  'USERNAME',
  'PASSWORD_PIN',
  'ROLE_AKSES',
  'status',
];

function doGet(e) {
  var params = (e && e.parameter) || {};
  var action = String(params.action || '').trim();
  var callback = String(params.callback || '').trim();
  var result;

  try {
    if (action === 'login') {
      result = handleLogin_(params);
    } else if (action === 'getUsers') {
      result = handleGetUsers_();
    } else if (action === 'saveUser') {
      result = handleSaveUser_(params);
    } else if (action === 'deleteUser') {
      result = handleDeleteUser_(params);
    } else if (action === 'save') {
      result = handleSavePayroll_(params);
    } else if (action === 'updatePayroll') {
      result = handleUpdatePayroll_(params);
    } else if (action === 'deletePayroll') {
      result = handleDeletePayroll_(params);
    } else {
      result = handleGetPayroll_(params);
    }
  } catch (err) {
    result = {
      status: 'error',
      message: String(err && err.message ? err.message : err),
    };
  }

  return buildOutput_(result, callback);
}

function doPost(e) {
  var result;
  try {
    var body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    var action = String(body.action || '').trim();

    if (action === 'save') {
      result = handleSavePayroll_(body);
    } else if (action === 'updatePayroll') {
      result = handleUpdatePayroll_(body);
    } else if (action === 'deletePayroll') {
      result = handleDeletePayroll_(body);
    } else if (action === 'saveUser') {
      result = handleSaveUser_(body);
    } else if (action === 'deleteUser') {
      result = handleDeleteUser_(body);
    } else {
      result = handleGetPayroll_(body);
    }
  } catch (err) {
    result = {
      status: 'error',
      message: String(err && err.message ? err.message : err),
    };
  }

  return buildOutput_(result, '');
}

function sanitizePayrollSheetName_(raw) {
  var cleaned = String(raw || '')
    .replace(/[\\/?*\[\]:]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 95);
  if (!cleaned || cleaned.toLowerCase() === ACCOUNT_SHEET_NAME.toLowerCase()) {
    return DEFAULT_PAYROLL_SHEET_NAME;
  }
  return cleaned;
}

function resolvePayrollSheetName_(params) {
  var requested = (params && (params.sheet || params.sheetName)) || '';
  return sanitizePayrollSheetName_(requested);
}

function getOrCreateSheetByName_(name, defaultHeaders) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    var all = ss.getSheets();
    for (var i = 0; i < all.length; i++) {
      if (all[i].getName().toLowerCase() === name.toLowerCase()) {
        sheet = all[i];
        break;
      }
    }
  }
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  if (sheet.getLastRow() === 0 && defaultHeaders && defaultHeaders.length) {
    sheet.getRange(1, 1, 1, defaultHeaders.length).setValues([defaultHeaders]);
  }
  return sheet;
}

function getPayrollSheet_(params) {
  var targetName = resolvePayrollSheetName_(params);
  return getOrCreateSheetByName_(targetName, PAYROLL_HEADERS);
}

function getAllPayrollSheets_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheets = ss.getSheets();
  var out = [];
  for (var i = 0; i < sheets.length; i++) {
    var sh = sheets[i];
    var name = sh.getName();
    if (name.toLowerCase() === ACCOUNT_SHEET_NAME.toLowerCase()) continue;
    var lastRow = sh.getLastRow();
    var lastCol = sh.getLastColumn();
    if (lastRow < 1 || lastCol < 1) continue;
    var headers = sh.getRange(1, 1, 1, lastCol).getValues()[0].map(function (h) {
      return String(h || '').trim().toLowerCase();
    });
    var isPayrollTab =
      headers.indexOf('nama') !== -1 ||
      headers.indexOf('periodetanggal') !== -1 ||
      headers.indexOf('periodebulan') !== -1 ||
      headers.indexOf('thp') !== -1 ||
      name.toLowerCase().indexOf('gajian') !== -1 ||
      name.toLowerCase().indexOf('mingguan') !== -1 ||
      name.toLowerCase().indexOf('bulanan') !== -1;
    if (isPayrollTab) {
      out.push(sh);
    }
  }
  if (out.length === 0) {
    out.push(getOrCreateSheetByName_(DEFAULT_PAYROLL_SHEET_NAME, PAYROLL_HEADERS));
  }
  return out;
}

function getAccountSheet_() {
  return getOrCreateSheetByName_(ACCOUNT_SHEET_NAME, ACCOUNT_HEADERS);
}

function ensurePayrollHeaders_(sheet, params) {
  var lastCol = sheet.getLastColumn();
  var headers =
    lastCol > 0
      ? sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(function (h) {
          return String(h || '').trim();
        })
      : [];

  var ignoreKeys = {
    action: true,
    callback: true,
    t: true,
    sheet: true,
    sheetName: true,
    includeAllPayrollSheets: true,
    localDraftId: true,
  };

  var changed = false;
  if (headers.length === 0) {
    headers = PAYROLL_HEADERS.slice();
    changed = true;
  }

  Object.keys(params || {}).forEach(function (key) {
    if (ignoreKeys[key]) return;
    if (headers.indexOf(key) === -1) {
      headers.push(key);
      changed = true;
    }
  });

  if (changed) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
  return headers;
}

function readPayrollRowsFromSheet_(sheet) {
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow < 2 || lastCol < 1) return [];

  var values = sheet.getRange(1, 1, lastRow, lastCol).getValues();
  var headers = values[0].map(function (h) {
    return String(h || '').trim();
  });
  var sheetName = sheet.getName();
  var rows = [];

  for (var r = 1; r < values.length; r++) {
    var row = values[r];
    var obj = {};
    var hasValue = false;
    for (var c = 0; c < headers.length; c++) {
      var key = headers[c];
      if (!key) continue;
      var val = row[c];
      if (val !== '' && val !== null && val !== undefined) hasValue = true;
      obj[key] = val;
    }
    var hasNama = String(obj.nama || '').trim() !== '';
    var hasPeriode = String(obj.periodeTanggal || obj.periodeBulan || '').trim() !== '';
    if (hasValue && (hasNama || hasPeriode)) {
      obj.sheetName = sheetName;
      rows.push(obj);
    }
  }
  return rows;
}

function handleGetPayroll_(params) {
  var sheets = getAllPayrollSheets_();
  var data = [];
  var sheetNames = [];

  for (var i = 0; i < sheets.length; i++) {
    sheetNames.push(sheets[i].getName());
    var rows = readPayrollRowsFromSheet_(sheets[i]);
    for (var j = 0; j < rows.length; j++) {
      data.push(rows[j]);
    }
  }

  return {
    status: 'success',
    sheets: sheetNames,
    data: data,
  };
}

function handleSavePayroll_(params) {
  var sheet = getPayrollSheet_(params);
  var headers = ensurePayrollHeaders_(sheet, params);
  var rowValues = headers.map(function (h) {
    if (h === 'savedAt' && !params[h]) return new Date().toISOString();
    return params[h] !== undefined && params[h] !== null ? params[h] : '';
  });
  sheet.appendRow(rowValues);
  return { status: 'success', mode: 'inserted', sheet: sheet.getName() };
}

function tryUpdateRowInSheet_(sheet, params) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return null;

  var headers = ensurePayrollHeaders_(sheet, params);
  var targetId = String(params.recordId || '').trim();
  var targetNik = String(params.nik || '').trim().toUpperCase();
  var targetNama = String(params.nama || '').trim().toLowerCase();
  var targetPeriode = String(params.periodeTanggal || params.periodeBulan || '')
    .trim()
    .toLowerCase();

  var idxId = headers.indexOf('recordId');
  var idxNik = headers.indexOf('nik');
  var idxNama = headers.indexOf('nama');
  var idxPerTgl = headers.indexOf('periodeTanggal');
  var idxPerBln = headers.indexOf('periodeBulan');

  var rows = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
  for (var i = rows.length - 1; i >= 0; i--) {
    var row = rows[i];
    var rId = idxId >= 0 ? String(row[idxId] || '').trim() : '';
    var rNik = idxNik >= 0 ? String(row[idxNik] || '').trim().toUpperCase() : '';
    var rNama = idxNama >= 0 ? String(row[idxNama] || '').trim().toLowerCase() : '';
    var rPer = String(
      (idxPerTgl >= 0 ? row[idxPerTgl] : '') || (idxPerBln >= 0 ? row[idxPerBln] : '') || '',
    )
      .trim()
      .toLowerCase();

    var matchedById = Boolean(targetId && rId && rId === targetId);
    var matchedByNikPeriode = Boolean(
      targetNik && rNik === targetNik && targetPeriode && rPer === targetPeriode,
    );
    var matchedByNamaPeriode = Boolean(
      targetNama && rNama === targetNama && targetPeriode && rPer === targetPeriode,
    );

    if (matchedById || matchedByNikPeriode || matchedByNamaPeriode) {
      var rowValues = headers.map(function (h) {
        if (h === 'savedAt' && !params[h]) return new Date().toISOString();
        return params[h] !== undefined && params[h] !== null ? params[h] : '';
      });
      sheet.getRange(i + 2, 1, 1, headers.length).setValues([rowValues]);
      return { status: 'success', mode: 'updated', sheet: sheet.getName(), row: i + 2 };
    }
  }
  return null;
}

function handleUpdatePayroll_(params) {
  var targetSheet = getPayrollSheet_(params);
  var updated = tryUpdateRowInSheet_(targetSheet, params);
  if (updated) return updated;

  // Jika baris lama ada di tab payroll lain (misal pindah dari Gajian ke Gajian Mingguan), cek & perbarui
  var allSheets = getAllPayrollSheets_();
  for (var i = 0; i < allSheets.length; i++) {
    if (allSheets[i].getName() === targetSheet.getName()) continue;
    var otherUpdated = tryUpdateRowInSheet_(allSheets[i], params);
    if (otherUpdated) return otherUpdated;
  }

  return handleSavePayroll_(params);
}

function tryDeleteRowInSheet_(sheet, params) {
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow < 2 || lastCol < 1) return false;

  var values = sheet.getRange(1, 1, lastRow, lastCol).getValues();
  var headers = values[0].map(function (h) {
    return String(h || '').trim();
  });

  var targetNik = String(params.nik || '').trim().toUpperCase();
  var targetNama = String(params.nama || '').trim().toLowerCase();
  var targetPeriode = String(params.periodeTanggal || '').trim().toLowerCase();

  var idxNik = headers.indexOf('nik');
  var idxNama = headers.indexOf('nama');
  var idxPerTgl = headers.indexOf('periodeTanggal');
  var idxPerBln = headers.indexOf('periodeBulan');

  for (var i = values.length - 1; i >= 1; i--) {
    var row = values[i];
    var rNik = idxNik >= 0 ? String(row[idxNik] || '').trim().toUpperCase() : '';
    var rNama = idxNama >= 0 ? String(row[idxNama] || '').trim().toLowerCase() : '';
    var rPer = String(
      (idxPerTgl >= 0 ? row[idxPerTgl] : '') || (idxPerBln >= 0 ? row[idxPerBln] : '') || '',
    )
      .trim()
      .toLowerCase();

    var sameEmp = (targetNik && rNik === targetNik) || (targetNama && rNama === targetNama);
    var samePeriode = !targetPeriode || rPer === targetPeriode;
    if (sameEmp && samePeriode) {
      sheet.deleteRow(i + 1);
      return true;
    }
  }
  return false;
}

function handleDeletePayroll_(params) {
  var targetName = resolvePayrollSheetName_(params);
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var preferred = ss.getSheetByName(targetName);
  if (preferred && tryDeleteRowInSheet_(preferred, params)) {
    return { status: 'success', deleted: true, sheet: preferred.getName() };
  }

  var allSheets = getAllPayrollSheets_();
  for (var i = 0; i < allSheets.length; i++) {
    if (preferred && allSheets[i].getName() === preferred.getName()) continue;
    if (tryDeleteRowInSheet_(allSheets[i], params)) {
      return { status: 'success', deleted: true, sheet: allSheets[i].getName() };
    }
  }

  return { status: 'success', deleted: false, sheet: targetName };
}

function readAccountRows_(sheet) {
  var lastRow = sheet.getLastRow();
  var lastCol = Math.min(Math.max(sheet.getLastColumn(), ACCOUNT_HEADERS.length), 10);
  if (lastRow < 2) return { headers: ACCOUNT_HEADERS.slice(), rows: [] };
  var values = sheet.getRange(1, 1, lastRow, lastCol).getValues();
  var headers = values[0].map(function (h) {
    return String(h || '').trim();
  });
  var rows = [];
  for (var r = 1; r < values.length; r++) {
    var obj = {};
    for (var c = 0; c < headers.length; c++) {
      if (headers[c]) obj[headers[c]] = values[r][c];
    }
    var uname = String(obj.USERNAME || obj.username || obj.email || '').trim();
    var idAkun = String(obj.ID_AKUN || obj.id || '').trim();
    if (uname || idAkun) {
      rows.push({ rowNumber: r + 1, raw: obj });
    }
  }
  return { headers: headers, rows: rows };
}

function handleGetUsers_() {
  var sheet = getAccountSheet_();
  var parsed = readAccountRows_(sheet);
  var users = parsed.rows.map(function (item) {
    var r = item.raw;
    var uname = String(r.USERNAME || r.username || r.email || '').trim();
    return {
      id: String(r.ID_AKUN || r.id || '').trim(),
      nama: String(r.NAMA_LENGKAP || r.nama || '').trim(),
      email: uname,
      username: uname,
      role: String(r.ROLE_AKSES || r.role || 'Staff').trim(),
      status: String(r.status || r.STATUS || 'Aktif').trim(),
    };
  });
  return { status: 'ok', users: users };
}

function handleLogin_(params) {
  var inputUser = String(params.email || params.username || '').trim().toLowerCase();
  var inputPass = String(params.password || '').trim();
  if (!inputUser || !inputPass) {
    return { status: 'error', message: 'Username dan password wajib diisi.' };
  }

  var sheet = getAccountSheet_();
  var parsed = readAccountRows_(sheet);
  for (var i = 0; i < parsed.rows.length; i++) {
    var r = parsed.rows[i].raw;
    var uname = String(r.USERNAME || r.username || r.email || '').trim();
    var pass = String(r.PASSWORD_PIN || r.password || '').trim();
    var st = String(r.status || r.STATUS || 'Aktif').trim().toLowerCase();
    if (uname.toLowerCase() === inputUser && pass === inputPass) {
      if (st === 'nonaktif') {
        return { status: 'error', message: 'Akun ini sedang dinonaktifkan.' };
      }
      return {
        status: 'ok',
        user: {
          id: String(r.ID_AKUN || r.id || '').trim(),
          nama: String(r.NAMA_LENGKAP || r.nama || uname).trim(),
          username: uname,
          email: uname,
          role: String(r.ROLE_AKSES || r.role || 'Staff').trim(),
          status: String(r.status || r.STATUS || 'Aktif').trim(),
        },
      };
    }
  }
  return { status: 'error', message: 'Username atau password tidak cocok.' };
}

function handleSaveUser_(params) {
  var sheet = getAccountSheet_();
  var parsed = readAccountRows_(sheet);
  var origEmail = String(params.originalEmail || '').trim().toLowerCase();
  var targetUser = String(params.email || params.username || '').trim();
  if (!targetUser) {
    return { status: 'error', message: 'Username/email akun wajib diisi.' };
  }

  var existingRow = null;
  var existingRaw = null;
  for (var i = 0; i < parsed.rows.length; i++) {
    var r = parsed.rows[i].raw;
    var uname = String(r.USERNAME || r.username || r.email || '').trim().toLowerCase();
    if ((origEmail && uname === origEmail) || uname === targetUser.toLowerCase()) {
      existingRow = parsed.rows[i].rowNumber;
      existingRaw = r;
      break;
    }
  }

  var idVal =
    String(params.idAkun || '').trim() ||
    (existingRaw
      ? String(existingRaw.ID_AKUN || '')
      : 'USR-' + String(parsed.rows.length + 1).padStart(3, '0'));
  var namaVal = String(params.nama || (existingRaw && existingRaw.NAMA_LENGKAP) || targetUser).trim();
  var passVal =
    String(params.password || '').trim() ||
    (existingRaw ? String(existingRaw.PASSWORD_PIN || '') : '');
  var roleVal = String(params.role || (existingRaw && existingRaw.ROLE_AKSES) || 'Staff').trim();
  var statusVal = String(params.status || (existingRaw && existingRaw.status) || 'Aktif').trim();

  var values = [idVal, namaVal, targetUser, passVal, roleVal, statusVal];
  if (existingRow) {
    sheet.getRange(existingRow, 1, 1, 6).setValues([values]);
    return { status: 'ok', message: 'Akun berhasil diperbarui di sheet Akun.' };
  }
  sheet.appendRow(values);
  return { status: 'ok', message: 'Akun baru berhasil disimpan ke sheet Akun.' };
}

function handleDeleteUser_(params) {
  var target = String(params.email || params.username || '').trim().toLowerCase();
  if (!target) return { status: 'error', message: 'Username kosong.' };

  var sheet = getAccountSheet_();
  var parsed = readAccountRows_(sheet);
  for (var i = parsed.rows.length - 1; i >= 0; i--) {
    var r = parsed.rows[i].raw;
    var uname = String(r.USERNAME || r.username || r.email || '').trim().toLowerCase();
    if (uname === target) {
      sheet.deleteRow(parsed.rows[i].rowNumber);
      return { status: 'ok', message: 'Akun berhasil dihapus.' };
    }
  }
  return { status: 'error', message: 'Akun tidak ditemukan.' };
}

/**
 * Helper 1x pakai:
 * Memindahkan baris data gaji yang terlanjur masuk ke sheet "Akun" ke sheet "Gajian",
 * dan membersihkan kolom payroll yang menempel di sebelah kanan kolom Akun.
 */
function pindahkanDataGajiDariAkunKeGajian() {
  var akunSheet = getAccountSheet_();
  var lastRow = akunSheet.getLastRow();
  var lastCol = akunSheet.getLastColumn();
  if (lastRow < 2 || lastCol <= ACCOUNT_HEADERS.length) {
    Logger.log('Tidak ada kolom/data gaji di sheet Akun.');
    return;
  }

  var values = akunSheet.getRange(1, 1, lastRow, lastCol).getValues();
  var headers = values[0].map(function (h) {
    return String(h || '').trim();
  });

  var rowsToDelete = [];
  var moved = 0;

  for (var r = 1; r < values.length; r++) {
    var obj = {};
    for (var c = 0; c < headers.length; c++) {
      if (headers[c]) obj[headers[c]] = values[r][c];
    }
    var isAccountRow = Boolean(String(obj.ID_AKUN || obj.USERNAME || '').trim());
    var isPayrollRow = Boolean(
      String(obj.nama || '').trim() || String(obj.periodeTanggal || obj.periodeBulan || '').trim(),
    );

    if (isPayrollRow && !isAccountRow) {
      var targetPer = String(obj.periodeTanggal || obj.periodeBulan || '').trim();
      obj.sheet = targetPer ? 'Gajian - ' + targetPer : DEFAULT_PAYROLL_SHEET_NAME;
      handleSavePayroll_(obj);
      rowsToDelete.push(r + 1);
      moved++;
    }
  }

  for (var d = rowsToDelete.length - 1; d >= 0; d--) {
    akunSheet.deleteRow(rowsToDelete[d]);
  }

  if (lastCol > ACCOUNT_HEADERS.length) {
    akunSheet.deleteColumns(ACCOUNT_HEADERS.length + 1, lastCol - ACCOUNT_HEADERS.length);
  }

  Logger.log('Selesai: ' + moved + ' baris gaji dipindahkan dari sheet Akun ke tab Gajian.');
}

function buildOutput_(data, callback) {
  var json = JSON.stringify(data);
  if (callback) {
    return ContentService.createTextOutput(callback + '(' + json + ')').setMimeType(
      ContentService.MimeType.JAVASCRIPT,
    );
  }
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}
