import React from 'react';
import { Popover } from 'antd';
import { useTranslation } from 'react-i18next';
import { Spin } from 'ui/component';
import { SvgIconOffline } from 'ui/assets';
import { useCurrentBalance } from 'ui/component/AddressList/AddressItem';
import { splitNumberByStep } from 'ui/utils';
import IconArrowRight from 'ui/assets/arrow-right.svg';
import { CHAINS } from 'consts';
import useConfirmExternalModal from './ConfirmOpenExternalModal';

const BalanceView = ({ currentAccount }) => {
  const [balance, chainBalances] = useCurrentBalance(
    currentAccount?.address,
    true
  );
  const _openInTab = useConfirmExternalModal();
  const { t } = useTranslation();

  const handleGotoProfile = () => {
    _openInTab(`https://debank.com/profile/${currentAccount?.address}`);
  };

  const balancePopoverContent = (
    <ul>
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
            <li className="flex" key={item.id}>
              <img className="chain-logo" src={chain.logo} />
              <span
                className="amount"
                title={'$' + splitNumberByStep(item.usd_value.toFixed(2))}
              >
                ${splitNumberByStep(Math.floor(item.usd_value))}
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
      <div className="left">
        <p className="amount leading-none" onClick={handleGotoProfile}>
          <span>${splitNumberByStep((balance || 0).toFixed(2))}</span>
          <img className="icon icon-arrow-right" src={IconArrowRight} />
        </p>
        <div className="extra leading-none flex">
          {balance === null ? (
            <>
              <Spin size="small" iconClassName="text-white" />
              <span className="ml-4 leading-tight">
                {t('Asset data loading')}
              </span>
            </>
          ) : isNaN(balance) ? (
            <>
              <SvgIconOffline className="mr-4" />
              <span className="leading-tight">
                {t('The network is disconnected and no data is obtained')}
              </span>
            </>
          ) : chainBalances.length > 0 ? (
            <Popover
              content={balancePopoverContent}
              placement="bottomLeft"
              overlayClassName="balance-popover"
            >
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
            t('No assets')
          )}
        </div>
      </div>
    </div>
  );
};

export default BalanceView;
