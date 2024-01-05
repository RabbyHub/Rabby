export const query2obj = (str: string) => {
  const res: Record<string, string> = {};
  str.replace(/([^=?#&]*)=([^?#&]*)/g, function (_, $1: string, $2: string) {
    res[decodeURIComponent($1)] = decodeURIComponent($2);
    return '';
  });
  return res;
};

export const obj2query = (obj: Record<string, string>) => {
  return Object.keys(obj)
    .map(function (key) {
      return encodeURIComponent(key) + '=' + encodeURIComponent(obj[key]);
    })
    .join('&');
};

export const isValidateUrl = (url: string) => {
  return /^(https?|http?):\/\/(localhost|\S)+/.test(url);
};
