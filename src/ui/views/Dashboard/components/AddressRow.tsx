import React from 'react';
import ClipboardJS from 'clipboard';
import clsx from 'clsx';

import { Account } from '@/background/service/preference';

import IconSuccess from 'ui/assets/success.svg';
import IconAddressCopy from 'ui/assets/address-copy.png';
import { ReactComponent as RcIconPinned } from 'ui/assets/icon-pinned.svg';
import { ReactComponent as RcIconPinnedFill } from 'ui/assets/icon-pinned-fill.svg';

import { splitNumberByStep, useWallet } from 'ui/utils';
import { message } from 'antd';
import {
  KEYRING_ICONS,
  KEYRING_WITH_INDEX,
  WALLET_BRAND_CONTENT,
} from '@/constant';
import { AddressViewer } from '@/ui/component';
import { connectStore, useRabbyDispatch, useRabbySelector } from '@/ui/store';
import useIsMountedRef from '@/ui/hooks/useMountedRef';
import { useTranslation } from 'react-i18next';
import ThemeIcon from '@/ui/component/ThemeMode/ThemeIcon';

function AddressRow({
  data,
  index,
  style,
  copiedSuccess = false,
  handleClickChange,
  onCopy,
}: {
  data: Account[];
  index: number;
  style: React.StyleHTMLAttributes<HTMLDivElement>;
  copiedSuccess?: boolean;
  handleClickChange?: (account: Account) => any;
  onCopy?: (account: Account) => void;
}) {
  const wallet = useWallet();
  const { highlightedAddresses } = useRabbySelector((s) => ({
    highlightedAddresses: s.addressManagement.highlightedAddresses,
  }));
  const dispatch = useRabbyDispatch();

  const account = data[index];
  const favorited = highlightedAddresses.some(
    (highlighted) =>
      account.address === highlighted.address &&
      account.brandName === highlighted.brandName
  );
  const { t } = useTranslation();

  const handleCopyContractAddress = React.useCallback(() => {
    const clipboard = new ClipboardJS('.address-item', {
      text: function () {
        return account?.address;
      },
    });
    clipboard.on('success', () => {
      if (onCopy) {
        onCopy(account);
      }
      message.success({
        duration: 1,
        icon: <i />,
        content: (
          <div>
            <div className="flex gap-4 mb-4">
              <img src={IconSuccess} alt="" />
              {t('global.copied')}
            </div>
            <div className="text-white">{account?.address}</div>
          </div>
        ),
      });
      clipboard.destroy();
    });
  }, [account, onCopy]);

  const isMountedRef = useIsMountedRef();
  const [hdPathIndex, setHDPathIndex] = React.useState(null);
  React.useEffect(() => {
    if (KEYRING_WITH_INDEX.includes(account.type as any)) {
      wallet.getIndexByAddress(account.address, account.type).then((index) => {
        if (!isMountedRef.current) return;
        if (index !== null) {
          setHDPathIndex(index + 1);
        }
      });
    }
  }, [account]);

  return (
    <div
      className={clsx(
        'flex items-center address-item',
        favorited && 'favorited'
      )}
      key={index}
      style={style}
      onClick={(e) => {
        const target = e.target as HTMLElement;
        if (target?.dataset?.action !== 'copyIcon') {
          handleClickChange?.(account);
        }
      }}
    >
      {' '}
      <img
        className="icon icon-account-type w-[20px] h-[20px]"
        src={
          WALLET_BRAND_CONTENT[account.brandName]?.image ||
          KEYRING_ICONS[account.type]
        }
      />
      <div className="flex flex-col items-start ml-10 relative w-[100%]">
        <div className="text-13 text-black text-left click-name">
          <div className="flex items-center w-[100%]">
            <div className="list-alian-name" title={account?.alianName}>
              {account?.alianName}
              {hdPathIndex && (
                <span className="address-hdpath-index font-roboto-mono">{`#${hdPathIndex}`}</span>
              )}
            </div>
            <span className={clsx('ml-[3px] favorite-star flex-shrink-0')}>
              <ThemeIcon
                onClick={(e) => {
                  e.stopPropagation();
                  if (account)
                    dispatch.addressManagement.toggleHighlightedAddressAsync({
                      address: account.address,
                      brandName: account.brandName,
                    });
                }}
                src={favorited ? RcIconPinnedFill : RcIconPinned}
                className={clsx('w-[12px] h-[12px]')}
              />
            </span>
          </div>
          <div className="flex items-center">
            <AddressViewer
              address={account?.address}
              showArrow={false}
              className={'address-color'}
            />
            <img
              onClick={handleCopyContractAddress}
              src={IconAddressCopy}
              data-action={'copyIcon'}
              className={clsx('ml-7 w-[16px] h-[16px]', {
                success: copiedSuccess,
              })}
            />
            <div
              className="money-color truncate max-w-[80px]"
              title={splitNumberByStep(Math.floor(account?.balance || 0))}
            >
              ${splitNumberByStep(Math.floor(account?.balance || 0))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * @deprecated
 */
export default connectStore()(AddressRow);
