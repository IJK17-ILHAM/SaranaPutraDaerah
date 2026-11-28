/**
 * Google Apps Script — SPS Armada + Google Drive Otomatis per Nomor Polisi
 * (PT. Sarana Putra Daerah)
 *
 * Folder Root Google Drive Armada:
 * https://drive.google.com/drive/folders/1Ch63swBO71_GofpT6BTov3f-O1Q3wjyZ?usp=sharing
 *
 * Struktur folder otomatis di Google Drive:
 *   Armada Root/
 *     ├── Pengajuan Barang/        (Folder khusus foto & lampiran Pengajuan Barang)
 *     ├── B 9001 ARM/
 *     │    ├── P2H/
 *     │    ├── Perbaikan/
 *     │    ├── Sewa Unit/
 *     │    ├── Uang Jalan/
 *     │    ├── Perjalanan/
 *     │    ├── Kendala/
 *     │    └── Berkas Kendaraan/
 *     └── <NOMOR POLISI LAINNYA>/
 *
 * Cara pasang:
 * 1. Buka Google Spreadsheet SPS Armada -> Ekstensi -> Apps Script.
 * 2. Tempel seluruh kode ini ke Code.gs, lalu simpan.
 * 3. Jalankan fungsi `ujiIzinDrive` sekali di editor Apps Script agar Google meminta izin DriveApp & SpreadsheetApp.
 * 4. Klik Terapkan -> Kelola deployment -> Edit -> Versi baru -> Terapkan
 *    (Jalankan sebagai: Saya, Yang memiliki akses: Siapa saja).
 */

var ARMADA_DRIVE_ROOT_FOLDER_ID = '1Ch63swBO71_GofpT6BTov3f-O1Q3wjyZ';
var PENGAJUAN_BARANG_FOLDER_NAME = 'Pengajuan Barang';

var ARMADA_SHEETS = {
  units: 'Unit Armada',
  pelanggan: 'Pelanggan',
  lokasi: 'Lokasi',
  tarif: 'Tarif',
  perjalanan: 'Perjalanan',
  uangJalan: 'Uang Jalan',
  sewa: 'Sewa Unit',
  p2h: 'P2H',
  maintenance: 'Maintenance',
  permintaanBarang: 'Permintaan Barang',
  kendala: 'Kendala',
  accounts: 'Akun Armada',
};

var SHEET_DEFAULT_KATEGORI = {
  'Unit Armada': 'Berkas Kendaraan',
  P2H: 'P2H',
  Maintenance: 'Perbaikan',
  'Permintaan Barang': 'Pengajuan Barang',
  'Sewa Unit': 'Sewa Unit',
  'Uang Jalan': 'Uang Jalan',
  Perjalanan: 'Perjalanan',
  Kendala: 'Kendala',
};

/**
 * Jalankan fungsi ini 1x di editor Apps Script untuk memberikan izin akses Google Drive & Spreadsheet
 * sekaligus membuat folder khusus Pengajuan Barang.
 */
function ujiIzinDrive() {
  var folder = DriveApp.getFolderById(ARMADA_DRIVE_ROOT_FOLDER_ID);
  var pbFolder = ensurePengajuanBarangFolder_(ARMADA_DRIVE_ROOT_FOLDER_ID);
  Logger.log('Terhubung ke folder Drive Armada: ' + folder.getName());
  Logger.log('Folder khusus Pengajuan Barang: ' + pbFolder.getName() + ' -> ' + pbFolder.getUrl());
}

