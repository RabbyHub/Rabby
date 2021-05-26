import { Transaction } from '@ethereumjs/tx';
import {
  keyringService,
  permissionService,
  chainService,
  sessionService,
} from 'background/service';
import { Session } from 'background/service/session';
import { CHAINS } from 'consts';
import { http } from 'background/utils';
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
  @Reflect.metadata('APPROVAL', ['SignTx'])
  ethSendTransaction = async ({
    data: {
      params: [txParams],
    },
  }) => {
    const tx = Transaction.fromTxData(txParams);
    await keyringService.signTransaction(tx, txParams.from);

    const serializedTx = tx.serialize().toString('hex');

    return http('serializedTx', serializedTx);
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

  ethGetTransactionCount = () => '0x4e20';

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
