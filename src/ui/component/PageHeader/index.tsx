import { Account } from '@/background/service/preference';
import { ReactComponent as RcIconDownCC } from '@/ui/assets/arrow-down-cc.svg';
import { useSceneAccountInfo } from '@/ui/hooks/backgroundState/useAccount';
import { useBrandIcon } from '@/ui/hooks/useBrandIcon';
import { useRabbyDispatch } from '@/ui/store';
import { getUiType, useAlias } from '@/ui/utils';
import clsx from 'clsx';
import { cn } from '@/ui/utils/cn';
import React, { ReactNode, SVGProps, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router-dom';
import { ReactComponent as RcIconBackNew } from 'ui/assets/back-new.svg';
import IconBack from 'ui/assets/back.svg';
import { ReactComponent as RcIconClose } from 'ui/assets/component/close-cc.svg';
import { AccountSelectorModal } from '../AccountSelector/AccountSelectorModal';
import ThemeIcon from '../ThemeMode/ThemeIcon';
import { KEYRING_TYPE } from '@/constant';
import { UI_TYPE } from '@/constant/ui';
const isTab = UI_TYPE.isTab;
const isDesktop = UI_TYPE.isDesktop;

const hasClass = (classNames: string, name: string) =>
  classNames.split(/\s+/).includes(name);

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
  contentClassName,
  className = '',
  closeable = false,
  onClose,
  closeCn,
  backCn,
  isShowAccount,
  disableSwitchAccount,
  showCurrentAccount,
  onSwitchAccountClick,
  onBeforeSwitchAccountChange,
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
  contentClassName?: string;
  className?: string;
  closeable?: boolean;
  closeCn?: string;
  backCn?: string;
  isShowAccount?: boolean;
  disableSwitchAccount?: boolean;
  showCurrentAccount?: Account;
  onSwitchAccountClick?: () => void;
  onBeforeSwitchAccountChange?: (nextAccount: Account) => void | Promise<void>;
}) => {
  const history = useHistory();

  const { currentAccount } = useSceneAccountInfo();

  // Callers can also ask for the thin/switch-account look through their classes.
  const headerClassName = clsx(
    isShowAccount && 'switch-account thin-header',
    contentClassName,
    !fixed && className
  );
  const isSwitchAccount = hasClass(headerClassName, 'switch-account');
  const isThin = hasClass(headerClassName, 'thin-header');

  const Content = (
    <>
      <div
        className={cn(
          'page-header flex items-center relative',
          'text-r-neutral-title-1 font-medium text-[20px] leading-[24px] pt-20 mb-20',
          isSwitchAccount && 'pt-[9px] pb-[6px]',
          headerClassName
        )}
      >
        {(forceShowBack || (canBack && history.length > 1)) && (
          <div
            className={cn(
              'icon-back-container hit-slop-8 absolute left-0 bottom-0 h-20 cursor-pointer',
              isSwitchAccount && 'top-[50%] [transform:translateY(-50%)]',
              backCn
            )}
            onClick={onBack || (() => history.goBack())}
          >
            <ThemeIcon
              src={keepBackLightVersion ? IconBack : RcIconBackNew}
              className={clsx(
                'icon icon-back w-20 h-20',
                invertBack && 'filter invert'
              )}
            />
          </div>
        )}
        <div
          className={cn(
            'header-content w-full text-center leading-none',
            isThin &&
              'text-r-neutral-title1 text-[20px] font-medium leading-[24px]'
          )}
        >
          {children}
          {isShowAccount && currentAccount ? (
            <AccountSwitchInner
              disableSwitch={disableSwitchAccount}
              currentAccount={showCurrentAccount || currentAccount}
              onSwitchAccountClick={onSwitchAccountClick}
              onBeforeSwitchAccountChange={onBeforeSwitchAccountChange}
            />
          ) : null}
        </div>
        {rightSlot && rightSlot}
        {closeable && (
          <ThemeIcon
            src={RcIconClose}
            className={cn(
              'icon-close absolute bottom-0 right-0 w-20 h-20 cursor-pointer text-r-neutral-body',
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
    <div className={cn('page-header-container h-[64px] shrink-0', className)}>
      <div
        className={cn(
          'page-header-wrap fixed top-0 left-0 right-0 z-10',
          'bg-r-neutral-bg-2 px-20 min-h-[64px]',
          className &&
            hasClass(className, 'transparent-wrap') &&
            'bg-transparent',
          wrapperClassName
        )}
      >
        {Content}
      </div>
    </div>
  ) : (
    Content
  );
};

const AccountSwitchInner = ({
  currentAccount,
  disableSwitch,
  onSwitchAccountClick,
  onBeforeSwitchAccountChange,
}: {
  currentAccount: Account;
  disableSwitch?: boolean;
  onSwitchAccountClick?: () => void;
  onBeforeSwitchAccountChange?: (nextAccount: Account) => void | Promise<void>;
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
            if (typeof onSwitchAccountClick === 'function') {
              onSwitchAccountClick();
              return;
            }
            setIsShowModal(true);
          }}
        >
          <img className="w-[16px] h-[16px] mr-[4px]" src={addressTypeIcon} />
          <div
            className={clsx(
              'text-r-neutral-body text-[13px] leading-[16px] font-medium',
              'max-w-[220px] truncate'
            )}
          >
            {alias}
          </div>
          {disableSwitch ? null : (
            <RcIconDownCC className="text-r-neutral-foot w-[16px] h-[16px]" />
          )}
        </div>
      </div>
      <AccountSelectorModal
        // title={t('component.PageHeader.selectAccount')}
        height="calc(100% - 60px)"
        visible={isShowModal}
        value={currentAccount}
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
        onChange={async (val) => {
          try {
            await onBeforeSwitchAccountChange?.(val);
          } catch (error) {
            console.error(
              '[PageHeader] onBeforeSwitchAccountChange error',
              error
            );
          }
          dispatch.account.changeAccountAsync(val);
          setIsShowModal(false);
        }}
      />
    </>
  );
};

export default PageHeader;
