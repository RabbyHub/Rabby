import { TokenWithChain } from '@/ui/component';
import { getTokenSymbol } from '@/ui/utils/token';
import { TokenItem } from '@rabby-wallet/rabby-api/dist/types';
import { Button, Skeleton, Switch, Tooltip } from 'antd';
import clsx from 'clsx';
import React, {
  Dispatch,
  PropsWithChildren,
  SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { ReactComponent as IconArrowDownCC } from 'ui/assets/bridge/tiny-down-arrow-cc.svg';
import { ReactComponent as RcIconInfo } from 'ui/assets/info-cc.svg';
import { BridgeSlippage } from './BridgeSlippage';
import { tokenPriceImpact } from '../hooks';
import imgBestQuoteSharpBg from '@/ui/assets/swap/best-quote-sharp-bg.svg';
import styled from 'styled-components';
import { findChainByServerID } from '@/utils/chain';
import BigNumber from 'bignumber.js';
import { CHAINS_ENUM } from '@debank/common';
import { formatGasHeaderUsdValue } from '@/ui/utils';
import ShowMoreGasSelectModal, { useGetGasInfoByUI } from './ShowMoreGasModal';
import { getGasLevelI18nKey } from '@/ui/utils/trans';
import { ReactComponent as IconInfoSVG } from 'ui/assets/info-cc.svg';
import { noop } from 'lodash';
import {
  useSignatureStore,
  signatureStore,
} from '@/ui/component/MiniSignV2/state';
import {
  GasAccountTips,
  GasLessActivityToSign,
  GasLessNotEnough,
} from '../../Approval/components/FooterBar/GasLessComponents';
import { useGasAccountSign } from '../../GasAccount/hooks';
import { useMemoizedFn } from 'ahooks';

const PreferMEVGuardSwitch = styled(Switch)`
  min-width: 20px;
  height: 12px;

  &.ant-switch-checked {
    background-color: var(--r-blue-default, #7084ff);
    .ant-switch-handle {
      left: calc(100% - 10px - 1px);
      top: 1px;
    }
  }
  .ant-switch-handle {
    height: 10px;
    width: 10px;
    top: 1px;
    left: 1px;
  }
`;

export const BridgeShowMore = ({
  openQuotesList,
  sourceName,
  sourceLogo,
  duration,
  slippage,
  displaySlippage,
  onSlippageChange,
  fromToken,
  toToken,
  amount,
  toAmount,
  quoteLoading,
  slippageError,
  autoSlippage,
  isCustomSlippage,
  setAutoSlippage,
  setIsCustomSlippage,
  open,
  setOpen,
  type,
  isWrapToken,
  isBestQuote,
  showMEVGuardedSwitch,
  originPreferMEVGuarded,
  switchPreferMEV,
  recommendValue,
  openFeePopup,
  supportDirectSign = false,
  autoSuggestSlippage,
}: {
  open: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
  openQuotesList: () => void;
  sourceName: string;
  sourceLogo: string;
  duration?: number;
  slippage: string;
  displaySlippage: string;
  onSlippageChange: (n: string) => void;
  showLoss?: boolean;
  fromToken?: TokenItem;
  toToken?: TokenItem;
  amount?: string | number;
  toAmount?: string | number;
  quoteLoading?: boolean;
  slippageError?: boolean;
  autoSlippage: boolean;
  isCustomSlippage: boolean;
  setAutoSlippage: (boolean: boolean) => void;
  setIsCustomSlippage: (boolean: boolean) => void;
  type: 'swap' | 'bridge';
  /**
   * for swap props
   */
  isWrapToken?: boolean;
  isBestQuote: boolean;
  showMEVGuardedSwitch?: boolean;
  originPreferMEVGuarded?: boolean;
  switchPreferMEV?: (b: boolean) => void;
  recommendValue?: number;
  openFeePopup: () => void;
  autoSuggestSlippage?: string;
  supportDirectSign?: boolean;
}) => {
  const { t } = useTranslation();
  const sourceAlwaysShow = type === 'bridge';

  const RABBY_FEE = '0.25%';

  const data = useMemo(() => {
    if (quoteLoading || (!sourceLogo && !sourceName)) {
      return {
        showLoss: false,
        diff: '',
        fromUsd: '',
        toUsd: '',
        lossUsd: '',
      };
    }
    return tokenPriceImpact(fromToken, toToken, amount, toAmount);
  }, [
    fromToken,
    toToken,
    amount,
    toAmount,
    quoteLoading,
    sourceLogo,
    sourceName,
  ]);

  const bestQuoteStyle = useMemo(() => {
    if (isBestQuote) {
      return {
        backgroundImage: `url(${imgBestQuoteSharpBg})`,
        backgroundRepeat: 'no-repeat',
        backgroundSize: '38px',
      };
    }
    return undefined;
  }, [isBestQuote]);

  const showSlippageError = slippageError;

  const showMinDuration = useMemo(() => {
    return Math.max(Math.round((duration || 0) / 60), 1);
  }, [duration]);

  const durationColor = useMemo(() => {
    if (showMinDuration > 10) {
      return 'text-r-red-default';
    }

    if (showMinDuration > 3) {
      return 'text-r-orange-default';
    }
    return 'text-r-blue-default';
  }, [showMinDuration]);

  const [showGasFeeError, setShowGasFeeError] = useState(false);

  const sourceContentRender = useMemoizedFn(() => {
    return (
      <ListItem
        name={
          type === 'bridge'
            ? t('page.bridge.showMore.source')
            : t('page.swap.source')
        }
        className="mb-12 h-18"
      >
        {quoteLoading ? (
          <Skeleton.Input
            active
            className="rounded"
            style={{
              width: 52,
              height: 12,
            }}
          />
        ) : (
          <div
            className="flex items-center gap-4  cursor-pointer"
            onClick={openQuotesList}
          >
            <div
              className={clsx(
                'flex items-center gap-4 cursor-pointer',
                isBestQuote &&
                  'border-[0.5px] border-solid border-rabby-blue-default rounded-[4px] pr-[5px]'
              )}
              style={bestQuoteStyle}
              // onClick={openQuotesList}
            >
              {isBestQuote ? (
                <span className="text-r-neutral-title2 text-[12px] font-medium italic py-1 pl-6 pr-8">
                  {t('page.swap.best')}
                </span>
              ) : null}
              {sourceLogo && (
                <img
                  className="w-12 h-12 rounded-full"
                  src={sourceLogo}
                  alt={sourceName}
                />
              )}
              <span className="text-12 text-rabby-blue-default font-medium">
                {sourceName}
              </span>
              {!sourceLogo && !sourceName ? (
                <span className="text-12 text-r-neutral-foot">-</span>
              ) : null}
            </div>
            {type === 'bridge' && (
              <span className={`text-12 font-medium ${durationColor}`}>
                {' · '}
                {t('page.bridge.duration', {
                  duration: showMinDuration,
                })}
              </span>
            )}
          </div>
        )}
      </ListItem>
    );
  });

  const lostValueContentRender = useCallback(() => {
    return (
      <>
        {data?.showLoss && !quoteLoading && (
          <div className="leading-4 mb-12 text-12 text-r-neutral-foot">
            <div className="flex justify-between">
              <span>{t('page.bridge.price-impact')}</span>
              <span
                className={clsx(
                  'font-medium  inline-flex items-center',
                  'text-r-red-default'
                )}
              >
                -{data.diff}%
                <Tooltip
                  align={{
                    offset: [10, 0],
                  }}
                  placement={'topRight'}
                  overlayClassName="rectangle max-w-[360px]"
                  title={
                    <div className="flex flex-col gap-4 py-[5px] text-13">
                      <div>
                        {t('page.bridge.est-payment')} {amount}
                        {getTokenSymbol(fromToken)} ≈ {data.fromUsd}
                      </div>
                      <div>
                        {t('page.bridge.est-receiving')} {toAmount}
                        {getTokenSymbol(toToken)} ≈ {data.toUsd}
                      </div>
                      <div>
                        {t('page.bridge.est-difference')} {data.lossUsd}
                      </div>
                    </div>
                  }
                >
                  <RcIconInfo className="ml-4 text-rabby-neutral-foot w-14 h-14 " />
                </Tooltip>
              </span>
            </div>
            <div className="mt-[8px] rounded-[4px] border-[0.5px] border-rabby-red-default bg-r-red-light p-8 text-13 font-normal text-r-red-default">
              {t('page.bridge.loss-tips', {
                usd: data?.lossUsd,
              })}
            </div>
          </div>
        )}
      </>
    );
  }, [data, quoteLoading, toToken, fromToken]);

  return (
    <div className="mx-16">
      {sourceAlwaysShow && sourceContentRender()}

      <div className="flex items-center justify-center gap-8 mb-8">
        <div
          className={clsx(
            'flex items-center opacity-50',
            'cursor-pointer',
            'text-r-neutral-foot text-12'
          )}
          onClick={() => setOpen((e) => !e)}
        >
          <span>{t('page.bridge.showMore.title')}</span>
          <IconArrowDownCC
            viewBox="0 0 14 14"
            width={14}
            height={14}
            className={clsx(
              'transition-transform',
              open && 'rotate-180 translate-y-1'
            )}
          />
        </div>
      </div>

      <div className={clsx('overflow-hidden', !open && 'h-0')}>
        {lostValueContentRender()}
        {!sourceAlwaysShow && sourceContentRender()}
        <BridgeSlippage
          autoSuggestSlippage={autoSuggestSlippage}
          value={slippage}
          displaySlippage={displaySlippage}
          onChange={onSlippageChange}
          autoSlippage={autoSlippage}
          isCustomSlippage={isCustomSlippage}
          setAutoSlippage={setAutoSlippage}
          setIsCustomSlippage={setIsCustomSlippage}
          type={type}
          isWrapToken={isWrapToken}
          recommendValue={recommendValue}
        />

        {fromToken && supportDirectSign ? (
          <DirectSignGasInfo
            supportDirectSign={supportDirectSign}
            loading={!!quoteLoading}
            openShowMore={setShowGasFeeError}
            noQuote={!sourceLogo && !sourceName}
            chainServeId={fromToken?.chain}
          />
        ) : null}

        <ListItem name={t('page.swap.rabbyFee.title')} className="mt-12 h-18">
          <div
            className={clsx(
              'text-12 font-medium',
              isWrapToken
                ? 'text-r-neutral-foot'
                : 'text-r-blue-default cursor-pointer'
            )}
            onClick={openFeePopup}
          >
            {isWrapToken && type === 'swap'
              ? t('page.swap.no-fees-for-wrap')
              : RABBY_FEE}
          </div>
        </ListItem>

        {showMEVGuardedSwitch && type === 'swap' ? (
          <ListItem
            name={
              <Tooltip
                placement={'topLeft'}
                overlayClassName={clsx('rectangle', 'max-w-[312px]')}
                title={t('page.swap.preferMEVTip')}
              >
                <span>{t('page.swap.preferMEV')}</span>
              </Tooltip>
            }
            className="mt-12"
          >
            <Tooltip
              placement={'topRight'}
              overlayClassName={clsx('rectangle', 'max-w-[312px]')}
              title={t('page.swap.preferMEVTip')}
            >
              <PreferMEVGuardSwitch
                checked={originPreferMEVGuarded}
                onChange={switchPreferMEV}
              />
            </Tooltip>
          </ListItem>
        ) : null}
      </div>

      {!open && (
        <>
          {lostValueContentRender()}
          {showSlippageError && (
            <BridgeSlippage
              autoSuggestSlippage={autoSuggestSlippage}
              value={slippage}
              displaySlippage={displaySlippage}
              onChange={onSlippageChange}
              autoSlippage={autoSlippage}
              isCustomSlippage={isCustomSlippage}
              setAutoSlippage={setAutoSlippage}
              setIsCustomSlippage={setIsCustomSlippage}
              type={type}
              isWrapToken={isWrapToken}
              recommendValue={recommendValue}
            />
          )}
          {showGasFeeError && fromToken && supportDirectSign ? (
            <DirectSignGasInfo
              supportDirectSign={supportDirectSign}
              loading={!!quoteLoading}
              openShowMore={noop}
              noQuote={!sourceLogo && !sourceName}
              chainServeId={fromToken?.chain}
            />
          ) : null}
        </>
      )}
    </div>
  );
};

const GasTipsWrapper = styled.div`
  position: relative;

  .security-level-tip {
    margin-top: 10px;
    border-radius: 4px;
    padding: 6px 10px 6px 8px;
    font-weight: 500;
    font-size: 13px;
    line-height: 15px;
    display: flex;
    position: relative;
    .icon-level {
      width: 14px;
      height: 14px;
      margin-right: 6px;
    }
  }
`;

export const DirectSignGasInfo = ({
  supportDirectSign,
  loading,
  openShowMore,
  noQuote,
  chainServeId,
}: {
  supportDirectSign: boolean;
  loading: boolean;
  openShowMore: (v: boolean) => void;
  noQuote?: boolean;
  chainServeId: string;
}) => {
  const { t } = useTranslation();

  const [gasModalVisible, setGasModalVisible] = useState(false);

  const chainEnum = findChainByServerID(chainServeId)?.enum;

  const calcGasAccountUsd = useCallback((n: number | string) => {
    const v = Number(n);
    if (!Number.isNaN(v) && v < 0.0001) {
      return `$${n}`;
    }
    return formatGasHeaderUsdValue(n || '0');
  }, []);

  const { sig, accountId } = useGasAccountSign();

  const isGasAccountLogin = !!sig && !!accountId;

  const { ctx, config } = useSignatureStore();

  const gasInfoByUI = useGetGasInfoByUI();

  const { gasCostUsdStr, gasAccountCost } = gasInfoByUI || {};

  const gasCostUsd =
    ctx?.gasMethod === 'gasAccount'
      ? calcGasAccountUsd(
          (gasAccountCost?.estimate_tx_cost || 0) +
            Number(gasAccountCost?.gas_cost || 0)
        )
      : gasCostUsdStr;

  const showGasContent = !!ctx?.txsCalc?.length && !loading && !noQuote;

  const isReady = (ctx?.txsCalc?.length || 0) > 0;
  const isGasNotEnough = !!ctx?.isGasNotEnough;
  const canUseGasLess = !!ctx?.gasless?.is_gasless;
  const noCustomRPC = !!ctx?.noCustomRPC;

  let gasLessConfig =
    canUseGasLess && ctx?.gasless?.promotion
      ? ctx?.gasless?.promotion?.config
      : undefined;
  if (
    gasLessConfig &&
    ctx?.gasless?.promotion?.id === '0ca5aaa5f0c9217e6f45fe1d109c24fb'
  ) {
    gasLessConfig = { ...gasLessConfig, dark_color: '', theme_color: '' };
  }

  const canGotoUseGasAccount =
    // isSupportedAddr &&
    noCustomRPC &&
    !!ctx?.gasAccount?.balance_is_enough &&
    !ctx?.gasAccount.chain_not_support &&
    !!ctx?.gasAccount.is_gas_account;

  const showGasLess = isReady && (isGasNotEnough || !!gasLessConfig);

  const showGasLessToSign =
    showGasLess && !canGotoUseGasAccount && canUseGasLess;

  // gas 提交使用 gasless
  const useGasLess =
    (isGasNotEnough || !!gasLessConfig) && !!canUseGasLess && !!ctx?.useGasless;

  const payGasByGasAccount = ctx?.gasMethod === 'gasAccount';

  const canDepositUseGasAccount =
    // isSupportedAddr &&
    noCustomRPC &&
    !!ctx?.gasAccount &&
    !ctx?.gasAccount?.balance_is_enough &&
    !ctx?.gasAccount.chain_not_support;

  const gasAccountCanPay =
    ctx?.gasMethod === 'gasAccount' &&
    // isSupportedAddr &&
    noCustomRPC &&
    !!ctx?.gasAccount?.balance_is_enough &&
    !ctx?.gasAccount.chain_not_support &&
    !!ctx?.gasAccount.is_gas_account &&
    !(ctx?.gasAccount as any).err_msg;

  const disabledProcess = payGasByGasAccount
    ? !gasAccountCanPay
    : useGasLess
    ? false
    : !ctx?.txsCalc?.length ||
      !!ctx.checkErrors?.some((e) => e.level === 'forbidden');

  // Gasless 切换
  const handleToggleGasless = (value) => {
    signatureStore.toggleGasless(value);
  };

  // Gas 方法切换 - 添加异步处理
  const handleChangeGasMethod = useCallback(
    async (method: 'native' | 'gasAccount') => {
      try {
        signatureStore.setGasMethod(method);
      } catch (error) {
        console.error('Gas method change error:', error);
      }
    },
    [ctx?.selectedGas]
  );

  useEffect(() => {
    if (loading || noQuote) {
      return;
    }
    const showGasLevelPopup = !!showGasContent && !!disabledProcess;
    const gasTooHigh =
      !!showGasContent &&
      !!gasCostUsdStr &&
      new BigNumber(gasCostUsdStr?.replace(/\$/g, '')).gt(
        chainEnum === CHAINS_ENUM.ETH ? 10 : 1
      );
    if (showGasLevelPopup || gasTooHigh) {
      openShowMore(true);
    } else {
      openShowMore(false);
    }
  }, [
    chainEnum,
    disabledProcess,
    isReady,
    gasCostUsdStr,
    openShowMore,
    showGasContent,
    loading,
    noQuote,
  ]);

  if (!supportDirectSign) {
    return null;
  }
  const gasTipsComponent = () => (
    <GasTipsWrapper>
      {showGasLessToSign ? (
        <GasLessActivityToSign
          directSubmit
          gasLessEnable={useGasLess}
          handleFreeGas={() => {
            handleToggleGasless?.(true);
          }}
          gasLessConfig={gasLessConfig}
        />
      ) : null}

      {showGasLess && !payGasByGasAccount && !canUseGasLess ? (
        <GasLessNotEnough
          directSubmit
          gasLessFailedReason={ctx?.gasless?.desc}
          canGotoUseGasAccount={canGotoUseGasAccount}
          onChangeGasAccount={() => handleChangeGasMethod('gasAccount')}
          canDepositUseGasAccount={canDepositUseGasAccount}
          miniFooter
          onRedirectToDeposit={config?.onRedirectToDeposit}
        />
      ) : null}

      {payGasByGasAccount && !gasAccountCanPay ? (
        <GasAccountTips
          directSubmit
          gasAccountCost={ctx?.gasAccount as any}
          isGasAccountLogin={isGasAccountLogin}
          isWalletConnect={false}
          noCustomRPC={noCustomRPC}
          miniFooter
          onRedirectToDeposit={config?.onRedirectToDeposit}
        />
      ) : null}
    </GasTipsWrapper>
  );

  return (
    <>
      <ListItem name={<>{'Gas fee'}</>} className="mt-12">
        {showGasContent ? (
          <>
            <ShowMoreGasSelectModal
              visible={gasModalVisible}
              onCancel={() => {
                setGasModalVisible(false);
              }}
              onConfirm={() => {
                setGasModalVisible(false);
              }}
            >
              <div
                className={clsx(
                  'cursor-pointer',
                  'cursor text-12 font-medium flex items-center gap-4',
                  disabledProcess ? 'text-r-red-default' : 'text-r-blue-default'
                )}
                onClick={() => {
                  setGasModalVisible(true);
                }}
              >
                <div>
                  {ctx?.selectedGas?.level
                    ? t(getGasLevelI18nKey(ctx.selectedGas.level))
                    : t(getGasLevelI18nKey('normal'))}

                  {' · '}

                  {gasCostUsd}
                </div>
                {ctx.gasMethod === 'gasAccount' ? (
                  <Tooltip
                    align={{
                      offset: [10, 0],
                    }}
                    placement={'topRight'}
                    overlayClassName="rectangle w-[max-content]"
                    title={
                      <div onClick={(e) => e.stopPropagation()}>
                        <div>{t('page.signTx.gasAccount.description')}</div>
                        <div>
                          {t('page.signTx.gasAccount.estimatedGas')}{' '}
                          {calcGasAccountUsd(
                            gasAccountCost?.estimate_tx_cost || 0
                          )}
                        </div>
                        <div>
                          {t('page.signTx.gasAccount.maxGas')}{' '}
                          {calcGasAccountUsd(gasAccountCost?.total_cost || '0')}
                        </div>
                        <div>
                          {t('page.signTx.gasAccount.sendGas')}{' '}
                          {calcGasAccountUsd(gasAccountCost?.total_cost || '0')}
                        </div>
                        <div>
                          {t('page.signTx.gasAccount.gasCost')}{' '}
                          {calcGasAccountUsd(gasAccountCost?.gas_cost || '0')}
                        </div>
                      </div>
                    }
                  >
                    <IconInfoSVG
                      className="text-r-neutral-foot -top-1"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </Tooltip>
                ) : null}
              </div>
            </ShowMoreGasSelectModal>
          </>
        ) : !loading && noQuote ? (
          <div>-</div>
        ) : (
          <Skeleton.Input
            active
            className="rounded"
            style={{
              width: 52,
              height: 12,
            }}
          />
        )}
      </ListItem>
      {showGasContent && <>{gasTipsComponent()}</>}
    </>
  );
};

function ListItem({
  name,
  className,
  children,
}: PropsWithChildren<{ name: React.ReactNode; className?: string }>) {
  return (
    <div
      className={clsx(
        'flex items-center justify-between',
        'text-12 text-r-neutral-foot',
        className
      )}
    >
      <span>{name}</span>
      <div className="flex items-center">{children}</div>
    </div>
  );
}

export const RecommendFromToken = ({
  token,
  className,
  onOk,
}: {
  token: TokenItem;
  className?: string;
  onOk: () => void;
}) => {
  const { t } = useTranslation();
  return (
    <div
      className={clsx(
        'flex items-center',
        'h-[44px] pl-12 pr-10 rounded-[8px]',
        'bg-r-neutral-card-1',
        className
      )}
    >
      <div
        className={clsx(
          'flex-1 flex items-center',
          'text-12 text-rabby-neutral-title-1'
        )}
      >
        <Trans t={t} i18nKey={'page.bridge.recommendFromToken'}>
          Bridge from
          <div
            className={clsx(
              'flex items-center gap-6',
              'px-8 py-6 mx-6',
              'text-r-blue-default',
              'bg-rabby-blue-light1 rounded-[6px]'
            )}
          >
            <TokenWithChain
              token={token}
              width="16px"
              height="16px"
              chainSize={'10px'}
            />
            <span>{getTokenSymbol(token)}</span>
          </div>
          for an available quote
        </Trans>
      </div>
      <Button
        type="primary"
        className="h-24 text-13 font-medium px-10 py-0"
        onClick={onOk}
      >
        {t('global.ok')}
      </Button>
    </div>
  );
};
