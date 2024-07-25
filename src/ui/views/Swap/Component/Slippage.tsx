import clsx from 'clsx';
import {
  memo,
  useMemo,
  useCallback,
  ChangeEventHandler,
  useState,
} from 'react';
import { useToggle } from 'react-use';
import styled from 'styled-components';
import BigNumber from 'bignumber.js';
import React from 'react';
import { Input } from 'antd';
import ImgArrowUp from 'ui/assets/swap/arrow-up.svg';
import i18n from '@/i18n';
import { Trans, useTranslation } from 'react-i18next';

export const SlippageItem = styled.div`
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  border: 0.5px solid transparent;
  cursor: pointer;
  border-radius: 6px;
  width: 52px;
  height: 28px;
  font-weight: 500;
  font-size: 12px;
  background: var(--r-neutral-card-2, #f2f4f7);
  border-radius: 4px;
  overflow: hidden;

  &:hover,
  &.active {
    background: var(--r-blue-light1, #eef1ff);
    border-color: var(--r-blue-default, #7084ff);
  }
`;

const SLIPPAGE = ['0.1', '0.3', '0.5'];

const Wrapper = styled.section`
  .slippage {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .input {
    font-weight: 500;
    font-size: 12px;
    border: none;
    border-radius: 4px;
    background: transparent;

    &:placeholder-shown {
      color: #707280;
    }
    .ant-input {
      border-radius: 0;
    }
  }

  .warning {
    padding: 10px;
    color: #ffb020;
    font-weight: 400;
    font-size: 12px;
    line-height: 14px;
    position: relative;
    border-radius: 4px;
    background: rgba(255, 176, 32, 0.1);
    margin-top: 8px;
  }
`;
interface SlippageProps {
  value: string;
  displaySlippage: string;
  onChange: (n: string) => void;
  recommendValue?: number;
}
export const Slippage = memo((props: SlippageProps) => {
  const { t } = useTranslation();

  const { value, displaySlippage, onChange, recommendValue } = props;
  const [isCustom, setIsCustom] = useToggle(!SLIPPAGE.includes(value));

  const [slippageOpen, setSlippageOpen] = useState(false);

  const [isLow, isHigh] = useMemo(() => {
    return [
      value?.trim() !== '' && Number(value || 0) < 0.1,
      value?.trim() !== '' && Number(value || 0) > 10,
    ];
  }, [value]);

  const setRecommendValue = useCallback(() => {
    onChange(new BigNumber(recommendValue || 0).times(100).toString());
  }, [onChange, recommendValue]);

  const tips = useMemo(() => {
    if (isLow) {
      return i18n.t(
        'page.swap.low-slippage-may-cause-failed-transactions-due-to-high-volatility'
      );
    }
    if (isHigh) {
      return i18n.t(
        'page.swap.transaction-might-be-frontrun-because-of-high-slippage-tolerance'
      );
    }
    if (recommendValue) {
      return (
        <span>
          <Trans
            i18nKey="page.swap.recommend-slippage"
            value={{
              slippage: new BigNumber(recommendValue || 0)
                .times(100)
                .toString(),
            }}
            t={t}
          >
            To prevent front-running, we recommend a slippage of{' '}
            <span
              onClick={setRecommendValue}
              className="underline cursor-pointer"
            >
              {{
                slippage: new BigNumber(recommendValue || 0)
                  .times(100)
                  .toString(),
              }}
            </span>
            %{' '}
          </Trans>
        </span>
      );
    }
    return null;
  }, [isHigh, isLow, recommendValue, setRecommendValue]);

  const onInputChange: ChangeEventHandler<HTMLInputElement> = useCallback(
    (e) => {
      const v = e.target.value;
      if (/^\d*(\.\d*)?$/.test(v)) {
        onChange(Number(v) > 50 ? '50' : v);
      }
    },
    [onChange]
  );

  return (
    <div>
      <div
        className="flex justify-between cursor-pointer"
        onClick={() => {
          setSlippageOpen((e) => !e);
        }}
      >
        <span>{t('page.swap.slippage-tolerance')}</span>
        <span className="font-medium text-r-neutral-title-1 inline-flex items-center">
          <span className={clsx(!!tips && 'text-orange')}>
            {displaySlippage}%{' '}
          </span>
          <img
            src={ImgArrowUp}
            className={clsx(
              'transition-transform inline-block w-14 h-[15px]',
              !slippageOpen && 'rotate-180'
            )}
          />
        </span>
      </div>
      <Wrapper className="widget-has-ant-input">
        <div
          className={clsx(
            'slippage',
            slippageOpen ? 'mt-8' : 'h-0 overflow-hidden'
          )}
        >
          {SLIPPAGE.map((e) => (
            <SlippageItem
              key={e}
              onClick={(event) => {
                event.stopPropagation();
                setIsCustom(false);
                onChange(e);
              }}
              className={clsx(!isCustom && e === value && 'active')}
            >
              {e}%
            </SlippageItem>
          ))}
          <SlippageItem
            onClick={(event) => {
              event.stopPropagation();
              setIsCustom(true);
            }}
            className={clsx('flex-1', isCustom && 'active')}
          >
            <Input
              className={clsx('input')}
              bordered={false}
              value={value}
              onChange={onInputChange}
              placeholder="0.1"
              suffix={<div>%</div>}
            />
          </SlippageItem>
        </div>

        {!!tips && <div className={clsx('warning')}>{tips}</div>}
      </Wrapper>
    </div>
  );
});
