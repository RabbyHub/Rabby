import i18n from '@/i18n';
import { ParsedTextActionData } from '@rabby-wallet/rabby-action';

export const getActionTypeText = (data: ParsedTextActionData | null) => {
  const { t } = i18n;

  if (data?.createKey) {
    return t('page.signTypedData.createKey.title');
  }
  if (data?.verifyAddress) {
    return t('page.signTypedData.verifyAddress.title');
  }
  if (data?.common) {
    return data.common.title;
  }
  return t('page.signTx.unknownAction');
};
