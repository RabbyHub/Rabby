import { utils } from 'ethers';
import {
  decodeCalldata,
  getCalldataVersion,
  UniABI,
} from '@/utils/swapCalldata';
import recorded from '../fixtures/swap-calldata/recorded-swaps-2026-10-16.json';

// Keep historical raw quotes intact; only Uni belongs to the active test scope.
const samples = recorded.cases.filter(
  (sample) => sample.record.dex === 'Uniswap'
);

const uni = new utils.Interface(UniABI);
const refundRegressions = samples.filter((sample) => sample.knownFailure);
const transaction = (sample: typeof samples[number]) => ({
  ...sample.record.quote.tx,
  chainId: sample.record.chainId,
});
const decode = (sample: typeof samples[number]) =>
  decodeCalldata(sample.record.dex, transaction(sample), {
    nativeTokenAddress: sample.record.request.nativeTokenAddress,
  });

// Inspect the raw command bytes independently of the swap decoder's output.
const routeFamilies = (commands: string, inputs: readonly string[]) => {
  const protocols = new Set<string>();
  Array.from(utils.arrayify(commands)).forEach((raw, index) => {
    const command = raw & 0x7f;
    if (command === 0x00 || command === 0x01) protocols.add('V3');
    if (command === 0x08 || command === 0x09) protocols.add('V2');
    if (command === 0x10) {
      const [actions] = utils.defaultAbiCoder.decode(
        ['bytes', 'bytes[]'],
        inputs[index]
      );
      if (
        Array.from(utils.arrayify(actions)).some(
          (action) => action >= 0x06 && action <= 0x09
        )
      )
        protocols.add('V4');
    }
    if (command === 0x21) {
      const [nestedCommands, nestedInputs] = utils.defaultAbiCoder.decode(
        ['bytes', 'bytes[]'],
        inputs[index]
      );
      routeFamilies(nestedCommands, nestedInputs)
        .split('+')
        .forEach((protocol) => protocols.add(protocol));
    }
  });
  return Array.from(protocols).sort().join('+');
};

describe('2026-10-16 real quote dataset coverage', () => {
  it('covers every Uni quote, excluding backend and no-quote errors', () => {
    expect(samples).toHaveLength(63);
    expect(new Set(samples.map((sample) => sample.recordId)).size).toBe(63);
    expect(
      samples.filter((sample) => sample.record.status === 'passed')
    ).toHaveLength(61);
    expect(refundRegressions.map((sample) => sample.recordId)).toEqual([
      548,
      562,
    ]);
    samples.forEach((sample) => {
      expect(sample.recordId).toBe(sample.record.id);
      expect(sample.record.quote.tx.data).toMatch(/^0x[0-9a-f]+$/i);
      expect(['passed', 'failed']).toContain(sample.record.status);
    });
  });

  it('contains all six Uni protocol combinations', () => {
    const families: Record<string, number> = {};
    samples.forEach((sample) => {
      const tx = transaction(sample);
      const parsed = uni.parseTransaction(tx);
      const family = routeFamilies(parsed.args.commands, parsed.args.inputs);
      expect(family).toBe(sample.route.family);
      const key = `${sample.record.dex} / ${family}`;
      families[key] = (families[key] || 0) + 1;
    });
    expect(families).toEqual({
      'Uniswap / V2': 3,
      'Uniswap / V3': 30,
      'Uniswap / V4': 21,
      'Uniswap / V2+V3': 1,
      'Uniswap / V2+V4': 3,
      'Uniswap / V3+V4': 5,
    });
  });

  it('retains every observed version, proxy variant and command shape', () => {
    expect(
      new Set(samples.map((sample) => sample.route.routerVersion))
    ).toEqual(new Set(['1.2', '2.0', '2.1.1']));
    expect(
      new Set(
        samples.map((sample) =>
          [
            sample.route.routerVersion,
            sample.route.entry,
            sample.route.family,
          ].join('|')
        )
      ).size
    ).toBe(15);
    expect(
      new Set(
        samples.map((sample) =>
          [
            sample.route.commands.join(','),
            sample.route.v4Actions.join(','),
          ].join('|')
        )
      ).size
    ).toBe(27);
    samples.forEach((sample) => {
      expect(getCalldataVersion(sample.record.dex, transaction(sample))).toBe(
        sample.record.version
      );
    });
  });
});

describe('2026-10-16 calldata must decode to the expected result', () => {
  // Diagnostic markers never exempt a quote from successful-result assertions.
  it.each(samples)('$name', (sample) => {
    const decoded = decode(sample);
    expect(
      decoded && {
        ...decoded,
        fromToken: decoded.fromToken.toLowerCase(),
        toToken: decoded.toToken.toLowerCase(),
        toTokenReceiver: decoded.toTokenReceiver.toLowerCase(),
      }
    ).toEqual(sample.expected);
  });
});

describe('2026-10-16 native refund output regressions', () => {
  it.each(refundRegressions)(
    'pins the intended output from the original SWEEP: $name',
    (sample) => {
      const parsed = uni.parseTransaction(transaction(sample));
      const commands = Array.from(utils.arrayify(parsed.args.commands));
      const sweepIndex = commands.lastIndexOf(0x04);
      const [token, recipient, minimum] = utils.defaultAbiCoder.decode(
        ['address', 'address', 'uint256'],
        parsed.args.inputs[sweepIndex]
      );
      expect(token.toLowerCase()).toBe(sample.expected.toToken);
      expect(recipient.toLowerCase()).toBe(sample.expected.toTokenReceiver);
      expect(minimum.toString()).toBe(sample.expected.minReceiveToTokenAmount);
      const index = sample.knownFailure!.firstIncorrectCommandIndex;
      expect(commands[index]).toBe(0x0c);
      const [, refundMinimum] = utils.defaultAbiCoder.decode(
        ['address', 'uint256'],
        parsed.args.inputs[index]
      );
      expect(refundMinimum.toString()).toBe('0');
      expect(sample.expected.fromToken).not.toBe(sample.expected.toToken);
    }
  );
});
