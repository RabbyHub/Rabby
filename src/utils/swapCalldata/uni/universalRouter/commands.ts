import { CalldataDecodeError } from '../../errors';
import {
  Context,
  decodeAbi,
  setSwap,
  Swap,
  unwrapNative,
  v3PathTokens,
  wrapNative,
  setOutput,
  CONTRACT_BALANCE,
} from '../shared';
import type { RouterProfile } from './profiles';
import { walkV4 } from './v4';

const decodeAmmSwap = (
  input: string,
  swap: Swap,
  ctx: Context,
  v3: boolean,
  exactOut: boolean,
  step: string
) => {
  const [recipient, amountA, amountB, path, payerIsUser] = decodeAbi(
    ['address', 'uint256', 'uint256', v3 ? 'bytes' : 'address[]', 'bool'],
    input,
    step
  );
  const tokens = v3 ? v3PathTokens(path, step) : (path as string[]);
  if (tokens.length < 2)
    throw new CalldataDecodeError(
      step,
      'Swap path requires at least two tokens'
    );
  const first = tokens[0];
  const last = tokens[tokens.length - 1];
  // V3 exact-output paths are reversed; V2 exact-output paths are not.
  const reverse = v3 && exactOut;
  setSwap(
    swap,
    ctx,
    reverse ? last : first,
    reverse ? first : last,
    amountA.toString(),
    amountB.toString(),
    exactOut,
    step,
    { recipient, payerIsUser }
  );
};

export const walkCommands = (
  commands: string,
  inputs: string[],
  swap: Swap,
  ctx: Context,
  profile: RouterProfile,
  step = `decode.uni.universal.${profile.version}`
) => {
  const hex = commands.slice(2);
  if (hex.length / 2 !== inputs.length)
    throw new CalldataDecodeError(step, 'Commands and inputs lengths differ');

  for (let i = 0; i < inputs.length; i++) {
    const command =
      parseInt(hex.slice(i * 2, i * 2 + 2), 16) & profile.commandMask;
    const input = inputs[i];
    const commandStep = `${step}.commands[${i}].0x${command
      .toString(16)
      .padStart(2, '0')}`;
    switch (command) {
      case 0x00:
      case 0x01:
        decodeAmmSwap(input, swap, ctx, true, command === 0x01, commandStep);
        break;
      case 0x08:
      case 0x09:
        decodeAmmSwap(input, swap, ctx, false, command === 0x09, commandStep);
        break;
      case 0x02: // PERMIT2_TRANSFER_FROM
      case 0x03: // PERMIT2_PERMIT_BATCH
      case 0x06: // PAY_PORTION
      case 0x0a: // PERMIT2_PERMIT
      case 0x0d: // PERMIT2_TRANSFER_FROM_BATCH
        break;
      case 0x0e: // BALANCE_CHECK_ERC20, added after the original V1 deployments.
        if (profile.commandMask === 0x1f)
          throw new CalldataDecodeError(
            commandStep,
            'Command 0x0e is not defined in this Router version'
          );
        break;
      case 0x07:
        if (profile.commandMask !== 0x7f || profile.version === '2.1.0')
          throw new CalldataDecodeError(
            commandStep,
            'Command 0x07 is not defined in this Router version'
          );
        break;
      case 0x04:
      case 0x05: {
        const [token, recipient, amount] = decodeAbi(
          ['address', 'address', 'uint256'],
          input,
          commandStep
        );
        const entireBalance =
          command === 0x05 && CONTRACT_BALANCE.eq(amount.toString());
        setOutput(
          swap,
          ctx,
          token,
          recipient,
          entireBalance ? undefined : amount.toString(),
          command === 0x05 && !entireBalance
        );
        break;
      }
      case 0x0b: {
        const [, amount] = decodeAbi(
          ['address', 'uint256'],
          input,
          commandStep
        );
        wrapNative(swap, ctx, amount.toString());
        break;
      }
      case 0x0c: {
        const [recipient, minimum] = decodeAbi(
          ['address', 'uint256'],
          input,
          commandStep
        );
        unwrapNative(swap, ctx, recipient, minimum.toString());
        break;
      }
      case 0x10:
        if (!profile.v4Version) {
          throw new CalldataDecodeError(
            commandStep,
            `Router ${profile.version} command 0x10 is Seaport, not a V4 swap`
          );
        }
        walkV4(input, swap, ctx, profile.v4Version, `${commandStep}.v4`);
        break;
      case 0x21: {
        const [nestedCommands, nestedInputs] = decodeAbi(
          ['bytes', 'bytes[]'],
          input,
          commandStep
        );
        walkCommands(
          nestedCommands,
          nestedInputs,
          swap,
          ctx,
          profile,
          `${commandStep}.subPlan`
        );
        break;
      }
      default:
        throw new CalldataDecodeError(
          commandStep,
          `Unsupported command 0x${command.toString(16)} for Router ${
            profile.version
          }`
        );
    }
  }
};
