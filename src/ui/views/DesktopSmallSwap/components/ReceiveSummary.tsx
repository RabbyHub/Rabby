import { Account } from '@/background/service/preference';
import { KEYRING_TYPE } from '@/constant';
import { RcIconWaringCC } from '@/ui/assets/desktop/common';
import IconUnknown from '@/ui/assets/token-default.svg';
import { TooltipWithMagnetArrow } from '@/ui/component/Tooltip/TooltipWithMagnetArrow';
import { formatAmount, formatUsdValue } from '@/ui/utils';
import { Chain } from '@debank/common';
import { TokenItem } from '@rabby-wallet/rabby-api/dist/types';
import { usePrevious } from 'ahooks';
import { Button, Image, Tooltip } from 'antd';
import clsx from 'clsx';
import Lottie from 'lottie-react';
import React, { useMemo } from 'react';
import CountUp from 'react-countup';
import { useTranslation } from 'react-i18next';
import { getTokenSymbol } from '../../DesktopProfile/components/TokensTabPane/Protocols/utils';
import { PANEL_WIDTH, PANEL_WIDTH_DELTA } from '../constant';
import { BatchSwapTaskType } from '../hooks/useBatchSwapTask';
import { ExchangeSettingRow } from './ExchangeSettingRow';
import { SelectPopup } from './SelectPopup';
import { SwapAnimation } from './SwapAnimation';
import { ReactComponent as RcIconFailed } from '@/ui/assets/small-swap/failed.svg';

type ReceiveSummaryProps = {
  totalValue?: number;
  token?: TokenItem | null;
  chain?: Chain | null;
  onStart?: () => void;
  task?: BatchSwapTaskType;
  receiveToken?: TokenItem | null;
  account?: Account | null;
};

