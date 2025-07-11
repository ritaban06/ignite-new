const axios = require('axios');

/**
 * Google Sheets Service for reading approved users data
 * 
 * MULTIPLE SHEETS SUPPORT:
 * 
 * 1. Reading from a specific sheet in a workbook:
 *    - Method 1: Add GID to your sheet URL in environment variable
 *      APPROVED_USERS_SHEET_URL=https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/edit#gid=123456789
 *    
 *    - Method 2: Set the GID separately
 *      APPROVED_USERS_SHEET_URL=https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/edit
 *      APPROVED_USERS_SHEET_GID=123456789
 * 
 * 2. How to find a sheet's GID:
 *    - Open your Google Sheets workbook
 *    - Click on the sheet tab you want to use
 *    - Look at the URL in your browser - it will show: #gid=123456789
 *    - The number after gid= is your sheet ID
 * 
 * 3. Programmatically fetch from different sheets:
 *    - Use fetchFromSpecificSheet(workbookUrl, gid) method
 *    - Example: googleSheetsService.fetchFromSpecificSheet(baseUrl, '123456789')
 * 
 * If no GID is specified, it will read from the first sheet in the workbook.
 */

class GoogleSheetsService {
  constructor() {
    this.sheetsData = null;
    this.lastFetch = null;
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes cache
    this.approvedUsersSheetUrl = process.env.APPROVED_USERS_SHEET_URL;
    this.approvedUsersSheetGid = process.env.APPROVED_USERS_SHEET_GID; // Optional: specific sheet GID
  }

  // Function to fetch data from public Google Sheet
  async fetchApprovedUsers() {
    try {
      if (!this.approvedUsersSheetUrl) {
        throw new Error('APPROVED_USERS_SHEET_URL environment variable is not set');
      }

      // Use specific sheet GID if provided, otherwise use default sheet
      let sheetUrl = this.approvedUsersSheetUrl;
      if (this.approvedUsersSheetGid) {
        // Add GID to URL if not already present
        if (!sheetUrl.includes('gid=')) {
          const separator = sheetUrl.includes('#') ? '&' : '#';
          sheetUrl = `${sheetUrl}${separator}gid=${this.approvedUsersSheetGid}`;
        }
      }

      // Convert Google Sheets URL to CSV export URL
      const csvUrl = this.convertToCSVUrl(sheetUrl);
      
      const response = await axios.get(csvUrl, {
        timeout: 10000, // 10 second timeout
        headers: {
          'User-Agent': 'Ignite-App/1.0'
        }
      });
      
      const users = this.parseCSV(response.data);
      
      this.sheetsData = users;
      this.lastFetch = Date.now();
      
      return users;
    } catch (error) {
      console.error('Error fetching approved users:', error.message);
      throw new Error('Unable to fetch approved users list. Please contact administrator.');
    }
  }

