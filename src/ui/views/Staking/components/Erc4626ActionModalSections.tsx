import React from 'react';
import { Input } from 'antd';
import clsx from 'clsx';
import type { TokenItem } from 'background/service/openapi';

import TokenWithChain from '@/ui/component/TokenWithChain';
import { ReactComponent as RcIconWalletCC } from '@/ui/assets/swap/wallet-cc.svg';
import { SwapSlider } from '@/ui/views/Swap/Component/Slider';

type Erc4626Action = 'deposit' | 'withdraw';

export const Erc4626DepositContent = ({
  amount,
  amountError,
  amountUsdText,
  actionToken,
  assetSymbol,
  balanceText,
  onAmountChange,
  onMax,
}: {
  amount: string;
  amountError: boolean;
  amountUsdText: string;
  actionToken?: TokenItem | null;
  assetSymbol?: string;
  balanceText: string;
  onAmountChange: (value: string) => void;
  onMax: () => void;
}) => (
  <div className={clsx('staking-action-amount-row', amountError && 'is-error')}>
    <div className="staking-action-amount-left">
      <Input
        className="staking-action-amount-input"
        placeholder="0"
        value={amount}
        onChange={(event) => onAmountChange(event.target.value)}
      />
      <div className="staking-action-amount-usd">{amountUsdText}</div>
    </div>
    <div className="staking-action-token-side">
      <div className="staking-action-token-main">
        {actionToken ? (
          <TokenWithChain
            width="32px"
            height="32px"
            chainSize={16}
            token={actionToken}
            hideConer
          />
        ) : null}
        <span className="staking-action-token-symbol">{assetSymbol || ''}</span>
      </div>
      <div className="staking-action-balance">
        <RcIconWalletCC viewBox="0 0 16 16" className="w-[14px] h-[14px]" />
        <span className="staking-action-balance-text" title={balanceText}>
          {balanceText}
        </span>
        <button type="button" className="staking-action-max" onClick={onMax}>
          Max
        </button>
      </div>
    </div>
  </div>
);

export const Erc4626WithdrawContent = ({
  percent,
  onPercentChange,
  actionToken,
  previewRedeemLoading,
  redeemReceiveText,
  redeemReceiveUsdText,
  assetSymbol,
}: {
  percent: number;
  onPercentChange: (value: number) => void;
  actionToken?: TokenItem | null;
  previewRedeemLoading: boolean;
  redeemReceiveText: string;
  redeemReceiveUsdText: string;
  assetSymbol?: string;
}) => (
  <>
    <div className="staking-action-withdraw-box">
      <div className="staking-action-percent-value">
        <span>{percent}</span>
        <span>%</span>
      </div>
      <SwapSlider
        className="staking-action-percent-slider"
        min={0}
        max={100}
        step={1}
        value={percent}
        tooltipVisible={false}
        onChange={(value) => onPercentChange(Number(value))}
      />
      <div className="staking-action-presets">
        {[25, 50, 75, 100].map((item) => (
          <button
            type="button"
            key={item}
            className={clsx(percent === item && 'is-active')}
            onClick={() => onPercentChange(item)}
          >
            {item}%
          </button>
        ))}
      </div>
    </div>
    <div className="staking-action-preview">
      <div className="staking-action-preview-title">Receive</div>
      <div className="staking-action-preview-card">
        <div className="staking-action-preview-left">
          {actionToken ? (
            <TokenWithChain
              width="24px"
              height="24px"
              chainSize={12}
              token={actionToken}
              hideConer
            />
          ) : null}
          <span>
            {previewRedeemLoading
              ? '-'
              : `${redeemReceiveText} ${assetSymbol || ''}`}
          </span>
        </div>
        <span className="staking-action-preview-value">
          {previewRedeemLoading ? '-' : redeemReceiveUsdText}
        </span>
      </div>
    </div>
  </>
);

export const Erc4626ActionError = ({
  disabledReason,
  action,
  depositBalanceError,
  withdrawInvalid,
  assetSymbol,
}: {
  disabledReason?: string;
  action: Erc4626Action;
  depositBalanceError: boolean;
  withdrawInvalid: boolean;
  assetSymbol?: string;
}) => {
  if (disabledReason) {
    return <div className="staking-action-error">{disabledReason}</div>;
  }

  if (action === 'deposit' && depositBalanceError) {
    return (
      <div className="staking-action-error">
        Insufficient {assetSymbol || 'token'} balance
      </div>
    );
  }

  if (action === 'withdraw' && withdrawInvalid) {
    return <div className="staking-action-error">No withdrawable position</div>;
  }

  return null;
};
