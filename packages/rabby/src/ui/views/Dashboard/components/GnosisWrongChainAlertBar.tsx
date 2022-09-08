import React from 'react';
import { useTranslation } from 'react-i18next';
import IconAlert from 'ui/assets/alert.svg';

const GnosisWrongChainAllert = () => {
  const { t } = useTranslation();

  return (
    <div className="gnosis-wrong-chain-alert">
      <img className="icon-alert" src={IconAlert} />
      {t('GnosisSwitchChainWarning')}
    </div>
  );
};

export default GnosisWrongChainAllert;
