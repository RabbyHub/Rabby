import version0170 from './0170.md';
const version = process.env.release || '0';
const versionMap = {
  '0.17.0': version0170,
};
export const getUpdateContent = () => {
  return versionMap[version];
};

export { default as version0170 } from './0170.md';
