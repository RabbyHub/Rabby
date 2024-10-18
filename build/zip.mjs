import gulp from 'gulp';
import sort from 'gulp-sort';
import gulpZip from 'gulp-zip';
import { pipeline } from 'readable-stream';

export async function createZipTask(dist, zipFileName) {
  return pipeline(
    gulp.src(dist),
    // sort files and set `mtime` to epoch to ensure zip build is deterministic
    sort(),
    // Modified time set to an arbitrary static date to ensure build the is reproducible.
    gulpZip(zipFileName, { modifiedTime: new Date('2024-07-16T00:00:00') }),
    gulp.dest('.')
  );
}
