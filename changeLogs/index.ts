import version0161 from './test0161.md';
const version = process.env.release || '0';
const versionMap = {
  '0.16.1': version0161,
  '0.16.4': version0161,
  '0.17': version0161,
  '0.17.1': version0161,
};
export const getUpdateContent = () => {
  return versionMap[version];
};

export { default as version0161 } from './test0161.md';
