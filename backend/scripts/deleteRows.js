// Load environment variables
require('dotenv').config({ path: '../.env' });

const { google } = require('googleapis');

/**
 * Script to delete rows from Google Sheets
 * Supports deleting single rows or multiple rows in a range
 */

class SheetsRowDeleter {
  constructor() {
    this.approvedUsersSheetUrl = process.env.APPROVED_USERS_SHEET_URL;
    this.approvedUsersSheetGid = process.env.APPROVED_USERS_SHEET_GID;
    
    // Google API credentials
    this.googleCredentials = process.env.GDRIVE_CREDENTIALS ? JSON.parse(process.env.GDRIVE_CREDENTIALS) : null;
    this.googleClientId = process.env.GOOGLE_CLIENT_ID;
    this.googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
  }

  /**
   * Get authenticated Google Sheets API client
   */
  async getAuthenticatedSheetsClient() {
    try {
      let auth;
      
      if (this.googleCredentials) {
        // Using service account credentials
        auth = new google.auth.GoogleAuth({
          credentials: this.googleCredentials,
          scopes: ['https://www.googleapis.com/auth/spreadsheets']
        });
      } else if (this.googleClientId && this.googleClientSecret) {
        // Using OAuth2 (you'd need to implement token refresh logic)
        const oauth2Client = new google.auth.OAuth2(
          this.googleClientId,
          this.googleClientSecret,
          'urn:ietf:wg:oauth:2.0:oob'
        );
        
        auth = oauth2Client;
      } else {
        throw new Error('No valid Google credentials found. Please set GDRIVE_CREDENTIALS or GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET');
      }

      return google.sheets({ version: 'v4', auth });
    } catch (error) {
      console.error('Error creating authenticated client:', error);
      throw error;
    }
  }

  /**
   * Extract spreadsheet ID from URL
   */
  extractSpreadsheetId(url) {
    const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : null;
  }

  /**
   * Get sheet ID by GID
   */
  async getSheetIdByGid(spreadsheetId, gid) {
    try {
      const sheets = await this.getAuthenticatedSheetsClient();
      
      const response = await sheets.spreadsheets.get({
        spreadsheetId: spreadsheetId
      });

      if (gid) {
        const sheet = response.data.sheets.find(sheet => 
          sheet.properties.sheetId.toString() === gid.toString()
        );
        return sheet ? sheet.properties.sheetId : 0;
      } else {
        // Return the first sheet ID if no GID specified
        return response.data.sheets[0].properties.sheetId;
      }
    } catch (error) {
      console.error('Error getting sheet ID:', error);
      throw new Error(`Failed to get sheet ID: ${error.message}`);
    }
  }

  /**
   * Delete a single row
   * @param {number} rowIndex - Row index to delete (0-based)
   * @param {string} gid - Optional sheet GID
   */
  async deleteRow(rowIndex, gid = null) {
    try {
      console.log(`Deleting row at index ${rowIndex} (row ${rowIndex + 1})...`);
      
      const spreadsheetId = this.extractSpreadsheetId(this.approvedUsersSheetUrl);
      if (!spreadsheetId) {
        throw new Error('Invalid spreadsheet URL');
      }

      const targetGid = gid || this.approvedUsersSheetGid;
      const sheetId = await this.getSheetIdByGid(spreadsheetId, targetGid);

      const sheets = await this.getAuthenticatedSheetsClient();

      const request = {
        spreadsheetId: spreadsheetId,
        resource: {
          requests: [{
            deleteDimension: {
              range: {
                sheetId: sheetId,
                dimension: 'ROWS',
                startIndex: rowIndex,
                endIndex: rowIndex + 1
              }
            }
          }]
        }
      };

      const response = await sheets.spreadsheets.batchUpdate(request);
      
      console.log(`✅ Successfully deleted row ${rowIndex + 1}`);
      return {
        success: true,
        deletedRows: 1,
        response: response.data
      };
    } catch (error) {
      console.error(`❌ Error deleting row ${rowIndex + 1}:`, error.message);
      throw error;
    }
  }

  /**
   * Delete multiple rows in a range
   * @param {number} startRow - Starting row index (0-based)
   * @param {number} endRow - Ending row index (0-based, exclusive)
   * @param {string} gid - Optional sheet GID
   */
  async deleteRows(startRow, endRow, gid = null) {
    try {
      console.log(`Deleting rows ${startRow + 1} to ${endRow} (${endRow - startRow} rows)...`);
      
      const spreadsheetId = this.extractSpreadsheetId(this.approvedUsersSheetUrl);
      if (!spreadsheetId) {
        throw new Error('Invalid spreadsheet URL');
      }

      const targetGid = gid || this.approvedUsersSheetGid;
      const sheetId = await this.getSheetIdByGid(spreadsheetId, targetGid);

      const sheets = await this.getAuthenticatedSheetsClient();

      const request = {
        spreadsheetId: spreadsheetId,
        resource: {
          requests: [{
            deleteDimension: {
              range: {
                sheetId: sheetId,
                dimension: 'ROWS',
                startIndex: startRow,
                endIndex: endRow
              }
            }
          }]
        }
      };

      const response = await sheets.spreadsheets.batchUpdate(request);
      
      const deletedCount = endRow - startRow;
      console.log(`✅ Successfully deleted ${deletedCount} rows (${startRow + 1} to ${endRow})`);
      
      return {
        success: true,
        deletedRows: deletedCount,
        response: response.data
      };
    } catch (error) {
      console.error(`❌ Error deleting rows ${startRow + 1} to ${endRow}:`, error.message);
      throw error;
    }
  }

