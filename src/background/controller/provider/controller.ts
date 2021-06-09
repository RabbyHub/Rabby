import Transaction from 'ethereumjs-tx';
import { bufferToHex } from 'ethereumjs-util';
import { ethErrors } from 'eth-rpc-errors';
import { normalize as normalizeAddress } from 'eth-sig-util';
import {
  keyringService,
  permissionService,
  chainService,
  sessionService,
  openapiService,
} from 'background/service';
import { Session } from 'background/service/session';
import { EVM_RPC_METHODS, Tx } from 'background/service/openapi';
import { CHAINS } from 'consts';
import { underline2Camelcase } from 'background/utils';
import BaseController from '../base';

class ProviderController extends BaseController {
  constructor() {
    super();

    this._mountMethods(EVM_RPC_METHODS);
  }

  private _mountMethods(methods) {
    methods.forEach((method) => {
      const parsedMethodName = underline2Camelcase(method);
      this[parsedMethodName] = ({ data: { params }, session: { origin } }) => {
        const chainServerId =
          CHAINS[permissionService.getConnectedSite(origin)!.chain].serverId;

        return openapiService[parsedMethodName](chainServerId, params);
      };
    });
  }

  @Reflect.metadata('APPROVAL', ['SignTx'])
  ethSendTransaction = async ({
    data: {
      params: [txParams],
    },
    approvalRes,
  }: {
    data: {
      params: any;
    };
    approvalRes: Tx;
  }) => {
    const keyring = await this._checkAddress(txParams.from);
    const tx = new Transaction(approvalRes);

    const signedTx = await keyringService.signTransaction(
      keyring,
      tx,
      txParams.from
    );

    return openapiService.pushTx({
      ...approvalRes,
      r: bufferToHex(signedTx.r),
      s: bufferToHex(signedTx.s),
      v: bufferToHex(signedTx.v),
      value: approvalRes.value || '0x0',
    });
  };

  @Reflect.metadata('APPROVAL', ['SignText'])
  personalSign = async ({
    data: {
      params: [data, from],
    },
  }) => {
    const keyring = await this._checkAddress(from);

    return keyringService.signPersonalMessage(keyring, { data, from });
  };

  ethAccounts = async ({ session: { origin } }) => {
    if (!permissionService.hasPerssmion(origin)) {
      return [];
    }
    const account = await this.getCurrentAccount();
    if (!account) return [];
    return [account.address];
  };

  ethChainId = ({ session }: { session: Session }) => {
    const origin = session.origin;
    const site = permissionService.getWithoutUpdate(origin);
    return CHAINS[site!.chain].hex;
  };

  netVersion = ({ session }: { session: Session }) => {
    const origin = session.origin;
    const site = permissionService.getWithoutUpdate(origin);
    if (!site) {
      return null;
    }
    return CHAINS[site.chain].network;
  };

  ethRequestAccounts = this.ethAccounts;

  @Reflect.metadata('APPROVAL', [
    'AddChain',
    ({
      data: {
        params: [chainParams],
      },
      session: { origin },
    }) => {
      return (
        chainService
          .getEnabledChains()
          .some((chain) => chain.hex === chainParams.chainId) &&
        CHAINS[permissionService.getConnectedSite(origin)!.chain]?.hex ===
          chainParams.chainId
      );
    },
    { height: 390 },
  ])
  walletAddEthereumChain = ({
    data: {
      params: [chainParams],
    },
    session: { origin },
  }) => {
    const chain = Object.values(CHAINS).find(
      (value) => value.hex === chainParams.chainId
    );

    if (!chain) {
      throw new Error('This chain is not supported by Rabby yet.');
    }

    permissionService.updateConnectSite(
      origin,
      {
        chain: chain.enum,
      },
      true
    );

    chainService.enableChain(chain.enum);

    sessionService.broadcastEvent(
      'chainChanged',
      {
        chain: chain.hex,
        networkVersion: chain.network,
      },
      origin
    );
    return null;
  };

  private _checkAddress = async (address) => {
    const { address: currentAddress, keyring } =
      (await this.getCurrentAccount()) || {};
    if (!currentAddress || currentAddress !== normalizeAddress(address)) {
      throw ethErrors.rpc.invalidParams({
        message:
          'Invalid parameters: must use the current user address to sign',
      });
    }

    return keyring;
  };
}

export default new ProviderController();
