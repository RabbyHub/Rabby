export const ellipsis = (text: string) => {
  return text.replace(/^(.{6})(.*)(.{4})$/, '$1...$3');
};