function doGet(e) {
  var params = (e && e.parameter) || {};
  var action = params.action || 'getAll';
  var callback = params.callback || '';
  var result;

  try {
    if (action === 'getAll') {
      result = handleGetAll_();
    } else if (action === 'loginArmada') {
      result = handleLoginArmada_(params.username || params.email || '', params.password || '');
    } else if (action === 'getArmadaUsers') {
      var accSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(ARMADA_SHEETS.accounts);
      result = { status: 'ok', accounts: accSheet ? readSheetObjects_(accSheet) : [] };
    } else if (action === 'ensurePengajuanBarangFolder') {
      var pbFolder = ensurePengajuanBarangFolder_(params.rootFolderId || ARMADA_DRIVE_ROOT_FOLDER_ID);
      result = {
        status: 'ok',
        folderId: pbFolder.getId(),
        folderName: pbFolder.getName(),
        folderUrl: pbFolder.getUrl(),
      };
    } else if (action === 'saveRecord') {
      var dataObj = JSON.parse(params.data || '{}');
      result = saveRecordWithDrive_(params.sheet, dataObj, null);
    } else if (action === 'deleteRecord') {
      result = deleteRowById_(params.sheet, params.id);
    } else {
      result = { status: 'ok', message: 'SPS Armada + Drive aktif', action: action };
    }
  } catch (err) {
    result = { status: 'error', message: String(err && err.message ? err.message : err) };
  }

  return buildOutput_(result, callback);
}

function doPost(e) {
  var result;
  try {
    var body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    var action = body.action || '';
    var rootId = body.rootFolderId || (body.driveMeta && body.driveMeta.rootFolderId) || ARMADA_DRIVE_ROOT_FOLDER_ID;

    if (action === 'uploadDriveFile') {
      var uploaded =
        body.folderMode === 'pengajuan_barang' || body.kategori === 'Pengajuan Barang'
          ? saveBase64ToPengajuanBarangDrive_(
              rootId,
              body.unitNomorPolisi || body.nomorPolisi || body.kodeUnit || '',
              buildFriendlyFileName_(body.refNumber || body.kodeUnit || 'PB', body.fileName || 'foto.jpg'),
              body.dataUrl || '',
            )
          : saveBase64ToVehicleDrive_(
              rootId,
              body.nomorPolisi || body.kodeUnit || 'UMUM',
              body.kategori || 'Berkas Kendaraan',
              buildFriendlyFileName_(body.refNumber || body.kodeUnit || '', body.fileName || 'dokumen.jpg'),
              body.dataUrl || '',
            );
      result = { status: 'ok', file: uploaded };
    } else if (action === 'ensurePengajuanBarangFolder') {
      var ensuredPb = ensurePengajuanBarangFolder_(rootId);
      result = {
        status: 'ok',
        folderId: ensuredPb.getId(),
        folderName: ensuredPb.getName(),
        folderUrl: ensuredPb.getUrl(),
      };
    } else if (action === 'saveRecord') {
      result = saveRecordWithDrive_(body.sheet, body.data || {}, body.driveMeta || { rootFolderId: rootId });
    } else if (action === 'deleteRecord') {
      result = deleteRowById_(body.sheet, body.id);
    } else if (action === 'syncSheet') {
      var processedRows = processRowsArrayWithDrive_(
        body.sheet,
        body.rows || [],
        rootId,
        body.kategori || SHEET_DEFAULT_KATEGORI[body.sheet] || '',
      );
      result = replaceSheetRows_(body.sheet, processedRows);
    } else if (action === 'syncAll') {
      var sheetsMap = body.sheets || {};
      var updatedTabs = [];
      // Sinkronkan Unit Armada terlebih dahulu agar semua folder plat nomor terbentuk & lookup tersedia
      if (sheetsMap[ARMADA_SHEETS.units]) {
        var unitRows = processRowsArrayWithDrive_(
          ARMADA_SHEETS.units,
          sheetsMap[ARMADA_SHEETS.units],
          rootId,
          'Berkas Kendaraan',
        );
        replaceSheetRows_(ARMADA_SHEETS.units, unitRows);
        updatedTabs.push(ARMADA_SHEETS.units);
      }
      Object.keys(sheetsMap).forEach(function (sheetName) {
        if (sheetName === ARMADA_SHEETS.units) return;
        var rows = processRowsArrayWithDrive_(
          sheetName,
          sheetsMap[sheetName] || [],
          rootId,
          SHEET_DEFAULT_KATEGORI[sheetName] || '',
        );
        replaceSheetRows_(sheetName, rows);
        updatedTabs.push(sheetName);
      });
      result = { status: 'ok', updatedTabs: updatedTabs };
    } else {
      result = { status: 'error', message: 'Action POST tidak dikenal: ' + action };
    }
  } catch (err) {
    result = { status: 'error', message: String(err && err.message ? err.message : err) };
  }

  return buildOutput_(result, '');
}

