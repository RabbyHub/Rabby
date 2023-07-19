export function detectClientOS(
  userAgent: typeof Navigator.prototype.userAgent = typeof window ===
  'undefined'
    ? ''
    : window.navigator.userAgent
) {
  if (userAgent.indexOf('Win') !== -1) return 'win32' as const;
  if (userAgent.indexOf('Mac') !== -1) return 'darwin' as const;
  if (userAgent.indexOf('X11') !== -1) return 'unix' as const;
  if (userAgent.indexOf('Linux') !== -1) return 'linux' as const;

  return 'unknown' as const;
}
