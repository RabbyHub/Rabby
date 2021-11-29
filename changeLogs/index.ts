import version0161 from './test0161.md';
const version = process.env.release || '0';
const versionMap = {
  '0.16.1': version0161,
};
export const getUpdateContent = () => {
  return versionMap[version];
};

export { default as version0161 } from './test0161.md';
