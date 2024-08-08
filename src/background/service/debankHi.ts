import { appIsDebugPkg, appIsProd } from '@/utils/env';
import { http } from '../utils/http';

interface IResponse {
  unread_message_count: number;
  is_checked: boolean;
}

const DEBANK_HOST = 'https://api.debank.com';

class DebankHiService {
  async getDebankHi(address: string): Promise<IResponse | undefined> {
    const res = await http.get(`${DEBANK_HOST}/hi/unread_status`, {
      params: {
        addr: address,
        third_party: 'rabby',
      },
    });
    if (res?.data?.error_code === 0) {
      return res.data.data as IResponse;
    }
    return;
  }
}
export default new DebankHiService();