// ======================================================
// GOOGLE DRIVE OTOMATIS PER NOMOR POLISI KENDARAAN
// ======================================================

function normalizePlateFolderName_(rawPlate) {
  var cleaned = String(rawPlate || '')
    .trim()
    .toUpperCase()
    .replace(/[\\/:*?"<>|]+/g, ' ')
    .replace(/\s+/g, ' ');
  return cleaned || 'UMUM';
}

function getOrCreateChildFolder_(parentFolder, childName) {
  var safeName = String(childName || 'Lainnya').trim();
  var it = parentFolder.getFoldersByName(safeName);
  if (it.hasNext()) {
    return it.next();
  }
  return parentFolder.createFolder(safeName);
}

function ensureVehicleFolder_(rootFolderId, nomorPolisi) {
  var root = DriveApp.getFolderById(rootFolderId || ARMADA_DRIVE_ROOT_FOLDER_ID);
  var plateName = normalizePlateFolderName_(nomorPolisi);
  return getOrCreateChildFolder_(root, plateName);
}

/**
 * Membuat / mengambil folder khusus "Pengajuan Barang" tepat di dalam root Drive Armada.
 * Memeriksa nama secara case-insensitive agar tidak terbentuk folder duplikat.
 */
function ensurePengajuanBarangFolder_(rootFolderId) {
  var root = DriveApp.getFolderById(rootFolderId || ARMADA_DRIVE_ROOT_FOLDER_ID);
  var it = root.getFolders();
  while (it.hasNext()) {
    var f = it.next();
    if (String(f.getName() || '').trim().toLowerCase() === PENGAJUAN_BARANG_FOLDER_NAME.toLowerCase()) {
      return f;
    }
  }
  return root.createFolder(PENGAJUAN_BARANG_FOLDER_NAME);
}

function buildFriendlyFileName_(prefix, originalName) {
  var today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd_HHmmss');
  var safePrefix = String(prefix || '')
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, '-');
  var safeOrig = String(originalName || 'lampiran.jpg')
    .trim()
    .replace(/[\\/:*?"<>|]+/g, '_');
  return safePrefix ? today + '_' + safePrefix + '_' + safeOrig : today + '_' + safeOrig;
}

function saveBase64ToPengajuanBarangDrive_(rootFolderId, unitNomorPolisi, fileName, dataUrl) {
  if (!dataUrl || String(dataUrl).indexOf('data:') !== 0) return null;

  var match = String(dataUrl).match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;

  var mimeType = match[1] || 'image/jpeg';
  var base64Data = match[2];
  var bytes = Utilities.base64Decode(base64Data);

  var finalName = fileName;
  if (finalName.indexOf('.') === -1) {
    var ext = mimeType.indexOf('png') !== -1 ? '.png' : mimeType.indexOf('pdf') !== -1 ? '.pdf' : '.jpg';
    finalName = finalName + ext;
  }

  var pbFolder = ensurePengajuanBarangFolder_(rootFolderId);
  var plateClean = unitNomorPolisi ? normalizePlateFolderName_(unitNomorPolisi) : '';
  var targetFolder =
    plateClean && plateClean !== 'UMUM' && plateClean !== '-' && plateClean !== 'PENGAJUAN BARANG'
      ? getOrCreateChildFolder_(pbFolder, plateClean)
      : pbFolder;
  var blob = Utilities.newBlob(bytes, mimeType, finalName);
  var file = targetFolder.createFile(blob);

  try {
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (e) {
    // Tetap lanjut jika kebijakan domain Google Workspace membatasi sharing publik
  }

  return {
    fileId: file.getId(),
    fileName: file.getName(),
    viewUrl: file.getUrl(),
    folderUrl: pbFolder.getUrl(),
  };
}

function saveBase64ToVehicleDrive_(rootFolderId, nomorPolisi, kategori, fileName, dataUrl) {
  if (!dataUrl || String(dataUrl).indexOf('data:') !== 0) return null;

  var match = String(dataUrl).match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;

  var mimeType = match[1] || 'image/jpeg';
  var base64Data = match[2];
  var bytes = Utilities.base64Decode(base64Data);

  var finalName = fileName;
  if (finalName.indexOf('.') === -1) {
    var ext = mimeType.indexOf('png') !== -1 ? '.png' : mimeType.indexOf('pdf') !== -1 ? '.pdf' : '.jpg';
    finalName = finalName + ext;
  }

  var plateFolder = ensureVehicleFolder_(rootFolderId, nomorPolisi);
  var targetFolder = kategori ? getOrCreateChildFolder_(plateFolder, kategori) : plateFolder;
  var blob = Utilities.newBlob(bytes, mimeType, finalName);
  var file = targetFolder.createFile(blob);

  try {
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (e) {
    // Tetap lanjut jika kebijakan domain Google Workspace membatasi sharing publik
  }

  return {
    fileId: file.getId(),
    fileName: file.getName(),
    viewUrl: file.getUrl(),
    folderUrl: plateFolder.getUrl(),
  };
}

function resolvePlateFromRecord_(sheetName, dataObj, driveMeta) {
  if (driveMeta && driveMeta.nomorPolisi) return driveMeta.nomorPolisi;
  if (dataObj && dataObj.nomorPolisi) return dataObj.nomorPolisi;

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var unitId = dataObj && dataObj.unitId ? String(dataObj.unitId) : '';

  if (!unitId && dataObj && dataObj.perjalananId) {
    var prjSheet = ss.getSheetByName(ARMADA_SHEETS.perjalanan);
    if (prjSheet) {
      var prjRows = readSheetObjects_(prjSheet);
      for (var p = 0; p < prjRows.length; p++) {
        if (String(prjRows[p].id) === String(dataObj.perjalananId)) {
          unitId = String(prjRows[p].unitId || '');
          break;
        }
      }
    }
  }

  if (unitId) {
    var unitSheet = ss.getSheetByName(ARMADA_SHEETS.units);
    if (unitSheet) {
      var unitRows = readSheetObjects_(unitSheet);
      for (var u = 0; u < unitRows.length; u++) {
        if (String(unitRows[u].id) === unitId) {
          return String(unitRows[u].nomorPolisi || unitRows[u].kodeUnit || 'UMUM');
        }
      }
    }
  }

  return (driveMeta && driveMeta.kodeUnit) || (dataObj && dataObj.kodeUnit) || 'UMUM';
}

function extractMediaToDrive_(sheetName, dataObj, driveMeta) {
  if (!dataObj || typeof dataObj !== 'object') return dataObj;
  var copy = JSON.parse(JSON.stringify(dataObj));
  var rootId = (driveMeta && driveMeta.rootFolderId) || ARMADA_DRIVE_ROOT_FOLDER_ID;
  var isPengajuanBarang =
    sheetName === ARMADA_SHEETS.permintaanBarang ||
    (driveMeta && driveMeta.folderMode === 'pengajuan_barang');
  var plate = isPengajuanBarang
    ? (driveMeta && driveMeta.unitNomorPolisi) || copy.nomorPolisi || copy.kodeUnit || ''
    : resolvePlateFromRecord_(sheetName, copy, driveMeta);
  var kategori = (driveMeta && driveMeta.kategori) || SHEET_DEFAULT_KATEGORI[sheetName] || 'Lainnya';
  var ref =
    (driveMeta && driveMeta.refNumber) ||
    copy.nomorPermintaan ||
    copy.nomorP2H ||
    copy.nomorPengajuan ||
    copy.nomorSewa ||
    copy.nomorUangJalan ||
    copy.nomorPenugasan ||
    copy.nomorLaporan ||
    copy.kodeUnit ||
    copy.id ||
    '';

  // Jika menyimpan Unit Armada, otomatis buat folder plat kendaraan & simpan URL foldernya
  if (sheetName === ARMADA_SHEETS.units && copy.nomorPolisi) {
    try {
      var unitFolder = ensureVehicleFolder_(rootId, copy.nomorPolisi);
      copy.driveFolderUrl = unitFolder.getUrl();
    } catch (e) {
      // Abaikan jika izin Drive belum aktif
    }
  }

  // Jika menyimpan Permintaan Barang, otomatis pastikan folder khusus Pengajuan Barang tersedia
  if (isPengajuanBarang) {
    try {
      var pbFolder = ensurePengajuanBarangFolder_(rootId);
      copy.driveFolderUrl = pbFolder.getUrl();
    } catch (e) {
      // Abaikan jika izin Drive belum aktif
    }
  }

  // 1. Field foto/dokumen level atas
  var topMediaFields = [
    { dataKey: 'fotoDataUrl', nameKey: 'fotoNama', label: 'foto' },
    { dataKey: 'buktiBongkarDataUrl', nameKey: 'buktiBongkarNama', label: 'bukti_bongkar' },
    { dataKey: 'buktiPencairanDataUrl', nameKey: 'buktiPencairanNama', label: 'bukti_pencairan' },
    { dataKey: 'buktiSerahTerimaDataUrl', nameKey: 'buktiSerahTerimaNama', label: 'serah_terima' },
    { dataKey: 'buktiKembaliDataUrl', nameKey: 'buktiKembaliNama', label: 'pengembalian' },
  ];

  topMediaFields.forEach(function (spec) {
    var val = copy[spec.dataKey];
    if (typeof val === 'string' && val.indexOf('data:') === 0) {
      var origName = copy[spec.nameKey] || spec.label + '.jpg';
      var saved = isPengajuanBarang
        ? saveBase64ToPengajuanBarangDrive_(
            rootId,
            plate,
            buildFriendlyFileName_(ref + '_' + spec.label, origName),
            val,
          )
        : saveBase64ToVehicleDrive_(
            rootId,
            plate,
            kategori,
            buildFriendlyFileName_(ref + '_' + spec.label, origName),
            val,
          );
      if (saved) {
        copy[spec.dataKey] = saved.viewUrl;
        if (isPengajuanBarang && saved.folderUrl) {
          copy.driveFolderUrl = saved.folderUrl;
        }
      }
    }
  });

  // 2. Foto item checklist P2H
  if (Array.isArray(copy.items)) {
    copy.items = copy.items.map(function (it) {
      if (it && typeof it.fotoDataUrl === 'string' && it.fotoDataUrl.indexOf('data:') === 0) {
        var label = it.label || it.kode || 'item';
        var saved = saveBase64ToVehicleDrive_(
          rootId,
          plate,
          'P2H',
          buildFriendlyFileName_(ref + '_' + label, it.fotoNama || 'temuan.jpg'),
          it.fotoDataUrl,
        );
        if (saved) {
          it.fotoDataUrl = saved.viewUrl;
        }
      }
      return it;
    });
  }

  // 3. Bukti nota pengeluaran Uang Jalan
  if (Array.isArray(copy.rincianPengeluaran)) {
    copy.rincianPengeluaran = copy.rincianPengeluaran.map(function (exp) {
      if (exp && typeof exp.buktiDataUrl === 'string' && exp.buktiDataUrl.indexOf('data:') === 0) {
        var label = exp.kategori || 'pengeluaran';
        var saved = saveBase64ToVehicleDrive_(
          rootId,
          plate,
          'Uang Jalan',
          buildFriendlyFileName_(ref + '_' + label, exp.buktiNama || 'nota.jpg'),
          exp.buktiDataUrl,
        );
        if (saved) {
          exp.buktiDataUrl = saved.viewUrl;
        }
      }
      return exp;
    });
  }

  return copy;
}

function saveRecordWithDrive_(sheetName, dataObj, driveMeta) {
  var processed = extractMediaToDrive_(sheetName, dataObj, driveMeta);
  return upsertRow_(sheetName, processed);
}

function processRowsArrayWithDrive_(sheetName, rows, rootId, kategori) {
  if (!Array.isArray(rows)) return [];
  return rows.map(function (row) {
    return extractMediaToDrive_(sheetName, row, {
      rootFolderId: rootId,
      kategori: kategori,
    });
  });
}

// ======================================================
// AUTENTIKASI AKUN ARMADA & HELPER SPREADSHEET
// ======================================================

function handleLoginArmada_(username, password) {
  var cleanUser = String(username || '').trim().toLowerCase();
  var cleanPass = String(password || '').trim();
  if (!cleanUser || !cleanPass) {
    return { status: 'error', message: 'Username dan password wajib diisi.' };
  }
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(ARMADA_SHEETS.accounts);
  if (!sheet) {
    return { status: 'error', message: 'Tab Akun Armada belum tersedia di SPS Armada.' };
  }
  var rows = readSheetObjects_(sheet);
  for (var i = 0; i < rows.length; i++) {
    var r = rows[i];
    var rowUser = String(r.username || r.USERNAME || '').trim().toLowerCase();
    if (rowUser !== cleanUser) continue;
    var rowStatus = String(r.status || r.STATUS || 'Aktif').trim().toLowerCase();
    if (rowStatus === 'nonaktif') {
      return { status: 'error', message: 'Akun Armada ini sedang dinonaktifkan.' };
    }
    var rowPass = String(r.passwordPin || r.PASSWORD_PIN || r.password || '').trim();
    if (rowPass !== cleanPass) {
      return { status: 'error', message: 'Password / PIN Armada salah.' };
    }
    return {
      status: 'ok',
      user: {
        id: String(r.idAkun || r.ID_AKUN || r.id || ''),
        nama: String(r.namaLengkap || r.NAMA_LENGKAP || r.nama || rowUser),
        username: String(r.username || r.USERNAME || ''),
        role: String(r.roleAkses || r.ROLE_AKSES || r.role || 'Sopir'),
        status: 'Aktif',
      },
    };
  }
  return { status: 'error', message: 'Akun Armada tidak ditemukan.' };
}

function buildOutput_(obj, callback) {
  var jsonText = JSON.stringify(obj);
  if (callback) {
    return ContentService.createTextOutput(callback + '(' + jsonText + ');').setMimeType(
      ContentService.MimeType.JAVASCRIPT,
    );
  }
  return ContentService.createTextOutput(jsonText).setMimeType(ContentService.MimeType.JSON);
}

function handleGetAll_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var out = { status: 'ok' };
  Object.keys(ARMADA_SHEETS).forEach(function (key) {
    var sheetName = ARMADA_SHEETS[key];
    var sheet = ss.getSheetByName(sheetName);
    out[key] = sheet ? readSheetObjects_(sheet) : [];
  });
  try {
    var pbFolder = ensurePengajuanBarangFolder_(ARMADA_DRIVE_ROOT_FOLDER_ID);
    out.pengajuanBarangDriveUrl = pbFolder.getUrl();
  } catch (e) {
    // Abaikan jika izin Drive belum aktif
  }
  return out;
}

function getOrCreateSheet_(sheetName) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }
  return sheet;
}

function readSheetObjects_(sheet) {
  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  var headers = values[0].map(function (h) {
    return String(h || '').trim();
  });
  var rows = [];
  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    var hasValue = false;
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      var key = headers[j];
      if (!key) continue;
      var val = row[j];
      if (val !== '' && val !== null && val !== undefined) hasValue = true;
      obj[key] =
        val instanceof Date
          ? Utilities.formatDate(val, Session.getScriptTimeZone(), 'yyyy-MM-dd')
          : val;
    }
    if (hasValue) rows.push(obj);
  }
  return rows;
}

