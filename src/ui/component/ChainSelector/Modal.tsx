import React, { useEffect, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { Drawer } from 'antd';

import { Chain } from 'background/service/openapi';
import { Account } from 'background/service/preference';
import { useWallet } from 'ui/utils';
import { CHAINS_ENUM, CHAINS } from 'consts';
import eventBus from '@/eventBus';
import ChainCard from '../ChainCard';
import clsx from 'clsx';
interface ChainSelectorModalProps {
  visible: boolean;
  value: CHAINS_ENUM;
  onCancel(): void;
  onChange(val: CHAINS_ENUM): void;
  connection?: boolean;
}

const ChainSelectorModal = ({
  visible,
  onCancel,
  onChange,
  value,
  connection = false,
}: ChainSelectorModalProps) => {
  const wallet = useWallet();
  const history = useHistory();
  const location = useLocation();
  const [currentAccount, setCurrentAccount] = useState<Account | null>(null);
  const [savedChainsData, setSavedChainsData] = useState<Chain[]>([]);

  const handleCancel = () => {
    onCancel();
  };

  const handleChange = (val: CHAINS_ENUM) => {
    onChange(val);
  };
  const goToChainManagement = () => {
    history.push({
      pathname: '/settings/chain',
      state: {
        connection,
        backurl: history?.location?.pathname,
      },
    });
  };
  const init = async () => {
    const savedChains = await wallet.getSavedChains();
    const savedChainsData = savedChains
      .map((item) => {
        return Object.values(CHAINS).find((chain) => chain.enum === item);
      })
      .filter(Boolean);
    setSavedChainsData(savedChainsData);
  };

  useEffect(() => {
    init();
    const accountChangeHandler = (data) => {
      if (data && data.address) {
        setCurrentAccount(data);
      }
    };
    eventBus.addEventListener('accountsChanged', accountChangeHandler);
    return () => {
      eventBus.removeEventListerner('accountsChanged', accountChangeHandler);
    };
  }, []);
  let maxHeight = Math.round(savedChainsData.length / 2) * 60 + 70;
  if (connection && maxHeight > 258) {
    maxHeight = 258;
  }
  return (
    <Drawer
      width="400px"
      closable={false}
      placement={'bottom'}
      visible={visible}
      onClose={handleCancel}
      className={clsx('chain-selector__modal', connection && 'connection')}
      contentWrapperStyle={{
        height: maxHeight > 450 ? 450 : maxHeight < 130 ? 130 : maxHeight,
      }}
      drawerStyle={{
        height: maxHeight > 450 ? 450 : maxHeight < 130 ? 130 : maxHeight,
      }}
    >
      <>
        {savedChainsData.length === 0 && (
          <div className="no-pinned-container">No pinned chains</div>
        )}
        {savedChainsData.length > 0 && (
          <ul className="chain-selector-options">
            {savedChainsData.map((chain) => (
              <div onClick={() => handleChange(chain.enum as CHAINS_ENUM)}>
                <ChainCard
                  chain={chain}
                  key={chain.id}
                  showIcon={false}
                  plus={false}
                  className="w-[176px] h-[56px]"
                />
              </div>
            ))}
          </ul>
        )}
        <div
          className="all-chais"
          onClick={goToChainManagement}
        >{`All chains >`}</div>
      </>
    </Drawer>
  );
};

export default ChainSelectorModal;
