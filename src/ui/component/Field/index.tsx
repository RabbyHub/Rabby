import React, { ReactNode } from 'react';
import cx from 'clsx';
import { useWallet } from 'ui/utils';
import './style.less';
import IconWalletConnect from 'ui/assets/walletlogo/walletconnect.png';
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
}: FieldProps) => {
  const wallet = useWallet();
  const saveWallet = async (e) => {
    e.stopPropagation();
    const savedList = await wallet.getHighlightWalletList();
    if (savedList.includes(brand)) {
      return;
    }
    const newList = [brand, ...savedList].sort();
    await wallet.updateHighlightWalletList(newList);
    callback && callback();
  };
  const removeWallet = async (e) => {
    e.stopPropagation();
    console.log('remove wallet');
    const savedList = await wallet.getHighlightWalletList();
    const newList = savedList.filter((item) => item !== brand);
    await wallet.updateHighlightWalletList(newList);
    callback && callback();
  };
  return (
    <div
      className={cx('field', className)}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'initial' }}
    >
      {leftIcon && (
        <div className="left-icon">
          {leftIcon}
          {showWalletConnect && (
            <img className="corner-icon" src={IconWalletConnect} />
          )}
        </div>
      )}
      <div className="field-slot">
        <div>{children}</div>
        {subText && <div className="sub-text">{subText}</div>}
      </div>
      <div
        className="right-icon"
        onClick={unselect ? removeWallet : saveWallet}
      >
        {rightIcon}
      </div>
    </div>
  );
};

export default Field;
