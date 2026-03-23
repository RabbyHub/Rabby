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
import { UI_TYPE } from '@/constant/ui';
const isTab = UI_TYPE.isTab;
const isDesktop = UI_TYPE.isDesktop;

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
  isShowAccount,
  disableSwitchAccount,
  showCurrentAccount,
  onSwitchAccountClick,
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
  isShowAccount?: boolean;
  disableSwitchAccount?: boolean;
  showCurrentAccount?: Account;
  onSwitchAccountClick?: () => void;
}) => {
  const history = useHistory();

  const { currentAccount } = useSceneAccountInfo();

  const Content = (
    <>
      <div
        className={clsx(
          'page-header',
          isShowAccount && 'switch-account thin-header',
          contentClassName,
          !fixed && className
        )}
      >
        {(forceShowBack || (canBack && history.length > 1)) && (
          <div
            className="icon-back-container hit-slop-8"
            onClick={onBack || (() => history.goBack())}
          >
            <ThemeIcon
              src={keepBackLightVersion ? IconBack : RcIconBackNew}
              className={clsx('icon icon-back', invertBack && 'filter invert')}
            />
          </div>
        )}
        <div className="header-content">
          {children}
          {isShowAccount && currentAccount ? (
            <AccountSwitchInner
              disableSwitch={disableSwitchAccount}
              currentAccount={showCurrentAccount || currentAccount}
              onSwitchAccountClick={onSwitchAccountClick}
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

const AccountSwitchInner = ({
  currentAccount,
  disableSwitch,
  onSwitchAccountClick,
}: {
  currentAccount: Account;
  disableSwitch?: boolean;
  onSwitchAccountClick?: () => void;
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
        onChange={(val) => {
          dispatch.account.changeAccountAsync(val);
          setIsShowModal(false);
        }}
      />
    </>
  );
};

export default PageHeader;
