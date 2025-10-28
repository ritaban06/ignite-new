// Load environment variables
require('dotenv').config({ path: '../.env' });

const googleSheetsService = require('../services/googleSheetsService');

/**
 * Script to update Google Sheets data
 * Specifically designed to update cells M3 and N3
 */

class SheetsUpdater {
  constructor() {
    this.sheetsService = googleSheetsService;
  }

  /**
   * Update a range of cells with provided values
   * @param {string} range - Range in A1 notation (e.g., 'M3:N3', 'A1:C5')
   * @param {Array[]} values - 2D array of values matching the range dimensions
   * @param {string} gid - Optional sheet GID, uses default if not provided
   */
  async updateRangeValues(range, values, gid = null) {
    try {
      console.log(`Updating range ${range}...`);
      console.log('Values:', values);

      const result = await this.sheetsService.updateSheetData(range, values, gid);
      
      console.log(`✅ Successfully updated range ${range}`);
      console.log(`Updated ${result.updatedCells} cells`);
      
      return result;
    } catch (error) {
      console.error(`❌ Error updating range ${range}:`, error.message);
      throw error;
    }
  }

  /**
   * Update specific cells M3 and N3 (legacy method for backward compatibility)
   * @param {string} m3Value - Value for cell M3
   * @param {string} n3Value - Value for cell N3
   * @param {string} gid - Optional sheet GID, uses default if not provided
   */
  async updateM3N3(m3Value, n3Value, gid = null) {
    return this.updateRangeValues('M3:N3', [[m3Value, n3Value]], gid);
  }

  /**
   * Update individual cell
   * @param {string} cell - Cell reference (e.g., 'M3', 'N3')
   * @param {string} value - Value to set
   * @param {string} gid - Optional sheet GID
   */
  async updateCell(cell, value, gid = null) {
    try {
      console.log(`Updating cell ${cell} with value: ${value}`);

      const range = `${cell}:${cell}`;
      const values = [[value]];

      const result = await this.sheetsService.updateSheetData(range, values, gid);
      
      console.log(`✅ Successfully updated cell ${cell}`);
      
      return result;
    } catch (error) {
      console.error(`❌ Error updating cell ${cell}:`, error.message);
      throw error;
    }
  }

  /**
   * Update a range of cells
   * @param {string} range - Range in A1 notation (e.g., 'A1:C3')
   * @param {Array[]} values - 2D array of values
   * @param {string} gid - Optional sheet GID
   */
  async updateRange(range, values, gid = null) {
    try {
      console.log(`Updating range ${range}...`);
      console.log('Values:', values);

      const result = await this.sheetsService.updateSheetData(range, values, gid);
      
      console.log(`✅ Successfully updated range ${range}`);
      console.log(`Updated ${result.updatedCells} cells`);
      
      return result;
    } catch (error) {
      console.error(`❌ Error updating range ${range}:`, error.message);
      throw error;
    }
  }

  /**
   * Append new row to the sheet
   * @param {Array} rowData - Array of values for the new row
   * @param {string} gid - Optional sheet GID
   */
  async appendRow(rowData, gid = null) {
    try {
      console.log('Appending new row...');
      console.log('Row data:', rowData);

      const result = await this.sheetsService.appendSheetData([rowData], gid);
      
      console.log('✅ Successfully appended new row');
      
      return result;
    } catch (error) {
      console.error('❌ Error appending row:', error.message);
      throw error;
    }
  }

  /**
   * Get current cache status
   */
  getCacheInfo() {
    return this.sheetsService.getCacheStatus();
  }

  /**
   * Clear cache to force fresh data fetch
   */
  clearCache() {
    this.sheetsService.clearCache();
    console.log('✅ Cache cleared');
  }

  /**
   * Generate and update a large range with similar/patterned values
   * @param {string} range - Range in A1 notation (e.g., 'A3:O529')
   * @param {string|Function} valuePattern - Either a single value or a function that generates values
   * @param {string} gid - Optional sheet GID
   */
  async updateLargeRange(range, valuePattern, gid = null) {
    try {
      console.log(`Generating data for large range ${range}...`);
      
      // Parse the range to determine dimensions
      const [start, end] = range.split(':');
      const startCol = start.match(/[A-Z]+/)[0];
      const startRow = parseInt(start.match(/\d+/)[0]);
      const endCol = end.match(/[A-Z]+/)[0];
      const endRow = parseInt(end.match(/\d+/)[0]);
      
      // Convert column letters to numbers
      const colToNum = (col) => {
        let result = 0;
        for (let i = 0; i < col.length; i++) {
          result = result * 26 + (col.charCodeAt(i) - 64);
        }
        return result;
      };
      
      const startColNum = colToNum(startCol);
      const endColNum = colToNum(endCol);
      const numCols = endColNum - startColNum + 1;
      const numRows = endRow - startRow + 1;
      
      console.log(`Range dimensions: ${numRows} rows × ${numCols} columns = ${numRows * numCols} cells`);
      
      // Generate the 2D array of values
      const values = [];
      
      for (let row = 0; row < numRows; row++) {
        const rowData = [];
        for (let col = 0; col < numCols; col++) {
          if (typeof valuePattern === 'function') {
            // Use function to generate value based on position
            rowData.push(valuePattern(row + startRow, col + startColNum, row, col));
          } else {
            // Use static value
            rowData.push(valuePattern);
          }
        }
        values.push(rowData);
      }
      
      console.log('Sample of generated data (first 3 rows):');
      values.slice(0, 3).forEach((row, idx) => {
        console.log(`Row ${idx + startRow}:`, row.slice(0, Math.min(5, row.length)), row.length > 5 ? '...' : '');
      });
      
      const result = await this.sheetsService.updateSheetData(range, values, gid);
      
      console.log(`✅ Successfully updated large range ${range}`);
      console.log(`Updated ${result.updatedCells} cells`);
      
      return result;
    } catch (error) {
      console.error(`❌ Error updating large range ${range}:`, error.message);
      throw error;
    }
  }
}

