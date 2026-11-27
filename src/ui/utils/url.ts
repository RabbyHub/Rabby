/**
 * Parse a query string into a flat object of strings.
 *
 * Accepts `?a=1`, `a=1`, or a full URL / hash-router href such as
 * `index.html#/route?a=1`: everything after the first `?` is parsed, up to a
 * `#`. Repeated keys keep the last value, `+` decodes to a space, and a
 * malformed escape never throws: `%ZZ` stays as-is and invalid UTF-8 such
 * as `%E0` becomes U+FFFD.
 */
export const query2obj = (str: string) => {
  const queryStart = str.indexOf('?');
  let query = queryStart === -1 ? str : str.slice(queryStart + 1);
  const hashStart = query.indexOf('#');
  if (hashStart !== -1) {
    query = query.slice(0, hashStart);
  }
  return Object.fromEntries(new URLSearchParams(query)) as Record<
    string,
    string
  >;
};

/**
 * Serialize a flat object into a query string, without a leading `?`.
 *
 * Kept on `encodeURIComponent` rather than `URLSearchParams#toString` on
 * purpose: switching would change the bytes of every URL and key built here
 * (`+` for spaces, `!'()~` escaped), including the keys from
 * `encodeRevokeItem` and `encodePermit2GroupKey`. `query2obj` reads both
 * forms. `null` and `undefined` are written as `"null"` and `"undefined"`;
 * leave such keys out when the reader should see them as missing.
 */
export const obj2query = (obj: Record<string, string | number | boolean>) => {
  return Object.keys(obj)
    .map(function (key) {
      return encodeURIComponent(key) + '=' + encodeURIComponent(obj[key]);
    })
    .join('&');
};

export const isValidateUrl = (url: string) => {
  return /^(https?|http?):\/\/(localhost|\S)+/.test(url);
};
