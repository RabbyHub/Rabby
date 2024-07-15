import PQueue from 'p-queue';
import {
  ParseTypedDataResponse,
  SellNFTOrderAction,
  SignMultiSigActions,
  ContractDesc,
  BuyNFTOrderAction,
  PermitAction,
  Permit2Action,
  TokenItem,
  SwapTokenOrderAction,
  CreateKeyAction,
  VerifyAddressAction,
  BatchPermit2Action,
  BatchSellNFTOrderAction,
  CreateCoboSafeAction,
  SubmitSafeRoleModificationAction,
  SubmitDelegatedAddressModificationAction,
  SubmitTokenApprovalModificationAction,
  SendAction,
  RevokeTokenApproveAction,
  NFTItem,
  SwapOrderAction,
  ApproveNFTAction,
} from '@rabby-wallet/rabby-api/dist/types';
import { ContextActionData } from '@rabby-wallet/rabby-security-engine/dist/rules';
import BigNumber from 'bignumber.js';
import { getArrayType, isArrayType } from '@metamask/abi-utils/dist/parsers';
import { BigNumber as EthersBigNumber } from 'ethers';
import { isStrictHexString, add0x } from 'ui/utils/address';
import i18n from '@/i18n';
import { WalletControllerType, getTimeSpan } from '@/ui/utils';
import {
  waitQueueFinished,
  getProtocol,
  calcUSDValueChange,
  SendRequireData,
  AssetOrderRequireData,
  ApproveNFTRequireData,
  fetchNFTApproveRequiredData,
} from '../Actions/utils';
import { ALIAS_ADDRESS, KEYRING_TYPE } from 'consts';
import { Chain } from 'background/service/openapi';
import {
  findChain,
  findChainByServerID,
  isTestnetChainId,
} from '@/utils/chain';
import { ReceiverData } from '../Actions/components/ViewMorePopup/ReceiverPopup';
import { parseNumber } from '@metamask/eth-sig-util';
import { padStart } from 'lodash';

interface PermitActionData extends PermitAction {
  expire_at: number | undefined;
}

interface Permit2ActionData extends Permit2Action {
  sig_expire_at: number | undefined;
}

interface BatchPermit2ActionData extends BatchPermit2Action {
  sig_expire_at: number | undefined;
}

export interface TypedDataActionData {
  chainId?: string;
  brand?: {
    logo_url: string;
    name: string;
  };
  contractId?: string;
  sender: string;
  actionType: string | null;
  sellNFT?: SellNFTOrderAction;
  batchSellNFT?: BatchSellNFTOrderAction;
  signMultiSig?: SignMultiSigActions;
  buyNFT?: BuyNFTOrderAction;
  permit?: PermitActionData;
  permit2?: Permit2ActionData;
  approveNFT?: ApproveNFTAction;
  batchPermit2?: BatchPermit2ActionData;
  swapTokenOrder?: {
    payToken: TokenItem;
    receiveToken: TokenItem;
    receiver: string;
    usdValueDiff: string;
    usdValuePercentage: number;
    expireAt: number | null;
  };
  createKey?: CreateKeyAction;
  verifyAddress?: VerifyAddressAction;
  send?: SendAction;
  contractCall?: object;
  coboSafeCreate?: CreateCoboSafeAction;
  coboSafeModificationDelegatedAddress?: SubmitSafeRoleModificationAction;
  coboSafeModificationRole?: SubmitDelegatedAddressModificationAction;
  coboSafeModificationTokenApproval?: SubmitTokenApprovalModificationAction;
  revokePermit?: RevokeTokenApproveAction;
  assetOrder?: {
    payTokenList: TokenItem[];
    payNFTList: NFTItem[];
    receiveTokenList: TokenItem[];
    receiveNFTList: NFTItem[];
    takers: string[];
    receiver: string | null;
    expireAt: string | null;
  };
  common?: {
    title: string;
    desc: string;
    is_asset_changed: boolean;
    is_involving_privacy: boolean;
    receiver?: string;
    from: string;
  };
}

