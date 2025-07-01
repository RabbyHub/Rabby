import { Account } from '@/background/service/preference';
import { ReactComponent as RcIconDownCC } from '@/ui/assets/arrow-down-cc.svg';
import { useSceneAccountInfo } from '@/ui/hooks/backgroundState/useAccount';
import { useBrandIcon } from '@/ui/hooks/useBrandIcon';
import { useRabbyDispatch } from '@/ui/store';
import { getUiType } from '@/ui/utils';
import clsx from 'clsx';
import React, { ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router-dom';
import { ReactComponent as RcIconBackNew } from 'ui/assets/back-new.svg';
import IconBack from 'ui/assets/back.svg';
import { ReactComponent as RcIconClose } from 'ui/assets/component/close-cc.svg';
import { AccountSelectorModal } from '../AccountSelector/AccountSelectorModal';
import ThemeIcon from '../ThemeMode/ThemeIcon';
import './style.less';
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
            <AccountSwitchInner currentAccount={currentAccount} />
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
}: {
  currentAccount: Account;
}) => {
  const addressTypeIcon = useBrandIcon({
    address: currentAccount?.address,
    brandName: currentAccount?.brandName,
    type: currentAccount?.type,
    forceLight: false,
  });

  const { t } = useTranslation();

  const [isShowModal, setIsShowModal] = useState(false);

  const dispatch = useRabbyDispatch();

  return (
    <>
      <div className="flex justify-center mt-[-1px]">
        <div
          className="flex items-center justify-center cursor-pointer px-[8px] py-[3px] rounded-[4px] hover:bg-r-neutral-line"
          onClick={() => {
            setIsShowModal(true);
          }}
        >
          <img className="w-[16px] h-[16px] mr-[4px]" src={addressTypeIcon} />
          <div className="text-r-neutral-body text-[13px] leading-[16px] font-medium">
            {currentAccount?.alianName}
          </div>
          <RcIconDownCC className="text-r-neutral-foot w-[16px] h-[16px]" />
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
