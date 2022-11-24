import React, { ReactNode } from 'react';
import cx from 'clsx';
import { useWallet, useHover } from 'ui/utils';
import './style.less';
import IconWalletConnect from 'ui/assets/walletlogo/walletconnect.svg';
interface FieldProps {
  children: ReactNode;
  leftIcon?: ReactNode;
  rightIcon: ReactNode;
  onClick?(): void;
  className?: string;
  subText?: string;
  showWalletConnect?: boolean;
  brand?: string | null;
  callback?(): void;
  unselect?: boolean;
  address?: boolean;
}

const Field = ({
  children,
  leftIcon,
  rightIcon,
  onClick,
  className,
  subText,
  showWalletConnect,
  brand,
  callback,
  unselect,
  address,
}: FieldProps) => {
  const wallet = useWallet();
  const [isHovering, hoverProps] = useHover();

  const saveWallet = async (e) => {
    e.stopPropagation();
    const savedList = await wallet.getHighlightWalletList();
    if (savedList.includes(brand)) {
      return;
    }
    const newList = [brand, ...savedList].filter(Boolean).sort();
    await wallet.updateHighlightWalletList(newList);
    callback && callback();
  };
  const removeWallet = async (e) => {
    e.stopPropagation();
    const savedList = await wallet.getHighlightWalletList();
    const newList = savedList.filter((item) => item !== brand);
    await wallet.updateHighlightWalletList(newList);
    callback && callback();
  };
  return (
    <div
      className={cx('address-option-field', className)}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'initial' }}
      {...hoverProps}
    >
      {leftIcon && (
        <div className={cx('left-icon', address && 'left-icon-address')}>
          {leftIcon}
          {showWalletConnect && (
            <img className="corner-icon" src={IconWalletConnect} />
          )}
        </div>
      )}
      <div className={cx('field-slot', address && 'field-slot-address')}>
        {children}
        {subText && <div className="sub-text">{subText}</div>}
      </div>
      <div
        className="right-icon"
        onClick={unselect ? removeWallet : saveWallet}
      >
        {!address ? rightIcon : (isHovering || unselect) && rightIcon}
      </div>
    </div>
  );
};

export default Field;
