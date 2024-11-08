import { createConsistentZip } from "./fns";

if (process.argv.length > 2) {
    const [, , srcDir, destZip, gitUTC0Time] = process.argv;
  
    console.log(
      `[fns] will pack ${srcDir} to ${destZip} with gitUTC0Time ${gitUTC0Time}`
    );
    
    createConsistentZip(srcDir, destZip, gitUTC0Time)
      .then(async (result) => {
        const md5Value = await get_md5_file(destZip);
        console.log(`[fns] ZIP file created at ${destZip} (md5: ${chalk.yellow(md5Value)}, size: ${chalk.yellow(result.totalBytes)} bytes)`);
      });
  }