function sanitizeCellValue_(val) {
  if (val === undefined || val === null) return '';
  var str = typeof val === 'object' ? JSON.stringify(val) : String(val);
  if (str.length > 48000) return str.slice(0, 48000);
  return str;
}

function ensureHeaders_(sheet, keys) {
  var lastCol = sheet.getLastColumn();
  var headers = lastCol > 0 ? sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(String) : [];
  var changed = false;
  keys.forEach(function (k) {
    if (headers.indexOf(k) === -1) {
      headers.push(k);
      changed = true;
    }
  });
  if (changed && headers.length > 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
  return headers;
}

function upsertRow_(sheetName, dataObj) {
  if (!sheetName) return { status: 'error', message: 'Nama sheet kosong' };
  var sheet = getOrCreateSheet_(sheetName);
  var keys = Object.keys(dataObj);
  if (keys.indexOf('id') === -1) keys.unshift('id');
  var headers = ensureHeaders_(sheet, keys);

  var idColIdx = headers.indexOf('id');
  var targetId = String(dataObj.id || '');
  var rowValues = headers.map(function (h) {
    return sanitizeCellValue_(dataObj[h]);
  });

  var lastRow = sheet.getLastRow();
  if (targetId && lastRow >= 2 && idColIdx !== -1) {
    var idValues = sheet.getRange(2, idColIdx + 1, lastRow - 1, 1).getValues();
    for (var i = 0; i < idValues.length; i++) {
      if (String(idValues[i][0]) === targetId) {
        sheet.getRange(i + 2, 1, 1, headers.length).setValues([rowValues]);
        return { status: 'ok', mode: 'updated', sheet: sheetName, id: targetId };
      }
    }
  }

  sheet.appendRow(rowValues);
  return { status: 'ok', mode: 'inserted', sheet: sheetName, id: targetId };
}

function deleteRowById_(sheetName, id) {
  if (!sheetName || !id) return { status: 'error', message: 'Sheet atau ID kosong' };
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet || sheet.getLastRow() < 2) return { status: 'ok', deleted: false };

  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(String);
  var idColIdx = headers.indexOf('id');
  if (idColIdx === -1) return { status: 'ok', deleted: false };

  var idValues = sheet.getRange(2, idColIdx + 1, sheet.getLastRow() - 1, 1).getValues();
  for (var i = idValues.length - 1; i >= 0; i--) {
    if (String(idValues[i][0]) === String(id)) {
      sheet.deleteRow(i + 2);
      return { status: 'ok', deleted: true, sheet: sheetName, id: id };
    }
  }
  return { status: 'ok', deleted: false };
}

function replaceSheetRows_(sheetName, rows) {
  if (!sheetName) return { status: 'error', message: 'Nama sheet kosong' };
  var sheet = getOrCreateSheet_(sheetName);
  if (!Array.isArray(rows) || rows.length === 0) {
    return { status: 'ok', sheet: sheetName, count: 0 };
  }

  var keySet = { id: true };
  rows.forEach(function (r) {
    Object.keys(r || {}).forEach(function (k) {
      keySet[k] = true;
    });
  });
  var headers = ['id'].concat(
    Object.keys(keySet).filter(function (k) {
      return k !== 'id';
    }),
  );

  var matrix = [headers].concat(
    rows.map(function (r) {
      return headers.map(function (h) {
        return sanitizeCellValue_(r[h]);
      });
    }),
  );

  sheet.clearContents();
  sheet.getRange(1, 1, matrix.length, headers.length).setValues(matrix);
  return { status: 'ok', sheet: sheetName, count: rows.length };
}
