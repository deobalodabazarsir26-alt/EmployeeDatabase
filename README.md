
# Employee Management System (EMS)

## 🛠️ Master Google Apps Script
Copy this entire block into your **Google Apps Script** editor (**Extensions > Apps Script**). After pasting, click **Deploy > New Deployment**, choose **Web App**, set access to **"Anyone"**, and use the provided URL in your `constants.tsx`.

```javascript
/**
 * MASTER CRUD SCRIPT FOR EMS PRO
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
      const sheetName = entity === 'Branch' ? 'Bank_Branch' : entity;
      upsertRow(ss, sheetName, payload);
    } 
    else if (action.startsWith('delete')) {
      const entity = action.replace('delete', '');
      const sheetName = entity === 'Branch' ? 'Bank_Branch' : entity;
      const idKey = Object.keys(payload)[0];
      const idValue = payload[idKey];
      deleteRow(ss, sheetName, idKey, idValue);
    }
    else if (action === 'updateUserPostSelections') {
      updateSelections(ss, payload);
    }
    else if (action === 'batchUpsertBranches') {
      payload.forEach(item => upsertRow(ss, 'Bank_Branch', item));
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
  if (!sheet) throw new Error("Sheet '" + sheetName + "' not found");
  
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const idKey = headers[0];
  const idValue = data[idKey];
  
  const vals = sheet.getDataRange().getValues();
  let rowIndex = -1;
  for (let i = 1; i < vals.length; i++) {
    if (vals[i][0].toString().trim() == idValue.toString().trim()) { 
      rowIndex = i + 1; 
      break; 
    }
  }

  const rowData = headers.map(h => data[h] === undefined ? "" : data[h]);
  if (rowIndex > 0) {
    sheet.getRange(rowIndex, 1, 1, headers.length).setValues([rowData]);
  } else {
    sheet.appendRow(rowData);
  }
}

function deleteRow(ss, sheetName, idKey, idValue) {
  const sheet = ss.getSheetByName(sheetName);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const colIndex = headers.findIndex(h => h.toString().toLowerCase() === idKey.toLowerCase());
  const searchCol = colIndex >= 0 ? colIndex : 0;
  const targetId = idValue.toString().trim();

  for (let i = data.length - 1; i >= 1; i--) {
    if (data[i][searchCol].toString().trim() == targetId) {
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
    // Normalize User_ID: Remove potential decimals like 1.0 -> 1
    const rawUid = r[0].toString().trim();
    const uId = rawUid.includes('.') ? Math.floor(parseFloat(rawUid)).toString() : rawUid;
    
    if (!map[uId]) map[uId] = [];
    
    const pVal = r[1].toString().trim();
    
    // Check if cell contains a JSON array string e.g., "[2350, 4083]"
    if (pVal.startsWith('[') && pVal.endsWith(']')) {
      try {
        const arr = JSON.parse(pVal);
        if (Array.isArray(arr)) {
          arr.forEach(id => {
            const nid = parseInt(id.toString().replace(/\.0$/, ''));
            if (!isNaN(nid)) map[uId].push(nid);
          });
          return; // Continue to next row in forEach
        }
      } catch(e) { /* ignore parse error and try standard parse below */ }
    }

    const pId = parseInt(pVal.replace(/\.0$/, ''));
    if (!isNaN(pId)) {
      map[uId].push(pId);
    }
  });
  
  // Ensure unique IDs in each list
  Object.keys(map).forEach(key => {
    map[key] = [...new Set(map[key])];
  });
  
  return map;
}

function updateSelections(ss, payload) {
  let sheet = ss.getSheetByName('UserPostSelections');
  if (!sheet) {
    sheet = ss.insertSheet('UserPostSelections');
    sheet.appendRow(['User_ID', 'Post_ID']);
  }
  
  const rawUid = payload.User_ID.toString().trim();
  const userId = rawUid.includes('.') ? Math.floor(parseFloat(rawUid)).toString() : rawUid;
  const postIds = payload.Post_IDs;
  
  const vals = sheet.getDataRange().getValues();
  // Clean existing mappings
  for (let i = vals.length - 1; i >= 1; i--) {
    const rowUid = vals[i][0].toString().trim();
    const cleanRowUid = rowUid.includes('.') ? Math.floor(parseFloat(rowUid)).toString() : rowUid;
    if (cleanRowUid == userId) {
      sheet.deleteRow(i + 1);
    }
  }
  
  // Re-insert mappings as individual rows for maximum compatibility
  if (Array.isArray(postIds)) {
    postIds.forEach(pId => {
      const cleanPid = Math.floor(Number(pId));
      if (!isNaN(cleanPid)) {
        sheet.appendRow([parseInt(userId), cleanPid]);
      }
    });
  }
}
```
