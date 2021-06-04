import React from 'react';
import { browser } from 'webextension-polyfill-ts';
import { Spin } from 'ui/component';
import { IconOffline } from 'ui/assets';
import { useCurrentBalance } from 'ui/component/AddressList/AddressItem';
import { splitNumberByStep } from 'ui/utils/number';
import IconArrowRight from 'ui/assets/arrow-right.svg';

const BalanceView = ({ currentAccount }) => {
  const [balance, chainBalances] = useCurrentBalance(currentAccount?.address);

  const handleGotoProfile = () => {
    browser.tabs.create({
      url: `https://debank.com/profile/${currentAccount?.address}`,
    });
  };

  return (
    <div className="assets flex">
      <div className="left" onClick={handleGotoProfile}>
        <p className="amount leading-none">
          <span>${splitNumberByStep((balance || 0).toFixed(2))}</span>
          <img className="icon icon-arrow-right" src={IconArrowRight} />
        </p>
        <div className="extra leading-none flex">
          {balance === null ? (
            <>
              <Spin spinning={true} size="small" className="mr-4" />
              <span className="ml-4 leading-tight">Asset data loading</span>
            </>
          ) : isNaN(balance) ? (
            <>
              <IconOffline className="mr-4" />
              The network is disconnected and no data is obtained
            </>
          ) : chainBalances.length > 0 ? (
            chainBalances.map((item) => (
              <img
                src={item.whiteLogo || item.logo_url}
                className="icon icon-chain"
                key={item.id}
                alt={`${item.name}: $${item.usd_value.toFixed(2)}`}
                title={`${item.name}: $${item.usd_value.toFixed(2)}`}
              />
            ))
          ) : (
            'This seems to be no assets yet'
          )}
        </div>
      </div>
    </div>
  );
};

export default BalanceView;