export const parseAction = (
  data: ParseTypedDataResponse,
  typedData: null | Record<string, any>,
  sender: string
): TypedDataActionData => {
  const result: TypedDataActionData = {
    sender,
    actionType: null,
    brand: (data.action?.data as any)?.brand as TypedDataActionData['brand'],
  };
  if (typedData?.domain) {
    if (typedData.domain.verifyingContract) {
      result.contractId = typedData.domain.verifyingContract;
    }
    if (typedData.domain.chainId) {
      result.chainId = typedData.domain.chainId;
    }
  }
  result.actionType = data.action?.type || null;
  switch (data.action?.type) {
    case 'sell_nft_order': {
      const actionData = data.action.data as SellNFTOrderAction;
      result.sellNFT = actionData;
      return result;
    }
    case 'swap_order': {
      const {
        pay_token_list,
        pay_nft_list,
        receive_nft_list,
        receive_token_list,
        receiver,
        takers,
        expire_at,
      } = data.action.data as SwapOrderAction;
      result.assetOrder = {
        payTokenList: pay_token_list,
        payNFTList: pay_nft_list,
        receiveNFTList: receive_nft_list,
        receiveTokenList: receive_token_list,
        receiver,
        takers,
        expireAt: expire_at,
      };
      return result;
    }
    case 'sell_nft_list_order': {
      const actionData = data.action.data as BatchSellNFTOrderAction;
      result.batchSellNFT = actionData;
      return result;
    }
    case 'buy_nft_order': {
      const actionData = data.action.data as BuyNFTOrderAction;
      result.buyNFT = actionData;
      return result;
    }
    case 'permit1_approve_token': {
      const actionData = data.action.data as PermitAction;
      result.permit = {
        ...actionData,
        expire_at: data.action.expire_at,
      };
      return result;
    }
    case 'permit2_approve_token': {
      const actionData = data.action.data as Permit2Action;
      result.permit2 = {
        ...actionData,
        sig_expire_at: data.action.expire_at,
      };
      return result;
    }
    case 'permit2_approve_token_list': {
      const actionData = data.action.data as BatchPermit2Action;
      result.batchPermit2 = {
        ...actionData,
        sig_expire_at: data.action.expire_at,
      };
      return result;
    }
    case 'approve_nft': {
      const actionData = data.action.data as ApproveNFTAction;

      result.approveNFT = actionData;
      return result;
    }
    case 'sign_multisig': {
      const actionData = data.action.data as SignMultiSigActions;
      result.signMultiSig = actionData;
      return result;
    }
    case 'swap_token_order': {
      const actionData = data.action.data as SwapTokenOrderAction;
      const receiveTokenUsdValue = new BigNumber(
        actionData.receive_token.raw_amount || '0'
      )
        .div(10 ** actionData.receive_token.decimals)
        .times(actionData.receive_token.price);
      const payTokenUsdValue = new BigNumber(
        actionData.pay_token.raw_amount || '0'
      )
        .div(10 ** actionData.pay_token.decimals)
        .times(actionData.pay_token.price);
      const usdValueDiff = receiveTokenUsdValue
        .minus(payTokenUsdValue)
        .toFixed();
      const usdValuePercentage = calcUSDValueChange(
        payTokenUsdValue.toFixed(),
        receiveTokenUsdValue.toFixed()
      );
      result.swapTokenOrder = {
        payToken: actionData.pay_token,
        receiveToken: actionData.receive_token,
        receiver: actionData.receiver,
        usdValueDiff,
        usdValuePercentage,
        expireAt: actionData.expire_at,
      };
      return result;
    }
    case 'create_key':
      result.createKey = data.action.data as CreateKeyAction;
      return result;
    case 'verify_address':
      result.verifyAddress = data.action.data as VerifyAddressAction;
      return result;

    case 'create_cobo_safe':
      result.coboSafeCreate = data.action.data as CreateCoboSafeAction;
      return result;
    case 'submit_safe_role_modification':
      result.coboSafeModificationRole = data.action
        .data as SubmitSafeRoleModificationAction;
      return result;
    case 'submit_delegated_address_modification':
      result.coboSafeModificationDelegatedAddress = data.action
        .data as SubmitDelegatedAddressModificationAction;
      return result;
    case 'submit_token_approval_modification':
      result.coboSafeModificationTokenApproval = data.action
        .data as SubmitTokenApprovalModificationAction;
      return result;
    case 'send_token':
      result.send = data.action.data as SendAction;
      return result;
    case 'permit1_revoke_token':
      console.log('permit1_revoke_token');
      result.revokePermit = data.action.data as RevokeTokenApproveAction;
      return result;
    case null:
      result.common = {
        ...(data.action as any),
        from: sender,
      };
      return result;
    default:
      break;
  }
  if (result.chainId && result.contractId) {
    result.contractCall = {};
    if (result.actionType) {
      result.actionType = 'contractCall';
    }
  }
  return result;
};

