export function ensurePrefix(str = '', prefix = '/') {
  return str.startsWith(prefix) ? str : prefix + str;
}

export function ensureSuffix(str = '', suffix = '/') {
  return str.endsWith(suffix) ? str : str + suffix;
}

export function unPrefix(str = '', prefix = '/') {
  return str.startsWith(prefix) ? str.slice(prefix.length) : str;
}

export function unSuffix(str = '', suffix = '/') {
  return str.endsWith(suffix) ? str.slice(0, -suffix.length) : str;
}

function escapeRegExp(str: string) {
  return str.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

export function safeBuildRegExp(
  ...[str, flags]: ConstructorParameters<typeof RegExp>
) {
  return new RegExp(str instanceof RegExp ? str : escapeRegExp(str), flags);
}