  // Convert Google Sheets URL to CSV export URL
  convertToCSVUrl(sheetUrl) {
    // Extract the sheet ID and optional gid from various Google Sheets URL formats
    let sheetId;
    let gid = null;
    
    // Handle different URL formats
    const patterns = [
      /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/,
      /\/d\/([a-zA-Z0-9-_]+)/,
      /id=([a-zA-Z0-9-_]+)/
    ];
    
    for (const pattern of patterns) {
      const match = sheetUrl.match(pattern);
      if (match) {
        sheetId = match[1];
        break;
      }
    }
    
    // Extract gid (sheet ID) if present in URL
    const gidMatch = sheetUrl.match(/[#&]gid=([0-9]+)/);
    if (gidMatch) {
      gid = gidMatch[1];
    }
    
    if (!sheetId) {
      throw new Error('Invalid Google Sheets URL format');
    }
    
    // Return CSV export URL with optional gid parameter
    let csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
    if (gid) {
      csvUrl += `&gid=${gid}`;
    }
    
    return csvUrl;
  }

  // Parse CSV text into array of user objects
  parseCSV(csvText) {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      throw new Error('Invalid sheet format - no data found');
    }
    
    // Get headers from first row and normalize them
    const rawHeaders = lines[0]
    .replace(/^\uFEFF/, '') // remove BOM
    .split(',')
    .map(header => header.trim().replace(/"/g, ''));
    
    // Create header mapping from new format to expected format
    const headerMapping = {
      'Registration ID': 'registrationId',
      'Student Name': 'name',
      'Email': 'email',
      'Event Name': 'eventName',
      'Payment Status': 'paymentStatus',
      'Payment ID': 'paymentId',
      'Payment Type': 'paymentType',
      'Payment Date': 'paymentDate',
      'Amount (₹)': 'amount',
      'Team Name': 'teamName',
      'Team UID': 'teamUid',
      'Team Role': 'teamRole',
      'Year': 'year',
      'Department': 'department'
    };
    
    // Map headers to normalized field names
    const headers = rawHeaders.map(header => headerMapping[header] || header.toLowerCase());
    
    // Validate required headers (using normalized names)
    const requiredHeaders = ['email', 'name', 'year', 'department'];
    console.log('Raw Headers:', rawHeaders);
    console.log('Normalized Headers:', headers);
    const missingHeaders = requiredHeaders.filter(header => !headers.includes(header));
    
    if (missingHeaders.length > 0) {
      throw new Error(`Missing required columns: ${missingHeaders.join(', ')}`);
    }
    
    // Parse data rows
    const users = [];
    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i]);
      
      if (values.length !== headers.length) {
        continue; // Skip malformed rows
      }
      
      const user = {};
      headers.forEach((header, index) => {
        user[header] = values[index];
      });
      
      // Only add users with valid email
      if (user.email && user.email.includes('@')) {
        const userRecord = {
          // Core required fields
          email: user.email.toLowerCase().trim(),
          name: user.name?.trim(),
          year: user.year?.trim(),
          department: user.department?.trim(),
          
          // Additional fields from new header format
          registrationId: user.registrationId?.trim(),
          eventName: user.eventName?.trim(),
          paymentStatus: user.paymentStatus?.trim(),
          paymentId: user.paymentId?.trim(),
          paymentType: user.paymentType?.trim(),
          paymentDate: user.paymentDate?.trim(),
          amount: user.amount?.trim(),
          teamName: user.teamName?.trim(),
          teamUid: user.teamUid?.trim(),
          teamRole: user.teamRole?.trim()
        };
        
        users.push(userRecord);
      }
    }
    
    return users;
  }

  // Parse a single CSV line, handling quoted values
  parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result;
  }

  // Check if user is approved based on email
  async isUserApproved(email) {
    try {
      // Check cache first
      if (this.sheetsData && this.lastFetch && 
          (Date.now() - this.lastFetch) < this.cacheTimeout) {
        return this.findUserInData(email.toLowerCase().trim(), this.sheetsData);
      }
      
      // Fetch fresh data
      const users = await this.fetchApprovedUsers();
      return this.findUserInData(email.toLowerCase().trim(), users);
    } catch (error) {
      console.error('Error checking user approval:', error.message);
      throw error;
    }
  }

  // Find user in the data array
  findUserInData(email, users) {
    const user = users.find(user => user.email === email);
    
    if (user) {
      return {
        approved: true,
        userData: user
      };
    }
    
    return {
      approved: false,
      userData: null
    };
  }

  // Clear cache
  clearCache() {
    this.sheetsData = null;
    this.lastFetch = null;
  }

  // Get cache status
  getCacheStatus() {
    return {
      cached: !!this.sheetsData,
      lastFetch: this.lastFetch,
      cacheAge: this.lastFetch ? Date.now() - this.lastFetch : null,
      usersCount: this.sheetsData ? this.sheetsData.length : 0
    };
  }

  // Function to fetch data from a specific sheet by GID
  async fetchFromSpecificSheet(workbookUrl, gid) {
    try {
      if (!workbookUrl) {
        throw new Error('APPROVED_USERS_SHEET_URL environment variable is not set');
      }

      // Create URL for specific sheet
      const sheetUrl = gid ? `${workbookUrl}&gid=${gid}` : workbookUrl;
      
      // Convert to CSV export URL
      const csvUrl = this.convertToCSVUrl(sheetUrl);
      
      const response = await axios.get(csvUrl, {
        timeout: 10000, // 10 second timeout
        headers: {
          'User-Agent': 'Ignite-App/1.0'
        }
      });
      
      const users = this.parseCSV(response.data);
      
      this.sheetsData = users;
      this.lastFetch = Date.now();
      
      return users;
    } catch (error) {
      console.error(`Error fetching from sheet ${gid}:`, error.message);
      throw new Error(`Unable to fetch approved users from sheet ${gid}. Please contact administrator.`);
    }
  }
}

module.exports = new GoogleSheetsService();
