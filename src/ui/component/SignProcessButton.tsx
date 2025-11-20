import { Account } from '@/background/service/preference';
import { useMemoizedFn } from 'ahooks';
import { Button, ButtonProps } from 'antd';
import React, { ReactNode } from 'react';
import { RcIconSpinCC } from '../assets/desktop/profile';
import { useBrandIcon } from '../hooks/useBrandIcon';
import { supportedHardwareDirectSign } from '../hooks/useMiniApprovalDirectSign';
import { Dots } from '../views/Approval/components/Popup/Dots';
import ThemeIcon from './ThemeMode/ThemeIcon';
import clsx from 'clsx';

export const SignProcessButton: React.FC<
  ButtonProps & {
    account: Account;
    isSigning?: boolean;
    currentIndex?: number;
    total?: number;
  }
> = ({
  account,
  loading,
  isSigning,
  title,
  onClick,
  children,
  currentIndex,
  total,
  ...btnProps
}) => {
  const handleClick = useMemoizedFn(
    (
      e: React.MouseEvent<HTMLButtonElement | HTMLAnchorElement, MouseEvent>
    ) => {
      if (isSigning || loading) {
        e.preventDefault();
        return;
      }

      onClick?.(
        'href' in btnProps
          ? (e as React.MouseEvent<HTMLAnchorElement, MouseEvent>)
          : (e as React.MouseEvent<HTMLButtonElement, MouseEvent>)
      );
    }
  );

  const addressTypeIcon = useBrandIcon({
    ...account,
  });

  const isSupportHardwareDirectSign = supportedHardwareDirectSign(account.type);

  if (isSigning && isSupportHardwareDirectSign) {
    return (
      <div
        className={clsx(
          'bg-r-neutral-card-2 rounded-[6px] flex items-center gap-[6px] py-[13px] px-[18px]',
          'text-[15px] leading-[18px] font-medium text-r-neutral-title1 cursor-pointer'
        )}
      >
        <ThemeIcon src={addressTypeIcon} className={'w-[16px] h-[16px]'} />
        Sending signing request{' '}
        {(total || 0) > 1 ? `(${currentIndex || 1}/${total})` : ''} <Dots />
      </div>
    );
  }

  return (
    <Button onClick={handleClick} {...btnProps}>
      <div className="flex items-center gap-[6px]">
        {loading || isSigning ? (
          <RcIconSpinCC className="animate-spin" />
        ) : null}
        {children}
      </div>
    </Button>
  );
};
