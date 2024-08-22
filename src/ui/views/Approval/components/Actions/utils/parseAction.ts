import {
  ParseAction,
  ParseActionParameters,
  ParsedActionData,
  ParseTextActionParameters,
  ParseTransactionActionParameters,
  ParseTypedDataActionParameters,
} from './types';
import { parseActionSend } from './actions/send/parseAction';
import { parseActionApproveNFT } from './actions/approveNFT/parseAction';
import { parseActionApproveNFTCollection } from './actions/approveNFTCollection/parseAction';
import { parseActionApproveToken } from './actions/approveToken/parseAction';
import { parseActionAssetOrder } from './actions/assetOrder/parseAction';
import { parseActionCancelTx } from './actions/cancelTx/parseAction';
import { parseActionCommon } from './actions/common/parseAction';
import { parseActionContractCall } from './actions/contractCall/parseAction';
import { parseActionCrossSwapToken } from './actions/crossSwapToken/parseAction';
import { parseActionCrossToken } from './actions/crossToken/parseAction';
import { parseActionDeployContract } from './actions/deployContract/parseAction';
import { parseActionPushMultiSig } from './actions/pushMultiSig/parseAction';
import { parseActionRevokeNFT } from './actions/revokeNFT/parseAction';
import { parseActionRevokeNFTCollection } from './actions/revokeNFTCollection/parseAction';
import { parseActionRevokePermit2 } from './actions/revokePermit2/parseAction';
import { parseActionRevokeToken } from './actions/revokeToken/parseAction';
import { parseActionSendNFT } from './actions/sendNFT/parseAction';
import { parseActionSwap } from './actions/swap/parseAction';
import { parseActionUnwrapToken } from './actions/unwrapToken/parseAction';
import { parseActionWrapToken } from './actions/wrapToken/parseAction';
import { parseActionPermit2BatchRevokeToken } from './actions/permit2BatchRevokeToken/parseAction';
import { parseActionBatchPermit2 } from './actions/batchPermit2/parseAction';
import { parseActionBatchSellNFT } from './actions/batchSellNFT/parseAction';
import { parseActionBuyNFT } from './actions/buyNFT/parseAction';
import { parseActionCoboSafeCreate } from './actions/coboSafeCreate/parseAction';
import { parseActionCoboSafeModificationDelegatedAddress } from './actions/coboSafeModificationDelegatedAddress/parseAction';
import { parseActionCoboSafeModificationRole } from './actions/coboSafeModificationRole/parseAction';
import { parseActionCoboSafeModificationTokenApproval } from './actions/coboSafeModificationTokenApproval/parseAction';
import { parseActionCreateKey } from './actions/createKey/parseAction';
import { parseActionPermit } from './actions/permit/parseAction';
import { parseActionPermit2 } from './actions/permit2/parseAction';
import { parseActionRevokePermit } from './actions/revokePermit/parseAction';
import { parseActionSellNFT } from './actions/sellNFT/parseAction';
import { parseActionSignMultiSig } from './actions/signMultiSig/parseAction';
import { parseActionSwapTokenOrder } from './actions/swapTokenOrder/parseAction';
import { parseActionVerifyAddress } from './actions/verifyAddress/parseAction';
import { parseTypedDataAction } from './utils/parseTypedDataAction';
import { parseTextAction } from './utils/parseTextAction';

export function parseAction(
  options: ParseTypedDataActionParameters
): ParsedActionData<'typed_data'>;
export function parseAction(
  options: ParseTransactionActionParameters
): ParsedActionData<'transaction'>;
export function parseAction(
  options: ParseTextActionParameters
): ParsedActionData<'text'>;
export function parseAction(options: ParseActionParameters): ParsedActionData {
  const result: ReturnType<ParseAction>[] = [];

  if (options.type === 'transaction') {
    result.push(
      parseActionApproveNFT(options),
      parseActionApproveNFTCollection(options),
      parseActionApproveToken(options),
      parseActionAssetOrder(options),
      parseActionCancelTx(options),
      parseActionCommon(options),
      parseActionCrossSwapToken(options),
      parseActionCrossToken(options),
      parseActionDeployContract(options),
      parseActionPushMultiSig(options),
      parseActionRevokeNFT(options),
      parseActionRevokeNFTCollection(options),
      parseActionRevokePermit2(options),
      parseActionRevokeToken(options),
      parseActionSend(options),
      parseActionSendNFT(options),
      parseActionSwap(options),
      parseActionUnwrapToken(options),
      parseActionWrapToken(options),
      parseActionPermit2BatchRevokeToken(options)
    );
  }

  if (options.type === 'typed_data') {
    result.push(
      parseTypedDataAction(parseActionCommon)(options),
      parseTypedDataAction(parseActionAssetOrder)(options),
      parseTypedDataAction(parseActionSend)(options),
      parseTypedDataAction(parseActionApproveNFT)(options),
      parseTypedDataAction(parseActionCreateKey)(options),
      parseTypedDataAction(parseActionVerifyAddress)(options),
      parseTypedDataAction(parseActionSellNFT)(options),
      parseTypedDataAction(parseActionBatchSellNFT)(options),
      parseTypedDataAction(parseActionSignMultiSig)(options),
      parseTypedDataAction(parseActionBuyNFT)(options),
      parseTypedDataAction(parseActionPermit)(options),
      parseTypedDataAction(parseActionPermit2)(options),
      parseTypedDataAction(parseActionBatchPermit2)(options),
      parseTypedDataAction(parseActionSwapTokenOrder)(options),
      parseTypedDataAction(parseActionCoboSafeCreate)(options),
      parseTypedDataAction(parseActionCoboSafeModificationDelegatedAddress)(
        options
      ),
      parseTypedDataAction(parseActionCoboSafeModificationRole)(options),
      parseTypedDataAction(parseActionCoboSafeModificationTokenApproval)(
        options
      ),
      parseTypedDataAction(parseActionRevokePermit)(options)
    );
  }

  if (options.type === 'text') {
    result.push(
      parseTextAction(parseActionCommon)(options),
      parseTextAction(parseActionCreateKey)(options),
      parseTextAction(parseActionVerifyAddress)(options)
    );
  }

  const action = result.reduce((acc, val) => ({ ...acc, ...val }), {});

  if (Object.keys(action).length === 0) {
    if (options.type === 'typed_data') {
      return parseTypedDataAction(parseActionContractCall)(options);
    } else if (options.type === 'transaction') {
      return parseActionContractCall(options);
    }
    return {};
  }

  return action;
}
