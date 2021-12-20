import React, { useState, useEffect } from 'react';
import { Popover } from 'antd';
import { useTranslation } from 'react-i18next';
import { Spin } from 'ui/component';
import { useCurrentBalance } from 'ui/component/AddressList/AddressItem';
import { splitNumberByStep } from 'ui/utils';
import { CHAINS } from 'consts';
import useConfirmExternalModal from './ConfirmOpenExternalModal';
import { SvgIconOffline } from 'ui/assets';
import IconArrowRight from 'ui/assets/arrow-right.svg';
import IconExternal from 'ui/assets/open-external-gray.svg';
import IconChainMore from 'ui/assets/chain-more.svg';
import clsx from 'clsx';
const BalanceView = ({ currentAccount, showChain = false }) => {
  const [balance, chainBalances] = useCurrentBalance(
    currentAccount?.address,
    true
  );
  const [numberAnimation, setNumberAnimation] = useState('');
  const [numberWrapperAnimation, setNumberWrapperAnimation] = useState('');

  const _openInTab = useConfirmExternalModal();
  const { t } = useTranslation();

  // const handleGotoProfile = () => {
  //   _openInTab(`https://debank.com/profile/${currentAccount?.address}`);
  // };
  const displayChainList = () => {
    const result = chainBalances.map((item) => (
      <img
        src={item.whiteLogo || item.logo_url}
        className="icon icon-chain opacity-60"
        key={item.id}
        alt={`${item.name}: $${item.usd_value.toFixed(2)}`}
      />
    ));
    if (result.length > 9) {
      return result
        .slice(0, 9)
        .concat(
          <img src={IconChainMore} className="icon icon-chain" key="more" />
        );
    }
    return result;
  };
  useEffect(() => {
    if (showChain) {
      setNumberAnimation('numberScaleOut');
      setNumberWrapperAnimation('numberWrapperScaleOut');
    } else {
      setNumberAnimation('numberScaleIn');
      setNumberWrapperAnimation('numberWrapperScaleIn');
    }
  }, [showChain]);
  return (
    <div className={clsx('assets flex', numberWrapperAnimation)}>
      <div className="left">
        <div className={clsx('amount mb-8', numberAnimation)}>
          <div className={clsx('amount-number')}>
            <span>${splitNumberByStep((balance || 0).toFixed(2))}</span>
          </div>
        </div>
        {showChain && (
          <div className="extra flex">
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
              <div className="flex">{displayChainList()}</div>
            ) : (
              t('No assets')
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default BalanceView;
