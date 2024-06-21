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
import version09222 from './09222.md';
import version09223 from './09223.md';
import version09224 from './09224.md';
import version09225 from './09225.md';
import version09227 from './09227.md';
import version09228 from './09228.md';
import version09229 from './09229.md';
import version09230 from './09230.md';
import version09231 from './09231.md';
import version09232 from './09232.md';
import version09234 from './09234.md';
import version09235 from './09235.md';
import version09236 from './09236.md';
import version09237 from './09237.md';
import version09238 from './09238.md';
import version09239 from './09239.md';
import version09243 from './09243.md';
import version09244 from './09244.md';
import version09245 from './09245.md';
import version09246 from './09246.md';
import version09247 from './09247.md';
import version09248 from './09248.md';
import version09249 from './09249.md';
import version09250 from './09250.md';
import version09251 from './09251.md';
import version09252 from './09252.md';
import version09253 from './09253.md';
import version09254 from './09254.md';
import version09255 from './09255.md';
import version09257 from './09257.md';
import version09259 from './09259.md';
import version09264 from './09264.md';
import version09266 from './09266.md';
import version09268 from './09268.md';
import version09269 from './09269.md';
import version09270 from './09270.md';
import version09271 from './09271.md';
import version09272 from './09272.md';
import version09273 from './09273.md';
import version09274 from './09274.md';
import version09276 from './09276.md';
import version09277 from './09277.md';

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
  '0.92.22': version09222,
  '0.92.23': version09223,
  '0.92.24': version09224,
  '0.92.25': version09225,
  '0.92.27': version09227,
  '0.92.28': version09228,
  '0.92.29': version09229,
  '0.92.30': version09230,
  '0.92.31': version09231,
  '0.92.32': version09232,
  '0.92.34': version09234,
  '0.92.35': version09235,
  '0.92.36': version09236,
  '0.92.37': version09237,
  '0.92.38': version09238,
  '0.92.39': version09239,
  '0.92.43': version09243,
  '0.92.44': version09244,
  '0.92.45': version09245,
  '0.92.46': version09246,
  '0.92.47': version09247,
  '0.92.48': version09248,
  '0.92.49': version09249,
  '0.92.50': version09250,
  '0.92.51': version09251,
  '0.92.52': version09252,
  '0.92.53': version09253,
  '0.92.54': version09254,
  '0.92.55': version09255,
  '0.92.57': version09257,
  '0.92.59': version09259,
  '0.92.64': version09264,
  '0.92.66': version09266,
  '0.92.68': version09268,
  '0.92.69': version09269,
  '0.92.70': version09270,
  '0.92.71': version09271,
  '0.92.72': version09272,
  '0.92.73': version09273,
  '0.92.74': version09274,
  '0.92.76': version09276,
  '0.92.77': version09277,
};
export const getUpdateContent = () => {
  return versionMap[version];
};

export { default as version0170 } from './0170.md';
