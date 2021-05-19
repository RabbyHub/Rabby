import { Transaction } from '@ethereumjs/tx';
import { keyringService, permission } from 'background/service';
import { http } from 'background/utils';
import BaseController from '../base';

class ProviderController extends BaseController {
  @Reflect.metadata('approval', true)
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

  @Reflect.metadata('approval', true)
  personalSign = ({
    data: {
      params: [data, from],
    },
  }) => keyringService.signPersonalMessage({ data, from });

  ethAccounts = async ({ session: { origin } }) => {
    if (!permission.hasPerssmion(origin)) {
      return [];
    }

    return [await this.getCurrentAccount()];
  };

  ethChainId = () => '0x1';

  ethGetTransactionCount = () => '0x100';

  ethRequestAccounts = this.ethAccounts;
}

export default new ProviderController();
