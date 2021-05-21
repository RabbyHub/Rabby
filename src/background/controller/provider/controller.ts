import { Transaction } from '@ethereumjs/tx';
import { keyringService, permission } from 'background/service';
import { Session } from 'background/service/session';
import { CHAINS } from 'consts';
import { http } from 'background/utils';
import BaseController from '../base';

class ProviderController extends BaseController {
  @Reflect.metadata('APPROVAL', 'SignTx')
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

  @Reflect.metadata('APPROVAL', 'SignText')
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
    return [account.address];
  };

  ethChainId = ({ session }: { session: Session }) => {
    const origin = session.origin;
    const site = permission.getWithoutUpdate(origin);
    return CHAINS[site!.chain].id;
  };

  ethGetTransactionCount = () => '0x100';

  ethRequestAccounts = this.ethAccounts;

  @Reflect.metadata('APPROVAL', 'AddChain')
  walletAddEthereumChain = ({
    data: {
      params: [chain],
    },
  }) => {
    console.log(chain);
  };
}

export default new ProviderController();
