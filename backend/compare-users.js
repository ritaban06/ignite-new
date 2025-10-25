/**
 * User Data Comparison Script
 * 
 * This script compares user data between Google Sheets and MongoDB
 * to identify discrepancies in: email, name, semester, year, and department
 */

const mongoose = require('mongoose');
const axios = require('axios');
require('dotenv').config();

// Import existing services and models
const googleSheetsService = require('./services/googleSheetsService');
const User = require('./models/User');

class UserDataComparator {
  constructor() {
    this.googleSheetsService = googleSheetsService;
    this.stats = {
      totalSheetsUsers: 0,
      totalDbUsers: 0,
      missingInDb: 0,
      missingInSheets: 0,
      discrepancies: 0,
      exactMatches: 0
    };
    this.differences = [];
  }

  async init() {
    try {
      // Connect to MongoDB with optimized settings for Atlas free tier
      await mongoose.connect(process.env.MONGODB_URI, {
        // Optimize for Atlas free tier
        maxPoolSize: 5, // Limit connection pool size (default is 100)
        serverSelectionTimeoutMS: 10000, // 10 seconds timeout
        socketTimeoutMS: 45000, // 45 seconds socket timeout
        maxIdleTimeMS: 30000, // Close connections after 30 seconds of inactivity
      });
      console.log('✅ Connected to MongoDB Atlas');
    } catch (error) {
      console.error('❌ MongoDB connection failed:', error.message);
      process.exit(1);
    }
  }

  async fetchGoogleSheetsData() {
    try {
      console.log('📊 Fetching data from Google Sheets...');
      const sheetsUsers = await this.googleSheetsService.fetchApprovedUsers();
      
      // Process sheets data to normalize it
      const processedSheetsUsers = sheetsUsers.map(user => ({
        email: user.email?.toLowerCase().trim(),
        name: user.name?.trim() || '',
        semester: parseInt(user.semester) || 0,
        year: parseInt(user.year) || 0,
        department: user.department?.trim() || '',
        // Additional fields for reference
        registrationId: user.registrationId || '',
        eventName: user.eventName || '',
        paymentStatus: user.paymentStatus || ''
      })).filter(user => user.email && user.email.includes('@'));

      this.stats.totalSheetsUsers = processedSheetsUsers.length;
      console.log(`✅ Found ${processedSheetsUsers.length} users in Google Sheets`);
      return processedSheetsUsers;
    } catch (error) {
      console.error('❌ Failed to fetch Google Sheets data:', error.message);
      throw error;
    }
  }

  async fetchMongoDBData() {
    try {
      console.log('🗃️  Fetching data from MongoDB...');
      
      // First, get total count for progress tracking
      const totalCount = await User.countDocuments({ role: 'client' });
      console.log(`📊 Total client users in database: ${totalCount}`);
      
      // Fetch data with lean() for better performance and memory usage
      const dbUsers = await User.find({ role: 'client' }, {
        email: 1,
        name: 1,
        semester: 1,
        year: 1,
        department: 1,
        isActive: 1,
        lastLogin: 1,
        createdAt: 1
      })
      .lean() // Use lean for better performance
      .maxTimeMS(90000); // Set query timeout (90 seconds, under Atlas 100s limit)

      const processedDbUsers = dbUsers.map(user => ({
        email: user.email?.toLowerCase().trim(),
        name: user.name?.trim() || '',
        semester: user.semester || 0,
        year: user.year || 0,
        department: user.department?.trim() || '',
        // Additional fields for reference
        isActive: user.isActive,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
        _id: user._id
      }));

      this.stats.totalDbUsers = processedDbUsers.length;
      console.log(`✅ Found ${processedDbUsers.length} client users in MongoDB`);
      return processedDbUsers;
    } catch (error) {
      if (error.name === 'MongoServerError' && error.code === 50) {
        console.error('❌ Query timeout - database may be under heavy load');
      }
      console.error('❌ Failed to fetch MongoDB data:', error.message);
      throw error;
    }
  }

  compareUsers(sheetsUsers, dbUsers) {
    console.log('\n🔍 Comparing user data...\n');

    // Create lookup maps
    const sheetsMap = new Map();
    const dbMap = new Map();

    sheetsUsers.forEach(user => sheetsMap.set(user.email, user));
    dbUsers.forEach(user => dbMap.set(user.email, user));

    // Find users missing in DB
    const missingInDb = [];
    sheetsUsers.forEach(sheetsUser => {
      if (!dbMap.has(sheetsUser.email)) {
        missingInDb.push(sheetsUser);
      }
    });

    // Find users missing in Sheets
    const missingInSheets = [];
    dbUsers.forEach(dbUser => {
      if (!sheetsMap.has(dbUser.email)) {
        missingInSheets.push(dbUser);
      }
    });

    // Find discrepancies in common users
    const discrepancies = [];
    const exactMatches = [];

    sheetsUsers.forEach(sheetsUser => {
      const dbUser = dbMap.get(sheetsUser.email);
      if (dbUser) {
        const differences = this.findUserDifferences(sheetsUser, dbUser);
        if (differences.length > 0) {
          discrepancies.push({
            email: sheetsUser.email,
            differences,
            sheetsData: sheetsUser,
            dbData: dbUser
          });
        } else {
          exactMatches.push({
            email: sheetsUser.email,
            data: sheetsUser
          });
        }
      }
    });

    // Update stats
    this.stats.missingInDb = missingInDb.length;
    this.stats.missingInSheets = missingInSheets.length;
    this.stats.discrepancies = discrepancies.length;
    this.stats.exactMatches = exactMatches.length;

    return {
      missingInDb,
      missingInSheets,
      discrepancies,
      exactMatches
    };
  }

