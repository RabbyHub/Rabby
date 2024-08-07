import { appIsDebugPkg, appIsProd } from '@/utils/env';
import { http } from '../utils/http';

interface IResponse {
  unread_message_count: number;
  is_checked: boolean;
}

const DEBANK_HOST = {
  DEBUG: 'https://hi-open-api.api.debank.dbkops.com',
  PROD: 'https://api.connect.debank.com',
};

class DebankHiService {
  async getDebankHi(address: string): Promise<IResponse | undefined> {
    const res = await http.get(
      `${
        appIsProd && !appIsDebugPkg ? DEBANK_HOST.PROD : DEBANK_HOST.DEBUG
      }/hi/unread_status`,
      {
        params: {
          addr: address,
          third_party: 'rabby',
        },
      }
    );
    if (res?.data?.error_code === 0) {
      return res.data.data as IResponse;
    }
    return;
  }
}
export default new DebankHiService();
