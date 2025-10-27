// Test script to verify Google Sheets credentials and update M3, N3

// Load environment variables
require('dotenv').config({ path: '../.env' });

const googleSheetsService = require('../services/googleSheetsService');

async function testCredentialsAndUpdate() {
  console.log('🔍 Testing Google Sheets credentials...\n');
  
  // Check environment variables
  console.log('Environment Variables Check:');
  console.log('- APPROVED_USERS_SHEET_URL:', process.env.APPROVED_USERS_SHEET_URL ? '✅ Set' : '❌ Missing');
  console.log('- APPROVED_USERS_SHEET_GID:', process.env.APPROVED_USERS_SHEET_GID ? '✅ Set' : '❌ Missing');
  console.log('- GDRIVE_CREDENTIALS:', process.env.GDRIVE_CREDENTIALS ? '✅ Set' : '❌ Missing');
  console.log('- GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? '✅ Set' : '❌ Missing');
  console.log('- GOOGLE_CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET ? '✅ Set' : '❌ Missing');
  
  if (process.env.GDRIVE_CREDENTIALS) {
    try {
      const creds = JSON.parse(process.env.GDRIVE_CREDENTIALS);
      console.log('- GDRIVE_CREDENTIALS parsing:', '✅ Valid JSON');
      console.log('- Service Account Email:', creds.client_email);
      console.log('- Project ID:', creds.project_id);
    } catch (error) {
      console.log('- GDRIVE_CREDENTIALS parsing:', '❌ Invalid JSON', error.message);
      return;
    }
  }
  
  console.log('\n📊 Attempting to update M3 and N3...');
  
  try {
    // Test authentication by trying to get sheet client
    console.log('Testing authentication...');
    const sheetsClient = await googleSheetsService.getAuthenticatedSheetsClient();
    console.log('✅ Authentication successful!');
    
    // Update M3 and N3 cells
    const range = 'M3:N3';
    const values = [[2, 3]]; // Numbers instead of strings for proper alignment
    
    console.log(`Updating range ${range} with values:`, values);
    
    const result = await googleSheetsService.updateSheetData(range, values);
    
    console.log('✅ Successfully updated Google Sheets!');
    console.log('Result:', {
      success: result.success,
      updatedCells: result.updatedCells,
      updatedRows: result.updatedRows,
      updatedColumns: result.updatedColumns
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Full error:', error);
  }
}

// Also test reading functionality
async function testReadFunctionality() {
  console.log('\n📖 Testing read functionality...');
  
  try {
    const users = await googleSheetsService.fetchApprovedUsers();
    console.log(`✅ Successfully read ${users.length} users from sheet`);
    
    if (users.length > 0) {
      console.log('Sample user:', {
        email: users[1].email,
        name: users[1].name,
        department: users[1].department
      });
    }
    
  } catch (error) {
    console.error('❌ Read error:', error.message);
  }
}

async function main() {
  await testCredentialsAndUpdate();
  await testReadFunctionality();
}

main().catch(console.error);