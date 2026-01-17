import {
  filterPrimaryType,
  parseSignTypedDataMessage,
} from '@/ui/views/Approval/components/SignTypedDataExplain/parseSignTypedDataMessage';

declare const describe: any;
declare const it: any;
declare const expect: any;

describe('parseSignTypedDataMessage', () => {
  it('returns raw string when JSON is invalid', () => {
    const raw = '{not-json';
    expect(parseSignTypedDataMessage(raw)).toBe(raw);
  });

  it('returns message when primaryType is missing', () => {
    const raw = {
      message: { hello: 'world' },
    };
    expect(parseSignTypedDataMessage(raw)).toEqual({ hello: 'world' });
  });

  it('returns filtered message for valid typed data payload', () => {
    const raw = {
      primaryType: 'Mail',
      types: {
        Mail: [
          { name: 'from', type: 'address' },
          { name: 'to', type: 'address' },
        ],
      },
      message: {
        from: '0x1111111111111111111111111111111111111111',
        to: '0x2222222222222222222222222222222222222222',
        extra: 'ignored',
      },
    };

    expect(parseSignTypedDataMessage(raw)).toEqual({
      from: '0x1111111111111111111111111111111111111111',
      to: '0x2222222222222222222222222222222222222222',
    });
  });
});

describe('filterPrimaryType', () => {
  it('falls back to message when types[primaryType] is missing', () => {
    const message = { a: 1 };
    expect(
      filterPrimaryType({
        primaryType: 'Mail',
        types: {},
        message,
      })
    ).toEqual(message);
  });
});
