import cloneDeep from 'lodash/cloneDeep';
import {
  cleanEIP712Payload,
  isDeepJSON,
  MAX_TYPED_DATA_DEPTH,
  truncateDeepJSON,
} from '../src/ui/views/Approval/components/typedDataSafety';
import { parseSignTypedDataMessage } from '../src/ui/views/Approval/components/SignTypedDataExplain/parseSignTypedDataMessage';

function makeDeepPayload(depth: number) {
  let nested: any = 'leaf';
  for (let i = 0; i < depth; i += 1) {
    nested = { next: nested };
  }

  return {
    primaryType: 'Mail',
    types: {
      Mail: [{ name: 'foo', type: 'Nested' }],
      Nested: [{ name: 'next', type: 'Nested' }],
      EIP712Domain: [],
    },
    domain: {},
    message: { foo: nested },
  };
}

test('deep EIP-712 payloads need truncation before UI display handling', () => {
  const payload = makeDeepPayload(4000);

  expect(isDeepJSON(payload, MAX_TYPED_DATA_DEPTH)).toBe(true);

  const cleaned = cleanEIP712Payload(payload as any);
  expect(() => cloneDeep(cleaned)).toThrow(/Maximum call stack size exceeded/);

  const safeDisplayPayload = truncateDeepJSON(cleaned, MAX_TYPED_DATA_DEPTH);
  const displayMessage = parseSignTypedDataMessage(safeDisplayPayload as any);

  expect(() => JSON.stringify(displayMessage, null, 4)).not.toThrow();
});
