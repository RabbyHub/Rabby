import clsx from 'clsx';
import React from 'react';
import LogoWithText from './LogoWithText';
import { ReactComponent as IconEditPen } from 'ui/assets/edit-pen-cc.svg';
import * as Values from './Values';
import { TooltipWithMagnetArrow } from '@/ui/component/Tooltip/TooltipWithMagnetArrow';
import { isNil } from 'lodash';
import { useTranslation } from 'react-i18next';
import BigNumber from 'bignumber.js';
import { ReactComponent as WarningSVG } from '@/ui/assets/warning-1.svg';

interface Props {
  amount: number | string;
  logoUrl: string;
  onEdit?: () => void;
  balance?: string;
}

export const TokenAmountItem: React.FC<Props> = ({
  amount,
  logoUrl,
  onEdit,
  balance,
}) => {
  const hideTooltip = isNil(balance);
  const isExceed = hideTooltip ? false : new BigNumber(amount).gt(balance);
  const { t } = useTranslation();

  return (
    <TooltipWithMagnetArrow
      inApproval
      overlayClassName="rectangle w-[max-content]"
      title={
        hideTooltip ? (
          false
        ) : (
          <div>
            <div className="break-all">
              {`${t('page.signTx.tokenApprove.amount')} ${new BigNumber(
                amount
              ).toFixed()}`}
            </div>
            {isExceed && (
              <div className="flex items-center gap-x-4">
                <WarningSVG />
                <span>{t('page.signTx.tokenApprove.exceed')}</span>
              </div>
            )}
          </div>
        )
      }
    >
      <div className="max-w-[220px]">
        <LogoWithText
          id="token-approve-balance"
          className={clsx(
            'rounded-[4px]',
            'overflow-hidden py-[4px] px-[7px]',
            'border-[0.5px] border-rabby-neutral-line',
            onEdit ? 'cursor-pointer hover:bg-r-blue-light1' : undefined
          )}
          logo={logoUrl}
          text={
            <div
              onClick={onEdit}
              className="overflow-hidden overflow-ellipsis flex justify-between items-center"
            >
              <div
                className={clsx(
                  'flex flex-1 overflow-hidden',
                  isExceed && 'text-red-light'
                )}
              >
                <Values.TokenAmount hasTitle={hideTooltip} value={amount} />
              </div>
              {onEdit ? (
                <span className="text-blue-light text-14 font-medium ml-4 hover:underline">
                  <IconEditPen className="text-r-blue-default" />
                </span>
              ) : null}
            </div>
          }
          logoRadius="100%"
          textStyle={{
            flex: 1,
          }}
        />
      </div>
    </TooltipWithMagnetArrow>
  );
};