export const ReceiveSummary: React.FC<ReceiveSummaryProps> = ({
  token,
  chain,
  task,
  receiveToken,
  account,
}) => {
  const ref = React.useRef<HTMLDivElement>(null);
  const { t } = useTranslation();

  const [priceImpactPopupVisible, setPriceImpactPopupVisible] = React.useState(
    false
  );
  const [gasPopupVisible, setGasPopupVisible] = React.useState(false);

  const previousUsd = usePrevious(task?.finalReceive?.usd || 0);

  const isSupported = !!([
    KEYRING_TYPE.HdKeyring,
    KEYRING_TYPE.SimpleKeyring,
  ] as string[]).includes(account?.type || '');

  const isShowTips = useMemo(() => {
    if (
      task?.status === 'completed' &&
      Object.values(task?.statusDict || {}).find(
        (item) => item.status === 'pending'
      )
    ) {
      return true;
    }
    return false;
  }, [task?.status, task?.statusDict]);

  const isSuccess = useMemo(() => {
    return (
      task?.status === 'completed' &&
      !!Object.values(task?.statusDict || {}).find(
        (item) => item.status === 'success'
      )
    );
  }, [task?.status, task?.statusDict]);

  return (
    <>
      <section
        className={clsx(
          'relative translate-x-0 overflow-hidden',
          'bg-r-neutral-card-1 rounded-[16px]',
          'flex-shrink-0 py-[24px] px-[32px] flex flex-col'
        )}
        style={{
          boxShadow: '0 16px 40px rgba(25, 41, 69, 0.06)',
          transition: 'width 0.3s',
          width:
            task?.status === 'idle'
              ? PANEL_WIDTH
              : PANEL_WIDTH - PANEL_WIDTH_DELTA,
        }}
        ref={ref}
      >
        {task?.status === 'completed' ? (
          <>
            <div className="flex-1 pt-[12px]">
              {isSuccess ? (
                <Lottie
                  animationData={require('@/ui/assets/animation/animation-create-success.min.json')}
                  loop={false}
                  style={{ width: 130, height: 130, margin: '0 auto' }}
                />
              ) : (
                <RcIconFailed className="mx-auto mt-[24px] mb-[32px]" />
              )}
              <div className="mt-[-8px] text-center text-[24px] leading-[29px] font-medium text-r-neutral-title1">
                {t('page.desktopSmallSwap.completedTitle')}
              </div>
              <div
                className={clsx(
                  'flex items-center justify-center gap-[8px] mt-[68px]',
                  'text-[24px] leading-[29px] font-medium text-r-neutral-title1'
                )}
              >
                +
                <div className="relative w-[28px] h-[28px] flex-shrink-0">
                  <Image
                    className="w-full h-full block rounded-full"
                    src={token?.logo_url || IconUnknown}
                    alt={token?.symbol}
                    fallback={IconUnknown}
                    preview={false}
                  />
                  <TooltipWithMagnetArrow
                    title={chain?.name}
                    className="rectangle w-[max-content]"
                  >
                    <img
                      className="w-[10px] h-[10px] absolute right-[-1px] bottom-[-1px] rounded-full"
                      src={chain?.logo || IconUnknown}
                      alt={chain?.name}
                    />
                  </TooltipWithMagnetArrow>
                </div>
                {formatUsdValue(task?.finalReceive?.usd)}{' '}
                <span className="font-normal">
                  ({formatAmount(task?.finalReceive?.amount)}{' '}
                  {receiveToken ? getTokenSymbol(receiveToken) : ''})
                </span>
              </div>
            </div>
            <footer>
              {isShowTips ? (
                <div className="flex items-center justify-center gap-[8px] mb-[16px]">
                  <RcIconWaringCC
                    className="text-r-neutral-foot w-[16px] h-[16px]"
                    viewBox="0 0 24 24"
                  />
                  <div className="text-[14px] leading-[17px] text-r-neutral-foot">
                    {t('page.desktopSmallSwap.completedTips')}
                  </div>
                </div>
              ) : null}
              <Button
                // disabled={disableSubmit}
                type="primary"
                block
                className="flex-1 h-[60px] rounded-[8px] text-[18px] leading-[20px]"
                // onClick={onConfirm}
                onClick={() => {
                  task.clear();
                }}
              >
                {t('page.desktopSmallSwap.done')}
              </Button>
            </footer>
          </>
        ) : (
          <>
            <div className="mb-[32px] text-[24px] leading-[29px] font-medium text-r-neutral-title1">
              {t('page.desktopSmallSwap.receiveTitle')}
            </div>

            <div className="mb-[32px] flex items-center gap-[16px]">
              <div className="relative w-[46px] h-[46px] flex-shrink-0">
                <Image
                  className="w-full h-full block rounded-full"
                  rootClassName="w-full h-full"
                  src={token?.logo_url || IconUnknown}
                  alt={token?.symbol}
                  fallback={IconUnknown}
                  preview={false}
                />
                {chain?.logo ? (
                  <TooltipWithMagnetArrow
                    title={chain?.name}
                    className="rectangle w-[max-content]"
                  >
                    <img
                      className="w-[18px] h-[18px] absolute right-[-1px] bottom-[-1px] rounded-full"
                      src={chain?.logo || IconUnknown}
                      alt={chain?.name}
                    />
                  </TooltipWithMagnetArrow>
                ) : null}
              </div>
              {task?.status === 'idle' ? (
                <div>
                  <div className="text-[24px] leading-[29px] font-medium text-r-neutral-title1">
                    {formatUsdValue(task?.expectReceive?.usd || 0)}{' '}
                  </div>
                  <div className="mt-[8px] text-[15px] leading-[18px] text-r-neutral-title1">
                    {t('page.desktopSmallSwap.expectedToReceive')}{' '}
                    {formatAmount(task?.expectReceive?.amount || 0)}{' '}
                    {receiveToken ? getTokenSymbol(receiveToken) : ''}
                  </div>
                </div>
              ) : (
                <div>
                  <div className="text-[24px] leading-[29px] font-medium text-r-neutral-title1">
                    {/* {formatUsdValue(task?.finalReceive?.usd || 0)}{' '} */}
                    {task?.finalReceive?.usd && task?.finalReceive?.usd < 0.01
                      ? '<'
                      : null}
                    <CountUp
                      start={previousUsd}
                      end={
                        task?.finalReceive?.usd &&
                        task?.finalReceive?.usd < 0.01
                          ? 0.01
                          : task?.finalReceive?.usd || 0
                      }
                      decimals={2}
                      duration={1}
                      separator=","
                      prefix="$"
                    />
                  </div>
                  <div className="mt-[8px] text-[15px] leading-[18px] text-r-neutral-title1">
                    {formatAmount(task?.finalReceive?.amount || 0)}{' '}
                    {receiveToken ? getTokenSymbol(receiveToken) : ''}
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-rabby-neutral-line" />
            <div className="mt-[32px]">
              {task?.status !== 'idle' && task?.currentToken ? (
                <ExchangeSettingRow
                  label={t('page.desktopSmallSwap.conversionProgress')}
                  value={
                    <div className="flex items-center gap-[18px]">
                      <SwapAnimation
                        fromToken={task?.currentToken}
                        toToken={receiveToken}
                        chain={chain}
                      />
                      <div className="text-[15px] leading-[18px] text-r-neutral-title1">
                        {(task?.currentTaskIndex || 0) + 1} /{' '}
                        {task?.list?.length}
                      </div>
                    </div>
                  }
                />
              ) : null}
              <ExchangeSettingRow
                label={t('page.desktopSmallSwap.priceImpact')}
                value={
                  task?.config.priceImpact ? `${task.config.priceImpact}%` : '-'
                }
                isShowArrow={task?.status === 'idle'}
                onClick={() => {
                  if (task?.status !== 'idle') {
                    return;
                  }
                  setPriceImpactPopupVisible(true);
                }}
              />

              <ExchangeSettingRow
                label={t('page.desktopSmallSwap.singleTransactionGasLimit')}
                value={
                  task?.config.maxGasCost ? `$${task.config.maxGasCost}` : '-'
                }
                isShowArrow={task?.status === 'idle'}
                onClick={() => {
                  if (task?.status !== 'idle') {
                    return;
                  }
                  setGasPopupVisible(true);
                }}
              />
            </div>

            <div className="mt-auto pt-[24px]">
              {task?.status === 'idle' ? (
                isSupported ? (
                  <Button
                    disabled={!task?.list?.length}
                    type="primary"
                    block
                    className="flex-1 h-[60px] rounded-[8px] text-[18px] leading-[20px]"
                    onClick={() => {
                      task?.start();
                    }}
                  >
                    {t('page.desktopSmallSwap.startConvert')}
                  </Button>
                ) : (
                  <Tooltip
                    title={t('page.desktopSmallSwap.unsupportedWalletType')}
                    placement="top"
                    overlayClassName="rectangle"
                  >
                    <div className="flex-1">
                      <Button
                        disabled={true}
                        type="primary"
                        block
                        className="h-[60px] rounded-[8px] text-[18px] leading-[20px]"
                      >
                        {t('page.desktopSmallSwap.startConvert')}
                      </Button>
                    </div>
                  </Tooltip>
                )
              ) : (
                <button
                  type="button"
                  className={clsx(
                    'w-full h-[60px] rounded-[8px] transition-opacity',
                    'text-[18px] leading-[20px] font-medium text-r-neutral-title2',
                    'bg-r-red-default'
                  )}
                  onClick={() => {
                    task?.pause();
                  }}
                >
                  {t('page.desktopSmallSwap.stop')}
                </button>
              )}
            </div>
          </>
        )}
      </section>
      <SelectPopup
        value={task?.config.priceImpact}
        title={t('page.desktopSmallSwap.priceImpact')}
        visible={priceImpactPopupVisible}
        onCancel={() => {
          setPriceImpactPopupVisible(false);
        }}
        onConfirm={(v) => {
          task?.setConfig((prev) => ({
            ...prev,
            priceImpact: v,
          }));
          setPriceImpactPopupVisible(false);
        }}
        options={[
          {
            label: '5%',
            value: '5',
          },
          {
            label: '10%',
            value: '10',
          },
          {
            label: '15%',
            value: '15',
          },
          {
            label: '20%',
            value: '20',
          },
        ]}
        getContainer={() => {
          return ref.current || document.body;
        }}
      />

      <SelectPopup
        value={task?.config.maxGasCost}
        title={t('page.desktopSmallSwap.singleTransactionGasLimit')}
        visible={gasPopupVisible}
        onCancel={() => {
          setGasPopupVisible(false);
        }}
        onConfirm={(v) => {
          task?.setConfig((prev) => ({
            ...prev,
            maxGasCost: v,
          }));
          setGasPopupVisible(false);
        }}
        options={[
          {
            label: '$ 0.01',
            value: '0.01',
          },
          {
            label: '$ 0.05',
            value: '0.05',
          },
          {
            label: '$ 0.1',
            value: '0.1',
          },
          {
            label: '$ 1',
            value: '1',
          },
        ]}
        getContainer={() => {
          return ref.current || document.body;
        }}
      />
    </>
  );
};
