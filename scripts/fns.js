const fs = require('fs');
const path = require('path');
const readdir = require('fs-readdir-recursive');
const archiver = require('archiver');
const chalk = require('chalk');

const loggerSlient = {
  log: () => {},
  error: () => {},
  warn: () => {},
  info: () => {},
  table: () => {},
};

/**
 * 
 * @returns {Promise<{
 *  totalBytes: number;
 * }>}
 */
async function createConsistentZip(
  srcDir,
  destZip,
  gitUTC0Time = new Date(1980, 0, 1),
  {
    printFileTable = true,
    silent = false,
  } = {}
) {
  const logger = silent ? loggerSlient : console;
  
  fs.mkdirSync(path.dirname(destZip), { recursive: true });
  const output = fs.createWriteStream(destZip, { flags: 'w+' });
  const archive = archiver('zip', {
    zlib: { level: 9 }
  });

  const pReturn = new Promise((resolve, reject) => {
    output.on('close', () => {
      logger.log('[fns::close] archiver has been finalized and the output file descriptor has closed.');
    });

    output.on('end', () => {
      logger.log('[fns::end] Data has been drained');
    });

    output.on('error', (err) => {
      console.error(`[fns::error] Error creating ZIP file: ${err.message}`);
      reject(err);
    });

    archive.on('finish', async () => {
      resolve({
        totalBytes: archive.pointer()
      });
    });

    archive.on('error', (err) => {
      console.error(`[fns::return] Error creating ZIP file: ${err.message}`);
      reject(err);
    });
  });

  const allItems = readdir(srcDir);
  /**
   * @type {{
   *  filePath: string;
   *  zipPath: string;
   *  time: Date;
   * }[]}
   */
  const asciiTable = [];
  
  for (const item of allItems) {
    const itemPath = path.join(srcDir, item);
    const itemZipPath = path.join('dist/', item);

    const stat = fs.statSync(itemPath);

    if (stat.isDirectory()) {
      await addDirectoryToZip(itemPath, itemZipPath);
    } else if (stat.isFile()) {
      const fileStream = fs.createReadStream(itemPath);
      asciiTable.push({
        time: gitUTC0Time,
        zipPath: itemZipPath,
        // filePath: itemPath,
      });
      // logger.log(`\twill add ${chalk.green(itemZipPath)} \t\t ${chalk.yellow`(atime|mtime: ${gitUTC0Time})`}`);
      archive.append(fileStream, { name: itemZipPath, date: gitUTC0Time });
    }
  }

  if (printFileTable) {
    logger.table(asciiTable);
  }

  archive.pipe(output);

  await archive.finalize();

  return pReturn;
}

function get_md5(buf) {
  return require('crypto').createHash('md5').update(buf, 'utf8').digest('hex');
}

async function get_md5_file(filepath) {
  const stream = fs.createReadStream(path.resolve(__dirname, filepath));
  const hash = require('crypto').createHash('md5');
  stream.on('data', chunk => {
    hash.update(chunk, 'utf8');
  });

  return new Promise((resolve, reject) => {
    stream.on('end', () => {
      resolve(hash.digest('hex'));
    });
    stream.on('error', reject);
  });
}
exports.get_md5_file = get_md5_file;


exports.createConsistentZip = createConsistentZip;