import clsx from 'clsx';
import {
  memo,
  useMemo,
  useCallback,
  ChangeEventHandler,
  useState,
  useEffect,
  useRef,
} from 'react';
import styled from 'styled-components';
import BigNumber from 'bignumber.js';
import React from 'react';
import { Button, DrawerProps, Input, InputRef } from 'antd';
import i18n from '@/i18n';
import { Trans, useTranslation } from 'react-i18next';
import { ReactComponent as RcInfoRowArrowRight } from '@/ui/assets/swap/info-row-arrow-right.svg';
import { Popup } from '@/ui/component';
import { useDebounce } from 'react-use';

const SlippageItem = styled.div`
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  border: 1px solid transparent;
  cursor: pointer;
  border-radius: 6px;
  width: 72px;
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
    color: var(--r-red-default, #e34935);
    border: 1px solid var(--r-red-default, #e34935);
    background: var(--r-red-light, #fff2f0);
  }
`;

const BRIDGE_SLIPPAGE = ['0.5', '1'];

export const SWAP_SLIPPAGE = ['0.5', '3'];

const BRIDGE_MAX_SLIPPAGE = 10;

const SWAP_MAX_SLIPPAGE = 50;

const DRAFT_VALIDATION_DEBOUNCE_MS = 300;

const Wrapper = styled.section`
  .slippage {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .input {
    font-weight: 500;
    font-size: 13px;
    border: none;
    border-radius: 4px;
    background: transparent;

    &:placeholder-shown {
      color: #707280;
    }
    .ant-input {
      border-radius: 0;
      font-weight: 500;
      font-size: 13px;
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
  }
`;

const SlippagePopup = styled(Popup)`
  .ant-drawer-content {
    border-radius: 16px !important;
    border-top: 0 !important;
  }
`;