// CLI functionality
async function main() {
  const updater = new SheetsUpdater();
  
  // Parse command line arguments
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`
📊 Google Sheets Updater Script

Usage:
  node updateSheets.js <command> [arguments]

Commands:
  m3n3 <m3_value> <n3_value> [gid]         Update M3 and N3 cells (legacy)
  cell <cell> <value> [gid]                Update single cell
  range <range> <values_json> [gid]        Update range of cells
  update-range <range> <values_json> [gid] Update range of cells (alias)
  large-range <range> <pattern> [gid]      Update large range with pattern
  append <row_data_json> [gid]             Append new row
  cache                                    Show cache info
  clear                                    Clear cache
  help                                     Show this help message

Examples:
  # Single row range update
  node updateSheets.js range M3:N3 '[["Status","Active"]]'
  
  # Multiple row range update
  node updateSheets.js range A1:C3 '[["Name","Age","City"],["John","25","NYC"],["Jane","30","LA"]]'
  
  # Single cell update
  node updateSheets.js cell M3 "Updated Value"
  
  # Large range with same value
  node updateSheets.js large-range A3:O529 "DefaultValue"
  
  # Large range with pattern (row numbers)
  node updateSheets.js large-range A3:O529 "ROW_NUM"
        `);
    return;
  }

  const command = args[0];
  
  try {
    switch (command) {
      case 'm3n3':
        if (args.length < 3) {
          throw new Error('M3 and N3 values are required');
        }
        await updater.updateM3N3(args[1], args[2], args[3]);
        break;

      case 'cell':
        if (args.length < 3) {
          throw new Error('Cell and value are required');
        }
        await updater.updateCell(args[1], args[2], args[3]);
        break;

      case 'range':
        if (args.length < 3) {
          throw new Error('Range and values JSON are required');
        }
        const values = JSON.parse(args[2]);
        await updater.updateRangeValues(args[1], values, args[3]);
        break;

      case 'update-range':
        // Alias for 'range' command for clarity
        if (args.length < 3) {
          throw new Error('Range and values JSON are required');
        }
        const rangeValues = JSON.parse(args[2]);
        await updater.updateRangeValues(args[1], rangeValues, args[3]);
        break;

      case 'large-range':
        if (args.length < 3) {
          throw new Error('Range and pattern are required');
        }
        let pattern = args[2];
        
        // Handle special patterns
        if (pattern === 'ROW_NUM') {
          pattern = (absoluteRow, absoluteCol, relativeRow, relativeCol) => `Row${absoluteRow}`;
        } else if (pattern === 'COL_NUM') {
          pattern = (absoluteRow, absoluteCol, relativeRow, relativeCol) => `Col${absoluteCol}`;
        } else if (pattern === 'COORD') {
          pattern = (absoluteRow, absoluteCol, relativeRow, relativeCol) => `${String.fromCharCode(64 + absoluteCol)}${absoluteRow}`;
        } else if (pattern === 'INDEX') {
          pattern = (absoluteRow, absoluteCol, relativeRow, relativeCol) => relativeRow * 15 + relativeCol + 1;
        }
        
        await updater.updateLargeRange(args[1], pattern, args[3]);
        break;

      case 'append':
        if (args.length < 2) {
          throw new Error('Row data JSON is required');
        }
        const rowData = JSON.parse(args[1]);
        await updater.appendRow(rowData, args[2]);
        break;

      case 'cache':
        console.log('Cache Status:', updater.getCacheInfo());
        break;

      case 'clear':
        updater.clearCache();
        break;

      default:
        throw new Error(`Unknown command: ${command}`);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Export for use as module
module.exports = SheetsUpdater;

// Run CLI if this file is executed directly
if (require.main === module) {
  main();
}
//  Usage:
//       node updateSheets.js m3n3 <m3_value> <n3_value> [gid]         # Update M3 and N3 (legacy)
//       node updateSheets.js cell <cell> <value> [gid]                # Update single cell
//       node updateSheets.js range <range> <values_json> [gid]        # Update range of cells
//       node updateSheets.js update-range <range> <values_json> [gid] # Update range of cells (alias)
//       node updateSheets.js append <row_data_json> [gid]             # Append row
//       node updateSheets.js cache                                    # Show cache info
//       node updateSheets.js clear                                    # Clear cache
    
//     Examples:
//       # Legacy M3/N3 update
//       node updateSheets.js m3n3 "Status" "Active"
//       
//       # Single cell update
//       node updateSheets.js cell M3 "Updated Value"
//       
//       # Range updates (single row)
//       node updateSheets.js range M3:N3 '[["Status","Active"]]'
//       node updateSheets.js range A1:E1 '[["Name","Email","Age","City","Status"]]'
//       
//       # Range updates (multiple rows)
//       node updateSheets.js range A1:C3 '[["Name","Age","City"],["John","25","NYC"],["Jane","30","LA"]]'
//       node updateSheets.js range M3:N5 '[["Status","Date"],["Active","2024-10-27"],["Pending","2024-10-28"]]'
//       
//       # Append new row
//       node updateSheets.js append '["New User","email@example.com","2024"]'
