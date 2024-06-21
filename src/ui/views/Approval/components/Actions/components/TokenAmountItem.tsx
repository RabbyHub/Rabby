import clsx from 'clsx';
import React from 'react';
import LogoWithText from './LogoWithText';
import { ReactComponent as IconEditPen } from 'ui/assets/edit-pen-cc.svg';
import * as Values from './Values';

interface Props {
  amount: number;
  logoUrl: string;
  onEdit?: () => void;
}

export const TokenAmountItem: React.FC<Props> = ({
  amount,
  logoUrl,
  onEdit,
}) => {
  return (
    <LogoWithText
      id="token-approve-balance"
      className={clsx(
        'rounded-[4px]',
        'overflow-hidden py-[4px] px-[7px]',
        'border-[0.5px] border-rabby-neutral-line',
        onEdit
          ? 'cursor-pointer hover:border-rabby-blue-default hover:bg-r-blue-light1'
          : undefined
      )}
      logo={logoUrl}
      text={
        <div
          onClick={onEdit}
          className="overflow-hidden overflow-ellipsis flex justify-between items-center"
        >
          <div className="flex flex-1 overflow-hidden">
            <Values.TokenAmount value={amount} />
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
  );
};
