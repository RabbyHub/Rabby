import fs from 'node:fs';
import path from 'node:path';
import archiver from 'archiver';

// Fixed date (UTC) and file mode keep the zip byte-for-byte reproducible on
// any machine and in any time zone.
const MODIFIED_TIME = new Date('2024-07-16T00:00:00Z');
const FILE_MODE = 0o644;

/**
 * Zip files in `distDir` (at the zip root), excluding `.DS_Store` and
 * sorted by path, so the same build always gives the same zip.
 */
export async function createZipTask(distDir, zipFileName) {
  const files = fs
    .readdirSync(distDir, { recursive: true })
    .map((p) => p.split(path.sep).join('/'))
    .filter((p) => path.posix.basename(p) !== '.DS_Store')
    .filter((p) => fs.statSync(path.join(distDir, p)).isFile())
    .sort();

  const output = fs.createWriteStream(zipFileName);
  const archive = archiver('zip', { zlib: { level: 9 } });

  const done = new Promise((resolve, reject) => {
    output.on('close', resolve);
    output.on('error', reject);
    archive.on('error', reject);
    archive.on('warning', reject);
  });

  archive.pipe(output);
  // `append` keeps entries in the order given; `archive.file` does not.
  for (const file of files) {
    archive.append(fs.readFileSync(path.join(distDir, file)), {
      name: file,
      date: MODIFIED_TIME,
      mode: FILE_MODE,
    });
  }
  await archive.finalize();
  await done;
}