export interface SlippageValidationResult {
  is_valid: boolean;
  suggest_slippage?: number;
}

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
  autoSuggestSlippage?: string;
  valueClassName?: string;
  getContainer?: DrawerProps['getContainer'];
  validateSlippage?: (
    slippage: string
  ) => Promise<SlippageValidationResult | undefined>;
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
    autoSuggestSlippage,
    valueClassName,
    getContainer,
    validateSlippage,
  } = props;

  const [popupVisible, setPopupVisible] = useState(false);
  const [draftValue, setDraftValue] = useState(value);
  const [draftAutoSlippage, setDraftAutoSlippage] = useState(autoSlippage);
  const [draftIsCustomSlippage, setDraftIsCustomSlippage] = useState(
    isCustomSlippage
  );
  const inputRef = useRef<InputRef>(null);
  const shouldCommitOnCloseRef = useRef(false);
  const draftValidationRequestIdRef = useRef(0);
  const [draftValidationInfo, setDraftValidationInfo] = useState<
    SlippageValidationResult | undefined
  >();

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

  const [isDraftLow, isDraftHigh] = useMemo(() => {
    const draftNumber = Number(draftValue || 0);
    return [
      draftValue?.trim() !== '' && draftNumber < minimumSlippage,
      draftValue?.trim() !== '' && draftNumber > maximumSlippage,
    ];
  }, [draftValue, minimumSlippage, maximumSlippage]);

  const displayValue =
    type === 'swap' && autoSlippage
      ? autoSuggestSlippage || displaySlippage
      : displaySlippage;
  const autoDraftValue =
    type === 'swap' ? autoSuggestSlippage || displaySlippage : displaySlippage;

  const setDraftRecommendValue = useCallback(
    (nextRecommendValue: number) => {
      const nextDraftValue = new BigNumber(nextRecommendValue)
        .times(100)
        .toString();
      setDraftValue(nextDraftValue);
      setDraftAutoSlippage(false);
      setDraftIsCustomSlippage(!SLIPPAGE.includes(nextDraftValue));
    },
    [SLIPPAGE]
  );

  const committedDisplayValue = autoSlippage ? displayValue : value;
  const shouldShowRecommend =
    !!recommendValue &&
    !draftValidationInfo &&
    draftAutoSlippage === autoSlippage &&
    draftValue === committedDisplayValue;
  const draftRecommendValue = draftValidationInfo
    ? draftValidationInfo.is_valid
      ? undefined
      : draftValidationInfo.suggest_slippage
    : shouldShowRecommend
    ? recommendValue
    : undefined;

  const draftTips = useMemo(() => {
    if (isDraftLow) {
      return i18n.t(
        'page.swap.low-slippage-may-cause-failed-transactions-due-to-high-volatility'
      );
    }
    if (isDraftHigh) {
      return i18n.t(
        'page.swap.transaction-might-be-frontrun-because-of-high-slippage-tolerance'
      );
    }
    if (draftRecommendValue) {
      return (
        <span>
          <Trans
            i18nKey="page.swap.recommend-slippage"
            value={{
              slippage: new BigNumber(draftRecommendValue)
                .times(100)
                .toString(),
            }}
            t={t}
          >
            To prevent front-running, we recommend a slippage of{' '}
            <span
              onClick={() => setDraftRecommendValue(draftRecommendValue)}
              className="underline cursor-pointer"
            >
              {
                {
                  slippage: new BigNumber(draftRecommendValue)
                    .times(100)
                    .toString(),
                } as any
              }
            </span>
            %{' '}
          </Trans>
        </span>
      );
    }
    return null;
  }, [isDraftHigh, isDraftLow, draftRecommendValue, setDraftRecommendValue, t]);
  const hasDraftTips = !!draftTips;
  const hasValueWarning = isLow || isHigh || !!recommendValue;

  const openPopup = useCallback(() => {
    const nextDraftValue = autoSlippage ? displayValue : value;
    const isFixedSlippage = SLIPPAGE.includes(nextDraftValue);
    setDraftValue(nextDraftValue);
    setDraftAutoSlippage(autoSlippage);
    setDraftIsCustomSlippage(!autoSlippage && !isFixedSlippage);
    shouldCommitOnCloseRef.current = false;
    draftValidationRequestIdRef.current += 1;
    setDraftValidationInfo(
      recommendValue
        ? {
            is_valid: false,
            suggest_slippage: recommendValue,
          }
        : undefined
    );
    setPopupVisible(true);
  }, [SLIPPAGE, autoSlippage, displayValue, recommendValue, value]);

  const closePopup = useCallback(() => {
    shouldCommitOnCloseRef.current = true;
    draftValidationRequestIdRef.current += 1;
    setPopupVisible(false);
  }, []);

  useEffect(() => {
    if (popupVisible) {
      draftValidationRequestIdRef.current += 1;
    }
  }, [draftAutoSlippage, draftIsCustomSlippage, draftValue, popupVisible]);

  useDebounce(
    () => {
      if (
        !popupVisible ||
        !validateSlippage ||
        !draftValue.trim() ||
        !Number(draftValue)
      ) {
        return;
      }
      const requestId = ++draftValidationRequestIdRef.current;
      validateSlippage(draftValue)
        .then((result) => {
          if (requestId === draftValidationRequestIdRef.current) {
            setDraftValidationInfo(result);
          }
        })
        .catch(() => {
          // Keep the previous validation warning when the latest request fails.
        });
    },
    DRAFT_VALIDATION_DEBOUNCE_MS,
    [
      draftAutoSlippage,
      draftIsCustomSlippage,
      draftValue,
      popupVisible,
      validateSlippage,
    ]
  );

  const commitDraft = useCallback(() => {
    setAutoSlippage(draftAutoSlippage);
    setIsCustomSlippage(draftAutoSlippage ? false : draftIsCustomSlippage);
    if (!draftAutoSlippage) {
      onChange(draftValue);
    }
  }, [
    draftAutoSlippage,
    draftIsCustomSlippage,
    draftValue,
    onChange,
    setAutoSlippage,
    setIsCustomSlippage,
  ]);

  const handleAfterVisibleChange = useCallback(
    (visible: boolean) => {
      if (!visible && shouldCommitOnCloseRef.current) {
        shouldCommitOnCloseRef.current = false;
        commitDraft();
      }
    },
    [commitDraft]
  );

  const onInputChange: ChangeEventHandler<HTMLInputElement> = useCallback(
    (e) => {
      setDraftAutoSlippage(false);
      setDraftIsCustomSlippage(true);
      const v = e.target.value;
      if (/^\d*(\.\d*)?$/.test(v)) {
        setDraftValue(Number(v) > MAX_SLIPPAGE ? `${MAX_SLIPPAGE}` : v);
      }
    },
    [MAX_SLIPPAGE]
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

  if (type === 'swap' && isWrapToken) {
    return (
      <div className="flex justify-between text-12">
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
    <>
      <div
        className="flex justify-between cursor-pointer text-12"
        onClick={openPopup}
      >
        <span className="font-normal text-r-neutral-foot">
          {t('page.swap.slippage-tolerance')}
        </span>
        <span className="inline-flex items-center gap-2 font-normal">
          <span
            className={clsx(
              valueClassName,
              hasValueWarning ? 'text-r-red-default' : 'text-r-neutral-title-1'
            )}
          >
            {displayValue}%
          </span>
          <RcInfoRowArrowRight className="h-14 w-14 text-r-neutral-foot" />
        </span>
      </div>

      <SlippagePopup
        visible={popupVisible}
        onCancel={closePopup}
        afterVisibleChange={handleAfterVisibleChange}
        height="fit-content"
        bodyStyle={{ padding: 0 }}
        closable={false}
        isNew
        isSupportDarkMode
        getContainer={getContainer}
      >
        <Wrapper className="widget-has-ant-input flex flex-col gap-24 rounded-t-[16px] bg-r-neutral-bg-2 p-20 shadow-[0_-12px_10px_rgba(35,47,129,0.1)]">
          <div className="flex flex-col gap-12">
            <div className="flex items-center justify-between text-[16px] font-medium">
              <span className="text-r-neutral-title-1">
                {t('page.swap.slippage-tolerance')}
              </span>
              <span
                className={clsx(
                  hasDraftTips ? 'text-r-red-default' : 'text-r-neutral-title-1'
                )}
              >
                {draftValue}%
              </span>
            </div>

            <div className="flex items-center gap-8">
              <SlippageItem
                onClick={() => {
                  inputRef.current?.blur();
                  setDraftValue(autoDraftValue);
                  setDraftAutoSlippage(true);
                  setDraftIsCustomSlippage(false);
                }}
                className={clsx(
                  draftAutoSlippage && 'active',
                  draftAutoSlippage && hasDraftTips && 'error'
                )}
              >
                {t('page.swap.Auto')}
              </SlippageItem>
              {SLIPPAGE.map((item) => {
                const active =
                  !draftAutoSlippage &&
                  !draftIsCustomSlippage &&
                  item === draftValue;
                return (
                  <SlippageItem
                    key={item}
                    onClick={() => {
                      inputRef.current?.blur();
                      setDraftValue(item);
                      setDraftAutoSlippage(false);
                      setDraftIsCustomSlippage(false);
                    }}
                    className={clsx(
                      active && 'active',
                      active && hasDraftTips && 'error'
                    )}
                  >
                    {item}%
                  </SlippageItem>
                );
              })}
              <SlippageItem
                onClick={() => {
                  setDraftAutoSlippage(false);
                  setDraftIsCustomSlippage(true);
                }}
                className={clsx(
                  'input-wrapper flex-1',
                  draftIsCustomSlippage && 'active',
                  draftIsCustomSlippage && hasDraftTips && 'error'
                )}
              >
                <Input
                  ref={inputRef}
                  className={clsx(
                    'input bg-transparent',
                    draftIsCustomSlippage &&
                      hasDraftTips &&
                      'text-r-red-default'
                  )}
                  bordered={false}
                  value={draftValue}
                  onChange={onInputChange}
                  onFocus={() => {
                    setDraftAutoSlippage(false);
                    setDraftIsCustomSlippage(true);
                  }}
                  placeholder="0.5"
                  suffix={
                    <div
                      className={clsx(
                        draftIsCustomSlippage &&
                          hasDraftTips &&
                          'text-r-red-default'
                      )}
                    >
                      %
                    </div>
                  }
                />
              </SlippageItem>
            </div>

            {hasDraftTips && <div className="warning">{draftTips}</div>}
          </div>

          <Button
            type="primary"
            block
            className="h-[40px] rounded-[6px] text-[16px] font-medium"
            onClick={closePopup}
          >
            {t('global.confirm')}
          </Button>
        </Wrapper>
      </SlippagePopup>
    </>
  );
});
