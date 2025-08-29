import { Account } from '@/background/service/preference';
import { ReactComponent as RcIconDownCC } from '@/ui/assets/arrow-down-cc.svg';
import { useSceneAccountInfo } from '@/ui/hooks/backgroundState/useAccount';
import { useBrandIcon } from '@/ui/hooks/useBrandIcon';
import { useRabbyDispatch } from '@/ui/store';
import { getUiType, useAlias } from '@/ui/utils';
import clsx from 'clsx';
import React, { ReactNode, SVGProps, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router-dom';
import { ReactComponent as RcIconBackNew } from 'ui/assets/back-new.svg';
import IconBack from 'ui/assets/back.svg';
import { ReactComponent as RcIconClose } from 'ui/assets/component/close-cc.svg';
import { AccountSelectorModal } from '../AccountSelector/AccountSelectorModal';
import ThemeIcon from '../ThemeMode/ThemeIcon';
import './style.less';
import { KEYRING_TYPE } from '@/constant';
const isTab = getUiType().isTab;

const PageHeader = ({
  children,
  canBack = true,
  rightSlot,
  onBack,
  forceShowBack,
  fixed = false,
  wrapperClassName = '',
  invertBack = false,
  keepBackLightVersion = false,
  className = '',
  closeable = false,
  onClose,
  closeCn,
  isShowAccount,
  disableSwitchAccount,
  showCurrentAccount,
}: {
  children: ReactNode;
  canBack?: boolean;
  rightSlot?: ReactNode;
  onBack?(): void;
  onClose?(): void;
  forceShowBack?: boolean;
  fixed?: boolean;
  wrapperClassName?: string;
  invertBack?: boolean;
  keepBackLightVersion?: boolean;
  className?: string;
  closeable?: boolean;
  closeCn?: string;
  isShowAccount?: boolean;
  disableSwitchAccount?: boolean;
  showCurrentAccount?: Account;
}) => {
  const history = useHistory();

  const { currentAccount } = useSceneAccountInfo();

  const Content = (
    <>
      <div
        className={clsx(
          'page-header',
          isShowAccount && 'switch-account',
          !fixed && className
        )}
      >
        {(forceShowBack || (canBack && history.length > 1)) && (
          <ThemeIcon
            src={keepBackLightVersion ? IconBack : RcIconBackNew}
            className={clsx('icon icon-back', invertBack && 'filter invert')}
            onClick={onBack || (() => history.goBack())}
          />
        )}
        <div className="header-content">
          {children}
          {isShowAccount && currentAccount ? (
            <AccountSwitchInner
              disableSwitch={disableSwitchAccount}
              currentAccount={showCurrentAccount || currentAccount}
            />
          ) : null}
        </div>
        {rightSlot && rightSlot}
        {closeable && (
          <ThemeIcon
            src={RcIconClose}
            className={clsx(
              'icon-close text-r-neutral-body',
              invertBack && 'filter invert',
              closeCn
            )}
            onClick={() => {
              if (onClose) {
                onClose();
              } else if (history.length > 1) {
                history.goBack();
              } else {
                history.replace('/');
              }
            }}
          />
        )}
      </div>
    </>
  );
  return fixed ? (
    <div className={clsx('page-header-container', className)}>
      <div className={clsx('page-header-wrap', wrapperClassName)}>
        {Content}
      </div>
    </div>
  ) : (
    Content
  );
};

const WatchAddressLogo = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    {...props}
  >
    <rect width={24} height={24} fill="currentColor" rx={12} />
    <path
      fill="#6e7585"
      d="M11.998 10.511a2.974 2.974 0 1 0 0-5.949 2.974 2.974 0 0 0 0 5.95ZM17.15 18.643c.93-.293 1.42-1.32 1.025-2.212A6.751 6.751 0 0 0 12 12.406a6.751 6.751 0 0 0-6.175 4.025c-.395.892.094 1.919 1.024 2.212 1.325.417 3.079.794 5.151.794 2.072 0 3.826-.377 5.15-.794Z"
    />
  </svg>
);

const AccountSwitchInner = ({
  currentAccount,
  disableSwitch,
}: {
  currentAccount: Account;
  disableSwitch?: boolean;
}) => {
  const addressTypeIcon = useBrandIcon({
    address: currentAccount?.address,
    brandName: currentAccount?.brandName,
    type: currentAccount?.type,
    forceLight: false,
  });

  const [alias] = useAlias(currentAccount.address);
  const { t } = useTranslation();

  const [isShowModal, setIsShowModal] = useState(false);

  const isWatchAddress =
    currentAccount?.type === KEYRING_TYPE.WatchAddressKeyring;

  const dispatch = useRabbyDispatch();

  return (
    <>
      <div className="flex justify-center mt-[-1px]">
        <div
          className={clsx(
            'flex items-center justify-center px-[8px] py-[3px] rounded-[4px] group',
            !disableSwitch && 'hover:bg-r-neutral-line cursor-pointer'
          )}
          onClick={() => {
            if (disableSwitch) {
              return;
            }
            setIsShowModal(true);
          }}
        >
          {isWatchAddress ? (
            <WatchAddressLogo className="w-[16px] h-[16px] mr-[4px] text-white group-hover:text-opacity-30" />
          ) : (
            <img className="w-[16px] h-[16px] mr-[4px]" src={addressTypeIcon} />
          )}
          <div className="text-r-neutral-body text-[13px] leading-[16px] font-medium">
            {alias}
          </div>
          {disableSwitch ? null : (
            <RcIconDownCC className="text-r-neutral-foot w-[16px] h-[16px]" />
          )}
        </div>
      </div>
      <AccountSelectorModal
        title={t('component.PageHeader.selectAccount')}
        height="calc(100% - 60px)"
        visible={isShowModal}
        value={currentAccount}
        onCancel={() => {
          setIsShowModal(false);
        }}
        getContainer={
          isTab
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
    </>
  );
};

export default PageHeader;
