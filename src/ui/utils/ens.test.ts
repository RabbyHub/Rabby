import { normalizeXdcidName } from './ens';

describe('normalizeXdcidName', () => {
  it('canonicalizes valid XDCID names', () => {
    expect(normalizeXdcidName(' Alice.XDC ')).toBe('alice.xdc');
    expect(normalizeXdcidName('abc-123.xdc')).toBe('abc-123.xdc');
  });

  it('rejects invalid XDCID labels', () => {
    expect(normalizeXdcidName('ab.xdc')).toBeNull();
    expect(normalizeXdcidName('-alice.xdc')).toBeNull();
    expect(normalizeXdcidName('alice-.xdc')).toBeNull();
    expect(normalizeXdcidName('alice_name.xdc')).toBeNull();
    expect(normalizeXdcidName('alice.eth')).toBeNull();
  });
});
