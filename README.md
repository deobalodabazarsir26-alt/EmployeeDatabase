# Employee Management System (EMS)

## 🛠️ Master Google Apps Script
Copy this entire block into your **Google Apps Script** editor (**Extensions > Apps Script**). After pasting, click **Deploy > New Deployment**, choose **Web App**, set access to **"Anyone"**, and use the provided URL in your `constants.tsx`.

```javascript
/**
 * MASTER CRUD SCRIPT FOR EMS PRO
 * Version: 2.2 (Robust Drive Uploads)
 */

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
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    const request = JSON.parse(e.postData.contents);
    const action = request.action;
    const payload = request.payload;
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    let result = { status: 'success' };

    if (action.startsWith('upsert')) {
      const entity = action.replace('upsert', '');
      const sheetName = (entity === 'Branch' || entity === 'bank_branchs') ? 'Bank_Branch' : entity;
      upsertRow(ss, sheetName, payload);
    } 
    else if (action.startsWith('delete')) {
      const entity = action.replace('delete', '');
      const sheetName = (entity === 'Branch' || entity === 'bank_branchs') ? 'Bank_Branch' : entity;
      const idKey = Object.keys(payload)[0];
      const idValue = payload[idKey];
      deleteRow(ss, sheetName, idKey, idValue);
    }
    else if (action === 'updateUserPostSelections') {
      updateSelections(ss, payload);
    }

    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ 
      status: 'error', 
      message: err.toString() 
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// --- CORE UTILITIES ---

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

function upsertRow(ss, sheetName, data) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) throw new Error("Sheet '" + sheetName + "' not found.");
  
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const idKey = headers[0]; 
  const idValue = data[idKey];

  // 1. HANDLE PHOTO UPLOAD
  if (data.photoData && data.photoData.base64) {
    try {
      const photoUrl = uploadFileToDrive(data.photoData, "EMS_Employee_Photos");
      data.Photo = photoUrl;
      console.log("Photo synced to Drive: " + photoUrl);
    } catch (e) {
      console.error("Photo upload failed: " + e.toString());
    }
    delete data.photoData;
  }

  // 2. HANDLE DOCUMENT UPLOAD
  if (data.fileData && data.fileData.base64) {
    try {
      const docUrl = uploadFileToDrive(data.fileData, "EMS_Deactivation_Docs");
      data.DA_Doc = docUrl;
      console.log("Document synced to Drive: " + docUrl);
    } catch (e) {
      console.error("Doc upload failed: " + e.toString());
    }
    delete data.fileData;
  }
  
  const vals = sheet.getDataRange().getValues();
  let rowIndex = -1;
  const searchId = idValue.toString().trim();
  
  for (let i = 1; i < vals.length; i++) {
    if (vals[i][0].toString().trim() === searchId) { 
      rowIndex = i + 1; 
      break; 
    }
  }

  const rowData = headers.map(h => {
    const val = data[h];
    return val === undefined || val === null ? "" : val;
  });

  if (rowIndex > 0) {
    sheet.getRange(rowIndex, 1, 1, headers.length).setValues([rowData]);
  } else {
    sheet.appendRow(rowData);
  }
}

function uploadFileToDrive(fileData, folderName) {
  let folder;
  const folders = DriveApp.getFoldersByName(folderName);
  if (folders.hasNext()) {
    folder = folders.next();
  } else {
    folder = DriveApp.createFolder(folderName);
  }

  const decoded = Utilities.base64Decode(fileData.base64);
  const blob = Utilities.newBlob(decoded, fileData.mimeType, fileData.name);
  const file = folder.createFile(blob);
  
  // Critical: Allow anyone to view so the web app can display it
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  
  const fileId = file.getId();
  
  // Return direct thumbnail link for images to avoid Drive Viewer wrapping
  if (fileData.mimeType.indexOf('image') !== -1) {
    return "https://drive.google.com/thumbnail?id=" + fileId + "&sz=w1000";
  }
  
  return file.getUrl();
}

function deleteRow(ss, sheetName, idKey, idValue) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return;
  const data = sheet.getDataRange().getValues();
  const targetId = idValue.toString().trim();

  for (let i = data.length - 1; i >= 1; i--) {
    if (data[i][0].toString().trim() === targetId) {
      sheet.deleteRow(i + 1);
      return; 
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
    const uId = Math.floor(Number(r[0])).toString();
    if (!map[uId]) map[uId] = [];
    const pId = Math.floor(Number(r[1]));
    if (!isNaN(pId)) map[uId].push(pId);
  });
  return map;
}

function updateSelections(ss, payload) {
  let sheet = ss.getSheetByName('UserPostSelections');
  if (!sheet) {
    sheet = ss.insertSheet('UserPostSelections');
    sheet.appendRow(['User_ID', 'Post_ID']);
  }
  const userId = Math.floor(Number(payload.User_ID));
  const postIds = payload.Post_IDs;
  const vals = sheet.getDataRange().getValues();
  for (let i = vals.length - 1; i >= 1; i--) {
    if (Math.floor(Number(vals[i][0])) == userId) sheet.deleteRow(i + 1);
  }
  if (Array.isArray(postIds)) {
    postIds.forEach(pId => sheet.appendRow([userId, Math.floor(Number(pId))]));
  }
}
```
