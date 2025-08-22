#!/usr/bin/env node

import { spawn } from 'child_process';
import { platform } from 'os';

// Set environment variable
process.env.NODE_ENV = 'development';

// Determine the command based on the platform
const isWindows = platform() === 'win32';
const command = isWindows ? 'npx.cmd' : 'npx';
const args = ['tsx', 'server/index.ts'];

// Spawn the process
const child = spawn(command, args, {
  stdio: 'inherit',
  env: process.env,
  shell: isWindows
});

child.on('error', (err) => {
  console.error('Failed to start the development server:', err);
  process.exit(1);
});

child.on('close', (code) => {
  process.exit(code);
});