export interface ContractRequireData {
  id: string;
  protocol: {
    name: string;
    logo_url: string;
  } | null;
  bornAt: number;
  hasInteraction: boolean;
  rank: number | null;
  unexpectedAddr: ReceiverData | null;
  receiverInWallet: boolean;
}

export const fetchContractRequireData = async (
  id: string,
  chainId: string,
  sender: string,
  apiProvider:
    | WalletControllerType['openapi']
    | WalletControllerType['testnetOpenapi'],
  wallet?: WalletControllerType,
  actionData?: TypedDataActionData
) => {
  const queue = new PQueue();
  const result: ContractRequireData = {
    id,
    protocol: null,
    bornAt: 0,
    hasInteraction: false,
    rank: null,
    unexpectedAddr: null,
    receiverInWallet: false,
  };
  queue.add(async () => {
    const credit = await apiProvider.getContractCredit(id, chainId);
    result.rank = credit.rank_at;
  });
  queue.add(async () => {
    const { desc } = await apiProvider.addrDesc(id);
    if (desc.contract && desc.contract[chainId]) {
      result.bornAt = desc.contract[chainId].create_at;
    } else {
      result.bornAt = desc.born_at;
    }
    result.protocol = getProtocol(desc.protocol, chainId);
  });
  queue.add(async () => {
    const hasInteraction = await apiProvider.hasInteraction(
      sender,
      chainId,
      id
    );
    result.hasInteraction = hasInteraction.has_interaction;
  });

  if (actionData && wallet) {
    if (actionData.contractCall || actionData.common) {
      const chain = findChainByServerID(chainId);

      queue.add(async () => {
        const addr = actionData.common?.receiver;

        if (addr) {
          result.receiverInWallet = await wallet.hasAddress(addr);
          const receiverData: ReceiverData = {
            address: addr,
            chain: chain!,
            eoa: null,
            cex: null,
            contract: null,
            usd_value: 0,
            hasTransfer: false,
            isTokenContract: false,
            name: null,
            onTransferWhitelist: false,
          };

          const { has_transfer } = await apiProvider.hasTransfer(
            chainId,
            sender,
            addr
          );
          receiverData.hasTransfer = has_transfer;

          const { desc } = await apiProvider.addrDesc(addr);
          if (desc.cex?.id) {
            receiverData.cex = {
              id: desc.cex.id,
              logo: desc.cex.logo_url,
              name: desc.cex.name,
              bornAt: desc.born_at,
              isDeposit: desc.cex.is_deposit,
            };
          }
          if (desc.contract && Object.keys(desc.contract).length > 0) {
            receiverData.contract = desc.contract;
          }
          if (!receiverData.cex && !receiverData.contract) {
            receiverData.eoa = {
              id: addr,
              bornAt: desc.born_at,
            };
          }
          receiverData.usd_value = desc.usd_value;
          if (id) {
            const { is_token } = await apiProvider.isTokenContract(
              chainId,
              addr
            );
            receiverData.isTokenContract = is_token;
          }
          receiverData.name = desc.name;
          if (ALIAS_ADDRESS[addr.toLowerCase()]) {
            receiverData.name = ALIAS_ADDRESS[addr.toLowerCase()];
          }

          const whitelist = await wallet.getWhitelist();
          receiverData.onTransferWhitelist = whitelist.includes(
            addr.toLowerCase()
          );
          result.unexpectedAddr = receiverData;
        }
      });
    }
  }
  await waitQueueFinished(queue);
  return result;
};

export interface ApproveTokenRequireData {
  isEOA: boolean;
  contract: Record<string, ContractDesc> | null;
  riskExposure: number;
  rank: number | null;
  hasInteraction: boolean;
  bornAt: number;
  protocol: {
    id: string;
    name: string;
    logo_url: string;
  } | null;
  isDanger: boolean | null;
  token: TokenItem;
}

