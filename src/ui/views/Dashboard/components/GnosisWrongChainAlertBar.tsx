import { useRabbySelector } from '@/ui/store';
import { CHAINS, CHAINS_ENUM } from '@debank/common';
import React from 'react';
import { useTranslation } from 'react-i18next';
import IconAlert from 'ui/assets/alert.svg';
import { ReactComponent as RcIconInfoCC } from '@/ui/assets/info-cc.svg';

const GnosisWrongChainAlert = () => {
  const { t } = useTranslation();

  return (
    <div className="gnosis-wrong-chain-alert">
      <RcIconInfoCC className="w-[14px] h-[14px]" />
      {t('page.dashboard.GnosisWrongChainAlertBar.notDeployed')}
    </div>
  );
};

export default GnosisWrongChainAlert;
