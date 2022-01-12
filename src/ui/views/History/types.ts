import { TxHistoryItem, TxHistoryResult } from 'background/service/openapi';

export interface TxDisplayItem extends TxHistoryItem {
  projectDict: TxHistoryResult['project_dict'];
  cateDict: TxHistoryResult['cate_dict'];
  tokenDict: TxHistoryResult['token_dict'];
}