const fetchTokenApproveRequireData = async ({
  spender,
  token,
  apiProvider,
  address,
  chainId,
}: {
  spender: string;
  token: TokenItem;
  address: string;
  chainId: string;
  apiProvider:
    | WalletControllerType['openapi']
    | WalletControllerType['testnetOpenapi'];
}) => {
  const queue = new PQueue();
  const result: ApproveTokenRequireData = {
    isEOA: false,
    contract: null,
    riskExposure: 0,
    rank: null,
    hasInteraction: false,
    bornAt: 0,
    protocol: null,
    isDanger: false,
    token: {
      ...token,
      amount: 0,
      raw_amount_hex_str: '0x0',
    },
  };
  queue.add(async () => {
    const credit = await apiProvider.getContractCredit(spender, chainId);
    result.rank = credit.rank_at;
  });
  queue.add(async () => {
    const { usd_value } = await apiProvider.tokenApproveExposure(
      spender,
      chainId
    );
    result.riskExposure = usd_value;
  });
  queue.add(async () => {
    const t = await apiProvider.getToken(address, chainId, token.id);
    result.token = t;
  });
  queue.add(async () => {
    const { desc } = await apiProvider.addrDesc(spender);
    if (desc.contract && desc.contract[chainId]) {
      result.bornAt = desc.contract[chainId].create_at;
    }
    if (!desc.contract?.[chainId]) {
      result.isEOA = true;
      result.bornAt = desc.born_at;
    }
    result.isDanger = desc.contract?.[chainId]?.is_danger || null;
    result.protocol = getProtocol(desc.protocol, chainId);
  });
  queue.add(async () => {
    const hasInteraction = await apiProvider.hasInteraction(
      address,
      chainId,
      spender
    );
    result.hasInteraction = hasInteraction.has_interaction;
  });
  await waitQueueFinished(queue);
  return result;
};

export interface BatchApproveTokenRequireData {
  isEOA: boolean;
  contract: Record<string, ContractDesc> | null;
  riskExposure: number;
  rank: number | null;
  hasInteraction: boolean;
  bornAt: number;
  protocol: {
    id: string;
    name: string;
    logo_url: string;
  } | null;
  isDanger: boolean | null;
  tokens: TokenItem[];
}

const fetchBatchTokenApproveRequireData = async ({
  spender,
  tokens,
  apiProvider,
  address,
  chainId,
}: {
  spender: string;
  tokens: TokenItem[];
  address: string;
  chainId: string;
  apiProvider:
    | WalletControllerType['openapi']
    | WalletControllerType['testnetOpenapi'];
}) => {
  const queue = new PQueue();
  const result: BatchApproveTokenRequireData = {
    isEOA: false,
    contract: null,
    riskExposure: 0,
    rank: null,
    hasInteraction: false,
    bornAt: 0,
    protocol: null,
    isDanger: false,
    tokens: tokens.map((token) => ({
      ...token,
      amount: 0,
      raw_amount_hex_str: '0x0',
    })),
  };
  queue.add(async () => {
    const credit = await apiProvider.getContractCredit(spender, chainId);
    result.rank = credit.rank_at;
  });
  queue.add(async () => {
    const { usd_value } = await apiProvider.tokenApproveExposure(
      spender,
      chainId
    );
    result.riskExposure = usd_value;
  });
  queue.add(async () => {
    const list = await Promise.all(
      tokens.map((token) => apiProvider.getToken(address, chainId, token.id))
    );
    result.tokens = list;
  });
  queue.add(async () => {
    const { desc } = await apiProvider.addrDesc(spender);
    if (desc.contract && desc.contract[chainId]) {
      result.bornAt = desc.contract[chainId].create_at;
    }
    if (!desc.contract?.[chainId]) {
      result.isEOA = true;
      result.bornAt = desc.born_at;
    }
    result.isDanger = desc.contract?.[chainId]?.is_danger || null;
    result.protocol = getProtocol(desc.protocol, chainId);
  });
  queue.add(async () => {
    const hasInteraction = await apiProvider.hasInteraction(
      address,
      chainId,
      spender
    );
    result.hasInteraction = hasInteraction.has_interaction;
  });
  await waitQueueFinished(queue);
  return result;
};

