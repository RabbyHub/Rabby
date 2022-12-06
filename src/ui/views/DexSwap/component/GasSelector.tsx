import clsx from 'clsx';
import React, { useRef, useMemo } from 'react';
import { Input } from 'antd';
import { useTranslation } from 'react-i18next';
import { GAS_LEVEL_TEXT } from 'consts';
import { GasLevel, TokenItem } from 'background/service/openapi';
import { useToggle } from 'react-use';
import { ReactComponent as IconTipDownArrow } from 'ui/assets/swap/arrow-tips-down.svg';
import styled from 'styled-components';
import { SlippageItem } from './Slippage';
import BigNumber from 'bignumber.js';
import LessPalette from '@/ui/style/var-defs';

interface GasSelectorProps {
  chainId: number;
  onChange(gas: GasLevel): void;
  gasList: GasLevel[];
  gas: GasLevel | null;
  token: TokenItem;
  gasUsed?: string | number;
}

export const GasSelector = ({
  onChange,
  gasList,
  gas: selectGas,
  token,
  gasUsed,
}: GasSelectorProps) => {
  const { t } = useTranslation();
  const customerInputRef = useRef<Input>(null);

  const [open, setOpen] = useToggle(false);

  const handleCustomGasChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    if (selectGas && /^\d*(\.\d*)?$/.test(e.target.value)) {
      onChange({
        ...selectGas,
        price: Number(e.target.value) * 1e9,
        level: 'custom',
      });
    }
  };

  const panelSelection = (e, gas: GasLevel) => {
    e.stopPropagation();
    if (gas.level === 'custom') {
      return onChange({
        ...gas,
        price: selectGas!.price,
        level: 'custom',
      });
    }
    onChange({ ...gas });
  };

  const gasUsd = useMemo(() => {
    if (!gasUsed || gasList.length < 1) {
      return '-';
    }
    if (selectGas?.level !== 'custom') {
      const item = gasList.find((e) => e.level === selectGas?.level);
      return new BigNumber(item?.price || 0)
        .times(gasUsed)
        .div(10 ** token.decimals)
        .times(token.price)
        .toFixed(2);
    } else {
      return new BigNumber(selectGas.price)
        .times(gasUsed)
        .div(10 ** token.decimals)
        .times(token.price)
        .toFixed(2);
    }
  }, [gasUsed, selectGas, gasList, token]);

  return (
    <section className={clsx('relative cursor-pointer px-12')}>
      <div className="flex justify-between" onClick={() => setOpen()}>
        <div className="text-13 text-gray-title">Gas fee</div>

        <div className="text-right text-13 font-medium flex items-center">
          {selectGas?.level ? GAS_LEVEL_TEXT[selectGas?.level] : ''}·${gasUsd}
          <div
            className={clsx('ml-4', {
              'rotate-180': open,
            })}
          >
            <IconTipDownArrow />
          </div>
        </div>
      </div>
      <div
        className={clsx('flex justify-between items-center  rounded mt-8', {
          hidden: !open,
        })}
      >
        {gasList.map((item) => (
          <GasItem
            //   'cursor-pointer w-[78px] h-[52px] flex-col pt-10 pb-9 justify-between'
            active={selectGas?.level === item.level}
            onClick={(e) => panelSelection(e, item)}
          >
            <div className="gas-level">{t(GAS_LEVEL_TEXT[item.level])}</div>
            <div>
              {item.level === 'custom' ? (
                <Input
                  className="cursor-pointer"
                  value={
                    selectGas?.level === 'custom'
                      ? (selectGas?.price || 0) / 1e9
                      : 0
                  }
                  //   defaultValue={(selectGas?.price || 0) / 1e9}
                  onChange={handleCustomGasChange}
                  onClick={(e) => panelSelection(e, item)}
                  //   onPressEnter={customGasConfirm}
                  ref={customerInputRef}
                  autoFocus={selectGas?.level === item.level}
                  min={0}
                  bordered={false}
                />
              ) : (
                item.price / 1e9
              )}
            </div>
          </GasItem>
        ))}
      </div>
    </section>
  );
};

const GasItem = styled(SlippageItem)`
  flex-direction: column;
  width: 72px;
  height: 52px;
  padding: 10px 4px 9px 4px;
  justify-content: space-between;
  font-weight: 500;
  font-size: 13px;
  line-height: 15px;
  text-align: center;
  &:hover {
    background-color: rgba(134, 151, 255, 0.1);
    border-color: ${LessPalette['@primary-color']};
  }
  .gas-level {
    font-weight: 400;
    font-size: 12px;
    line-height: 14px;
    text-align: center;
    color: #4b4d59;
  }
  .ant-input {
    padding: 0;
    font-weight: 500;
    font-size: 13px;
    line-height: 15px;
  }
`;
