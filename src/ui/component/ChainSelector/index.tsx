import React, { useState } from 'react';
import { Modal } from 'antd';
import { CHAINS_ENUM, CHAINS } from 'consts';
import { useWallet, splitNumberByStep } from 'ui/utils';
import IconChecked from 'ui/assets/checked.svg';
import IconNotChecked from 'ui/assets/not-checked.svg';
import { IconArrowDown } from 'ui/assets';
import { useCurrentBalance } from 'ui/component/AddressList/AddressItem';

import './style.less';

interface ChainSelectorProps {
  value: CHAINS_ENUM;
  onChange(value: CHAINS_ENUM): void;
  direction?: 'top' | 'bottom';
}

const ChainSelector = ({ value, onChange }: ChainSelectorProps) => {
  const wallet = useWallet();
  const [showSelectorModal, setShowSelectorModal] = useState(false);
  const [enableChains] = useState(wallet.getEnableChains());
  const currentAccount = wallet.syncGetCurrentAccount();
  const [, chainBalances] = useCurrentBalance(currentAccount?.address);

  const handleClickSelector = () => {
    setShowSelectorModal(true);
  };

  const handleCancel = () => {
    setShowSelectorModal(false);
  };

  const handleChange = (val: CHAINS_ENUM) => {
    setShowSelectorModal(false);
    onChange(val);
  };

  const chainBalanceMap = chainBalances.reduce((m, n) => {
    m[n.community_id] = n;
    m[n.community_id].splitedNumber = splitNumberByStep(n.usd_value.toFixed(2));
    return m;
  }, {});

  return (
    <>
      <div className="chain-selector" onClick={handleClickSelector}>
        <img src={CHAINS[value].logo} className="chain-logo" />
        <IconArrowDown className="icon icon-arrow-down text-gray-content fill-current" />
      </div>
      <Modal
        centered
        width="90%"
        closable={false}
        visible={showSelectorModal}
        footer={null}
        onCancel={handleCancel}
        className="chain-selector__modal"
      >
        <>
          <ul className="chain-selector-options">
            {enableChains.map((chain) => (
              <li
                className="relative"
                key={chain.enum}
                onClick={() => handleChange(chain.enum as CHAINS_ENUM)}
              >
                <img className="chain-logo" src={chain.logo} />
                <div className="chain-name">
                  <p className="text-13 font-medium my-0">{chain.name}</p>
                  {chainBalanceMap[chain.id]?.usd_value && (
                    <>
                      <div className="absolute left-0 top-10 bottom-10 w-2 bg-blue-light" />
                      <p
                        className="mt-4 mb-0 text-gray-content text-12 truncate"
                        title={splitNumberByStep(
                          chainBalanceMap[chain.id].splitedNumber
                        )}
                      >
                        $
                        {splitNumberByStep(
                          chainBalanceMap[chain.id].splitedNumber
                        )}
                      </p>
                    </>
                  )}
                </div>
                <img
                  className="icon icon-checked"
                  src={value === chain.enum ? IconChecked : IconNotChecked}
                />
              </li>
            ))}
          </ul>
        </>
      </Modal>
    </>
  );
};

export default ChainSelector;
