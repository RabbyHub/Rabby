import Transaction from 'ethereumjs-tx';
import {
  keyringService,
  permissionService,
  chainService,
  sessionService,
  openapiService,
} from 'background/service';
import { Session } from 'background/service/session';
import { EVM_RPC_METHODS } from 'background/service/openapi';
import { CHAINS } from 'consts';
import { underline2Camelcase } from 'background/utils';
import BaseController from '../base';

// eth_coinbase
// eth_sign
// eth_signTypedData
// eth_signTypedData_v3
// eth_signTypedData_v4
// eth_getEncryptionPublicKey
// eth_decrypt
// personal_ecRecover

class ProviderController extends BaseController {
  constructor() {
    super();

    // handle 'eth_getTransactionCount' in exception
    // const [, ...needMountMethods] = EVM_RPC_METHODS;
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
  }) => {
    const tx = new Transaction(txParams);
    const signedTx = await keyringService.signTransaction(tx, txParams.from);

    // return openapiService.pushTx(signedTx.toJSON());
  };

  @Reflect.metadata('APPROVAL', ['SignText'])
  personalSign = ({
    data: {
      params: [data, from],
    },
  }) => keyringService.signPersonalMessage({ data, from });

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
    return CHAINS[site!.chain].id;
  };

  netVersion = ({ session }: { session: Session }) => {
    const origin = session.origin;
    const site = permissionService.getWithoutUpdate(origin);
    if (!site) {
      return null;
    }
    return CHAINS[site.chain].network;
  };

  // ethGetTransactionCount = async ({
  //   data: { params },
  //   session: { origin },
  // }) => {
  //   const [addr, blockIdentifier] = params;
  //   const chain = CHAINS[permissionService.getConnectedSite(origin)!.chain];

  //   if (blockIdentifier === 'pending') {
  //     const { chains } = await openapiService.getPendingCount(addr);

  //     const pendingTxCount = chains.find(
  //       (_chain) => _chain.community_id === chain.id
  //     )?.pending_tx_count;

  //     return pendingTxCount;
  //   }

  //   return openapiService.ethGetTransactionCount(chain.serverId, params);
  // };

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

    sessionService.broadcastEvent('chainChanged', chain.id, origin);
    return null;
  };
}

export default new ProviderController();
