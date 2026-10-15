import { utils } from 'ethers';
import { CalldataDecodeError, decodeAt } from '../../errors';
import {
  MulticallABI,
  RouterPaymentsABI,
  SwapRouter02ABI,
  SwapRouterABI,
  V2RouterABI,
} from '../abi';
import {
  chainToken,
  Context,
  MSG_SENDER,
  Swap,
  setReceiver,
  unwrapNative,
  wrapNative,
} from '../shared';
import { decodeV2Swap } from './v2';
import { decodeV3Swap } from './v3';

const interfaces = [
  { name: 'swapRouterV3', abi: new utils.Interface(SwapRouterABI) },
  { name: 'swapRouter02', abi: new utils.Interface(SwapRouter02ABI) },
  { name: 'routerV2', abi: new utils.Interface(V2RouterABI) },
  { name: 'multicall', abi: new utils.Interface(MulticallABI) },
  { name: 'payments', abi: new utils.Interface(RouterPaymentsABI) },
];

const selectorVersions = new Map(
  interfaces.flatMap((version) =>
    Object.values(version.abi.functions).map(
      (fragment) => [version.abi.getSighash(fragment), version] as const
    )
  )
);

const versionLabels: Record<string, string> = {
  swapRouterV3: 'SwapRouter V3',
  swapRouter02: 'SwapRouter02',
  routerV2: 'Router V2',
};

export const getSwapRouterVersion = (data: string): string | undefined => {
  const version = selectorVersions.get(data.slice(0, 10).toLowerCase());
  if (!version) return undefined;
  if (version.name !== 'multicall') return versionLabels[version.name];
  const calls = version.abi.parseTransaction({ data }).args.data as string[];
  for (const call of calls) {
    const nestedVersion = getSwapRouterVersion(call);
    if (nestedVersion) return nestedVersion;
  }
  return undefined;
};

const walkCall = (data: string, swap: Swap, ctx: Context, path: string) => {
  const selector = data.slice(0, 10).toLowerCase();
  const version = selectorVersions.get(selector);
  if (!version)
    throw new CalldataDecodeError(
      path,
      `Unsupported SwapRouter selector: ${selector}`
    );
  const step = `${path}.${version.name}`;
  const transaction = decodeAt(step, () =>
    version.abi.parseTransaction({ data })
  );

  if (version.name === 'multicall') {
    (transaction.args.data as string[]).forEach((call, index) =>
      walkCall(call, swap, ctx, `${step}[${index}]`)
    );
  } else if (transaction.name.startsWith('exact')) {
    decodeV3Swap(transaction, swap, ctx, step);
  } else if (transaction.name.startsWith('swap')) {
    decodeV2Swap(transaction, swap, ctx, step);
  } else {
    const { name, args } = transaction;
    switch (name) {
      case 'unwrapWETH9':
        unwrapNative(
          swap,
          ctx,
          args.recipient || MSG_SENDER,
          args.amountMinimum.toString()
        );
        break;
      case 'sweepToken':
        swap.toToken = chainToken(args.token, ctx.native);
        swap.minReceive = args.amountMinimum.toString();
        setReceiver(swap, args.recipient || MSG_SENDER, ctx);
        break;
      case 'wrapETH':
        wrapNative(swap, ctx, args.value.toString());
        break;
      case 'pull':
        swap.fromToken = chainToken(args.token, ctx.native);
        swap.fromTokenAmount = args.value.toString();
        break;
      // Refunds and permits do not describe the received swap asset.
      case 'refundETH':
      case 'selfPermit':
      case 'selfPermitIfNecessary':
      case 'selfPermitAllowed':
      case 'selfPermitAllowedIfNecessary':
        break;
      default:
        throw new CalldataDecodeError(
          step,
          `Unsupported SwapRouter function: ${name}`
        );
    }
  }
};

export const decodeSwapRouter = (data: string, ctx: Context): Swap => {
  const swap: Swap = {};
  walkCall(data, swap, ctx, 'decode.uni');
  return swap;
};
