import React, { useState } from 'react';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { Tooltip } from 'antd';
import MarkedHeadTailAddress from '@/ui/component/AddressViewer/MarkedHeadTailAddress';

import type { Account } from '@/background/service/preference';
import { ellipsisAddress } from '@/ui/utils/address';
import { useBrandIcon } from '@/ui/hooks/useBrandIcon';
import { useThemeMode } from '@/ui/hooks/usePreference';
import { getUiType, useAlias } from '@/ui/utils';
import { AccountSelectorModal } from '@/ui/component/AccountSelector/AccountSelectorModal';
import { useRabbyDispatch } from '@/ui/store';
import { useCurrentAccount } from '@/ui/hooks/backgroundState/useAccount';

import { ReactComponent as RcIconAddressEntry } from '@/ui/views/SendToken/icons/address-entry.svg';

const isTab = getUiType().isTab;
const isDesktop = getUiType().isDesktop;

export function AddressInfoFrom({
  className,
}: // account,
{
  className?: string;
  account?: Account /*  | null */;
}) {
  const { t } = useTranslation();

  const { isDarkTheme } = useThemeMode();

  const account = useCurrentAccount();
  const addressTypeIcon = useBrandIcon({
    address: account?.address || '',
    brandName: account?.brandName || '',
    type: account?.type || '',
    forceLight: false,
  });

  const aliasName = useAlias(account?.address || '');
  const [isShowModal, setIsShowModal] = useState(false);
  const dispatch = useRabbyDispatch();

  return (
    <div className={clsx(className, 'overflow-auto')}>
      <div className="section relative">
        <div className="section-title justify-between items-center flex">
          <span className="section-title__to font-bold text-[17px]">
            {t('page.sendToken.sectionFrom.title')}
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
            onClick={() => {
              setIsShowModal(true);
            }}
          >
            <div className="flex items-center justify-start">
              <img
                src={addressTypeIcon}
                className={'w-[24px] h-[24px] rounded-full'}
              />
              {!!account && (
                <Tooltip
                  overlayClassName="address-tooltip address-tooltip-light rounded-tooltip"
                  title={<MarkedHeadTailAddress address={account.address} />}
                >
                  <div className="flex items-center ml-[8px]">
                    <span className="text-[16px] font-medium leading-[20px] text-r-neutral-title-1">
                      {aliasName || ellipsisAddress(account.address)}
                    </span>
                  </div>
                </Tooltip>
              )}
            </div>

            <RcIconAddressEntry width={24} height={24} />
          </div>
        </div>
      </div>

      <AccountSelectorModal
        title={t('page.sendToken.accountSelectorModal.title')}
        height="calc(100% - 60px)"
        visible={isShowModal}
        value={account}
        onCancel={() => {
          setIsShowModal(false);
        }}
        getContainer={
          isTab || isDesktop
            ? (document.querySelector(
                '.js-rabby-popup-container'
              ) as HTMLDivElement) || document.body
            : document.body
        }
        onChange={(val) => {
          dispatch.account.changeAccountAsync(val);
          setIsShowModal(false);
        }}
      />
    </div>
  );
}
