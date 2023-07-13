import React, { useEffect, useState } from 'react';
import ClipboardJS from 'clipboard';
import { message } from 'antd';
import { useWallet } from 'ui/utils';
import IconSuccess from 'ui/assets/success.svg';
import IconAddressCopy from 'ui/assets/icon-copy-2.svg';
import './index.less';
import clsx from 'clsx';
import { ALIAS_ADDRESS, CHAINS, CHAINS_ENUM } from '@/constant';
import IconExternal from 'ui/assets/icon-share.svg';
import { openInTab } from '@/ui/utils';
import { findChainByEnum } from '@/utils/chain';

interface NameAndAddressProps {
  className?: string;
  address: string;
  nameClass?: string;
  addressClass?: string;
  noNameClass?: string;
  copyIconClass?: string;
  openExternal?: boolean;
  chainEnum?: CHAINS_ENUM;
  isShowCopyIcon?: boolean;
  addressSuffix?: React.ReactNode;
}

const NameAndAddress = ({
  className = '',
  address = '',
  nameClass = '',
  addressClass = '',
  noNameClass = '',
  copyIconClass = '',
  openExternal = false,
  chainEnum,
  isShowCopyIcon = true,
  addressSuffix = null,
}: NameAndAddressProps) => {
  const wallet = useWallet();
  const [alianName, setAlianName] = useState('');
  const init = async () => {
    const alianName =
      (await wallet.getAlianName(address?.toLowerCase())) ||
      ALIAS_ADDRESS[address?.toLowerCase() || ''] ||
      '';
    setAlianName(alianName);
  };
  const localName = alianName || '';
  const handleCopyContractAddress = () => {
    const clipboard = new ClipboardJS('.name-and-address', {
      text: function () {
        return address;
      },
    });

    clipboard.on('success', () => {
      message.success({
        duration: 3,
        icon: <i />,
        content: (
          <div>
            <div className="flex gap-4 mb-4">
              <img src={IconSuccess} alt="" />
              Copied
            </div>
            <div className="text-white">{address}</div>
          </div>
        ),
      });
      clipboard.destroy();
    });
  };

  const handleClickContractId = () => {
    if (!chainEnum) return;
    const chainItem = findChainByEnum(chainEnum);
    openInTab(
      chainItem?.scanLink.replace(/tx\/_s_/, `address/${address}`),
      false
    );
  };

  useEffect(() => {
    init();
  }, [address]);
  return (
    <div className={clsx('name-and-address', className)}>
      {localName && (
        <div className={clsx('name', nameClass)} title={localName}>
          {localName}
        </div>
      )}
      <div
        className={clsx('address', addressClass, !localName && noNameClass)}
        title={address.toLowerCase()}
      >
        {localName
          ? `(${address
              ?.toLowerCase()
              .slice(0, 6)}...${address?.toLowerCase().slice(-4)})`
          : `${address
              ?.toLowerCase()
              .slice(0, 6)}...${address?.toLowerCase().slice(-4)}`}
      </div>
      {addressSuffix || null}
      {openExternal && (
        <img
          onClick={handleClickContractId}
          src={IconExternal}
          width={16}
          height={16}
          className={clsx('ml-6 cursor-pointer', copyIconClass)}
        />
      )}
      {isShowCopyIcon && (
        <img
          onClick={handleCopyContractAddress}
          src={IconAddressCopy}
          width={16}
          height={16}
          className={clsx('ml-6 cursor-pointer', copyIconClass, {
            success: true,
          })}
        />
      )}
    </div>
  );
};

export default NameAndAddress;