  findUserDifferences(sheetsUser, dbUser) {
    const differences = [];
    const fieldsToCompare = ['name', 'semester', 'year', 'department'];

    fieldsToCompare.forEach(field => {
      let sheetsValue = sheetsUser[field];
      let dbValue = dbUser[field];

      // Normalize values for comparison
      if (typeof sheetsValue === 'string') {
        sheetsValue = sheetsValue.trim();
      }
      if (typeof dbValue === 'string') {
        dbValue = dbValue.trim();
      }

      if (sheetsValue !== dbValue) {
        differences.push({
          field,
          sheetsValue,
          dbValue
        });
      }
    });

    return differences;
  }

  generateReport(comparisonResults) {
    const { missingInDb, missingInSheets, discrepancies, exactMatches } = comparisonResults;

    console.log('📊 COMPARISON REPORT');
    console.log('='.repeat(60));
    console.log(`📈 Total users in Google Sheets: ${this.stats.totalSheetsUsers}`);
    console.log(`🗃️  Total users in MongoDB: ${this.stats.totalDbUsers}`);
    console.log(`✅ Exact matches: ${this.stats.exactMatches}`);
    console.log(`❌ Users with discrepancies: ${this.stats.discrepancies}`);
    console.log(`📊 Missing in MongoDB: ${this.stats.missingInDb}`);
    console.log(`🗃️  Missing in Sheets: ${this.stats.missingInSheets}`);
    console.log('='.repeat(60));

    // Missing in DB
    if (missingInDb.length > 0) {
      console.log('\n🚨 USERS MISSING IN MONGODB:');
      console.log('-'.repeat(40));
      missingInDb.forEach(user => {
        console.log(`📧 ${user.email}`);
        console.log(`   Name: ${user.name}`);
        console.log(`   Department: ${user.department}, Year: ${user.year}, Semester: ${user.semester}`);
        if (user.registrationId) console.log(`   Registration ID: ${user.registrationId}`);
        console.log('');
      });
    }

    // Missing in Sheets
    if (missingInSheets.length > 0) {
      console.log('\n📊 USERS MISSING IN GOOGLE SHEETS:');
      console.log('-'.repeat(40));
      missingInSheets.forEach(user => {
        console.log(`📧 ${user.email}`);
        console.log(`   Name: ${user.name}`);
        console.log(`   Department: ${user.department}, Year: ${user.year}, Semester: ${user.semester}`);
        console.log(`   Active: ${user.isActive}, Last Login: ${user.lastLogin || 'Never'}`);
        console.log(`   Created: ${user.createdAt}`);
        console.log('');
      });
    }

    // Data discrepancies
    if (discrepancies.length > 0) {
      console.log('\n⚠️  DATA DISCREPANCIES:');
      console.log('-'.repeat(40));
      discrepancies.forEach(item => {
        console.log(`📧 ${item.email}`);
        item.differences.forEach(diff => {
          console.log(`   ${diff.field}:`);
          console.log(`     Sheets: "${diff.sheetsValue}"`);
          console.log(`     MongoDB: "${diff.dbValue}"`);
        });
        console.log('');
      });
    }

    // Summary by specific GID if available
    if (process.env.APPROVED_USERS_SHEET_GID) {
      console.log(`\n📋 Data source: Sheet GID ${process.env.APPROVED_USERS_SHEET_GID}`);
    }

    return {
      stats: this.stats,
      missingInDb,
      missingInSheets,
      discrepancies,
      exactMatches
    };
  }

  async generateJSONReport(comparisonResults) {
    const report = {
      timestamp: new Date().toISOString(),
      sheetGID: process.env.APPROVED_USERS_SHEET_GID || null,
      stats: this.stats,
      ...comparisonResults
    };

    const fs = require('fs');
    const reportPath = './user-comparison-report.json';
    
    try {
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      console.log(`\n💾 Detailed report saved to: ${reportPath}`);
    } catch (error) {
      console.error('❌ Failed to save JSON report:', error.message);
    }
  }

  async run() {
    try {
      await this.init();

      // Fetch data from both sources
      const sheetsUsers = await this.fetchGoogleSheetsData();
      const dbUsers = await this.fetchMongoDBData();

      // Compare the data
      const comparisonResults = this.compareUsers(sheetsUsers, dbUsers);

      // Generate and display report
      const report = this.generateReport(comparisonResults);

      // Save detailed JSON report
      await this.generateJSONReport(comparisonResults);

      // Close MongoDB connection properly
      await mongoose.disconnect();
      console.log('\n✅ Comparison complete!');

    } catch (error) {
      console.error('❌ Script failed:', error.message);
      
      // Ensure connection is closed even on error
      if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
      }
      
      process.exit(1);
    }
  }
}

// Support for specific sheet GID via command line
const args = process.argv.slice(2);
if (args.length > 0) {
  // Allow GID to be passed as command line argument
  const gid = args[0];
  if (gid.match(/^[0-9]+$/)) {
    process.env.APPROVED_USERS_SHEET_GID = gid;
    console.log(`🎯 Using specific sheet GID: ${gid}`);
  }
}

// Run the comparison if this file is executed directly
if (require.main === module) {
  const comparator = new UserDataComparator();
  comparator.run().catch(console.error);
}

module.exports = UserDataComparator;