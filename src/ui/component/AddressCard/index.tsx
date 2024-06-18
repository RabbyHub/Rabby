import { Tooltip } from 'antd';
import clsx from 'clsx';
import { KEYRING_ICONS, WALLET_BRAND_CONTENT } from 'consts';
import React, { memo, useMemo, useRef } from 'react';

import { AddressViewer } from 'ui/component';
import { isSameAddress, splitNumberByStep, useAlias } from 'ui/utils';
import { useRabbySelector } from '@/ui/store';

import { ReactComponent as RcIconWhitelist } from 'ui/assets/address/whitelist.svg';
import { CopyChecked } from '@/ui/component/CopyChecked';
import { useWalletConnectIcon } from '@/ui/component/WalletConnect/useWalletConnectIcon';
import { CommonSignal } from '@/ui/component/ConnectStatus/CommonSignal';
import { useTranslation } from 'react-i18next';
import ThemeIcon from '../ThemeMode/ThemeIcon';
import { pickKeyringThemeIcon } from '@/utils/account';
import { useThemeMode } from '@/ui/hooks/usePreference';

export interface AddressCardProps {
  balance: number;
  address: string;
  type: string;
  brandName: string;
  className?: string;
  alias?: string;
}

const AddressCard = memo(
  ({
    balance,
    address,
    type,
    brandName,
    className,
    alias: aliasName,
  }: AddressCardProps) => {
    const { whitelistEnable, whiteList } = useRabbySelector((s) => ({
      whitelistEnable: s.whitelist.enabled,
      whiteList: s.whitelist.whitelist,
    }));
    const { t } = useTranslation();

    const isInWhiteList = useMemo(() => {
      return whiteList.some((e) => isSameAddress(e, address));
    }, [whiteList, address]);

    const [_alias] = useAlias(address);
    const alias = _alias || aliasName;
    const titleRef = useRef<HTMLDivElement>(null);

    const brandIcon = useWalletConnectIcon({
      address,
      brandName,
      type,
    });

    const { isDarkTheme } = useThemeMode();

    const addressTypeIcon = useMemo(
      () =>
        brandIcon ||
        pickKeyringThemeIcon(type as any, isDarkTheme) ||
        KEYRING_ICONS[type] ||
        pickKeyringThemeIcon(brandName as any, isDarkTheme) ||
        WALLET_BRAND_CONTENT?.[brandName]?.image,
      [type, brandName, brandIcon, isDarkTheme]
    );

    return (
      <div
        className={clsx(
          'searched-account-item relative',
          'group hover:bg-blue-light hover:bg-opacity-[0.1]',
          className
        )}
      >
        <div className={clsx('searched-account-item-left mr-[8px]')}>
          <div className="relative">
            <ThemeIcon src={addressTypeIcon} className={'w-[24px] h-[24px]'} />
            <CommonSignal
              type={type}
              brandName={brandName}
              address={address}
              className={''}
            />
          </div>
        </div>

        <div className={clsx('searched-account-item-content')}>
          {
            <div className="searched-account-item-title" ref={titleRef}>
              <>
                <div
                  className={clsx('searched-account-item-alias')}
                  title={alias}
                >
                  {alias}
                </div>
                {whitelistEnable && isInWhiteList && (
                  <Tooltip
                    overlayClassName="rectangle"
                    placement="top"
                    title={t(
                      'component.AccountSearchInput.AddressItem.whitelistedAddressTip'
                    )}
                  >
                    <ThemeIcon
                      src={RcIconWhitelist}
                      className={clsx('w-14 h-14 ml-[4px]')}
                    />
                  </Tooltip>
                )}
              </>
            </div>
          }
          <div className="flex items-center">
            <AddressViewer
              address={address?.toLowerCase()}
              showArrow={false}
              className={clsx('subtitle')}
            />

            <CopyChecked
              addr={address}
              className={clsx(
                'w-[14px] h-[14px] ml-4 text-14 textgre cursor-pointer'
              )}
              copyClassName={clsx()}
              checkedClassName={clsx('text-[#00C087]')}
            />

            <span className="ml-[8px] text-12 text-r-neutral-body">
              ${splitNumberByStep(balance?.toFixed(2))}
            </span>
          </div>
        </div>
      </div>
    );
  }
);

export default AddressCard;
