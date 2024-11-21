const { exec } = require('child_process');

const MANIFEST_TYPE = process.env.MANIFEST_TYPE || 'chrome-mv3';

exec(
  MANIFEST_TYPE.endsWith('-mv2') 
    ? 
    'mkdir -p dist-mv2 && rm -rf dist-mv2/*' 
    : 
    'mkdir -p dist && rm -rf dist/*', 
  (error) => {
    if (error) {
      console.error(`exec error: ${error}`);
      return;
    }
  }
);
