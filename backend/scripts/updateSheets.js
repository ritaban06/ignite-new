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
   * Update specific cells M3 and N3
   * @param {string} m3Value - Value for cell M3
   * @param {string} n3Value - Value for cell N3
   * @param {string} gid - Optional sheet GID, uses default if not provided
   */
  async updateM3N3(m3Value, n3Value, gid = null) {
    try {
      console.log('Updating cells M3 and N3...');
      console.log(`M3: ${m3Value}`);
      console.log(`N3: ${n3Value}`);

      // Update M3 and N3 in a single operation
      const range = 'M3:N3';
      const values = [[m3Value, n3Value]];

      const result = await this.sheetsService.updateSheetData(range, values, gid);
      
      console.log('✅ Successfully updated cells M3 and N3');
      console.log(`Updated ${result.updatedCells} cells`);
      
      return result;
    } catch (error) {
      console.error('❌ Error updating M3 and N3:', error.message);
      throw error;
    }
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
}

// CLI functionality
async function main() {
  const updater = new SheetsUpdater();
  
  // Parse command line arguments
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`
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
        await updater.updateRange(args[1], values, args[3]);
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
//       node updateSheets.js m3n3 <m3_value> <n3_value> [gid]     # Update M3 and N3
//       node updateSheets.js cell <cell> <value> [gid]            # Update single cell
//       node updateSheets.js range <range> <values_json> [gid]    # Update range
//       node updateSheets.js append <row_data_json> [gid]         # Append row
//       node updateSheets.js cache                                # Show cache info
//       node updateSheets.js clear                                # Clear cache
    
//     Examples:
//       node updateSheets.js m3n3 "Status" "Active"
//       node updateSheets.js cell M3 "Updated Value"
//       node updateSheets.js range A1:B2 '[["Name","Age"],["John","25"]]'
//       node updateSheets.js append '["New User","email@example.com","2024"]'
