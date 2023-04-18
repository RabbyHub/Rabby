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
};
export const getUpdateContent = () => {
  return versionMap[version];
};

export { default as version0170 } from './0170.md';
