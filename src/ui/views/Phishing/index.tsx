import { getCurrentTab, useWallet } from '@/ui/utils';
import { matomoRequestEvent } from '@/utils/matomo-request';
import React from 'react';
import { useLocation } from 'react-router-dom';
import IconRabby from 'ui/assets/dashboard/rabby.svg';
import IconDanger from 'ui/assets/phishing/danger.svg';
import { browser } from 'webextension-polyfill-ts';
import './index.less';

const Phishing = () => {
  const location = useLocation();
  const wallet = useWallet();
  const origin = React.useMemo(
    () => new URLSearchParams(location.search).get('origin'),
    [location]
  );

  if (!origin) {
    return null;
  }

  const onClose = () => {
    window.close();
    matomoRequestEvent({
      category: 'Phishing',
      action: 'close',
      label: origin,
    });
  };

  const onContinue = async () => {
    await wallet.continuePhishing(origin);
    matomoRequestEvent({
      category: 'Phishing',
      action: 'continue',
      label: origin,
    });

    const tab = await getCurrentTab();

    browser.tabs.update(tab.id, {
      active: true,
      url: origin,
    });
  };

  React.useEffect(() => {
    matomoRequestEvent({
      category: 'Phishing',
      action: 'active',
      label: origin,
    });
  }, [origin]);

  return (
    <div className="phishing">
      <div className="phishing-content">
        <img className="phishing-logo" src={IconRabby} />
        <div className="phishing-headline">
          <img className="phishing-danger" src={IconDanger} />
          <h1 className="phishing-title">Phishing site detected by Rabby</h1>
        </div>
        <div className="phishing-body">
          <p className="phishing-text">
            Rabby detects that you are currently visiting a phishing site.
            Interaction on the website might lead to losses. Therefore Rabby has
            restricted access to the site.
          </p>
          <p className="phishing-text">
            If you insist on accessing the site, please click the link below.
            Rabby will not be responsible for the security of your assets.
          </p>
        </div>
        <div className="phishing-footer">
          <button onClick={onClose} className="phishing-close">
            Close
          </button>
          <a onClick={onContinue} href="#" className="phishing-continue">
            I'm aware of the risks and will continue to visit the site.
          </a>
        </div>
      </div>
    </div>
  );
};

export default Phishing;
