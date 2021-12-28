import React, { useState, useEffect } from 'react';
import { Popover } from 'antd';
import { useTranslation } from 'react-i18next';
import { Spin } from 'ui/component';
import { useCurrentBalance } from 'ui/component/AddressList/AddressItem';
import { splitNumberByStep, useWallet } from 'ui/utils';
import { CHAINS, KEYRING_TYPE, CHAINS_ENUM } from 'consts';
import useConfirmExternalModal from './ConfirmOpenExternalModal';
import { SvgIconOffline } from 'ui/assets';
import IconArrowRight from 'ui/assets/arrow-right.svg';
import IconExternal from 'ui/assets/open-external-gray.svg';
import IconChainMore from 'ui/assets/chain-more.svg';

const BalanceView = ({ currentAccount }) => {
  const [balance, chainBalances] = useCurrentBalance(
    currentAccount?.address,
    true
  );
  const _openInTab = useConfirmExternalModal();
  const { t } = useTranslation();
  const wallet = useWallet();
  const [isGnosis, setIsGnosis] = useState(false);
  const [gnosisNetwork, setGnosisNetwork] = useState(CHAINS[CHAINS_ENUM.ETH]);

  const handleGotoProfile = () => {
    _openInTab(`https://debank.com/profile/${currentAccount?.address}`);
  };

  const handleIsGnosisChange = async () => {
    if (!currentAccount) return;
    const networkId = await wallet.getGnosisNetworkId(currentAccount.address);
    const network = Object.values(CHAINS).find(
      (chain) => chain.id === Number(networkId)
    );
    if (network) {
      setGnosisNetwork(network);
    }
  };

  useEffect(() => {
    if (currentAccount) {
      setIsGnosis(currentAccount.type === KEYRING_TYPE.GnosisKeyring);
    }
  }, [currentAccount]);

  useEffect(() => {
    if (isGnosis) {
      handleIsGnosisChange();
    }
  }, [isGnosis, currentAccount]);

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
              <img className="chain-logo" src={chain?.logo} />
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
  const displayChainList = () => {
    if (isGnosis) {
      return (
        <>
          <img
            src={gnosisNetwork.whiteLogo || gnosisNetwork.logo}
            className="icon icon-chain opacity-60"
          />
          <span className="ml-2 text-white opacity-40">
            On {gnosisNetwork.name}
          </span>
        </>
      );
    }
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
  return (
    <div className="assets flex pt-28">
      <div className="left">
        <div className="amount leading-none mb-8" onClick={handleGotoProfile}>
          <div className="amount-number">
            <span>${splitNumberByStep((balance || 0).toFixed(2))}</span>
            <img className="icon icon-external-link" src={IconExternal} />
          </div>
          <img className="icon icon-arrow-right" src={IconArrowRight} />
        </div>
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
              <div className="flex items-center">{displayChainList()}</div>
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
