import React from 'react';
import SpeedUpCorner from './SpeedUpCorner';
import { AddressViewer, Copy, TokenWithChain } from 'ui/component';
import { ellipsisOverflowedText, splitNumberByStep } from '@/ui/utils';
import IconUnknownProtocol from 'ui/assets/unknown-protocol.svg';
import { useTranslation } from 'react-i18next';
import { ExplainTxResponse } from '@debank/rabby-api/dist/types';
import BigNumber from 'bignumber.js';
import clsx from 'clsx';
import { InfoCircleOutlined } from '@ant-design/icons';
import { CHAINS_ENUM, CHAINS } from 'consts';
import IconExternal from 'ui/assets/icon-share.svg';
import { openInTab } from '@/ui/utils';

export interface Props {
  isSpeedUp?: boolean;
  detail: NonNullable<ExplainTxResponse['type_token_approval']>;
  onClickEdit?: () => void;
  onApproveAmountChange?: (amount: string) => void;
  balance?: string | null;
  chainEnum?: CHAINS_ENUM;
}

export const ApproveToken: React.FC<Props> = ({
  detail,
  isSpeedUp,
  balance,
  onClickEdit,
  onApproveAmountChange,
  children,
  chainEnum,
}) => {
  const { t } = useTranslation();
  const tokenAmount = new BigNumber(detail.token_amount).toFixed();
  const totalTokenPrice = new BigNumber(
    ((detail.token.raw_amount || 0) / Math.pow(10, detail.token.decimals)) *
      detail.token.price
  ).toFixed(2);

  const ExceedsAccountBalance = React.useMemo(() => {
    if (
      balance === undefined ||
      balance === null ||
      new BigNumber(balance || 0).gte(
        new BigNumber(detail.token.raw_amount_hex_str || 0)
          .div(new BigNumber(10).pow(detail.token.decimals))
          .toFixed()
      )
    ) {
      return null;
    }
    return (
      <div className="flex justify-between items-center text-13 py-[10px] border-t border-gray-divider overflow-hidden overflow-ellipsis whitespace-nowrap">
        <div className="flex flex-1 items-center text-gray-content">
          <InfoCircleOutlined />
          <span className="ml-[4px]">Exceeds account balance</span>
        </div>

        <span
          className="underline text-gray-content pl-[10px] overflow-hidden overflow-ellipsis whitespace-nowrap cursor-pointer"
          onClick={() => onApproveAmountChange?.(balance || '0')}
          title={balance}
        >
          Balance: {splitNumberByStep(new BigNumber(balance || 0).toFixed(4))}
        </span>
      </div>
    );
  }, [balance, detail.token.raw_amount_hex_str]);

  const handleProtocolLogoLoadFailed = function (
    e: React.SyntheticEvent<HTMLImageElement>
  ) {
    e.currentTarget.src = IconUnknownProtocol;
  };

  const handleClickSpender = () => {
    if (!chainEnum) return;
    const chain = CHAINS[chainEnum];
    openInTab(
      chain.scanLink.replace(/tx\/_s_/, `address/${detail.spender}`),
      false
    );
  };

  return (
    <div className="action-card">
      <div className="common-detail-block pt-[15px]">
        {isSpeedUp && <SpeedUpCorner />}
        <p className="title mb-[16px] text-gray-title">{t('Token Approval')}</p>
        <div className="block-field flex flex-col bg-gray-bg2 rounded px-[12px]">
          <div className="flex justify-between pt-[16px] text-13 font-medium leading-[15px] mb-[8px]">
            <span className="text-gray-title">Approval amount</span>
            {onClickEdit && (
              <span
                className="text-blue-light cursor-pointer text"
                onClick={onClickEdit}
              >
                {t('Edit')}
              </span>
            )}
          </div>
          <div className="flex justify-between items-center pb-[12px]">
            <div className="flex">
              <TokenWithChain
                hideConer
                width={'20px'}
                height={'20px'}
                token={detail.token}
                hideChainIcon
              />
              <span
                className="ml-[6px] font-medium"
                title={tokenAmount + ' ' + detail.token_symbol}
              >
                {ellipsisOverflowedText(
                  splitNumberByStep(tokenAmount),
                  12,
                  true
                )}{' '}
                <span title={detail.token_symbol}>
                  {ellipsisOverflowedText(detail.token_symbol, 4)}
                </span>{' '}
              </span>
            </div>
            <div
              className="token-value"
              title={splitNumberByStep(totalTokenPrice)}
            >
              $
              {ellipsisOverflowedText(
                splitNumberByStep(totalTokenPrice),
                18,
                true
              )}
            </div>
          </div>
          {ExceedsAccountBalance}
        </div>
        <div className="block-field mb-0">
          <span className="label flex items-center w-[80px]">
            {t('Approve to')}
          </span>
          <div className="value protocol justify-end">
            <img
              className="protocol-logo rounded-full h-[20px] w-[20px]"
              src={detail.spender_protocol_logo_url || IconUnknownProtocol}
              onError={handleProtocolLogoLoadFailed}
            />
            <div className="protocol-info">
              <div
                className={clsx('protocol-info__name flex font-medium', {
                  'text-gray-title': !detail.spender_protocol_name,
                })}
              >
                {ellipsisOverflowedText(
                  detail.spender_protocol_name || t('UnknownProtocol'),
                  10
                )}
                <span className="protocol-info__spender">
                  <AddressViewer
                    className="font-normal"
                    address={detail.spender}
                    showArrow={false}
                  />
                  {chainEnum && (
                    <img
                      src={IconExternal}
                      className="icon icon-copy w-[16px] h-[16px]"
                      onClick={handleClickSpender}
                    />
                  )}
                  <Copy
                    data={detail.spender}
                    variant="address"
                    className="icon icon-copy w-[16px] h-[16px]"
                  />
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
      {children}
    </div>
  );
};
