import React, { useMemo, useState } from 'react';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { Cex } from '@rabby-wallet/rabby-api/dist/types';

import type { Account } from '@/background/service/preference';
import { ellipsisAddress } from '@/ui/utils/address';
import { useBrandIcon } from '@/ui/hooks/useBrandIcon';

import { useThemeMode } from '@/ui/hooks/usePreference';
import { getUiType, isSameAddress, useAlias } from '@/ui/utils';
import { Tooltip } from 'antd';
import ThemeIcon from '@/ui/component/ThemeMode/ThemeIcon';
import MarkedHeadTailAddress from '@/ui/component/AddressViewer/MarkedHeadTailAddress';
import { useRabbySelector } from '@/ui/store';

import { ReactComponent as RcAvatarCC } from '@/ui/views/SendToken/icons/avatar-cc.svg';
import { ReactComponent as RcToSwitch } from '@/ui/views/SendToken/icons/to-address-switch.svg';
import { ReactComponent as RcWhitelistIconCC } from '@/ui/assets/send-token/small-lock.svg';
import { ReactComponent as RcIconAddressEntry } from '@/ui/views/SendToken/icons/address-entry.svg';
import { BRAND_ALIAN_TYPE_TEXT, KEYRING_CLASS } from '@/constant';

const isTab = getUiType().isTab;

export function AddressInfoTo({
  toAccount,
  // inWhitelist,
  loading,
  cexInfo,
  className,
  onClick,
}: {
  className?: string;
  toAccount?: Account;
  // inWhitelist?: boolean;
  loading?: boolean;
  cexInfo?: Cex;
  onClick?: () => void;
}) {
  const { t } = useTranslation();

  const { isDarkTheme } = useThemeMode();

  // const [account, setAccount] = useState<Account | null>(null);

  const addressTypeIcon = useBrandIcon({
    address: toAccount?.address || '',
    brandName: toAccount?.brandName || '',
    type: toAccount?.type || '',
    forceLight: false,
  });

  const aliasName = useAlias(toAccount?.address || '');

  const { whitelist } = useRabbySelector((s) => ({
    whitelist: s.whitelist.whitelist,
  }));

  const inWhitelist =
    !!toAccount?.address &&
    whitelist?.some((w) => isSameAddress(w, toAccount.address));

  const { showBorderdDesc, cexInfoText } = useMemo(() => {
    const ret = {
      showCexInfo: false,
      cexInfoText: '',
      showBorderdDesc: false,
    };
    ret.showCexInfo =
      !!cexInfo?.id &&
      !!cexInfo?.is_deposit &&
      toAccount?.type === KEYRING_CLASS.WATCH;

    ret.cexInfoText = ret.showCexInfo
      ? t('page.sendPoly.riskAlert.cexDepositAddress', {
          cexName: cexInfo?.name,
        })
      : toAccount?.type === KEYRING_CLASS.GNOSIS
      ? t('page.sendPoly.riskAlert.cexAddress', {
          cexName: BRAND_ALIAN_TYPE_TEXT[toAccount?.type],
        })
      : toAccount?.type
      ? BRAND_ALIAN_TYPE_TEXT[toAccount?.type]
      : '';

    ret.showBorderdDesc =
      ret.showCexInfo || toAccount?.type === KEYRING_CLASS.GNOSIS;

    return ret;
  }, [cexInfo, toAccount?.type]);

  return (
    <div className={clsx(className, 'overflow-auto')} onClick={onClick}>
      <div className="section relative">
        <div className="section-title justify-between items-center flex">
          <span className="section-title__to font-medium">
            {t('page.sendToken.sectionTo.title')}
          </span>
        </div>

        {/* selected block  */}
        <div className="mt-[12px]">
          <div
            className={clsx(
              'h-[58px] w-[100%] flex items-center justify-between p-[16px] ',
              isDarkTheme ? 'bg-r-neutral-card1' : 'bg-r-neutral-bg1',
              'cursor-pointer border-[1px] border-transparent hover:border-rabby-blue-default hover:bg-r-blue-light1 rounded-[8px]'
            )}
            onClick={() => {}}
          >
            <div className="relative flex items-center justify-start">
              <Tooltip
                overlayClassName="rounded-tooltip"
                title={inWhitelist ? t('page.whitelist.tips.tooltip') : ''}
                {...(!inWhitelist && {
                  visible: false,
                })}
              >
                <div className="relative">
                  {!toAccount?.address ? (
                    <div className="w-[24px] h-[24px] rounded-[6px] flex justify-center items-center bg-r-neutral-line">
                      <RcAvatarCC
                        width={13}
                        height={15}
                        className="text-r-neutral-foot"
                      />
                    </div>
                  ) : (
                    <ThemeIcon
                      src={cexInfo?.logo_url || addressTypeIcon}
                      className={'w-[24px] h-[24px] rounded-full'}
                    />
                  )}
                  {inWhitelist && (
                    <div className="absolute w-[12px] h-[12px] bottom-[-2px] right-[-2px] text-r-blue-default">
                      <RcWhitelistIconCC
                        width={12}
                        height={12}
                        viewBox="0 0 12 12"
                      />
                    </div>
                  )}
                </div>
              </Tooltip>

              <div className="flex items-center ml-[8px]">
                <Tooltip
                  overlayClassName="address-tooltip address-tooltip-light rounded-tooltip"
                  title={
                    <div className="flex flex-col justify-center">
                      <MarkedHeadTailAddress address={toAccount?.address} />
                      {showBorderdDesc && (
                        <div
                          className={clsx(
                            'flex items-center justify-center',
                            'rounded-[8px] bg-r-blue-light1',
                            'px-[12px] h-[32px]',
                            'text-[13px] font-medium text-r-blue-default whitespace-nowrap overflow-hidden text-ellipsis'
                          )}
                        >
                          {cexInfoText}
                        </div>
                      )}
                    </div>
                  }
                  {...(!toAccount?.address && {
                    visible: false,
                  })}
                  // visible
                >
                  <span className="text-[16px] font-[600] leading-[20px] text-r-neutral-title-1">
                    {toAccount?.address
                      ? aliasName || ellipsisAddress(toAccount?.address || '')
                      : t('page.sendToken.sectionTo.placeholder')}
                  </span>
                </Tooltip>
              </div>
            </div>

            {toAccount ? (
              <RcToSwitch />
            ) : (
              <RcIconAddressEntry width={26} height={26} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
