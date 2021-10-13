import React, { useEffect, useState } from 'react';
import { Modal } from 'ui/component';
import { useCurrentBalance } from 'ui/component/AddressList/AddressItem';
import { Chain } from 'background/service/chain';
import { Account } from 'background/service/preference';
import { useWallet, splitNumberByStep } from 'ui/utils';
import { CHAINS_ENUM } from 'consts';
import IconChecked from 'ui/assets/checked.svg';
import IconNotChecked from 'ui/assets/not-checked.svg';

interface ChainSelectorModalProps {
  visible: boolean;
  value: CHAINS_ENUM;
  onCancel(): void;
  onChange(val: CHAINS_ENUM): void;
}

const ChainSelectorModal = ({
  visible,
  onCancel,
  onChange,
  value,
}: ChainSelectorModalProps) => {
  const wallet = useWallet();
  const [enableChains, setEnableChains] = useState<Chain[]>([]);
  const [currentAccount, setCurrentAccount] = useState<Account | null>(null);
  const [, chainBalances] = useCurrentBalance(currentAccount?.address);

  const chainBalanceMap = chainBalances.reduce((m, n) => {
    m[n.community_id] = n;
    m[n.community_id].splitedNumber = splitNumberByStep(n.usd_value.toFixed(2));
    return m;
  }, {});

  const handleCancel = () => {
    onCancel();
  };

  const handleChange = (val: CHAINS_ENUM) => {
    onChange(val);
  };

  const init = async () => {
    setEnableChains(await wallet.getEnableChains());
    setCurrentAccount(await wallet.syncGetCurrentAccount());
  };

  useEffect(() => {
    init();
  }, []);

  return (
    <Modal
      width="360px"
      closable={false}
      visible={visible}
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
              <img className="chain-logo" src={chain?.logo} />
              <div className="chain-name">
                <p className="text-13 font-medium my-0 leading-none">
                  {chain.name}
                </p>
                {chainBalanceMap[chain?.id]?.usd_value && (
                  <>
                    <div className="absolute left-0 top-10 bottom-10 w-2 bg-blue-light" />
                    <p
                      className="mt-4 mb-0 text-gray-content text-12 truncate"
                      title={splitNumberByStep(
                        chainBalanceMap[chain?.id].splitedNumber
                      )}
                    >
                      $
                      {splitNumberByStep(
                        chainBalanceMap[chain?.id].splitedNumber
                      )}
                    </p>
                  </>
                )}
              </div>
              <img
                className="icon icon-checked"
                src={value === chain?.enum ? IconChecked : IconNotChecked}
              />
            </li>
          ))}
        </ul>
      </>
    </Modal>
  );
};

export default ChainSelectorModal;
