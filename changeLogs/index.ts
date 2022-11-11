import version0170 from './0170.md';
import version0340 from './0340.md';
import version0460 from './0460.md';
import version0490 from './0490.md';
import version0530 from './0530.md';
import version0560 from './0560.md';

const version = process.env.release || '0';
const versionMap = {
  '0.17.0': version0170,
  '0.34.0': version0340,
  '0.46.0': version0460,
  '0.49.0': version0490,
  '0.49.1': version0490,
  '0.53.0': version0530,
  '0.56.0': version0560,
};
export const getUpdateContent = () => {
  return versionMap[version];
};

export { default as version0170 } from './0170.md';
