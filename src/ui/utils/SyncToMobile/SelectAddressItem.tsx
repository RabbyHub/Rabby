import { IDisplayedAccountWithBalance } from '@/ui/models/accountToDisplay';
import { useRabbySelector } from '@/ui/store';
import { Tooltip } from 'antd';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { isSameAddress, splitNumberByStep, useAccountInfo } from '@/ui/utils';
import { WALLET_BRAND_CONTENT, KEYRING_ICONS } from '@/constant';
import ThemeIcon from '@/ui/component/ThemeMode/ThemeIcon';
import { pickKeyringThemeIcon } from '@/utils/account';
import { ReactComponent as RcIconWhitelist } from 'ui/assets/address/whitelist.svg';
import { ellipsis } from '../address';
import { CopyChecked } from '@/ui/component/CopyChecked';
import { ReactComponent as IconUnCheck } from '@/ui/assets/sync-to-mobile/uncheck.svg';
import { ReactComponent as IconChecked } from '@/ui/assets/sync-to-mobile/checked.svg';
import clsx from 'clsx';
import { isNil } from 'lodash';
import { TooltipWithMagnetArrow } from '@/ui/component/Tooltip/TooltipWithMagnetArrow';
import { BAN_REASONS } from './SelectAddressModal';

export const SelectAddressItem: React.FC<{
  className?: string;
  account: IDisplayedAccountWithBalance;
  disabled?: boolean | BAN_REASONS;
  onClick?(account: IDisplayedAccountWithBalance): void;
  checked?: boolean;
}> = ({ account, onClick, disabled, checked, className }) => {
  const { whitelistEnable, whiteList } = useRabbySelector((s) => ({
    whitelistEnable: s.whitelist.enabled,
    whiteList: s.whitelist.whitelist,
  }));

  const { t } = useTranslation();
  const accountInfo = useAccountInfo(
    account.type,
    account.address,
    account.brandName
  );
  const isInWhiteList = useMemo(() => {
    return whiteList.some((e) => isSameAddress(e, account.address));
  }, [whiteList, account.address]);

  const handleClickItem = () => {
    if (disabled) {
      return;
    }

    onClick?.(account);
  };

  return (
    <TooltipWithMagnetArrow
      className="rectangle"
      title={
        disabled === BAN_REASONS.NOT_ALLOWED
          ? t('page.syncToMobile.disableSelectAddress', {
              type: account.type,
            })
          : disabled === BAN_REASONS.HAS_PASSPHRASE
          ? t('page.syncToMobile.disableSelectAddressWithPassphrase', {
              type: account.type,
            })
          : disabled === BAN_REASONS.IS_SLIP39
          ? t('page.syncToMobile.disableSelectAddressWithSlip39', {
              type: account.type,
            })
          : ''
      }
    >
      <div
        className={clsx(
          'flex items-center justify-between',
          'cursor-pointer',
          'bg-r-neutral-card1',
          'py-[11px] px-[16px] rounded-[8px]',
          'border border-transparent border-solid',
          'hover:bg-r-blue-light1 hover:border-rabby-blue-default',
          checked && 'bg-r-blue-light1 border-rabby-blue-default',
          disabled && 'cursor-not-allowed opacity-50',
          className
        )}
        onClick={handleClickItem}
      >
        <div className={clsx('flex items-center gap-[12px]', 'flex-1')}>
          <ThemeIcon
            className="w-[24px] h-[24px]"
            src={
              pickKeyringThemeIcon(account.brandName as any, false) ||
              WALLET_BRAND_CONTENT[account.brandName]?.image ||
              pickKeyringThemeIcon(account.type as any, false) ||
              KEYRING_ICONS[account.type]
            }
          />
          <div className={clsx('flex-1', 'flex flex-col gap-[4px]')}>
            <div className={clsx('flex items-center gap-[4px]')}>
              <div
                className={clsx(
                  'leading-[16px] text-r-neutral-title1 text-[13px]',
                  'font-medium'
                )}
              >
                {account.alianName}
              </div>
              {!isNil(accountInfo?.index) && (
                <div className={clsx('leading-[16px]')}>
                  #{accountInfo?.index}
                </div>
              )}
              {onClick && whitelistEnable && isInWhiteList && (
                <Tooltip
                  overlayClassName="rectangle"
                  placement="top"
                  title={t('component.Contact.AddressItem.whitelistedTip')}
                >
                  <ThemeIcon
                    src={RcIconWhitelist}
                    className={'w-[14px] h-[14px]'}
                  />
                </Tooltip>
              )}
            </div>
            <div className={clsx('flex items-center gap-[4px]')}>
              <div
                className={clsx(
                  'leading-[16px] text-rabby-neutral-body text-[12px]'
                )}
              >
                {ellipsis(account.address)}
              </div>
              <CopyChecked addr={account.address} />
              <div
                className={clsx(
                  'ml-[8px]',
                  'leading-[16px] text-rabby-neutral-body text-[12px]'
                )}
              >
                ${splitNumberByStep(Math.floor(account.balance))}
              </div>
            </div>
          </div>
        </div>
        <div>{checked ? <IconChecked /> : <IconUnCheck />}</div>
      </div>
    </TooltipWithMagnetArrow>
  );
};
