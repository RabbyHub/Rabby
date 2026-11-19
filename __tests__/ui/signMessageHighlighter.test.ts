import {
  tokenizeSignMessageText,
  tokenizeSignTypedDataMessage,
  tokenizeSignTypedDataV1Message,
} from '@/ui/views/Approval/components/signMessageHighlighter';
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
});

describe('legacy typed-data field arrays', () => {
  const other = '0x27b1fdb04752bbc536007a920d24acb045561c26';

  test('preserves duplicate names, types and values in order, including __proto__', () => {
    const fields = [
      { name: 'amount', type: 'uint256', value: '1000000' },
      { name: 'amount', type: 'uint256', value: '1' },
      { name: '__proto__', type: 'string', value: 'visible' },
      { name: 'recipient', type: 'address', value: address },
      { name: 'recipient', type: 'address', value: other },
    ];
    const original = JSON.stringify(fields, null, 4);
    const tokens = tokenizeSignTypedDataV1Message(fields, original);
    expect(tokens.map((token) => token.value).join('')).toBe(original);
    expect(
      tokens
        .filter((token) => token.type === 'address')
        .map((token) => token.address)
    ).toEqual([address, other]);
    expect(JSON.stringify(fields, null, 4)).toBe(original);
  });

  test('keeps typed address arrays highlighted without treating string fields as addresses', () => {
    const fields = [
      {
        name: 'recipients',
        type: 'address[]',
        value: [address, other.slice(2)],
      },
      { name: 'note', type: 'string', value: address },
    ];
    const formatted = JSON.stringify(fields, null, 4);
    const tokens = tokenizeSignTypedDataV1Message(fields, formatted);
    expect(tokens.map((token) => token.value).join('')).toBe(formatted);
    expect(
      tokens
        .filter((token) => token.type === 'address')
        .map((token) => token.address)
    ).toEqual([address, other]);
  });

  test('renders malformed legacy fields as supplied without crashing the highlighter', () => {
    const fields = [
      null,
      1,
      { name: 'missing type', value: 1 },
      { name: 'unknown', type: '__proto__', value: {} },
    ] as any;
    const formatted = JSON.stringify(fields, null, 4);
    expect(
      tokenizeSignTypedDataV1Message(fields, formatted)
        .map((token) => token.value)
        .join('')
    ).toBe(formatted);
  });
});
