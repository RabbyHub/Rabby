const fs = require('fs').promises;
const path = require('path');

const MANIFEST_TYPE = process.env.MANIFEST_TYPE || 'chrome-mv3';
const isMv2 = MANIFEST_TYPE.endsWith('-mv2');
const distDir = isMv2 ? 'dist-mv2' : 'dist';

async function clean() {
  try {
    const distPath = path.resolve(process.cwd(), distDir);
    
    // Ensure directory exists
    try {
      await fs.mkdir(distPath, { recursive: true });
    } catch (e) {
      // Directory might already exist
    }
    
    // Read and clean directory contents
    const entries = await fs.readdir(distPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const entryPath = path.join(distPath, entry.name);
      if (entry.isDirectory()) {
        await fs.rm(entryPath, { recursive: true, force: true });
      } else {
        await fs.unlink(entryPath);
      }
    }
    
    console.log(`Cleaned ${distDir}/`);
  } catch (error) {
    console.error(`Clean error: ${error.message}`);
    process.exit(1);
  }
}

clean();
