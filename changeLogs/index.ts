import version09318 from './09318.md';
import version09319 from './09319.md';

const version = process.env.release || '0';
const versionMap = {
  '0.93.18': version09318,
  '0.93.19': version09319,
};
export const getUpdateContent = () => {
  return versionMap[version];
};

export { default as version0170 } from './0170.md';
