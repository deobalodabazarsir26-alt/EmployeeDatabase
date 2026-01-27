
# Employee Management System (EMS)

## 🛠️ Google Apps Script (Backend)
Copy and paste this code into your **Google Apps Script** editor (**Extensions > Apps Script**) and deploy it as a **Web App** (Set access to "Anyone").

```javascript
// MASTER CRUD SCRIPT FOR EMS
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
    const payload = request.payload;
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    let result = { status: 'success' };

    if (action.startsWith('upsert')) {
      const sheetName = action.replace('upsert', '');
      upsertRow(ss, sheetName === 'Branch' ? 'Bank_Branch' : sheetName, payload);
    } 
    else if (action.startsWith('delete')) {
      const sheetName = action.replace('delete', '');
      const actualSheetName = sheetName === 'Branch' ? 'Bank_Branch' : sheetName;
      const idKey = Object.keys(payload)[0];
      deleteRow(ss, actualSheetName, idKey, payload[idKey]);
    }
    else if (action === 'updateUserPostSelections') {
      updateSelections(ss, payload);
    }
    else if (action === 'batchUpsertBranches') {
      payload.forEach(item => upsertRow(ss, 'Bank_Branch', item));
    }

    return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

// --- HELPER FUNCTIONS ---

function getSheetData(ss, name) {
  const sheet = ss.getSheetByName(name);
  if (!sheet) return [];
  const vals = sheet.getDataRange().getValues();
  const headers = vals.shift();
  return vals.map(row => {
    let obj = {};
    headers.forEach((h, i) => obj[h] = row[i]);
    return obj;
  });
}

function upsertRow(ss, sheetName, data) {
  const sheet = ss.getSheetByName(sheetName);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const idKey = headers[0];
  const idValue = data[idKey];
  
  const vals = sheet.getDataRange().getValues();
  let rowIndex = -1;
  for (let i = 1; i < vals.length; i++) {
    if (vals[i][0] == idValue) { rowIndex = i + 1; break; }
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
  if (!sheet) throw new Error("Sheet " + sheetName + " not found");
  const vals = sheet.getDataRange().getValues();
  for (let i = 1; i < vals.length; i++) {
    // Loose equality check to handle string/number comparison
    if (vals[i][0] == idValue) {
      sheet.deleteRow(i + 1);
      return;
    }
  }
  throw new Error("Record with ID " + idValue + " not found in " + sheetName);
}

function getSelectionData(ss) {
  const sheet = ss.getSheetByName('UserPostSelections');
  if (!sheet) return {};
  const vals = sheet.getDataRange().getValues();
  vals.shift();
  const map = {};
  vals.forEach(r => {
    const uId = r[0];
    const pId = r[1];
    if (!map[uId]) map[uId] = [];
    map[uId].push(pId);
  });
  return map;
}

function updateSelections(ss, payload) {
  const sheet = ss.getSheetByName('UserPostSelections');
  const userId = payload.User_ID;
  const postIds = payload.Post_IDs;
  
  const vals = sheet.getDataRange().getValues();
  for (let i = vals.length - 1; i >= 1; i--) {
    if (vals[i][0] == userId) sheet.deleteRow(i + 1);
  }
  postIds.forEach(pId => sheet.appendRow([userId, pId]));
}
```

### Automatic IFSC Lookup Functions
(Include the `FETCH_IFSC_BRANCH` and `FETCH_IFSC_BANK` code here as previously provided...)
