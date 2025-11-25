/* eslint "react-hooks/exhaustive-deps": ["error"] */
/* eslint-enable react-hooks/exhaustive-deps */
import React, { useEffect, useMemo, useState } from 'react';
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
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';

import { ReactComponent as RcAvatarCC } from '@/ui/views/SendToken/icons/avatar-cc.svg';
import { ReactComponent as RcToSwitch } from '@/ui/views/SendToken/icons/to-address-switch.svg';
import { ReactComponent as RcWhitelistGuardBordered } from '@/ui/assets/component/whitelist-guard-bordered.svg';
import { ReactComponent as RcCheckRight } from '@/ui/assets/send-token/check-right.svg';

import { ReactComponent as RcIconAddressEntry } from '@/ui/views/SendToken/icons/address-entry.svg';
import { BRAND_ALIAN_TYPE_TEXT, KEYRING_CLASS } from '@/constant';
import { AddressViewer } from '@/ui/component';
import {
  ToAddressPositiveTips,
  useRecentSendToHistoryFor,
} from '@/ui/component/SendLike/hooks/useRecentSend';
import MarkedHeadTailAddress from '../AddressViewer/MarkedHeadTailAddress';

const isTab = getUiType().isTab;

export function AddressInfoTo({
  toAccount,
  titleText,
  loadingToAddressDesc,
  toAddressPositiveTips,
  // isMyImported,
  cexInfo,
  className,
  onClick,
}: {
  className?: string;
  toAccount?: Account;
  titleText?: string;
  loadingToAddressDesc?: boolean;
  toAddressPositiveTips?: ToAddressPositiveTips;
  // isMyImported: boolean | undefined;
  cexInfo?: Cex;
  onClick?: () => void;
}) {
  const { t } = useTranslation();

  const { isDarkTheme } = useThemeMode();

  const addressTypeIcon = useBrandIcon({
    address: toAccount?.address || '',
    brandName: toAccount?.brandName || '',
    type: toAccount?.type || '',
    forceLight: false,
  });

  const [aliasName] = useAlias(toAccount?.address || '');

  const rDispatch = useRabbyDispatch();

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
      ? t('page.selectToAddress.riskAlert.cexDepositAddress', {
          cexName: cexInfo?.name,
        })
      : toAccount?.type === KEYRING_CLASS.GNOSIS
      ? t('page.selectToAddress.riskAlert.cexAddress', {
          cexName: BRAND_ALIAN_TYPE_TEXT[toAccount?.type],
        })
      : toAccount?.type
      ? BRAND_ALIAN_TYPE_TEXT[toAccount?.type]
      : '';

    // ret.showBorderdDesc = ret.showCexInfo || toAccount?.type === KEYRING_CLASS.GNOSIS;
    ret.showBorderdDesc = false;

    return ret;
  }, [cexInfo, toAccount?.type, t]);

  useEffect(() => {
    rDispatch.accountToDisplay.getAllAccountsToDisplay();
  }, [rDispatch]);

  return (
    <div className={clsx(className, 'overflow-auto')}>
      <div className="section relative">
        <div className="section-title justify-between items-center flex">
          <span className="section-title__to font-bold text-[17px]">
            {titleText || t('page.sendToken.sectionTo.title')}
          </span>

          {toAddressPositiveTips?.hasPositiveTips && (
            <div className="flex items-center justify-end font-medium text-[15px]">
              <RcCheckRight width={18} height={18} className="mr-[3px]" />
              {toAddressPositiveTips.inWhitelist ? (
                <span className="text-r-green-default">
                  {t('page.selectToAddress.positiveTips.whitelistAddress')}
                </span>
              ) : toAddressPositiveTips.isMyImported ? (
                <span className="text-r-green-default">
                  {t('page.selectToAddress.positiveTips.yourOwnAddress')}
                </span>
              ) : toAddressPositiveTips.toAddressIsRecentlySend ? (
                <span className="text-r-green-default">
                  {t('page.selectToAddress.positiveTips.sentBefore')}
                </span>
              ) : null}
            </div>
          )}
        </div>

        {/* selected block  */}
        <div className="mt-[12px]">
          <div
            className={clsx(
              'h-[58px] w-[100%] flex items-center justify-between p-[16px] ',
              isDarkTheme ? 'bg-r-neutral-card1' : 'bg-r-neutral-bg1',
              'cursor-pointer border-[1px] border-transparent hover:border-rabby-blue-default hover:bg-r-blue-light1 rounded-[8px]'
            )}
            onClick={onClick}
          >
            <div className="relative flex items-center justify-start">
              <Tooltip
                overlayClassName="rounded-tooltip"
                title={
                  toAddressPositiveTips?.inWhitelist
                    ? t('page.whitelist.tips.tooltip')
                    : ''
                }
                {...(!toAddressPositiveTips?.inWhitelist && {
                  visible: false,
                })}
              >
                <div className="relative">
                  {!toAccount?.address ? (
                    <div
                      className="w-[24px] h-[24px] flex justify-center items-center"
                      style={{}}
                    >
                      <div className="w-[24px] h-[24px] rounded-[6px] flex justify-center items-center bg-r-neutral-line">
                        <RcAvatarCC
                          width={13}
                          height={15}
                          className="text-r-neutral-foot"
                        />
                      </div>
                    </div>
                  ) : (
                    <ThemeIcon
                      src={cexInfo?.logo_url || addressTypeIcon}
                      className={'w-[24px] h-[24px] rounded-full'}
                      style={{ padding: 0 }}
                    />
                  )}
                  {toAddressPositiveTips?.inWhitelist && (
                    <div className="absolute w-[18px] h-[18px] whitelist-guard-bordered-view text-r-blue-default">
                      <RcWhitelistGuardBordered
                        width={18}
                        height={18}
                        viewBox="0 0 18 18"
                      />
                    </div>
                  )}
                </div>
              </Tooltip>

              <div className={clsx('flex flex-col items-center', 'ml-[8px]')}>
                {toAccount?.address ? (
                  <Tooltip
                    overlayClassName="address-tooltip address-tooltip-transparent rounded-tooltip"
                    title={
                      <div className="flex flex-col justify-center">
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
                    {...(!showBorderdDesc && {
                      visible: false,
                    })}
                  >
                    <div className="flex flex-col justify-center items-start">
                      {aliasName ? (
                        <span className="text-[14px] mb-[4px] font-medium leading-[20px] text-r-neutral-title-1">
                          {aliasName}
                        </span>
                      ) : (
                        <MarkedHeadTailAddress
                          headCount={8}
                          tailCount={4}
                          address={toAccount?.address || ''}
                          className="text-[14px] mb-[4px]"
                        />
                      )}
                      <AddressViewer
                        address={toAccount?.address?.toLowerCase()}
                        showArrow={false}
                        longEllipsis
                        className={clsx(
                          'text-[13px] text-r-neutral-body leading-[16px]'
                        )}
                      />
                    </div>
                  </Tooltip>
                ) : (
                  <span className="text-[16px] font-medium leading-[20px] text-r-neutral-foot">
                    {t('page.sendToken.sectionTo.placeholder')}
                  </span>
                )}
              </div>
            </div>

            {toAccount ? (
              <RcToSwitch width={24} height={24} />
            ) : (
              <RcIconAddressEntry width={24} height={24} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
