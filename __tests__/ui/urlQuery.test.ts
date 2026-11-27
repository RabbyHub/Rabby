import { obj2query, query2obj } from '@/ui/utils/url';

describe('query2obj', () => {
  it('parses a search string with or without the leading "?"', () => {
    expect(query2obj('?a=1&b=two')).toEqual({ a: '1', b: 'two' });
    expect(query2obj('a=1&b=two')).toEqual({ a: '1', b: 'two' });
    expect(query2obj('')).toEqual({});
    expect(query2obj('?')).toEqual({});
  });

  it('reads the query inside a hash-router href', () => {
    // RequestPermission passes window.location.href.
    expect(
      query2obj(
        'chrome-extension://id/index.html#/request-permission?type=imkey&from=approval'
      )
    ).toEqual({ type: 'imkey', from: 'approval' });
    expect(query2obj('index.html?a=1#/route')).toEqual({ a: '1' });
  });

  it('decodes values, including an encoded nested query', () => {
    expect(
      query2obj(
        `?from=${encodeURIComponent('/desktop/profile?utm_source=debank')}`
      )
    ).toEqual({ from: '/desktop/profile?utm_source=debank' });
    expect(query2obj('?q=a%20b&r=a+b')).toEqual({ q: 'a b', r: 'a b' });
  });

  it('does not throw on a malformed escape', () => {
    // decodeURIComponent threw URIError on both.
    expect(query2obj('?a=%ZZ&b=1')).toEqual({ a: '%ZZ', b: '1' });
    expect(query2obj('?a=%E0&b=1')).toEqual({ a: '�', b: '1' });
  });

  it('keeps the last value of a repeated key', () => {
    expect(query2obj('?from=/a&from=/b')).toEqual({ from: '/b' });
  });
});

describe('obj2query', () => {
  it('encodes with encodeURIComponent, keeping its exact output', () => {
    expect(obj2query({ a: 'x y', b: "!'()~", c: '&=?#+' })).toBe(
      "a=x%20y&b=!'()~&c=%26%3D%3F%23%2B"
    );
    expect(obj2query({ keyringId: 3, ok: true })).toBe('keyringId=3&ok=true');
    expect(obj2query({})).toBe('');
  });

  it('round-trips through query2obj', () => {
    const obj = {
      chainServerId: 'eth',
      permit2ContractId: '0x000000000022D473030F116dDEE9F6B43aC78BA3',
      label: 'a b+c&d=e?f#g%h',
    };
    expect(query2obj(obj2query(obj))).toEqual(obj);
    expect(query2obj(`revoke-item://?${obj2query(obj)}`)).toEqual(obj);
  });
});
