#!/usr/bin/env node

/**
 * Test script to verify Parch project setup
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Testing Parch project setup...\n');

// Test 1: Check if essential files exist
const essentialFiles = [
  'package.json',
  'src-tauri/Cargo.toml',
  'src-tauri/tauri.conf.json',
  'src-tauri/capabilities/default.json',
  'src-tauri/src/lib.rs',
  'src-tauri/src/main.rs',
  'src/App.tsx',
  'src/lib/tauri-api.ts',
  'src/types/tauri.ts',
  'dist/index.html'
];

let allFilesExist = true;
essentialFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - MISSING`);
    allFilesExist = false;
  }
});

// Test 2: Check package.json dependencies
console.log('\n📦 Checking dependencies...');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const requiredDeps = [
  '@tauri-apps/api',
  '@tauri-apps/plugin-dialog',
  '@tauri-apps/plugin-fs',
  '@tauri-apps/plugin-window-state',
  'react',
  'react-dom'
];

requiredDeps.forEach(dep => {
  if (packageJson.dependencies[dep]) {
    console.log(`✅ ${dep}: ${packageJson.dependencies[dep]}`);
  } else {
    console.log(`❌ ${dep} - MISSING`);
    allFilesExist = false;
  }
});

// Test 3: Check Cargo.toml dependencies
console.log('\n🦀 Checking Rust dependencies...');
const cargoToml = fs.readFileSync('src-tauri/Cargo.toml', 'utf8');
const requiredRustDeps = [
  'tauri',
  'tauri-plugin-dialog',
  'tauri-plugin-fs',
  'tauri-plugin-window-state',
  'serde',
  'tokio'
];

requiredRustDeps.forEach(dep => {
  if (cargoToml.includes(`${dep} =`)) {
    console.log(`✅ ${dep}`);
  } else {
    console.log(`❌ ${dep} - MISSING`);
    allFilesExist = false;
  }
});

// Test 4: Check build artifacts
console.log('\n🏗️ Checking build artifacts...');
if (fs.existsSync('dist')) {
  console.log('✅ Frontend build artifacts exist');
} else {
  console.log('❌ Frontend build artifacts missing');
  allFilesExist = false;
}

if (fs.existsSync('src-tauri/target')) {
  console.log('✅ Rust build artifacts exist');
} else {
  console.log('❌ Rust build artifacts missing');
  allFilesExist = false;
}

// Summary
console.log('\n📋 Setup Summary:');
if (allFilesExist) {
  console.log('🎉 All checks passed! Parch project is properly configured.');
  console.log('\n🚀 Next steps:');
  console.log('   - Run `npm run tauri:dev` to start development');
  console.log('   - Run `npm run tauri:build` to create production build');
} else {
  console.log('⚠️  Some issues found. Please review the missing items above.');
  process.exit(1);
}