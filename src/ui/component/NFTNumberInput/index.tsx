import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { Input, Tooltip } from 'antd';
import clsx from 'clsx';
import { NFTItem } from '@/background/service/openapi';
import './style.less';
import { useTranslation } from 'react-i18next';

interface Props {
  onChange?(val: number): void;
  max?: number;
  min?: number;
  value?: number;
  nftItem: NFTItem;
  disabled?: boolean;
}

interface InputRef {
  focus(): void;
}

const NumberInput = forwardRef<InputRef, Props>(
  (
    { value, onChange, min = 1, max, nftItem, disabled = false }: Props,
    ref
  ) => {
    const handleInputValueChange = (e) => {
      if (
        /^\d*$/.test(e.target.value) &&
        max &&
        Number(e.target.value) <= max
      ) {
        onChange && onChange(Number(e.target.value));
      }
    };

    const handleMinus = () => {
      if (!value || value <= min) return;
      onChange && onChange(value - 1);
    };

    const handleAdd = () => {
      if (!value || (max && value >= max)) return;
      onChange && onChange(value + 1);
    };

    const inputEl = useRef<Input | null>(null);

    useImperativeHandle(ref, () => ({
      focus: () => {
        inputEl.current && inputEl.current.focus();
      },
    }));

    const { t } = useTranslation();

    return (
      <div className="number-input">
        <div
          className={clsx('action left', { disabled: value && value <= min })}
          onClick={handleMinus}
        >
          -
        </div>
        <Input
          type="number"
          value={value}
          onChange={handleInputValueChange}
          disabled={disabled}
          ref={inputEl}
        />
        <Tooltip
          overlayClassName={clsx('rectangle send-nft-tooltip', {
            is1155: nftItem.is_erc1155,
          })}
          title={
            nftItem.is_erc1155
              ? t('component.NFTNumberInput.erc1155Tips', {
                  amount: nftItem.amount,
                })
              : t('component.NFTNumberInput.erc721Tips')
          }
        >
          <div
            className={clsx('action right', {
              disabled: value && max && value >= max,
            })}
            onClick={handleAdd}
          >
            +
          </div>
        </Tooltip>
      </div>
    );
  }
);

export default NumberInput;
