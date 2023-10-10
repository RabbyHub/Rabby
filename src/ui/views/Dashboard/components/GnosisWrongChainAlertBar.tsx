import { useRabbySelector } from '@/ui/store';
import { CHAINS, CHAINS_ENUM } from '@debank/common';
import React from 'react';
import { useTranslation } from 'react-i18next';
import IconAlert from 'ui/assets/alert.svg';

const GnosisWrongChainAlert = () => {
  const { t } = useTranslation();
  const currentConnection = useRabbySelector(
    (state) => state.chains.currentConnection
  );
  const chain = CHAINS[currentConnection?.chain || CHAINS_ENUM.ETH];

  return (
    <div className="gnosis-wrong-chain-alert">
      <img className="icon-alert" src={IconAlert} />
      {t('page.dashboard.GnosisWrongChainAlertBar.warning', {
        chain: chain?.name,
      })}
    </div>
  );
};

export default GnosisWrongChainAlert;
