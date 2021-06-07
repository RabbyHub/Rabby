import React from 'react';
import { browser } from 'webextension-polyfill-ts';
import { Popover } from 'antd';
import { Spin } from 'ui/component';
import { IconOffline } from 'ui/assets';
import { useCurrentBalance } from 'ui/component/AddressList/AddressItem';
import { splitNumberByStep } from 'ui/utils/number';
import IconArrowRight from 'ui/assets/arrow-right.svg';
import { CHAINS } from 'consts';

const BalanceView = ({ currentAccount }) => {
  const [balance, chainBalances] = useCurrentBalance(currentAccount?.address);

  const handleGotoProfile = () => {
    browser.tabs.create({
      url: `https://debank.com/profile/${currentAccount?.address}`,
    });
  };

  const balancePopoverContent = (
    <ul className="balance-popover">
      {chainBalances
        .sort((a, b) => b.usd_value - a.usd_value)
        .map((item) => {
          const totalUSDValue = chainBalances.reduce((res, item) => {
            return res + item.usd_value;
          }, 0);
          const chain = Object.values(CHAINS).find(
            (v) => v.serverId === item.id
          )!;
          const percent = (item.usd_value / totalUSDValue) * 100;
          return (
            <li className="flex">
              <img className="chain-logo" src={chain.logo} />
              <span className="amount">
                ${splitNumberByStep(item.usd_value.toFixed(2))}
              </span>
              <div className="progress">
                <div className="inner" style={{ width: percent + '%' }}></div>
              </div>
              <span className="percent">{Math.floor(percent)}%</span>
            </li>
          );
        })}
    </ul>
  );

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
              <Spin spinning={true} size="small" iconClassName="text-white" />
              <span className="ml-4 leading-tight">Asset data loading</span>
            </>
          ) : isNaN(balance) ? (
            <>
              <IconOffline className="mr-4" />
              The network is disconnected and no data is obtained
            </>
          ) : chainBalances.length > 0 ? (
            <Popover content={balancePopoverContent} placement="bottomLeft">
              <div className="flex">
                {chainBalances.map((item) => (
                  <img
                    src={item.whiteLogo || item.logo_url}
                    className="icon icon-chain"
                    key={item.id}
                    alt={`${item.name}: $${item.usd_value.toFixed(2)}`}
                  />
                ))}
              </div>
            </Popover>
          ) : (
            'No assets'
          )}
        </div>
      </div>
    </div>
  );
};

export default BalanceView;
