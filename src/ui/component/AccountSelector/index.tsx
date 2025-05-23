import { ReactComponent as RcArrowDownSVG } from '@/ui/assets/dashboard/arrow-down-cc.svg';
import React, { CSSProperties, forwardRef, ReactNode, useState } from 'react';
import { useAlias, useWallet } from 'ui/utils';

import { Account } from '@/background/service/preference';
import { useBrandIcon } from '@/ui/hooks/useBrandIcon';
import clsx from 'clsx';
import { AccountSelectorModal } from './AccountSelectorModal';
import './style.less';

interface Props {
  value?: Account | null;
  onChange?(value: Account): void;
  className?: string;
  title?: ReactNode;
  onAfterOpen?: () => void;
  modalHeight?: number | string;
  disabled?: boolean;
  style?: CSSProperties;
}

export const AccountSelector = forwardRef<HTMLDivElement, Props>(
  (
    {
      title,
      value,
      onChange,
      className = '',
      onAfterOpen,
      modalHeight,
      disabled,
      style,
    },
    ref
  ) => {
    const [showSelectorModal, setShowSelectorModal] = useState(false);
    const wallet = useWallet();

    const handleClickSelector = () => {
      if (disabled) {
        return;
      }
      setShowSelectorModal(true);
      onAfterOpen?.();
    };

    const handleCancel = () => {
      setShowSelectorModal(false);
    };

    const handleChange = (value: Account) => {
      onChange?.(value);
      setShowSelectorModal(false);
    };

    return (
      <>
        <div
          className={clsx(
            'global-account-selector',
            disabled ? 'is-disabled' : '',
            className
          )}
          onClick={handleClickSelector}
          style={style}
          ref={ref}
        >
          {value ? (
            <CurrentAccount account={value} />
          ) : (
            <div className="flex-1 whitespace-nowrap overflow-hidden overflow-ellipsis">
              Select Address
            </div>
          )}
          <RcArrowDownSVG
            className={clsx('ml-[2px] w-[14px] h-[14px] text-r-neutral-foot')}
          />
        </div>
        <AccountSelectorModal
          title={title}
          value={value}
          visible={showSelectorModal}
          onChange={handleChange}
          onCancel={handleCancel}
          height={modalHeight}
        />
      </>
    );
  }
);

const CurrentAccount = ({ account }: { account: Account }) => {
  const addressTypeIcon = useBrandIcon({
    address: account.address,
    brandName: account.brandName,
    type: account.type,
    forceLight: false,
  });

  const [alias] = useAlias(account.address);

  return (
    <>
      <div className="mr-6">
        <img src={addressTypeIcon} className="brand-icon" alt="" />
      </div>
      <span className="flex-1 whitespace-nowrap overflow-hidden overflow-ellipsis">
        {alias}
      </span>
    </>
  );
};
