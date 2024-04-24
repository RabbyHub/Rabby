import clsx from 'clsx';
import React, { useEffect, useState, useRef } from 'react';
import { Input, Button } from 'antd';
import { useTranslation } from 'react-i18next';
import { CHAINS, MINIMUM_GAS_LIMIT } from 'consts';
import Popup from 'ui/component/Popup';
import { GasLevel, TokenItem } from 'background/service/openapi';
import { formatTokenAmount } from 'ui/utils/number';
import styled from 'styled-components';
import { BigNumber } from 'bignumber.js';
import { getGasLevelI18nKey } from '@/ui/utils/trans';
import { findChain } from '@/utils/chain';
import { INPUT_NUMBER_RE, filterNumber } from '@/constant/regexp';

interface GasSelectorProps {
  chainId: number;
  onChange(gas: GasLevel): void;
  gasList: GasLevel[];
  gas: GasLevel | null;
  visible: boolean;
  token: TokenItem;
  onClose(): void;
}

const Description = styled.p`
  font-weight: 400;
  font-size: 12px;
  line-height: 16px;
  text-align: center;
  color: var(--r-neutral-foot, #babec5);
  margin: 0 0 30px;
`;

const Footer = styled.div`
  display: flex;
  justify-content: center;
  margin-top: 79px;
`;

const GasSelector = ({
  chainId,
  onChange,
  gasList,
  gas,
  visible,
  token,
  onClose,
}: GasSelectorProps) => {
  const { t } = useTranslation();
  const customerInputRef = useRef<Input>(null);
  const [customGas, setCustomGas] = useState<string | number>('0');
  const chain = findChain({
    id: chainId,
  });
  const [selectedGas, setSelectedGas] = useState(gas);

  const handleConfirmGas = () => {
    if (!selectedGas) return;
    if (selectedGas.level === 'custom') {
      onChange({
        ...selectedGas,
        price: Number(customGas) * 1e9,
        level: selectedGas.level,
      });
    } else {
      onChange({
        ...selectedGas,
        level: selectedGas.level,
      });
    }
  };

  const handleCustomGasChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    if (INPUT_NUMBER_RE.test(e.target.value)) {
      setCustomGas(filterNumber(e.target.value));
    }
  };

  const panelSelection = (e, gas: GasLevel) => {
    e.stopPropagation();
    const target = gas;

    if (gas.level === selectedGas?.level) return;
    if (gas.level === 'custom') {
      setSelectedGas({
        ...target,
        level: 'custom',
      });
      customerInputRef.current?.focus();
    } else {
      setSelectedGas({
        ...gas,
        level: gas?.level,
      });
    }
  };

  const customGasConfirm = (e) => {
    const gas = {
      level: 'custom',
      price: Number(e?.target?.value),
      front_tx_count: 0,
      estimated_seconds: 0,
      base_fee: gasList[0].base_fee,
      priority_price: null,
    };
    setSelectedGas({
      ...gas,
      price: Number(gas.price),
      level: gas.level,
    });
  };

  useEffect(() => {
    if (selectedGas?.level === 'custom') {
      setSelectedGas({
        level: 'custom',
        price: Number(customGas) * 1e9,
        front_tx_count: 0,
        estimated_seconds: 0,
        base_fee: 0,
        priority_price: null,
      });
    }
  }, [customGas]);

  useEffect(() => {
    setSelectedGas(gas);
  }, [gas]);

  return (
    <Popup
      height={400}
      // Set Gas Price (Gwei)
      title={t('page.sendToken.GasSelector.popupTitle')}
      visible={visible}
      onClose={onClose}
      placement="bottom"
      className="send-token-gas-selector"
      closable={false}
      isSupportDarkMode
    >
      <Description>
        {/* The gas cost will be reserved from the transfer amount based on the gas
        price you set */}
        {t('page.sendToken.GasSelector.popupDesc')}
      </Description>
      <div className="gas-selector">
        <div className="top">
          <p className="usmoney">
            ≈ $
            {new BigNumber(selectedGas ? selectedGas.price : 0)
              .times(MINIMUM_GAS_LIMIT)
              .div(1e18)
              .times(token.price)
              .toFixed(2)}
          </p>
          <p className="gasmoney">
            {`${formatTokenAmount(
              new BigNumber(selectedGas ? selectedGas.price : 0)
                .times(MINIMUM_GAS_LIMIT)
                .div(1e18)
                .toFixed()
            )} ${chain?.nativeTokenSymbol}`}
          </p>
        </div>
        <div className="card-container">
          {gasList.map((item) => (
            <div
              className={clsx('card cursor-pointer', {
                active: selectedGas?.level === item.level,
              })}
              onClick={(e) => panelSelection(e, item)}
            >
              <div className="gas-level">
                {t(getGasLevelI18nKey(item.level))}
              </div>
              <div
                className={clsx('cardTitle', {
                  'custom-input': item.level === 'custom',
                  active: selectedGas?.level === item.level,
                })}
              >
                {item.level === 'custom' ? (
                  <Input
                    className="cursor-pointer"
                    value={customGas}
                    defaultValue={customGas}
                    onChange={handleCustomGasChange}
                    onClick={(e) => panelSelection(e, item)}
                    onPressEnter={customGasConfirm}
                    ref={customerInputRef}
                    autoFocus={selectedGas?.level === item.level}
                    min={0}
                    bordered={false}
                  />
                ) : (
                  item.price / 1e9
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      <Footer>
        <Button
          type="primary"
          size="large"
          className="w-[200px]"
          onClick={handleConfirmGas}
        >
          {/* Confirm */}
          {t('page.sendToken.GasSelector.confirm')}
        </Button>
      </Footer>
    </Popup>
  );
};

export default GasSelector;
