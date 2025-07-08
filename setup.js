#!/usr/bin/env node
// Set-ExecutionPolicy Unrestricted

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const https = require('https');

// Simple color functions (no external dependency)
const colors = {
  green: (text) => `\x1b[32m${text}\x1b[0m`,
  red: (text) => `\x1b[31m${text}\x1b[0m`,
  yellow: (text) => `\x1b[33m${text}\x1b[0m`,
  blue: (text) => `\x1b[34m${text}\x1b[0m`,
  cyan: (text) => `\x1b[36m${text}\x1b[0m`,
  gray: (text) => `\x1b[90m${text}\x1b[0m`
};

function prompt(question) {
  return new Promise((resolve) => {
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    readline.question(question, (answer) => {
      readline.close();
      resolve(answer.toLowerCase().trim());
    });
  });
}

console.clear();
console.log(colors.green('========================================'));
console.log(colors.green('    IGNITE PROJECT SETUP SCRIPT'));
console.log(colors.green('    Educational Notes Platform'));
console.log(colors.green('========================================'));
console.log();

// Google Drive file configurations for IGNITE project

const ENV_FILES_CONFIG = [
  {
    fileId: process.env.BACKEND_ENV_FILE_ID || '1Pnrmf9vJT1BIxnVUuDkomQWu5c7rRhc8',
    fileName: '.env',
    destination: 'backend/.env',
    description: 'Backend Environment'
  },
  {
    fileId: process.env.CLIENT_ENV_FILE_ID || '12mMFAY0qGgcK6dqufkYnVTnxS-1B-PfZ',
    fileName: '.env',
    destination: 'client/.env',
    description: 'Client Environment'
  },
  {
    fileId: process.env.ADMIN_ENV_FILE_ID || '1yuYUUVfab_qbcOxNJYElsFpIx7Thh4ZT',
    fileName: '.env',
    destination: 'admin/.env',
    description: 'Admin Environment'
  }
];

async function checkNodeVersion() {
  console.log(colors.blue('[1/5] Checking Node.js installation...'));
  
  try {
    const nodeVersion = execSync('node --version', { encoding: 'utf8' }).trim();
    const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
    
    console.log(colors.green('✓ SUCCESS: Node.js is installed!'));
    console.log(colors.cyan(`  Node.js version: ${nodeVersion}`));
    console.log(colors.cyan(`  npm version: ${npmVersion}`));
    
    // Check minimum version requirements
    const majorVersion = parseInt(nodeVersion.replace('v', '').split('.')[0]);
    if (majorVersion < 16) {
      console.log(colors.yellow('⚠ Warning: Node.js version 16 or higher is recommended'));
    }
    
    return true;
  } catch (error) {
    console.log(colors.red('✗ ERROR: Node.js is not installed or not in PATH'));
    console.log(colors.yellow('Please install Node.js from: https://nodejs.org/en/download/'));
    console.log(colors.yellow('After installation, restart your terminal and run this script again.'));
    process.exit(1);
  }
}

async function installPnpm() {
  console.log(colors.blue('\n[2/5] Installing pnpm globally...'));
  
  try {
    // Check if pnpm is already installed
    try {
      const pnpmVersion = execSync('pnpm --version', { encoding: 'utf8' }).trim();
      console.log(colors.green(`✓ pnpm is already installed (v${pnpmVersion})`));
      return true;
    } catch {
      // pnpm not installed, proceed with installation
    }
    
    console.log(colors.yellow('Installing pnpm...'));
    execSync('npm install -g pnpm', { stdio: 'inherit' });
    
    const pnpmVersion = execSync('pnpm --version', { encoding: 'utf8' }).trim();
    console.log(colors.green(`✓ SUCCESS: pnpm installed (v${pnpmVersion})`));
    
    return true;
  } catch (error) {
    console.log(colors.red('✗ ERROR: Failed to install pnpm'));
    console.log(colors.red(error.message));
    process.exit(1);
  }
}

function downloadFile(url, destination) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destination);
    
    https.get(url, (response) => {
      // Handle redirects
      if ([301, 302, 303].includes(response.statusCode)) {
        return downloadFile(response.headers.location, destination)
          .then(resolve)
          .catch(reject);
      }
      
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
        return;
      }
      
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        resolve();
      });
      
      file.on('error', (err) => {
        fs.unlink(destination, () => {}); // Delete incomplete file
        reject(err);
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

async function createDirectories() {
  const directories = [
    'backend', 
    'client', 
    'admin'
  ];
  
  directories.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(colors.green(`✓ Created directory: ${dir}`));
    }
  });
}

