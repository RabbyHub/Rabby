import React from 'react';
import { connectStore, useRabbyDispatch } from 'ui/store';
import RiskCheck from './RiskCheck';
import DisplayMnemonic from './DisplayMnemonic';
import { useTranslation } from 'react-i18next';
import { useCreateMnemonicsStore } from '@/ui/state/createMnemonics';

const CreateMnemonic = () => {
  const step = useCreateMnemonicsStore((state) => state.step);
  const { t } = useTranslation();
  const dispatch = useRabbyDispatch();
  React.useEffect(() => {
    dispatch.account.getAllClassAccountsAsync();
  }, []);
  let node;

  switch (step) {
    case 'risk-check':
      node = <RiskCheck />;
      break;
    case 'display':
      node = <DisplayMnemonic />;
      break;
    default:
      throw new Error(t('page.newAddress.seedPhrase.importError'));
  }

  return node;
};

export default connectStore()(CreateMnemonic);