const fetchReceiverRequireData = async ({
  apiProvider,
  from,
  to,
  chainId,
  wallet,
  token,
}: {
  apiProvider:
    | WalletControllerType['openapi']
    | WalletControllerType['testnetOpenapi'];
  from: string;
  to: string;
  chainId: string;
  wallet: WalletControllerType;
  token: TokenItem;
}) => {
  const queue = new PQueue();
  const result: SendRequireData = {
    eoa: null,
    cex: null,
    contract: null,
    usd_value: 0,
    protocol: null,
    hasTransfer: false,
    usedChains: [],
    isTokenContract: false,
    name: null,
    onTransferWhitelist: false,
    whitelistEnable: false,
    receiverIsSpoofing: false,
    hasReceiverPrivateKeyInWallet: false,
    hasReceiverMnemonicInWallet: false,
  };
  const hasPrivateKeyInWallet = await wallet.hasPrivateKeyInWallet(to);
  if (hasPrivateKeyInWallet) {
    result.hasReceiverPrivateKeyInWallet =
      hasPrivateKeyInWallet === KEYRING_TYPE.SimpleKeyring;
    result.hasReceiverMnemonicInWallet =
      hasPrivateKeyInWallet === KEYRING_TYPE.HdKeyring;
  }
  queue.add(async () => {
    const { has_transfer } = await apiProvider.hasTransfer(chainId, from, to);
    result.hasTransfer = has_transfer;
  });
  queue.add(async () => {
    const { desc } = await apiProvider.addrDesc(to);
    if (desc.cex?.id) {
      result.cex = {
        id: desc.cex.id,
        logo: desc.cex.logo_url,
        name: desc.cex.name,
        bornAt: desc.born_at,
        isDeposit: desc.cex.is_deposit,
      };
    }
    if (desc.contract && Object.keys(desc.contract).length > 0) {
      result.contract = desc.contract;
    }
    if (!result.cex && !result.contract) {
      result.eoa = {
        id: to,
        bornAt: desc.born_at,
      };
    }
    result.usd_value = desc.usd_value;
    if (result.cex) {
      const { support } = await apiProvider.depositCexSupport(
        token.id,
        token.chain,
        result.cex.id
      );
      result.cex.supportToken = support;
    }
    if (result.contract) {
      const { is_token } = await apiProvider.isTokenContract(chainId, to);
      result.isTokenContract = is_token;
    }
    result.name = desc.name;
    if (ALIAS_ADDRESS[to.toLowerCase()]) {
      result.name = ALIAS_ADDRESS[to.toLowerCase()];
    }
  });
  queue.add(async () => {
    const usedChainList = await apiProvider.addrUsedChainList(to);
    result.usedChains = usedChainList;
  });
  queue.add(async () => {
    const { is_spoofing } = await apiProvider.checkSpoofing({
      from,
      to,
    });
    result.receiverIsSpoofing = is_spoofing;
  });
  const whitelist = await wallet.getWhitelist();
  const whitelistEnable = await wallet.isWhitelistEnabled();
  result.whitelistEnable = whitelistEnable;
  result.onTransferWhitelist = whitelist.includes(to.toLowerCase());
  await waitQueueFinished(queue);
  return result;
};

export interface MultiSigRequireData {
  id: string;
  contract: Record<string, ContractDesc> | null;
}

export interface SwapTokenOrderRequireData extends ContractRequireData {
  sender: string;
}

export type TypedDataRequireData =
  | SwapTokenOrderRequireData
  | ContractRequireData
  | MultiSigRequireData
  | ApproveTokenRequireData
  | BatchApproveTokenRequireData
  | SendRequireData
  | ApproveNFTRequireData
  | null;

