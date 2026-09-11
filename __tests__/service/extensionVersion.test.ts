import {
  compareExtensionVersions,
  versionInfoSchema,
} from '@/utils/extensionVersion';

describe('extension version comparison', () => {
  it.each([
    ['0.94.7', '0.94.10', -1],
    ['0.94.10', '0.94.7', 1],
    ['1.0.0', '0.94.10', 1],
    ['1.0.0', '1.0.0.0', 0],
    ['1.0.0.1', '1.0.0', 1],
  ])('compares %s to %s numerically', (a, b, result) => {
    expect(compareExtensionVersions(a as string, b as string)).toBe(result);
  });
  it.each(['', '1.0', '1.0.0-beta', 'broken'])(
    'rejects invalid versions %s',
    (version) => {
      expect(() => compareExtensionVersions(version, '1.0.0')).toThrow();
    }
  );
  it('rejects unsupported levels', () => {
    expect(
      versionInfoSchema.safeParse({
        version: { id: '1.0.0', level: 5, changelog: '' },
        latest_version: { id: '1.1.0', level: 1, changelog: '' },
      }).success
    ).toBe(false);
  });
});
