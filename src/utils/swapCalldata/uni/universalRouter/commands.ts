import {
  CommandType,
  UniversalRouterVersion,
} from '@uniswap/universal-router-sdk';
import { CalldataDecodeError } from '../../errors';
import {
  Context,
  setSwap,
  Swap,
  unwrapNative,
  wrapNative,
  setOutput,
  CONTRACT_BALANCE,
} from '../shared';
import type { RouterProfile } from './profiles';
import { decodeCommand, paramValues } from './sdk';
import { walkV4 } from './v4';

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
    // Strip execution flags before passing the command to the SDK parser.
    const command =
      parseInt(hex.slice(i * 2, i * 2 + 2), 16) & profile.commandMask;
    const commandStep = `${step}.commands[${i}].0x${command
      .toString(16)
      .padStart(2, '0')}`;
    const unsupported = () =>
      new CalldataDecodeError(
        commandStep,
        `Unsupported command 0x${command.toString(
          16
        )} for the current exact-input quote flow (Router ${profile.version})`
      );

    if (command === CommandType.V4_SWAP) {
      if (profile.version === UniversalRouterVersion.V1_2) {
        throw new CalldataDecodeError(
          commandStep,
          'Router 1.2 command 0x10 is Seaport, not a V4 swap'
        );
      }
      walkV4(inputs[i], swap, ctx, profile.version, `${commandStep}.v4`);
      continue;
    }
    if (
      (command === CommandType.PAY_PORTION_FULL_PRECISION &&
        profile.version !== UniversalRouterVersion.V2_1_1) ||
      (command === CommandType.BALANCE_CHECK_ERC20 &&
        profile.commandMask === 0x1f)
    )
      throw unsupported();
    if (
      ![
        CommandType.V3_SWAP_EXACT_IN,
        CommandType.V2_SWAP_EXACT_IN,
        CommandType.SWEEP,
        CommandType.TRANSFER,
        CommandType.PAY_PORTION,
        CommandType.PAY_PORTION_FULL_PRECISION,
        CommandType.WRAP_ETH,
        CommandType.UNWRAP_WETH,
        CommandType.BALANCE_CHECK_ERC20,
        CommandType.EXECUTE_SUB_PLAN,
      ].includes(command)
    )
      throw unsupported();

    const args = paramValues(
      decodeCommand(command, inputs[i], profile.version, commandStep).params
    );
    switch (command) {
      case CommandType.V3_SWAP_EXACT_IN:
      case CommandType.V2_SWAP_EXACT_IN: {
        const v3 = command === CommandType.V3_SWAP_EXACT_IN;
        const path = args.path;
        if (path.length < (v3 ? 1 : 2)) {
          throw new CalldataDecodeError(
            commandStep,
            'Swap path requires at least two tokens'
          );
        }
        const first = path[0];
        const last = path[path.length - 1];
        setSwap(
          swap,
          ctx,
          v3 ? first.tokenIn : first,
          v3 ? last.tokenOut : last,
          args.amountIn.toString(),
          args.amountOutMin.toString(),
          commandStep,
          { recipient: args.recipient, payerIsUser: args.payerIsUser }
        );
        break;
      }
      case CommandType.SWEEP:
      case CommandType.TRANSFER: {
        const transfer = command === CommandType.TRANSFER;
        const amount = (transfer ? args.value : args.amountMin).toString();
        const entireBalance = transfer && CONTRACT_BALANCE.eq(amount);
        setOutput(
          swap,
          ctx,
          args.token,
          args.recipient,
          entireBalance ? undefined : amount,
          transfer && !entireBalance
        );
        break;
      }
      case CommandType.WRAP_ETH:
        wrapNative(swap, ctx, args.amount.toString());
        break;
      case CommandType.UNWRAP_WETH:
        unwrapNative(swap, ctx, args.recipient, args.amountMin.toString());
        break;
      case CommandType.EXECUTE_SUB_PLAN:
        walkCommands(
          args.commands,
          args.inputs,
          swap,
          ctx,
          profile,
          `${commandStep}.subPlan`
        );
        break;
      // Fees and balance assertions are decoded but do not describe a payout.
      case CommandType.PAY_PORTION:
      case CommandType.PAY_PORTION_FULL_PRECISION:
      case CommandType.BALANCE_CHECK_ERC20:
        break;
    }
  }
};