export const fetchRequireData = async (
  actionData: TypedDataActionData,
  sender: string,
  wallet: WalletControllerType
): Promise<TypedDataRequireData> => {
  let chain: Chain | null | undefined;
  if (actionData.chainId) {
    chain = findChain({
      id: Number(actionData.chainId),
    });
  }
  const apiProvider = isTestnetChainId(actionData.chainId)
    ? wallet.testnetOpenapi
    : wallet.openapi;
  if (actionData.sellNFT) {
    if (chain && actionData.contractId) {
      const contractRequireData = await fetchContractRequireData(
        actionData.contractId,
        chain.serverId,
        sender,
        apiProvider
      );
      return contractRequireData;
    }
  }
  if (actionData.batchSellNFT) {
    if (chain && actionData.contractId) {
      const contractRequireData = await fetchContractRequireData(
        actionData.contractId,
        chain.serverId,
        sender,
        apiProvider
      );
      return contractRequireData;
    }
  }
  if (actionData.buyNFT) {
    if (chain && actionData.contractId) {
      const contractRequireData = await fetchContractRequireData(
        actionData.contractId,
        chain.serverId,
        sender,
        apiProvider
      );
      return contractRequireData;
    }
  }
  if (actionData.signMultiSig) {
    const result: MultiSigRequireData = {
      contract: null,
      id: actionData.signMultiSig.multisig_id,
    };
    const { desc } = await apiProvider.addrDesc(
      actionData.signMultiSig.multisig_id
    );
    if (desc.contract) {
      result.contract = desc.contract;
    }
    return result;
  }
  if (actionData.swapTokenOrder) {
    if (chain && actionData.contractId) {
      const contractRequireData = await fetchContractRequireData(
        actionData.contractId,
        chain.serverId,
        sender,
        apiProvider
      );
      return contractRequireData;
    }
  }
  if (actionData.permit || actionData.permit2) {
    const data = (actionData.permit || actionData.permit2)!;
    if (chain && actionData.contractId) {
      const tokenApproveRequireData = await fetchTokenApproveRequireData({
        spender: data.spender,
        token: data.token,
        address: sender,
        chainId: chain.serverId,
        apiProvider,
      });
      return tokenApproveRequireData;
    }
  }
  if (actionData.approveNFT) {
    const data = actionData.approveNFT;
    if (chain && actionData.contractId) {
      const nftApproveRequireData = await fetchNFTApproveRequiredData({
        spender: data.spender,
        address: sender,
        chainId: chain.serverId,
        apiProvider,
      });
      return nftApproveRequireData;
    }
  }
  if (actionData?.revokePermit) {
    const { token, spender } = actionData.revokePermit;
    if (chain && actionData.contractId) {
      return await fetchTokenApproveRequireData({
        apiProvider,
        chainId: chain?.serverId,
        address: sender,
        token,
        spender,
      });
    }
  }
  if (actionData?.batchPermit2) {
    const data = actionData.batchPermit2;
    if (chain && actionData.contractId) {
      const tokenApproveRequireData = await fetchBatchTokenApproveRequireData({
        spender: data.spender,
        tokens: data.token_list,
        address: sender,
        chainId: chain.serverId,
        apiProvider,
      });
      return tokenApproveRequireData;
    }
  }
  if (actionData?.assetOrder) {
    if (chain && actionData.contractId) {
      const data = await fetchContractRequireData(
        actionData.contractId,
        chain.serverId,
        sender,
        apiProvider
      );
      return {
        ...data,
        sender,
      } as AssetOrderRequireData;
    }
  }
  if (actionData?.send) {
    const data = actionData.send;
    if (chain && actionData.contractId) {
      const receiverRequireData = await fetchReceiverRequireData({
        from: sender,
        to: data.to,
        token: data.token,
        apiProvider,
        wallet,
        chainId: chain.serverId,
      });
      return receiverRequireData;
    }
  }
  if (chain && actionData.contractId) {
    return await fetchContractRequireData(
      actionData.contractId,
      chain.serverId,
      sender,
      apiProvider,
      wallet,
      actionData
    );
  }

  if (actionData?.common) {
    if (chain && actionData.contractId) {
      const contractRequireData = await fetchContractRequireData(
        actionData.contractId,
        chain.serverId,
        sender,
        apiProvider,
        wallet,
        actionData
      );
      return contractRequireData;
    }
  }
  return null;
};

export const getActionTypeText = (data: TypedDataActionData | null) => {
  const { t } = i18n;

  if (data?.permit) {
    return t('page.signTypedData.permit.title');
  }
  if (data?.permit2 || data?.batchPermit2) {
    return t('page.signTypedData.permit2.title');
  }
  if (data?.approveNFT) {
    return t('page.signTx.nftApprove.title');
  }
  if (data?.swapTokenOrder) {
    return t('page.signTypedData.swapTokenOrder.title');
  }
  if (data?.buyNFT || data?.sellNFT || data?.batchSellNFT) {
    return t('page.signTypedData.sellNFT.title');
  }
  if (data?.signMultiSig) {
    return t('page.signTypedData.signMultiSig.title');
  }
  if (data?.createKey) {
    return t('page.signTypedData.createKey.title');
  }
  if (data?.verifyAddress) {
    return t('page.signTypedData.verifyAddress.title');
  }
  if (data?.contractCall) {
    return t('page.signTx.unknownAction');
  }
  if (data?.coboSafeCreate) {
    return t('page.signTx.coboSafeCreate.title');
  }
  if (data?.coboSafeModificationRole) {
    return t('page.signTx.coboSafeModificationRole.title');
  }
  if (data?.coboSafeModificationDelegatedAddress) {
    return t('page.signTx.coboSafeModificationDelegatedAddress.title');
  }
  if (data?.coboSafeModificationTokenApproval) {
    return t('page.signTx.coboSafeModificationTokenApproval.title');
  }
  if (data?.send) {
    return t('page.signTx.send.title');
  }
  if (data?.revokePermit) {
    return t('page.signTx.revokePermit.title');
  }
  if (data?.assetOrder) {
    return t('page.signTx.assetOrder.title');
  }
  if (data?.common) {
    return data.common.title;
  }
  return t('page.signTx.unknownAction');
};

