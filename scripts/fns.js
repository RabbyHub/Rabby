const fs = require('fs');
const path = require('path');
const readdir = require('fs-readdir-recursive');
const archiver = require('archiver');
const chalk = require('chalk');

/**
 * 
 * @returns {{
 *  totalBytes: number;
 * }}
 */
async function createConsistentZip(
  srcDir,
  destZip,
  gitUTC0Time = new Date(1980, 0, 1)
) {
  fs.mkdirSync(path.dirname(destZip), { recursive: true });
  const output = fs.createWriteStream(destZip, { flags: 'w+' });
  const archive = archiver('zip', {
    zlib: { level: 9 }
  });

  const pReturn = new Promise((resolve, reject) => {
    output.on('close', () => {
      console.log('[fns::close] archiver has been finalized and the output file descriptor has closed.');
    });

    output.on('end', () => {
      console.log('[fns::end] Data has been drained');
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
      // console.log(`\twill add ${chalk.green(itemZipPath)} \t\t ${chalk.yellow`(atime|mtime: ${gitUTC0Time})`}`);
      archive.append(fileStream, { name: itemZipPath, date: gitUTC0Time });
    }
  }

  console.table(asciiTable);

  archive.pipe(output);

  await archive.finalize();

  return pReturn;
}

const [, , srcDir, destZip, gitUTC0Time] = process.argv;

console.log(
  `[fns] will pack ${srcDir} to ${destZip} with gitUTC0Time ${gitUTC0Time}`
);

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

createConsistentZip(srcDir, destZip, gitUTC0Time)
  .then(async (result) => {
    const md5Value = await get_md5_file(destZip);
    console.log(`[fns] ZIP file created at ${destZip} (md5: ${chalk.yellow(md5Value)}, size: ${chalk.yellow(result.totalBytes)} bytes)`);
  });
