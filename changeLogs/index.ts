import version0170 from './0170.md';
import version0340 from './0340.md';
import version0460 from './0460.md';
import version0490 from './0490.md';
import version0530 from './0530.md';
import version0560 from './0560.md';
import version0570 from './0570.md';
import version0610 from './0610.md';
import version0781 from './0781.md';
import version0790 from './0790.md';
import version0792 from './0792.md';
import version0800 from './0800.md';
import version0810 from './0810.md';
import version0820 from './0820.md';
import version0830 from './0830.md';
import version0840 from './0840.md';
import version0850 from './0850.md';
import version0860 from './0860.md';
import version0870 from './0870.md';
import version0880 from './0880.md';
import version0890 from './0890.md';
import version0900 from './0900.md';
import version0910 from './0910.md';
import version0920 from './0920.md';
import version0921 from './0921.md';
import version0922 from './0922.md';
import version0923 from './0923.md';
import version0924 from './0924.md';
import version0925 from './0925.md';
import version0927 from './0927.md';
import version0928 from './0928.md';
import version0929 from './0929.md';
import version09210 from './09210.md';
import version09211 from './09211.md';
import version09212 from './09212.md';
import version09213 from './09213.md';
import version09216 from './09216.md';
import version09217 from './09217.md';
import version09218 from './09218.md';
import version09219 from './09219.md';
import version09220 from './09220.md';
import version09221 from './09221.md';

const version = process.env.release || '0';
const versionMap = {
  '0.17.0': version0170,
  '0.34.0': version0340,
  '0.46.0': version0460,
  '0.49.0': version0490,
  '0.49.1': version0490,
  '0.53.0': version0530,
  '0.56.0': version0560,
  '0.57.1': version0570,
  '0.61.0': version0610,
  '0.78.1': version0781,
  '0.79.0': version0790,
  '0.79.2': version0792,
  '0.80.0': version0800,
  '0.81.0': version0810,
  '0.82.0': version0820,
  '0.83.0': version0830,
  '0.84.0': version0840,
  '0.85.0': version0850,
  '0.86.0': version0860,
  '0.87.0': version0870,
  '0.88.0': version0880,
  '0.89.0': version0890,
  '0.90.0': version0900,
  '0.91.0': version0910,
  '0.92.0': version0920,
  '0.92.1': version0921,
  '0.92.2': version0922,
  '0.92.3': version0923,
  '0.92.4': version0924,
  '0.92.5': version0925,
  '0.92.7': version0927,
  '0.92.8': version0928,
  '0.92.9': version0929,
  '0.92.10': version09210,
  '0.92.11': version09211,
  '0.92.12': version09212,
  '0.92.13': version09213,
  '0.92.16': version09216,
  '0.92.17': version09217,
  '0.92.18': version09218,
  '0.92.19': version09219,
  '0.92.20': version09220,
  '0.92.21': version09221,
};
export const getUpdateContent = () => {
  return versionMap[version];
};

export { default as version0170 } from './0170.md';
