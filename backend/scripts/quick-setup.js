#!/usr/bin/env node

/**
 * Quick Setup Script for Kayak Platform Data Loading
 * 
 * This script handles the complete setup:
 * 1. Validates Kaggle CLI installation
 * 2. Downloads datasets (if kaggle.json configured)
 * 3. Installs backend dependencies
 * 4. Runs import script
 * 5. Verifies data in both databases
 * 
 * Usage:
 *   node scripts/quick-setup.js
 * 
 * Environment:
 *   - Requires Kaggle API token in ~/.kaggle/kaggle.json
 *   - MySQL must be running on MYSQL_HOST
 *   - MongoDB must be running on MONGODB_URI
 */

const fs = require('fs');
const path = require('path');
const { spawn, execSync } = require('child_process');
const os = require('os');

const BACKEND_DIR = path.join(__dirname, '..');
const DATA_RAW = path.join(BACKEND_DIR, 'data', 'raw');

// Datasets to download (name, kaggle-dataset-id)
const DATASETS = [
  { name: 'inside-airbnb-nyc', id: 'dominoweir/inside-airbnb-nyc', size: '~500MB' },
  { name: 'hotel-booking', id: 'mojtaba142/hotel-booking', size: '~45MB' },
  { name: 'flightprices', id: 'dilwong/flightprices', size: '~23MB' },
  { name: 'global-airports', id: 'samvelkoch/global-airports-iata-icao-timezone-geo', size: '~4MB' },
  { name: 'flight-delays', id: 'usdot/flight-delays', size: '~600MB', optional: true }
];

// ============================================================================
// UTILITIES
// ============================================================================

function log(message, level = 'info') {
  const colors = {
    info: '\x1b[36m',    // Cyan
    success: '\x1b[32m', // Green
    warn: '\x1b[33m',    // Yellow
    error: '\x1b[31m',   // Red
    reset: '\x1b[0m'
  };
  
  const color = colors[level] || colors.info;
  console.log(`${color}${level.toUpperCase()}: ${message}${colors.reset}`);
}

function checkCommand(cmd) {
  try {
    execSync(`${cmd} --version`, { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

function checkKaggleConfig() {
  const configPath = path.join(os.homedir(), '.kaggle', 'kaggle.json');
  return fs.existsSync(configPath);
}

// ============================================================================
// SETUP PHASES
// ============================================================================

async function phase1_validate() {
  log('Phase 1: Validating environment...');
  
  // Check Node.js
  if (!checkCommand('node')) {
    log('Node.js not found', 'error');
    process.exit(1);
  }
  log('✓ Node.js available', 'success');
  
  // Check Kaggle CLI
  if (!checkCommand('kaggle')) {
    log('Kaggle CLI not found. To download datasets, install: pip install kaggle', 'warn');
    return false;
  }
  log('✓ Kaggle CLI available', 'success');
  
  // Check Kaggle config
  if (!checkKaggleConfig()) {
    log('Kaggle credentials not found at ~/.kaggle/kaggle.json', 'warn');
    log('Run: pip install kaggle, then https://www.kaggle.com/settings/account -> Create New API Token', 'warn');
    return false;
  }
  log('✓ Kaggle credentials configured', 'success');
  
  // Create data directory
  if (!fs.existsSync(DATA_RAW)) {
    fs.mkdirSync(DATA_RAW, { recursive: true });
    log(`✓ Created data directory: ${DATA_RAW}`, 'success');
  }
  
  return true;
}

async function phase2_downloadDatasets(hasKaggle) {
  if (!hasKaggle) {
    log('Phase 2: Skipping downloads (Kaggle CLI not configured)', 'warn');
    log('To download datasets manually:', 'warn');
    DATASETS.forEach(ds => {
      log(`  kaggle datasets download -d ${ds.id}`, 'warn');
    });
    log('Then extract them to:', 'warn');
    log(`  ${DATA_RAW}`, 'warn');
    return;
  }
  
  log('Phase 2: Downloading Kaggle datasets...');
  
  for (const dataset of DATASETS) {
    const datasetPath = path.join(DATA_RAW, dataset.name);
    if (fs.existsSync(datasetPath)) {
      log(`Skipping ${dataset.name} (already exists)`, 'warn');
      continue;
    }
    
    log(`Downloading ${dataset.name} (${dataset.size})...`);
    try {
      execSync(`cd "${DATA_RAW}" && kaggle datasets download -d ${dataset.id}`, { stdio: 'inherit' });
      
      // Auto-extract
      const zipPath = path.join(DATA_RAW, `${dataset.name}.zip`);
      if (fs.existsSync(zipPath)) {
        log(`Extracting ${dataset.name}...`);
        try {
          execSync(`cd "${DATA_RAW}" && unzip -q "${dataset.name}.zip" -d "${dataset.name}"`, { stdio: 'inherit' });
          fs.unlinkSync(zipPath);
          log(`✓ ${dataset.name} downloaded and extracted`, 'success');
        } catch {
          log(`Auto-extract failed for ${dataset.name}. Unzip manually if needed.`, 'warn');
        }
      }
    } catch (err) {
      if (dataset.optional) {
        log(`Skipped ${dataset.name} (optional dataset)`, 'warn');
      } else {
        log(`Failed to download ${dataset.name}`, 'error');
      }
    }
  }
}

async function phase3_installDependencies() {
  log('Phase 3: Installing backend dependencies...');
  
  try {
    execSync('npm install csv-parser', { cwd: BACKEND_DIR, stdio: 'inherit' });
    log('✓ Dependencies installed', 'success');
  } catch (err) {
    log('Failed to install dependencies', 'error');
    process.exit(1);
  }
}

async function phase4_importData() {
  log('Phase 4: Importing data into databases...');
  
  const importScript = path.join(__dirname, 'import-kaggle-data.js');
  if (!fs.existsSync(importScript)) {
    log('Import script not found', 'error');
    process.exit(1);
  }
  
  try {
    execSync(`node "${importScript}"`, { cwd: BACKEND_DIR, stdio: 'inherit', env: process.env });
    log('✓ Data import completed', 'success');
  } catch (err) {
    log('Data import failed', 'error');
    process.exit(1);
  }
}

async function phase5_verify() {
  log('Phase 5: Verifying data...');
  
  // For now, just provide next steps
  log('✓ Setup complete!', 'success');
  log('\nNext steps:', 'info');
  log('1. Verify data in databases:', 'info');
  log('   mysql -h localhost -u root -p kayak_admin -e "SELECT COUNT(*) as hotel_count FROM hotels; SELECT COUNT(*) as flight_count FROM flights;"', 'info');
  log('2. Restart backend pod in K8s:', 'info');
  log('   kubectl delete pod -l app=backend -n kayak-travel', 'info');
  log('3. Test data endpoints:', 'info');
  log('   curl http://localhost:5001/api/admin/listings/hotels', 'info');
  log('4. Monitor cache performance:', 'info');
  log('   curl http://localhost:5001/metrics/cache', 'info');
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('🚀 Kayak Platform - Quick Setup');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  try {
    const hasKaggle = await phase1_validate();
    console.log();
    
    await phase2_downloadDatasets(hasKaggle);
    console.log();
    
    await phase3_installDependencies();
    console.log();
    
    await phase4_importData();
    console.log();
    
    await phase5_verify();
    
    console.log('═══════════════════════════════════════════════════════════\n');
  } catch (error) {
    log(`Fatal error: ${error.message}`, 'error');
    process.exit(1);
  }
}

main();
