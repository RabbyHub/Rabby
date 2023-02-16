import React, { useEffect, useState } from 'react';
import ClipboardJS from 'clipboard';
import { message } from 'antd';
import { useWallet } from 'ui/utils';
import IconSuccess from 'ui/assets/success.svg';
import IconAddressCopy from 'ui/assets/component/icon-copy.svg';
import './index.less';
import clsx from 'clsx';
import { ALIAS_ADDRESS, CHAINS, CHAINS_ENUM } from '@/constant';
import IconExternal from 'ui/assets/open-external-gray.svg';
import { openInTab } from '@/ui/utils';

interface NameAndAddressProps {
  className?: string;
  address: string;
  nameClass?: string;
  addressClass?: string;
  noNameClass?: string;
  copyIconClass?: string;
  openExternal?: boolean;
  chainEnum?: CHAINS_ENUM;
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
    const chain = CHAINS[chainEnum];
    openInTab(chain.scanLink.replace(/tx\/_s_/, `address/${address}`), false);
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
      {!openExternal && (
        <img
          onClick={handleCopyContractAddress}
          src={IconExternal}
          width={16}
          height={16}
          className={clsx('ml-4 cursor-pointer', copyIconClass, {
            success: true,
          })}
        />
      )}
      {openExternal && (
        <img
          onClick={handleClickContractId}
          src={IconExternal}
          width={14}
          height={14}
          className={clsx('ml-4 cursor-pointer', copyIconClass)}
        />
      )}
    </div>
  );
};

export default NameAndAddress;