  /**
   * Delete rows by row numbers (1-based)
   * @param {number|Array} rowNumbers - Single row number or array of row numbers (1-based)
   * @param {string} gid - Optional sheet GID
   */
  async deleteRowsByNumbers(rowNumbers, gid = null) {
    try {
      const rows = Array.isArray(rowNumbers) ? rowNumbers : [rowNumbers];
      
      // Convert to 0-based and sort in descending order to avoid index shifting
      const sortedRows = rows
        .map(row => row - 1)
        .sort((a, b) => b - a);

      console.log(`Deleting ${rows.length} row(s): ${rows.join(', ')}...`);
      
      const spreadsheetId = this.extractSpreadsheetId(this.approvedUsersSheetUrl);
      if (!spreadsheetId) {
        throw new Error('Invalid spreadsheet URL');
      }

      const targetGid = gid || this.approvedUsersSheetGid;
      const sheetId = await this.getSheetIdByGid(spreadsheetId, targetGid);

      const sheets = await this.getAuthenticatedSheetsClient();

      // Create delete requests for each row
      const requests = sortedRows.map(rowIndex => ({
        deleteDimension: {
          range: {
            sheetId: sheetId,
            dimension: 'ROWS',
            startIndex: rowIndex,
            endIndex: rowIndex + 1
          }
        }
      }));

      const request = {
        spreadsheetId: spreadsheetId,
        resource: { requests }
      };

      const response = await sheets.spreadsheets.batchUpdate(request);
      
      console.log(`✅ Successfully deleted ${rows.length} row(s): ${rows.join(', ')}`);
      
      return {
        success: true,
        deletedRows: rows.length,
        response: response.data
      };
    } catch (error) {
      console.error(`❌ Error deleting rows:`, error.message);
      throw error;
    }
  }

  /**
   * Delete range of rows (1-based)
   * @param {string} range - Range in format "5" (single row), "5:8" (range), or "5,7,9" (multiple rows)
   * @param {string} gid - Optional sheet GID
   */
  async deleteRowRange(range, gid = null) {
    try {
      if (range.includes(',')) {
        // Multiple specific rows: "5,7,9"
        const rowNumbers = range.split(',').map(num => parseInt(num.trim()));
        return await this.deleteRowsByNumbers(rowNumbers, gid);
      } else if (range.includes(':')) {
        // Row range: "5:8"
        const [start, end] = range.split(':').map(num => parseInt(num.trim()));
        return await this.deleteRows(start - 1, end, gid); // Convert to 0-based
      } else {
        // Single row: "5"
        const rowNumber = parseInt(range);
        return await this.deleteRow(rowNumber - 1, gid); // Convert to 0-based
      }
    } catch (error) {
      console.error(`❌ Error parsing range "${range}":`, error.message);
      throw error;
    }
  }
}

// CLI functionality
async function main() {
  const deleter = new SheetsRowDeleter();
  
  // Parse command line arguments
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`
        `);
        return;
    }

  const range = args[0];
  const gid = args[1] || null;
  
  try {
    // Confirmation prompt for safety
    console.log(`⚠️  WARNING: You are about to delete row(s) ${range}`);
    if (gid) {
      console.log(`   Sheet GID: ${gid}`);
    }
    console.log('   This action cannot be undone!');
    
    // In a production environment, you might want to add a confirmation prompt
    // For now, we'll proceed directly
    
    await deleter.deleteRowRange(range, gid);
    
    console.log('\n🎉 Row deletion completed successfully!');
} catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Export for use as module
module.exports = SheetsRowDeleter;

// Run CLI if this file is executed directly
if (require.main === module) {
  main();
}

// Usage:
//   node deleteRows.js <range> [gid]

// Range formats:
//   5          # Delete row 5
//   5:8        # Delete rows 5 to 8 (inclusive)
//   5,7,9      # Delete rows 5, 7, and 9

// Examples:
//   node deleteRows.js 5                    # Delete row 5
//   node deleteRows.js 5:8                  # Delete rows 5-8
//   node deleteRows.js 5,7,9                # Delete rows 5, 7, and 9
//   node deleteRows.js 10 123456789         # Delete row 10 from sheet with GID 123456789

// Notes:
//   - Row numbers are 1-based (row 1 is the first row)
//   - GID is optional; uses default sheet if not provided
//   - Be careful with row deletions as they cannot be undone!
