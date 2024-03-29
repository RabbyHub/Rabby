#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const child_process = require('child_process');
const targetPath = path.join(
  __dirname,
  '../src/constant/default-support-chains.json'
);

const res = child_process.execSync(
  'curl -s https://static.debank.com/supported_chains.json'
);
let supported_chains_list = [];
try {
  supported_chains_list = JSON.parse(res);
} catch (err) {
  console.error('parse remote chain data failed:', err);
}

fs.writeFileSync(targetPath, res);

console.info('finished.');