async function downloadEnvironmentFiles() {
  console.log(colors.blue('\n[3/5] Downloading environment files from Google Drive...'));
  console.log();
  
  // Check if file IDs are configured
  const unconfiguredFiles = ENV_FILES_CONFIG.filter(config => 
    config.fileId.startsWith('YOUR_GDRIVE_FILE_ID')
  );
  
  if (unconfiguredFiles.length > 0) {
    console.log(colors.red('✗ ERROR: Google Drive file IDs not configured!'));
    console.log(colors.yellow('Please update the ENV_FILES_CONFIG in setup.js with your actual Google Drive file IDs.'));
    console.log();
    console.log(colors.cyan('To get Google Drive file IDs:'));
    console.log(colors.cyan('1. Open your file in Google Drive'));
    console.log(colors.cyan('2. Click "Share" and set permissions to "Anyone with the link"'));
    console.log(colors.cyan('3. Copy the file ID from the URL (the long string between /d/ and /view)'));
    console.log(colors.cyan('4. Update the fileId values in this script'));
    console.log();
    process.exit(1);
  }
  
  await createDirectories();
  
  console.log(colors.yellow('Downloading .env files...'));
  
  for (const config of ENV_FILES_CONFIG) {
    try {
      console.log(colors.cyan(`  Downloading ${config.description}...`));
      
      // Google Drive direct download URL
      const downloadUrl = `https://drive.google.com/uc?export=download&id=${config.fileId}`;
      
      await downloadFile(downloadUrl, config.destination);
      console.log(colors.green(`  ✓ Downloaded: ${config.destination}`));
      
    } catch (error) {
      console.log(colors.red(`  ✗ Failed to download ${config.description}`));
      console.log(colors.red(`    Error: ${error.message}`));
      
      const answer = await prompt(`Continue setup without ${config.description}? (y/n): `);
      
      if (answer !== 'y' && answer !== 'yes') {
        process.exit(1);
      }
    }
  }
  
  console.log(colors.green('\n✓ Environment files download completed!'));
}

async function validateEnvironmentFiles() {
  console.log(colors.blue('\n[4/5] Validating environment files...'));
  
  let validFiles = 0;
  let totalFiles = ENV_FILES_CONFIG.length;
  
  for (const config of ENV_FILES_CONFIG) {
    if (fs.existsSync(config.destination)) {
      const stats = fs.statSync(config.destination);
      if (stats.size > 0) {
        console.log(colors.green(`  ✓ ${config.destination} (${stats.size} bytes)`));
        validFiles++;
      } else {
        console.log(colors.yellow(`  ⚠ ${config.destination} (empty file)`));
      }
    } else {
      console.log(colors.red(`  ✗ ${config.destination} (missing)`));
    }
  }
  
  console.log(colors.cyan(`\nValidation complete: ${validFiles}/${totalFiles} files ready`));
  
  if (validFiles === 0) {
    console.log(colors.red('⚠ Warning: No environment files found. The application may not work correctly.'));
  }
}

async function installDependencies() {
  console.log(colors.blue('\n[5/5] Installing all dependencies...'));
  console.log();
  
  try {
    console.log(colors.yellow('Installing dependencies for entire workspace...'));
    execSync('pnpm install', { stdio: 'inherit' });
    
    console.log(colors.green('\n✓ SUCCESS: All dependencies installed!'));
    return true;
  } catch (error) {
    console.log(colors.red('✗ ERROR: Failed to install dependencies with pnpm'));
    console.log(colors.red(error.message));
    
    // Fallback to npm if pnpm fails
    console.log(colors.yellow('\nTrying with npm as fallback...'));
    try {
      execSync('npm install --workspaces', { stdio: 'inherit' });
      console.log(colors.green('\n✓ SUCCESS: Dependencies installed with npm!'));
      return true;
    } catch (npmError) {
      console.log(colors.red('✗ ERROR: Both pnpm and npm failed'));
      console.log(colors.red(npmError.message));
      process.exit(1);
    }
  }
}

function showCompletionMessage() {
  console.log();
  console.log(colors.green('========================================'));
  console.log(colors.green('           SETUP COMPLETE!'));
  console.log(colors.green('========================================'));
  console.log();
  console.log(colors.yellow('Available development commands:'));
  console.log();
  console.log(colors.cyan('  pnpm dev:all      # Run client, backend & admin'));
  console.log(colors.cyan('  pnpm dev:client   # Run client only'));
  console.log(colors.cyan('  pnpm dev:backend  # Run backend only'));
  console.log(colors.cyan('  pnpm dev:admin    # Run admin only'));
  console.log();
  console.log(colors.yellow('Environment files status:'));
  ENV_FILES_CONFIG.forEach(config => {
    const status = fs.existsSync(config.destination) ? '✓' : '✗';
    console.log(colors.cyan(`  ${status} ${config.destination}`));
  });
  console.log();
  console.log(colors.green('========================================'));
}

// Main execution
async function main() {
  try {
    await checkNodeVersion();
    await installPnpm();
    await downloadEnvironmentFiles();
    await validateEnvironmentFiles();
    await installDependencies();
    showCompletionMessage();
  } catch (error) {
    console.error(colors.red('Setup failed:'), error.message);
    process.exit(1);
  }
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log(colors.yellow('\n\nSetup interrupted by user'));
  process.exit(0);
});

if (require.main === module) {
  main();
}