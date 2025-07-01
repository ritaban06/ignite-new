const axios = require('axios');

class GoogleSheetsService {
  constructor() {
    this.sheetsData = null;
    this.lastFetch = null;
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes cache
    this.approvedUsersSheetUrl = process.env.APPROVED_USERS_SHEET_URL;
  }

  // Function to fetch data from public Google Sheet
  async fetchApprovedUsers() {
    try {
      if (!this.approvedUsersSheetUrl) {
        throw new Error('APPROVED_USERS_SHEET_URL environment variable is not set');
      }

      // Convert Google Sheets URL to CSV export URL
      const csvUrl = this.convertToCSVUrl(this.approvedUsersSheetUrl);
      
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
    // Extract the sheet ID from various Google Sheets URL formats
    let sheetId;
    
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
    
    if (!sheetId) {
      throw new Error('Invalid Google Sheets URL format');
    }
    
    // Return CSV export URL
    return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
  }

  // Parse CSV text into array of user objects
  parseCSV(csvText) {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      throw new Error('Invalid sheet format - no data found');
    }
    
    // Get headers from first row
    const headers = lines[0].split(',').map(header => 
      header.trim().toLowerCase().replace(/"/g, '')
    );
    
    // Validate required headers
    const requiredHeaders = ['email', 'name', 'year', 'department'];
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
        users.push({
          email: user.email.toLowerCase().trim(),
          name: user.name?.trim(),
          year: user.year?.trim(),
          department: user.department?.trim()
        });
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
}

module.exports = new GoogleSheetsService();
