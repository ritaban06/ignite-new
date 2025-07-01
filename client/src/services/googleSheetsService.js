// Google Sheets service for checking approved users
class GoogleSheetsService {
  constructor() {
    this.sheetsData = null;
    this.lastFetch = null;
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes cache
  }

  // Function to fetch data from public Google Sheet
  async fetchApprovedUsers(sheetUrl) {
    try {
      // Convert Google Sheets URL to CSV export URL
      const csvUrl = this.convertToCSVUrl(sheetUrl);
      
      const response = await fetch(csvUrl);
      if (!response.ok) {
        throw new Error('Failed to fetch approved users sheet');
      }
      
      const csvText = await response.text();
      const users = this.parseCSV(csvText);
      
      this.sheetsData = users;
      this.lastFetch = Date.now();
      
      return users;
    } catch (error) {
      console.error('Error fetching approved users:', error);
      throw new Error('Unable to verify user approval status. Please try again later.');
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
    const headers = lines[0].split(',').map(header => header.trim().toLowerCase());
    
    // Validate required headers
    const requiredHeaders = ['email', 'name', 'year', 'department'];
    const missingHeaders = requiredHeaders.filter(header => !headers.includes(header));
    
    if (missingHeaders.length > 0) {
      throw new Error(`Missing required columns: ${missingHeaders.join(', ')}`);
    }
    
    // Parse data rows
    const users = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(value => value.trim().replace(/"/g, ''));
      
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
          email: user.email.toLowerCase(),
          name: user.name,
          year: user.year,
          department: user.department
        });
      }
    }
    
    return users;
  }

  // Check if user is approved based on email
  async isUserApproved(email, sheetUrl) {
    try {
      // Check cache first
      if (this.sheetsData && this.lastFetch && 
          (Date.now() - this.lastFetch) < this.cacheTimeout) {
        return this.findUserInData(email.toLowerCase(), this.sheetsData);
      }
      
      // Fetch fresh data
      const users = await this.fetchApprovedUsers(sheetUrl);
      return this.findUserInData(email.toLowerCase(), users);
    } catch (error) {
      console.error('Error checking user approval:', error);
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
}

export default new GoogleSheetsService();
