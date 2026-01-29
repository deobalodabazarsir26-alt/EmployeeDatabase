# Employee Management System (EMS)

## 🛠️ Master Google Apps Script (v2.9) - Final Permission Fix

### 1. The Manifest (`appsscript.json`)
You **must** enable this in **Project Settings** -> **Show manifest file**. Replace its content with this to force the Drive scope:
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
Replace your script with this block.
**IMPORTANT:** After saving, you **MUST** click the **+** next to **Services** on the left, add **Drive API**, then run `checkConfig` to trigger the "Review Permissions" window.

```javascript
/**
 * MASTER CRUD SCRIPT FOR EMS PRO
 * Version: 2.9 (Permission Bypass Edition)
 */

const FOLDER_ID_PHOTOS = "1nohdez9u46-OmM6im7hD7OjGJhuHfKZm";
const FOLDER_ID_DOCS = "1EFhL38Xlmj-fHhV3O2Vq2yquNY7elvam";

/**
 * TRIGGER THIS FUNCTION TO FIX PERMISSIONS:
 * 1. Select 'checkConfig' in the toolbar.
 * 2. Click 'Run'.
 * 3. Click 'Review Permissions' -> Choose Account -> Advanced -> Go to ... (unsafe) -> Allow.
 */
function checkConfig() {
  try {
    const photoFolder = DriveApp.getFolderById(FOLDER_ID_PHOTOS);
    const docFolder = DriveApp.getFolderById(FOLDER_ID_DOCS);
    console.log("SUCCESS: Connection established to: " + photoFolder.getName());
    return "SUCCESS: Folders Linked";
  } catch (e) {
    console.error("PERMISSION FAILED: " + e.message);
    return "ERROR: " + e.message;
  }
}

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
  try {
    const request = JSON.parse(e.postData.contents);
    const action = request.action;
    let payload = request.payload;
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    if (action.startsWith('upsert')) {
      const entity = action.replace('upsert', '');
      const sheetName = (entity === 'Branch' || entity === 'bank_branchs') ? 'Bank_Branch' : entity;
      payload = upsertRow(ss, sheetName, payload);
    } 
    else if (action.startsWith('delete')) {
      const entity = action.replace('delete', '');
      const sheetName = (entity === 'Branch' || entity === 'bank_branchs') ? 'Bank_Branch' : entity;
      deleteRow(ss, sheetName, Object.keys(payload)[0], payload[Object.keys(payload)[0]]);
    }

    return ContentService.createTextOutput(JSON.stringify({ status: 'success', data: payload }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function upsertRow(ss, sheetName, data) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) throw new Error("Sheet missing: " + sheetName);
  
  // Handle Drive Uploads
  if (data.photoData && data.photoData.base64) {
    data.Photo = uploadFileToDrive(data.photoData, FOLDER_ID_PHOTOS);
    delete data.photoData;
  }
  if (data.fileData && data.fileData.base64) {
    data.DA_Doc = uploadFileToDrive(data.fileData, FOLDER_ID_DOCS);
    delete data.fileData;
  }

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const idValue = data[headers[0]];
  const rows = sheet.getDataRange().getValues();
  let rowIndex = -1;
  
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0].toString().trim() === idValue.toString().trim()) { rowIndex = i + 1; break; }
  }

  const rowData = headers.map(h => {
    const key = Object.keys(data).find(k => k.toLowerCase().trim() === h.toString().toLowerCase().trim());
    return key ? data[key] : "";
  });

  if (rowIndex > 0) {
    sheet.getRange(rowIndex, 1, 1, headers.length).setValues([rowData]);
  } else {
    sheet.appendRow(rowData);
  }
  return data;
}

function uploadFileToDrive(fileData, folderId) {
  try {
    const folder = DriveApp.getFolderById(folderId);
    const decoded = Utilities.base64Decode(fileData.base64);
    const blob = Utilities.newBlob(decoded, fileData.mimeType, fileData.name);
    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    if (fileData.mimeType.indexOf('image') !== -1) {
      return "https://drive.google.com/thumbnail?id=" + file.getId() + "&sz=w1000";
    }
    return file.getUrl();
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

function deleteRow(ss, sheetName, idKey, idValue) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return;
  const vals = sheet.getDataRange().getValues();
  for (let i = vals.length - 1; i >= 1; i--) {
    if (vals[i][0].toString().trim() === idValue.toString().trim()) { sheet.deleteRow(i + 1); break; }
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
    map[uId].push(Number(r[1]));
  });
  return map;
}
```
