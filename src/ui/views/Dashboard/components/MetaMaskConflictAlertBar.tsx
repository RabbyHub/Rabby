import React from 'react';
import { useTranslation } from 'react-i18next';
import IconMetaMaskWarning from 'ui/assets/metamask-warning.svg';
import IconOpenExternal from 'ui/assets/open-external.svg';

const MetaMaskConflictAlertBar = () => {
  const { t } = useTranslation();
  const handleClick = () => {
    // TODO
  };

  return (
    <div className="metamask-conflict-alert" onClick={handleClick}>
      <img className="icon-metamask-warning" src={IconMetaMaskWarning} />
      {t('Disable metamask to avoid conflicts')}
      <img className="icon-open-external" src={IconOpenExternal} />
    </div>
  );
};

export default MetaMaskConflictAlertBar;
