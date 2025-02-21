import clsx from 'clsx';
import {
  memo,
  useMemo,
  useCallback,
  ChangeEventHandler,
  useState,
  useEffect,
} from 'react';
import styled from 'styled-components';
import BigNumber from 'bignumber.js';
import React from 'react';
import { Input } from 'antd';
import i18n from '@/i18n';
import { Trans, useTranslation } from 'react-i18next';

const SlippageItem = styled.div`
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  border: 1px solid transparent;
  cursor: pointer;
  border-radius: 6px;
  width: 58px;
  height: 32px;
  font-weight: 500;
  font-size: 13px;
  background: var(--r-neutral-card-1, #fff);
  border-radius: 6px;
  overflow: hidden;
  color: var(--r-neutral-title1, #192945);

  &.input-wrapper {
    border: 1px solid var(--r-neutral-line, #e0e5ec);
    background: var(--r-neutral-card-1, #fff);
  }

  &:hover,
  &.active {
    color: var(--r-blue-default, #7084ff);
    background: var(--r-blue-light1, #eef1ff);
    border: 1px solid var(--r-blue-default, #7084ff);
  }

  &.error,
  &.active.error,
  &.error:hover {
    border: 1px solid var(--r-red-default, #e34935);
    background: var(--r-red-light, #fff2f0);
  }
`;

const BRIDGE_SLIPPAGE = ['0.5', '1'];

export const SWAP_SLIPPAGE = ['0.5', '3'];

const BRIDGE_MAX_SLIPPAGE = 10;

const SWAP_MAX_SLIPPAGE = 50;

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
      font-weight: 500;
      font-size: 12px;
    }
  }

  .warning {
    padding: 8px;
    border-radius: 4px;
    border: 0.5px solid var(--r-red-default, #e34935);
    background: var(--r-red-light, #fff2f0);
    color: var(--r-red-default, #e34935);
    font-size: 13px;
    font-style: normal;
    font-weight: 400;
    line-height: normal;
    position: relative;
    margin-top: 8px;
  }
`;
interface BridgeSlippageProps {
  value: string;
  displaySlippage: string;
  onChange: (n: string) => void;
  recommendValue?: number;
  autoSlippage: boolean;
  isCustomSlippage: boolean;
  setAutoSlippage: (boolean: boolean) => void;
  setIsCustomSlippage: (boolean: boolean) => void;
  type: 'swap' | 'bridge';
  isWrapToken?: boolean;
}
export const BridgeSlippage = memo((props: BridgeSlippageProps) => {
  const { t } = useTranslation();

  const {
    value,
    displaySlippage,
    onChange,
    recommendValue,
    autoSlippage,
    isCustomSlippage,
    setAutoSlippage,
    setIsCustomSlippage,
    type,
    isWrapToken,
  } = props;

  const [slippageOpen, setSlippageOpen] = useState(false);

  const [minimumSlippage, maximumSlippage] = useMemo(() => {
    if (type === 'swap') {
      return [0.1, 10];
    }
    return [0.2, 3];
  }, [type]);

  const SLIPPAGE = useMemo(() => {
    if (type === 'swap') {
      return SWAP_SLIPPAGE;
    }
    return BRIDGE_SLIPPAGE;
  }, [type]);

  const MAX_SLIPPAGE = useMemo(() => {
    if (type === 'swap') {
      return SWAP_MAX_SLIPPAGE;
    }
    return BRIDGE_MAX_SLIPPAGE;
  }, [type]);

  const [isLow, isHigh] = useMemo(() => {
    return [
      value?.trim() !== '' && Number(value || 0) < minimumSlippage,
      value?.trim() !== '' && Number(value || 0) > maximumSlippage,
    ];
  }, [value, minimumSlippage]);

  const setRecommendValue = useCallback(() => {
    onChange(new BigNumber(recommendValue || 0).times(100).toString());
    setAutoSlippage(false);
    setIsCustomSlippage(false);
  }, [onChange, recommendValue, setAutoSlippage, setIsCustomSlippage]);

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
      setAutoSlippage(false);
      setIsCustomSlippage(true);
      const v = e.target.value;
      if (/^\d*(\.\d*)?$/.test(v)) {
        onChange(Number(v) > MAX_SLIPPAGE ? `${MAX_SLIPPAGE}` : v);
      }
    },
    [onChange, setAutoSlippage, setIsCustomSlippage]
  );

  useEffect(() => {
    if (
      !autoSlippage &&
      !isCustomSlippage &&
      SLIPPAGE.findIndex((item) => item === value) === -1
    ) {
      setIsCustomSlippage(true);
    }
  }, [SLIPPAGE, autoSlippage, isCustomSlippage, setIsCustomSlippage, value]);

  useEffect(() => {
    if (tips) {
      setSlippageOpen(true);
    }
  }, [tips]);

  if (type === 'swap' && isWrapToken) {
    return (
      <div
        className="flex justify-between cursor-pointer text-12"
        onClick={() => {
          setSlippageOpen((e) => !e);
        }}
      >
        <span className="font-normal text-r-neutral-foot">
          {t('page.swap.slippage-tolerance')}
        </span>
        <span className="font-medium text-r-neutral-foot">
          {t('page.swap.no-slippage-for-wrap')}
        </span>
      </div>
    );
  }

  return (
    <div>
      <div
        className="flex justify-between cursor-pointer text-12"
        onClick={() => {
          setSlippageOpen((e) => !e);
        }}
      >
        <span className="font-normal text-r-neutral-foot">
          {t('page.swap.slippage-tolerance')}
        </span>
        <span className="font-medium text-r-neutral-title-1 inline-flex items-center">
          <span
            className={clsx(
              tips ? 'text-r-red-default' : 'text-r-blue-default'
            )}
          >
            {displaySlippage}%
          </span>
        </span>
      </div>
      <Wrapper className="widget-has-ant-input">
        <div
          className={clsx(
            'slippage',
            slippageOpen ? 'mt-8' : 'h-0 overflow-hidden'
          )}
        >
          <SlippageItem
            onClick={(event) => {
              if (autoSlippage) {
                return;
              }
              event.stopPropagation();
              onChange(value);
              setAutoSlippage(true);
              setIsCustomSlippage(false);
            }}
            className={clsx(autoSlippage && 'active')}
          >
            {t('page.swap.Auto')}
          </SlippageItem>
          {SLIPPAGE.map((e) => (
            <SlippageItem
              key={e}
              onClick={(event) => {
                event.stopPropagation();
                setIsCustomSlippage(false);
                setAutoSlippage(false);
                onChange(e);
              }}
              className={clsx(
                !autoSlippage && !isCustomSlippage && e === value && 'active'
              )}
            >
              {e}%
            </SlippageItem>
          ))}
          <SlippageItem
            onClick={(event) => {
              event.stopPropagation();
              setAutoSlippage(false);
              setIsCustomSlippage(true);
            }}
            className={clsx(
              'input-wrapper',
              'flex-1',
              isCustomSlippage && 'active',
              tips && 'error'
            )}
          >
            <Input
              className={clsx(
                'input bg-transparent',
                tips && 'text-r-red-default'
              )}
              bordered={false}
              value={value}
              onChange={onInputChange}
              onFocus={() => {
                setAutoSlippage(false);
                setIsCustomSlippage(true);
              }}
              placeholder="0.5"
              suffix={
                <div className={clsx(tips && 'text-r-red-default')}>%</div>
              }
            />
          </SlippageItem>
        </div>

        {!!tips && <div className={clsx('warning')}>{tips}</div>}
      </Wrapper>
    </div>
  );
});
