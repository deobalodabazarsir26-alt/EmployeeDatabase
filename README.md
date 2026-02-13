
# Employee Management System (EMS)

## 🛠️ Master Google Apps Script (v3.6) - Finalization & Batch Operations

### ⚠️ MANDATORY: Spreadsheet Setup
Before deploying the script, you **MUST** add a new column to your Google Sheet:
1. Open your Google Spreadsheet.
2. Go to the **Office** sheet.
3. Add a header named `Finalized` in the next available column (e.g., Column G).
4. Initialize the values as `No` for existing rows.

---

### 1. The Manifest (`appsscript.json`)
Ensure this is enabled in **Project Settings**.
```json
{
  "timeZone": "Asia/Kolkata",
  "dependencies": {
    "enabledAdvancedServices": [
      {
        "userSymbol": "Drive",
        "serviceId": "drive",
        "version": "v2"
      }
    ]
  },
  "webapp": {
    "executeAs": "USER_DEPLOYING",
    "access": "ANYONE"
  },
  "exceptionLogging": "STACKDRIVER",
  "runtimeVersion": "V8",
  "oauthScopes": [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive",
    "https://www.googleapis.com/auth/script.external_request"
  ]
}
```

### 2. The Code (`Code.gs`)
**Copy this into your script project and Deploy as Web App.**
```javascript
/**
 * MASTER CRUD SCRIPT FOR EMS PRO
 * Version: 3.6 (Batch Support & Case-Insensitive Mapping)
 */

const FOLDER_ID_PHOTOS = "1nohdez9u46-OmM6im7hD7OjGJhuHfKZm";
const FOLDER_ID_DOCS = "1EFhL38Xlmj-fHhV3O2Vq2yquNY7elvam";

function doGet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const data = {
    users: getSheetData(ss, 'User'),
    departments: getSheetData(ss, 'Department'),
    offices: getSheetData(ss, 'Office'),
    banks: getSheetData(ss, 'Bank'),
    branches: getSheetData(ss, 'Bank_Branch'),
    posts: getSheetData(ss, 'Post'),
    payscales: getSheetData(ss, 'Payscale'),
    employees: getSheetData(ss, 'Employee'),
    userPostSelections: getSelectionData(ss)
  };
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    const request = JSON.parse(e.postData.contents);
    const action = request.action;
    let payload = request.payload;
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // Support for singular upsert
    if (action.startsWith('upsert')) {
      const entity = action.replace('upsert', '');
      const sheetName = (entity === 'Branch' || entity === 'bank_branchs') ? 'Bank_Branch' : entity;
      payload = upsertRow(ss, sheetName, payload);
    } 
    // Support for batch upsert (Finalize All / De-Finalize All)
    else if (action.startsWith('batchUpsert')) {
      const entity = action.replace('batchUpsert', '');
      const sheetName = (entity === 'Branch' || entity === 'bank_branchs' || entity === 'Office') ? 'Office' : entity;
      if (Array.isArray(payload)) {
        payload = payload.map(item => upsertRow(ss, sheetName, item));
      }
    }
    else if (action.startsWith('delete')) {
      const entity = action.replace('delete', '');
      const sheetName = (entity === 'Branch' || entity === 'bank_branchs') ? 'Bank_Branch' : entity;
      deleteRow(ss, sheetName, payload);
    }
    else if (action === 'updateUserPostSelections') {
      updateUserPostSelections(ss, payload);
    }

    return ContentService.createTextOutput(JSON.stringify({ status: 'success', data: payload }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function upsertRow(ss, sheetName, data) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) throw new Error("Sheet missing: " + sheetName);
  
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const idKey = headers[0];
  let idValue = data[idKey];

  if (!idValue || Number(idValue) === 0) {
    idValue = getNextId(sheet);
    data[idKey] = idValue;
  }

  const rows = sheet.getDataRange().getValues();
  let rowIndex = -1;
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0].toString().trim() === idValue.toString().trim()) { rowIndex = i + 1; break; }
  }

  // File Upload Logic
  if (data.photoData && data.photoData.base64) {
    data.Photo = uploadFileToDrive(data.photoData, FOLDER_ID_PHOTOS);
    delete data.photoData;
  }
  if (data.fileData && data.fileData.base64) {
    data.DA_Doc = uploadFileToDrive(data.fileData, FOLDER_ID_DOCS);
    delete data.fileData;
  }

  // Header Mapping
  const rowData = headers.map(h => {
    const hStr = h.toString().toLowerCase().trim();
    const key = Object.keys(data).find(k => k.toLowerCase().trim() === hStr);
    return (key !== undefined) ? data[key] : "";
  });

  if (rowIndex > 0) {
    sheet.getRange(rowIndex, 1, 1, headers.length).setValues([rowData]);
  } else {
    sheet.appendRow(rowData);
  }
  return data;
}

function getNextId(sheet) {
  const vals = sheet.getDataRange().getValues();
  if (vals.length < 2) return 1;
  const ids = vals.slice(1).map(r => Number(r[0])).filter(id => !isNaN(id));
  return ids.length > 0 ? Math.max(...ids) + 1 : 1;
}

function uploadFileToDrive(fileData, folderId) {
  try {
    const folder = DriveApp.getFolderById(folderId);
    const decoded = Utilities.base64Decode(fileData.base64);
    const blob = Utilities.newBlob(decoded, fileData.mimeType, fileData.name);
    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return fileData.mimeType.indexOf('image') !== -1 
      ? "https://drive.google.com/thumbnail?id=" + file.getId() + "&sz=w1000"
      : file.getUrl();
  } catch (e) {
    return "DRIVE_ERR: " + e.message;
  }
}

function getSheetData(ss, name) {
  const sheet = ss.getSheetByName(name);
  if (!sheet) return [];
  const vals = sheet.getDataRange().getValues();
  if (vals.length < 2) return [];
  const headers = vals.shift();
  return vals.map(row => {
    let obj = {};
    headers.forEach((h, i) => obj[h] = row[i]);
    return obj;
  });
}

function deleteRow(ss, sheetName, payload) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return;
  const idValue = payload[Object.keys(payload)[0]];
  const vals = sheet.getDataRange().getValues();
  for (let i = vals.length - 1; i >= 1; i--) {
    if (vals[i][0].toString().trim() === idValue.toString().trim()) { 
      sheet.deleteRow(i + 1); 
      break; 
    }
  }
}

function getSelectionData(ss) {
  const sheet = ss.getSheetByName('UserPostSelections');
  if (!sheet) return {};
  const vals = sheet.getDataRange().getValues();
  if (vals.length < 2) return {};
  vals.shift();
  const map = {};
  vals.forEach(r => {
    const uId = r[0].toString();
    if (!map[uId]) map[uId] = [];
    let val = r[1];
    if (typeof val === 'string' && val.indexOf('[') !== -1) {
      try {
        const parsed = JSON.parse(val);
        if (Array.isArray(parsed)) {
          parsed.forEach(v => map[uId].push(Number(v)));
        }
      } catch(e) {
        val.replace(/[\[\]]/g, '').split(',').forEach(v => map[uId].push(Number(v.trim())));
      }
    } else {
      map[uId].push(Number(val));
    }
  });
  return map;
}

function updateUserPostSelections(ss, payload) {
  const sheet = ss.getSheetByName('UserPostSelections');
  if (!sheet) return;
  const userId = payload.User_ID.toString();
  const postIds = payload.Post_IDs; 
  const rows = sheet.getDataRange().getValues();
  for (let i = rows.length - 1; i >= 1; i--) {
    if (rows[i][0].toString() === userId) {
      sheet.deleteRow(i + 1);
    }
  }
  postIds.forEach(pId => {
    sheet.appendRow([userId, pId]);
  });
}
```