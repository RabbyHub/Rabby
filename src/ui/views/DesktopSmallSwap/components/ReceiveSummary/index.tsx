import clsx from 'clsx';
import React from 'react';

import { ExchangeSettingRow } from '../ExchangeSettingRow';
import { SlippagePopup } from './SlippagePopup';
import { TokenItem } from '@rabby-wallet/rabby-api/dist/types';
import { TooltipWithMagnetArrow } from '@/ui/component/Tooltip/TooltipWithMagnetArrow';
import { Chain } from '@debank/common';
import { Button, Image } from 'antd';
import IconUnknown from '@/ui/assets/token-default.svg';
import { BatchSwapTaskType } from '../../hooks/useBatchSwapTask';
import { PANEL_WIDTH, PANEL_WIDTH_DELTA } from '../../constant';

type ReceiveSummaryProps = {
  totalValue?: number;
  token?: TokenItem | null;
  chain?: Chain | null;
  onStart?: () => void;
  task?: BatchSwapTaskType;
};

export const ReceiveSummary: React.FC<ReceiveSummaryProps> = ({
  totalValue,
  token,
  chain,
  onStart,
  task,
}) => {
  const ref = React.useRef<HTMLDivElement>(null);
  return (
    <>
      <section
        className={clsx(
          'relative translate-x-0 overflow-hidden',
          'bg-r-neutral-card-1 rounded-[16px]',
          'flex-shrink-0 px-[24px] py-[32px] flex flex-col'
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
            <div className="flex-1">
              <div className="text-center text-[24px] leading-[29px] font-medium text-r-neutral-title1">
                Dust Converted !
              </div>
              <div
                className={clsx(
                  'flex items-center justify-center gap-[8px] mt-[48px]',
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
                $ {12.49} <span className="font-normal">(0.0042ETH)</span>
              </div>
            </div>
            <footer>
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
                Done
              </Button>
            </footer>
          </>
        ) : (
          <>
            <div className="mb-[32px] text-[24px] leading-[29px] font-medium text-r-neutral-title1">
              You Receive
            </div>

            <div className="mb-[32px] flex items-center gap-[16px]">
              <div className="relative w-[46px] h-[46px] flex-shrink-0">
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
                    className="w-[18px] h-[18px] absolute right-[-1px] bottom-[-1px] rounded-full"
                    src={chain?.logo || IconUnknown}
                    alt={chain?.name}
                  />
                </TooltipWithMagnetArrow>
              </div>
              <div>
                <div className="text-[24px] leading-[29px] font-medium text-r-neutral-title1"></div>
                <div className="mt-[8px] text-[15px] leading-[18px] text-r-neutral-title1">
                  Expected to receive ETH
                </div>
              </div>
            </div>

            <div className="border-t border-rabby-neutral-line" />
            <div className="mt-[32px]">
              {task?.status !== 'idle' && task?.currentToken ? (
                <ExchangeSettingRow
                  label="Conversion progress"
                  value={
                    <div className="flex items-center gap-[18px]">
                      <div className="flex items-center gap-[12px]">
                        <div className="relative w-[24px] h-[24px] flex-shrink-0">
                          <Image
                            className="w-full h-full block rounded-full"
                            src={task?.currentToken?.logo_url || IconUnknown}
                            alt={task?.currentToken?.symbol}
                            fallback={IconUnknown}
                            preview={false}
                          />
                          <img
                            className="w-[9px] h-[9px] absolute right-[-1px] bottom-[-1px] rounded-full"
                            src={chain?.logo || IconUnknown}
                            alt={chain?.name}
                          />
                        </div>
                        <div className="w-[9px] h-[9px] rounded-full bg-r-blue-default"></div>
                        <div className="relative w-[24px] h-[24px] flex-shrink-0">
                          <Image
                            className="w-full h-full block rounded-full"
                            src={token?.logo_url || IconUnknown}
                            alt={token?.symbol}
                            fallback={IconUnknown}
                            preview={false}
                          />
                          <img
                            className="w-[9px] h-[9px] absolute right-[-1px] bottom-[-1px] rounded-full"
                            src={chain?.logo || IconUnknown}
                            alt={chain?.name}
                          />
                        </div>
                      </div>
                      <div className="text-[15px] leading-[18px] text-r-neutral-title1">
                        {(task?.currentTaskIndex || 0) + 1} /{' '}
                        {task?.list?.length}
                      </div>
                    </div>
                  }
                />
              ) : null}
              <ExchangeSettingRow
                label="Slippage tolerance"
                value="3%"
                isShowArrow={task?.status === 'idle'}
              />

              <ExchangeSettingRow
                label="Single Transaction Gas Limit"
                value="$0.1"
                isShowArrow={task?.status === 'idle'}
              />
            </div>

            <div className="mt-auto pt-[24px]">
              {task?.status === 'idle' ? (
                <Button
                  // disabled={disableSubmit}
                  type="primary"
                  block
                  className="flex-1 h-[60px] rounded-[8px] text-[18px] leading-[20px]"
                  // onClick={onConfirm}
                  onClick={() => {
                    task?.start();
                  }}
                >
                  {/* {t('global.Confirm')} */}
                  Start convert
                </Button>
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
                  Stop
                </button>
              )}
            </div>
          </>
        )}
      </section>
      <SlippagePopup
        slippage={0}
        onChange={function (slippage: number): void {
          throw new Error('Function not implemented.');
        }}
        getContainer={() => {
          return ref.current || document.body;
        }}
      />
    </>
  );
};
