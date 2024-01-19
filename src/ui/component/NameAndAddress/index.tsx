import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useWallet } from 'ui/utils';
import clsx from 'clsx';
import { ALIAS_ADDRESS, CHAINS_ENUM, ThemeIconType } from '@/constant';
import { openInTab } from '@/ui/utils';
import { findChainByEnum } from '@/utils/chain';
import { copyAddress } from '@/ui/utils/clipboard';

import IconAddressCopy from 'ui/assets/icon-copy-2.svg';
import IconExternal from 'ui/assets/icon-share.svg';
import './index.less';
import { useTranslation } from 'react-i18next';
import { getAddressScanLink } from '@/utils';
import ThemeIcon from '../ThemeMode/ThemeIcon';

interface NameAndAddressProps {
  className?: string;
  address: string;
  nameClass?: string;
  addressClass?: string;
  noNameClass?: string;
  openExternal?: boolean;
  externalIconProps?: Partial<React.ComponentProps<typeof ThemeIcon>>;
  chainEnum?: CHAINS_ENUM;
  copyIcon?: boolean | ThemeIconType;
  copyIconClass?: string;
  copyIconProps?: React.ComponentProps<typeof ThemeIcon>;
  addressSuffix?: React.ReactNode;
  /**
   * @description don't know why click event not be stopped when click copy icon,
   * just add this prop to fix it in some case.
   */
  __internalRestrainClickEventOnCopyIcon?: boolean;
}

const NameAndAddress = ({
  className = '',
  address = '',
  nameClass = '',
  addressClass = '',
  noNameClass = '',
  copyIconClass = '',
  openExternal = false,
  externalIconProps = { className: copyIconClass },
  chainEnum,
  copyIcon = true,
  copyIconProps,
  addressSuffix = null,
  __internalRestrainClickEventOnCopyIcon = false,
}: NameAndAddressProps) => {
  const wallet = useWallet();
  const [alianName, setAlianName] = useState('');

  const mountedRef = useRef(false);
  const { t } = useTranslation();
  const init = async () => {
    const alianName =
      (await wallet.getAlianName(address?.toLowerCase())) ||
      ALIAS_ADDRESS[address?.toLowerCase() || ''] ||
      '';

    if (!mountedRef.current) return;
    setAlianName(alianName);
  };
  const localName = alianName || '';
  const handleCopyContractAddress = () => {
    copyAddress(address);
  };

  const handleClickCopyIcon = useCallback(
    (
      evt: Parameters<
        Exclude<React.DOMAttributes<HTMLImageElement>['onClick'], void>
      >[0]
    ) => {
      evt.stopPropagation();
      copyAddress(address);
    },
    [address]
  );

  const handleClickContractId = () => {
    if (!chainEnum) return;
    const chainItem = findChainByEnum(chainEnum);
    if (!chainItem) return;
    openInTab(getAddressScanLink(chainItem?.scanLink, address), false);
  };

  useEffect(() => {
    mountedRef.current = true;
    init();

    return () => {
      mountedRef.current = false;
    };
  }, [address]);

  const { isShowCopyIcon, iconCopySrc } = useMemo(() => {
    return {
      isShowCopyIcon: !!copyIcon,
      iconCopySrc:
        typeof copyIcon === 'string'
          ? copyIcon.trim() || IconAddressCopy
          : IconAddressCopy,
    };
  }, [copyIcon]);

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
        <ThemeIcon
          onClick={handleClickContractId}
          src={IconExternal}
          width={16}
          height={16}
          {...(externalIconProps as any)}
          className={clsx('ml-6 cursor-pointer', externalIconProps?.className)}
        />
      )}
      {isShowCopyIcon && (
        <ThemeIcon
          src={iconCopySrc}
          onClick={
            __internalRestrainClickEventOnCopyIcon
              ? handleClickCopyIcon
              : handleCopyContractAddress
          }
          width={16}
          height={16}
          {...(copyIconProps as any)}
          className={clsx(
            'ml-6 cursor-pointer',
            copyIconClass,
            {
              success: true,
            },
            copyIconProps?.className
          )}
        />
      )}
    </div>
  );
};

export default NameAndAddress;

NameAndAddress.SafeCopy = (
  props: Omit<NameAndAddressProps, '__internalRestrainClickEventOnCopyIcon'>
) => {
  return <NameAndAddress {...props} __internalRestrainClickEventOnCopyIcon />;
};
