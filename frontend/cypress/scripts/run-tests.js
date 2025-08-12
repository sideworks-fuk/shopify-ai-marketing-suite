#!/usr/bin/env node

/**
 * Cypress Test Runner Script
 * Automated test execution with server management
 */

const { exec, spawn } = require('child_process');
const path = require('path');

const FRONTEND_DIR = path.resolve(__dirname, '../..');
const DEV_SERVER_PORT = 3000;
const API_SERVER_PORT = 5001;

let devServerProcess = null;
let testProcess = null;

// Color codes for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkPort(port) {
  return new Promise((resolve) => {
    const { exec } = require('child_process');
    exec(`netstat -an | find "LISTENING" | find ":${port}"`, (error, stdout) => {
      resolve(stdout.includes(`:${port}`));
    });
  });
}

async function startDevServer() {
  log('Starting development server...', 'blue');
  
  return new Promise((resolve, reject) => {
    devServerProcess = spawn('npm', ['run', 'dev'], {
      cwd: FRONTEND_DIR,
      stdio: 'pipe',
      shell: true
    });

    let serverReady = false;

    devServerProcess.stdout.on('data', (data) => {
      const output = data.toString();
      if (output.includes('Ready') || output.includes('compiled')) {
        if (!serverReady) {
          serverReady = true;
          log('Development server is ready!', 'green');
          resolve();
        }
      }
    });

    devServerProcess.stderr.on('data', (data) => {
      const error = data.toString();
      if (error.includes('Error') && !serverReady) {
        reject(new Error(`Server startup failed: ${error}`));
      }
    });

    // Timeout after 60 seconds
    setTimeout(() => {
      if (!serverReady) {
        reject(new Error('Server startup timeout'));
      }
    }, 60000);
  });
}

function stopDevServer() {
  if (devServerProcess) {
    log('Stopping development server...', 'yellow');
    devServerProcess.kill();
    devServerProcess = null;
  }
}

async function runTests(testType = 'basic') {
  log(`Running ${testType} tests...`, 'blue');
  
  return new Promise((resolve, reject) => {
    const command = testType === 'basic' ? 'npm run e2e:basic' : 'npm run e2e';
    
    testProcess = exec(command, {
      cwd: FRONTEND_DIR,
      maxBuffer: 1024 * 1024 * 10 // 10MB buffer
    });

    testProcess.stdout.on('data', (data) => {
      process.stdout.write(data);
    });

    testProcess.stderr.on('data', (data) => {
      process.stderr.write(data);
    });

    testProcess.on('close', (code) => {
      if (code === 0) {
        log('Tests completed successfully!', 'green');
        resolve();
      } else {
        log(`Tests failed with exit code ${code}`, 'red');
        reject(new Error(`Tests failed`));
      }
    });
  });
}

async function runTestsWithServer() {
  try {
    // Check if servers are already running
    const devServerRunning = await checkPort(DEV_SERVER_PORT);
    
    if (!devServerRunning) {
      log('Development server not running, starting it...', 'yellow');
      await startDevServer();
      
      // Wait a bit more for server to fully initialize
      await new Promise(resolve => setTimeout(resolve, 3000));
    } else {
      log('Development server is already running', 'green');
    }

    // Run tests
    await runTests('basic');
    
  } catch (error) {
    log(`Error: ${error.message}`, 'red');
    process.exit(1);
  } finally {
    // Clean up only if we started the server
    const devServerRunning = await checkPort(DEV_SERVER_PORT);
    if (devServerRunning && devServerProcess) {
      stopDevServer();
    }
  }
}

// Handle process termination
process.on('SIGINT', () => {
  log('Received SIGINT, cleaning up...', 'yellow');
  stopDevServer();
  process.exit(0);
});

process.on('SIGTERM', () => {
  log('Received SIGTERM, cleaning up...', 'yellow');
  stopDevServer();
  process.exit(0);
});

// Main execution
if (require.main === module) {
  const args = process.argv.slice(2);
  const testType = args[0] || 'basic';
  
  log('Cypress Test Runner Starting...', 'blue');
  log(`Test Type: ${testType}`, 'blue');
  
  runTestsWithServer();
}

module.exports = {
  runTestsWithServer,
  runTests,
  startDevServer,
  stopDevServer
};