import React from 'react';
import { connectStore, useRabbyDispatch, useRabbySelector } from 'ui/store';
import RiskCheck from './RiskCheck';
import DisplayMnemonic from './DisplayMnemonic';
import { useTranslation } from 'react-i18next';

const CreateMnemonic = () => {
  const step = useRabbySelector((s) => s.createMnemonics.step);
  const { t } = useTranslation();
  const dispatch = useRabbyDispatch();
  React.useEffect(() => {
    dispatch.createMnemonics.getAllHDKeyrings();
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
