# Google Sheets Update Script

This script allows you to update Google Sheets data programmatically using the Google Sheets API.

## Prerequisites

1. **Install dependencies:**
   ```bash
   npm install googleapis
   ```

2. **Set up environment variables:**
   ```env
   # Your Google Sheet URL with GID
   APPROVED_USERS_SHEET_URL=https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/edit#gid=YOUR_GID
   APPROVED_USERS_SHEET_GID=YOUR_GID

   # Google API credentials (service account recommended)
   GDRIVE_CREDENTIALS={"type":"service_account","project_id":"...","private_key_id":"..."}
   
   # OR OAuth2 credentials (requires additional token management)
   GOOGLE_CLIENT_ID=your_client_id
   GOOGLE_CLIENT_SECRET=your_client_secret
   ```

## Usage

### Command Line Interface

#### Update M3 and N3 specifically:
```bash
node updateSheets.js m3n3 "Status" "Active"
node updateSheets.js m3n3 "Updated Value" "2024-10-27"
```

#### Update individual cells:
```bash
node updateSheets.js cell M3 "New Status"
node updateSheets.js cell N3 "New Value"
node updateSheets.js cell A1 "Updated Title"
```

#### Update a range of cells:
```bash
node updateSheets.js range M3:N4 '[["Header 1","Header 2"],["Value 1","Value 2"]]'
node updateSheets.js range A1:C1 '[["Name","Email","Status"]]'
```

#### Append new row:
```bash
node updateSheets.js append '["New User","user@example.com","Active","2024"]'
```

#### Cache management:
```bash
node updateSheets.js cache    # Show cache status
node updateSheets.js clear    # Clear cache
```

#### Using specific sheet GID:
```bash
node updateSheets.js m3n3 "Status" "Active" "123456789"
node updateSheets.js cell M3 "Value" "987654321"
```

### Programmatic Usage

```javascript
const SheetsUpdater = require('./updateSheets');

async function updateData() {
  const updater = new SheetsUpdater();

  try {
    // Update M3 and N3
    await updater.updateM3N3('Status', 'Active');

    // Update single cell
    await updater.updateCell('M3', 'Updated Value');

    // Update range
    await updater.updateRange('M3:N4', [
      ['Header 1', 'Header 2'],
      ['Value 1', 'Value 2']
    ]);

    // Append new row
    await updater.appendRow(['New User', 'email@example.com', 'Active']);

  } catch (error) {
    console.error('Error:', error.message);
  }
}

updateData();
```

## API Reference

### SheetsUpdater Methods

- `updateM3N3(m3Value, n3Value, gid?)` - Update cells M3 and N3
- `updateCell(cell, value, gid?)` - Update a single cell
- `updateRange(range, values, gid?)` - Update a range of cells
- `appendRow(rowData, gid?)` - Append a new row
- `getCacheInfo()` - Get cache status
- `clearCache()` - Clear cached data

### Parameters

- `cell`: Cell reference in A1 notation (e.g., 'M3', 'A1')
- `range`: Range in A1 notation (e.g., 'M3:N4', 'A1:C10')
- `values`: 2D array for ranges, 1D array for rows
- `gid`: Optional sheet GID (uses default from env if not provided)

## Examples

### Update specific cells for tracking:
```bash
# Update status tracking cells
node updateSheets.js m3n3 "Last Updated" "2024-10-27 15:30"
node updateSheets.js m3n3 "Total Users" "150"
```

### Update header information:
```bash
# Update report headers
node updateSheets.js range M1:N2 '[["Report Date","Status"],["2024-10-27","Generated"]]'
```

### Track changes:
```bash
# Add timestamp and user info
node updateSheets.js cell M3 "$(date)"
node updateSheets.js cell N3 "Auto-updated"
```

## Error Handling

The script includes comprehensive error handling:
- Invalid credentials
- Network timeouts
- Invalid ranges or cell references
- Missing permissions
- Sheet not found

## Permissions Required

Your Google service account needs:
- `https://www.googleapis.com/auth/spreadsheets` scope
- Edit access to the target Google Sheet

## Troubleshooting

1. **Authentication Error**: Check GDRIVE_CREDENTIALS format and permissions
2. **Sheet Not Found**: Verify APPROVED_USERS_SHEET_URL and GID
3. **Range Error**: Use proper A1 notation (e.g., 'M3:N3', not 'M3-N3')
4. **Permission Denied**: Ensure service account has edit access to the sheet