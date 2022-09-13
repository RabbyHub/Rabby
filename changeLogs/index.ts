import version0170 from './0170.md';
import version0340 from './0340.md';
import version0460 from './0460.md';
const version = process.env.release || '0';
const versionMap = {
  '0.17.0': version0170,
  '0.34.0': version0340,
  '0.46.0': version0460,
};
export const getUpdateContent = () => {
  return versionMap[version];
};

export { default as version0170 } from './0170.md';
