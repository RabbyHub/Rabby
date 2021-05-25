import { Transaction } from '@ethereumjs/tx';
import { keyringService, permission, chainService } from 'background/service';
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
    if (!permission.hasPerssmion(origin)) {
      return [];
    }
    const account = await this.getCurrentAccount();
    if (!account) return [];
    return [account.address];
  };

  ethChainId = ({ session }: { session: Session }) => {
    const origin = session.origin;
    const site = permission.getWithoutUpdate(origin);
    return CHAINS[site!.chain].id;
  };

  netVersion = ({ session }: { session: Session }) => {
    const origin = session.origin;
    const site = permission.getWithoutUpdate(origin);
    if (!site) {
      return null;
    }
    return CHAINS[site.chain].network;
  };

  ethGetTransactionCount = () => '0x100';

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
        CHAINS[permission.getConnectedSite(origin)!.chain]?.hex ===
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

    permission.updateConnectSite(
      origin,
      {
        chain: chain.enum,
      },
      true
    );

    return chainService.enableChain(chain.enum);
  };
}

export default new ProviderController();
