import { CHAINS } from 'consts';
import { createPersistStore } from 'background/utils';
import { http } from 'background/utils';

class ChainService {
  supportChainIds: string[] = [];
  init = async () => {
    // this.supportChainIds = await http('get_support_id');
  };
}

export default new ChainService();
