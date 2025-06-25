import version09318 from './09318.md';
import version09319 from './09319.md';
import version09321 from './09321.md';
import version09323 from './09323.md';
import version09324 from './09324.md';
import version09325 from './09325.md';
import version09327 from './09327.md';
import version09328 from './09328.md';
import version09330 from './09330.md';
import version09331 from './09331.md';

const version = process.env.release || '0';
const versionMap = {
  '0.93.18': version09318,
  '0.93.19': version09319,
  '0.93.21': version09321,
  '0.93.23': version09323,
  '0.93.24': version09324,
  '0.93.25': version09325,
  '0.93.27': version09327,
  '0.93.28': version09328,
  '0.93.30': version09330,
  '0.93.31': version09331,
};
export const getUpdateContent = () => {
  return versionMap[version];
};

export { default as version0170 } from './0170.md';
