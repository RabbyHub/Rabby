import version0161 from './test0161.md';
const version = process.env.version!.split('/')[0].replace(/[^0-9]/g, '');
const versionMap = {
  '0161': version0161,
  '0167': version0161,
};
export const getUpdateContent = () => {
  return versionMap[version];
};

export { default as version0161 } from './test0161.md';
