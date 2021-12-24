import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { Modal } from 'ui/component';
import { useCurrentBalance } from 'ui/component/AddressList/AddressItem';
import { Chain } from 'background/service/chain';
import { Account } from 'background/service/preference';
import { useWallet } from 'ui/utils';
import { CHAINS_ENUM } from 'consts';
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
      },
    });
  };
  const init = async () => {
    const savedChains = await wallet.getSavedChains();
    const getSupportChains = await wallet.getSupportChains();
    const savedChainsData = savedChains
      .map((item) => {
        return getSupportChains.find((chain) => chain.enum === item);
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

  return (
    <Modal
      width="400px"
      closable={false}
      visible={visible}
      onCancel={handleCancel}
      className={clsx('chain-selector__modal', connection && 'connection')}
      transitionName=""
      maskTransitionName=""
    >
      <>
        {savedChainsData.length === 0 && (
          <div className="no-pinned-container">No pinned Chains</div>
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
    </Modal>
  );
};

export default ChainSelectorModal;
