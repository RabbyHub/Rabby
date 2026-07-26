import {
  tokenizeSignMessageText,
  tokenizeSignTypedDataMessage,
} from '@/ui/views/Approval/components/signMessageHighlighter';
import {
  addSignMessageOriginFallback,
  hasSignMessageOriginMismatch,
} from '@/ui/views/Approval/components/signMessageOrigin';

const address = '0xde709f2102306220921060314715629080e2fb77';

describe('sign message highlighter', () => {
  test('finds valid urls and addresses without swallowing punctuation', () => {
    expect(
      tokenizeSignMessageText(
        `Visit [https://example.com/path], send to ${address}.`
      )
    ).toEqual([
      { type: 'text', value: 'Visit [' },
      { type: 'url', value: 'https://example.com/path' },
      { type: 'text', value: '], send to ' },
      { type: 'address', value: address },
      { type: 'text', value: '.' },
    ]);
  });

  test('does not mark transaction hashes or bad checksum addresses', () => {
    const txHash = `0x${'1'.repeat(64)}`;
    const badChecksum = '0xDE709F2102306220921060314715629080e2fb77';

    expect(tokenizeSignMessageText(`${txHash} ${badChecksum}`)).toEqual([
      { type: 'text', value: `${txHash} ${badChecksum}` },
    ]);
  });

  test('finds an address inside a url without changing the displayed text', () => {
    const url = `https://etherscan.io/address/${address}`;
    const tokens = tokenizeSignMessageText(url);

    expect(tokens.map((token) => token.value).join('')).toBe(url);
    expect(tokens).toEqual([
      { type: 'url', value: 'https://etherscan.io/address/' },
      { type: 'address', value: address },
    ]);
  });

  test('finds only values declared as nested typed-data addresses', () => {
    const withoutPrefix = 'de709f2102306220921060314715629080e2fb77';
    const recipient = '0x27b1fdb04752bbc536007a920d24acb045561c26';
    const typedData = {
      primaryType: 'Mail',
      types: {
        Mail: [
          { name: 'from', type: 'Person' },
          { name: 'recipients', type: 'address[]' },
          { name: 'note', type: 'string' },
        ],
        Person: [{ name: 'wallet', type: 'address' }],
      },
      message: {
        from: { wallet: withoutPrefix },
        recipients: [recipient],
        note: recipient,
      },
    };
    const message = JSON.stringify(typedData.message, null, 4);
    const tokens = tokenizeSignTypedDataMessage(typedData, message);

    expect(tokens.map((token) => token.value).join('')).toBe(message);
    expect(tokens.filter((token) => token.type === 'address')).toEqual([
      {
        type: 'address',
        value: withoutPrefix,
        address: `0x${withoutPrefix}`,
      },
      { type: 'address', value: recipient, address: recipient },
    ]);
  });

  test('warns when any visible hostname differs from the request hostname', () => {
    expect(
      hasSignMessageOriginMismatch(
        'example.com\nURI: https://example.com/login',
        'https://EXAMPLE.com.:443'
      )
    ).toBe(false);
    expect(
      hasSignMessageOriginMismatch(
        'example.com\nResource: https://docs.example.org/terms',
        'https://example.com'
      )
    ).toBe(true);
    expect(
      hasSignMessageOriginMismatch(
        'https://app.example.com',
        'https://example.com'
      )
    ).toBe(true);
    expect(
      hasSignMessageOriginMismatch(
        'https://xn--fsqu00a.xn--0zwm56d',
        'https://例子.测试'
      )
    ).toBe(false);
    expect(
      hasSignMessageOriginMismatch(
        '"verifying_contract": "intents.near"',
        'https://near.com'
      )
    ).toBe(false);
    expect(
      hasSignMessageOriginMismatch(
        '"verifying_contract": "https://intents.near"',
        'https://near.com'
      )
    ).toBe(true);
    expect(
      hasSignMessageOriginMismatch(
        'No hostname in this message',
        'https://example.com'
      )
    ).toBe(false);
  });

  test('adds the origin rule only for an unparsed mismatched request', () => {
    const ctx = { contractCall: {} } as any;
    const options = {
      message: 'https://docs.example.org',
      origin: 'https://example.com',
    };

    expect(
      addSignMessageOriginFallback(ctx, {
        ...options,
        isUnparsedAction: false,
        isInternalOrigin: false,
      })
    ).toBe(ctx);
    expect(
      addSignMessageOriginFallback(ctx, {
        message: 'example.com',
        origin: 'https://example.com',
        isUnparsedAction: true,
        isInternalOrigin: false,
      })
    ).toBe(ctx);
    expect(
      addSignMessageOriginFallback(ctx, {
        ...options,
        isUnparsedAction: true,
        isInternalOrigin: false,
      })
    ).toEqual({
      contractCall: {},
      verifyAddress: {
        allowOrigins: [],
        origin: 'https://example.com',
      },
    });
  });
});