export const formatSecurityEngineCtx = async ({
  actionData,
  requireData,
  wallet,
}: {
  actionData: TypedDataActionData;
  requireData: TypedDataRequireData;
  wallet: WalletControllerType;
}): Promise<ContextActionData> => {
  let chain: Chain | null | undefined;
  if (actionData?.chainId) {
    chain = findChain({
      id: Number(actionData.chainId),
    });
  }
  if (actionData?.chainId && isTestnetChainId(actionData?.chainId)) {
    return {};
  }
  if (actionData?.permit) {
    const data = requireData as ApproveTokenRequireData;
    return {
      permit: {
        spender: actionData.permit.spender,
        isEOA: data.isEOA,
        riskExposure: data.riskExposure,
        deployDays: getTimeSpan(Math.floor(Date.now() / 1000) - data.bornAt).d,
        hasInteracted: data.hasInteraction,
        isDanger: !!data.isDanger,
        chainId: chain?.serverId,
      },
    };
  }
  if (actionData?.permit2) {
    const data = requireData as ApproveTokenRequireData;
    return {
      permit2: {
        spender: actionData.permit2.spender,
        isEOA: data.isEOA,
        riskExposure: data.riskExposure,
        deployDays: getTimeSpan(Math.floor(Date.now() / 1000) - data.bornAt).d,
        hasInteracted: data.hasInteraction,
        isDanger: !!data.isDanger,
        chainId: chain?.serverId,
      },
    };
  }
  if (actionData?.approveNFT) {
    const data = requireData as ApproveNFTRequireData;
    return {
      nftApprove: {
        spender: actionData.approveNFT.spender,
        isEOA: data.isEOA,
        riskExposure: data.riskExposure,
        deployDays: getTimeSpan(Math.floor(Date.now() / 1000) - data.bornAt).d,
        hasInteracted: data.hasInteraction,
        isDanger: !!data.isDanger,
        chainId: chain?.serverId || 'eth',
      },
    };
  }
  if (actionData?.batchPermit2) {
    const data = requireData as ApproveTokenRequireData;
    return {
      batchPermit2: {
        spender: actionData.batchPermit2.spender,
        isEOA: data.isEOA,
        riskExposure: data.riskExposure,
        deployDays: getTimeSpan(Math.floor(Date.now() / 1000) - data.bornAt).d,
        hasInteracted: data.hasInteraction,
        isDanger: !!data.isDanger,
        chainId: chain?.serverId,
      },
    };
  }
  if (actionData?.buyNFT) {
    const receiveNFTIsFake =
      actionData.buyNFT.receive_nft.collection?.is_verified === false;
    const receiveNFTIsScam = receiveNFTIsFake
      ? false
      : !!actionData.buyNFT.receive_nft.collection?.is_suspicious;
    return {
      buyNFT: {
        from: actionData.sender,
        receiver: actionData.buyNFT.receiver,
        receiveNFTIsFake,
        receiveNFTIsScam,
        chainId: chain?.serverId,
        id: actionData.contractId,
      },
    };
  }
  if (actionData?.sellNFT) {
    const receiveTokenIsFake =
      actionData.sellNFT.receive_token.is_verified === false;
    const receiveTokenIsScam = receiveTokenIsFake
      ? false
      : !!actionData.sellNFT.receive_token.is_suspicious;
    return {
      sellNFT: {
        specificBuyer: actionData.sellNFT.takers[0],
        from: actionData.sender,
        receiver: actionData.sellNFT.receiver,
        receiveTokenIsFake,
        receiveTokenIsScam,
        chainId: chain?.serverId,
        id: actionData.contractId,
      },
    };
  }
  if (actionData?.batchSellNFT) {
    const receiveTokenIsFake =
      actionData.batchSellNFT.receive_token.is_verified === false;
    const receiveTokenIsScam = receiveTokenIsFake
      ? false
      : !!actionData.batchSellNFT.receive_token.is_suspicious;
    return {
      batchSellNFT: {
        specificBuyer: actionData.batchSellNFT.takers[0],
        from: actionData.sender,
        receiver: actionData.batchSellNFT.receiver,
        receiveTokenHasFake: receiveTokenIsFake,
        receiveTokenHasScam: receiveTokenIsScam,
        chainId: chain?.serverId,
        id: actionData.contractId,
      },
    };
  }
  if (actionData?.swapTokenOrder) {
    const receiverInWallet = await wallet.hasAddress(
      actionData.swapTokenOrder.receiver
    );
    const receiveTokenIsFake =
      actionData.swapTokenOrder.receiveToken.is_verified === false;
    const receiveTokenIsScam = receiveTokenIsFake
      ? false
      : !!actionData.swapTokenOrder.receiveToken.is_suspicious;
    return {
      swapTokenOrder: {
        receiveTokenIsFake,
        receiveTokenIsScam,
        receiver: actionData.swapTokenOrder.receiver,
        from: actionData.sender,
        usdValuePercentage: actionData.swapTokenOrder.usdValuePercentage,
        chainId: chain?.serverId,
        id: actionData.contractId,
        receiverInWallet,
      },
    };
  }
  if (actionData?.createKey) {
    return {
      createKey: {
        allowOrigins: actionData.createKey.allow_origins,
        origin,
      },
    };
  }
  if (actionData?.verifyAddress) {
    return {
      verifyAddress: {
        allowOrigins: actionData.verifyAddress.allow_origins,
        origin,
      },
    };
  }
  if (actionData?.send) {
    const data = requireData as SendRequireData;
    const { to } = actionData.send;
    return {
      send: {
        to,
        contract: data.contract
          ? {
              chains: Object.keys(data.contract),
            }
          : null,
        cex: data.cex
          ? {
              id: data.cex.id,
              isDeposit: data.cex.isDeposit,
              supportToken: data.cex.supportToken,
            }
          : null,
        hasTransfer: data.hasTransfer,
        chainId: chain!.serverId,
        usedChainList: data.usedChains.map((item) => item.id),
        isTokenContract: data.isTokenContract,
        onTransferWhitelist: data.whitelistEnable
          ? data.onTransferWhitelist
          : false,
        receiverIsSpoofing: data.receiverIsSpoofing,
        hasReceiverMnemonicInWallet: data.hasReceiverMnemonicInWallet,
        hasReceiverPrivateKeyInWallet: data.hasReceiverPrivateKeyInWallet,
      },
    };
  }
  if (actionData?.assetOrder) {
    const {
      takers,
      receiver,
      receiveNFTList,
      receiveTokenList,
    } = actionData.assetOrder;
    const data = requireData as AssetOrderRequireData;
    return {
      assetOrder: {
        specificBuyer: takers[0],
        from: data.sender,
        receiver: receiver || '',
        chainId: chain?.serverId,
        id: data.id,
        hasReceiveAssets: receiveNFTList.length + receiveTokenList.length > 0,
      },
    };
  }
  if (actionData?.contractCall && actionData?.contractId && chain) {
    return {
      contractCall: {
        id: actionData.contractId,
        chainId: chain.serverId,
      },
    };
  }
  if (actionData?.common) {
    return {
      common: {
        ...actionData.common,
        receiverInWallet: (requireData as ContractRequireData)
          ?.receiverInWallet,
      },
    };
  }
  return {};
};

export function normalizeTypeData(data) {
  try {
    const { types, primaryType, domain, message } = data;
    const domainTypes = types.EIP712Domain;
    const messageTypes = types[primaryType];
    domainTypes.forEach((item) => {
      const { name, type } = item;
      domain[name] = normalizeValue(type, domain[name]);
    });
    messageTypes.forEach((item) => {
      const { name, type } = item;
      message[name] = normalizeValue(type, message[name]);
    });
    return { types, primaryType, domain, message };
  } catch (e) {
    return data;
  }
}

export function normalizeValue(type: string, value: unknown): any {
  if (isArrayType(type) && Array.isArray(value)) {
    const [innerType] = getArrayType(type);
    return value.map((item) => normalizeValue(innerType, item));
  }

  if (type === 'address') {
    let address = value as string;
    if (typeof value === 'string' && !/^(0x|0X)/.test(value)) {
      address = EthersBigNumber.from(value).toHexString();
    } else if (isStrictHexString(value)) {
      address = add0x(value);
    }
    try {
      const parseAddress = padStart(
        parseNumber(address).toString('hex'),
        40,
        '0'
      );
      return `0x${parseAddress}`;
    } catch (e) {
      return address;
    }
  }

  return value;
}
