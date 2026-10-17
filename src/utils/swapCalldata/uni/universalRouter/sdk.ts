import { CommandParser, CommandType } from '@uniswap/universal-router-sdk';
import type {
  Param,
  UniversalRouterVersion,
} from '@uniswap/universal-router-sdk';
import { utils } from 'ethers';
import { decodeAt } from '../../errors';

const planTypes = ['bytes', 'bytes[]'];

export const readPlan = (input: string, step: string) =>
  decodeAt(step, () => {
    const [commands, inputs] = utils.defaultAbiCoder.decode(planTypes, input);
    return { commands: commands as string, inputs: inputs as string[] };
  });

export const paramValues = (params: readonly Param[]): Record<string, any> =>
  Object.fromEntries(params.map(({ name, value }) => [name, value]));

// Parse one command at a time so SDK errors retain the original command index.
// The SDK selects all version-specific parameter schemas and V3 path parsers.
export const decodeCommand = (
  command: number,
  input: string,
  version: UniversalRouterVersion,
  step: string
) =>
  decodeAt(step, () => {
    const calldata = CommandParser.INTERFACE.encodeFunctionData(
      'execute(bytes,bytes[])',
      [utils.hexlify(command), [input]]
    );
    return CommandParser.parseCalldata(calldata, version).commands[0];
  });

// Isolate one action before delegating to the SDK's nested V4 parser. This
// preserves action-level diagnostics without maintaining our own V4 structs.
export const decodeV4Action = (
  action: number,
  input: string,
  version: UniversalRouterVersion,
  step: string
) =>
  decodeAt(step, () => {
    const plan = utils.defaultAbiCoder.encode(planTypes, [
      utils.hexlify(action),
      [input],
    ]);
    const decoded = decodeCommand(CommandType.V4_SWAP, plan, version, step)
      .params[0];
    return { name: decoded.name, params: paramValues(decoded.value) };
  });
