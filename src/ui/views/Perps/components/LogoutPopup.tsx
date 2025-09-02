import React from 'react';
import { useTranslation } from 'react-i18next';
import { AddressViewer, Popup } from '@/ui/component';
import { PopupProps } from '@/ui/component/Popup';
import clsx from 'clsx';
import { CopyChecked } from '@/ui/component/CopyChecked';
import { useAlias } from '@/ui/utils';
import { useBrandIcon } from '@/ui/hooks/useBrandIcon';
import { Account } from '@/background/service/preference';
import { Button } from 'antd';
import {
  GasAccountBlueBorderedButton,
  GasAccountRedBorderedButton,
} from '../../GasAccount/components/Button';

const LogoutCurrentAddress = ({ account }: { account: Account }) => {
  const [alias] = useAlias(account.address);

  const addressTypeIcon = useBrandIcon({
    address: account.address,
    brandName: account.brandName,
    type: account.type,
  });

  return (
    <div className="max-w-[calc(100%-40px)] mb-[20px] py-12 px-16 rounded-[6px] flex items-center bg-r-neutral-card-1 overflow-hidden">
      <img src={addressTypeIcon} className="w-24 h-24" />
      <span className="ml-[8px] mr-4 text-15 font-medium text-r-neutral-title-1 truncate">
        {alias}
      </span>
      <AddressViewer
        address={account.address}
        showArrow={false}
        className="text-13 text-r-neutral-body relative top-1"
      />
      <CopyChecked
        addr={account.address}
        className={clsx(
          'w-[14px] h-[14px] ml-4 text-14 cursor-pointer relative top-1'
        )}
        checkedClassName={clsx('text-[#00C087]')}
      />
    </div>
  );
};

const LogoutContent = ({
  account,
  onLogout,
  onCancel,
}: {
  account: Account;
  onLogout: () => void;
  onCancel: () => void;
}) => {
  const { t } = useTranslation();

  return (
    <div className="w-full h-full flex flex-col items-center bg-r-neutral-bg2 rounded-t-[16px]">
      <div className="text-20 font-medium text-r-neutral-title-1 mt-20 mb-[20px]">
        {t('page.perps.logoutConfirmModal.title')}
      </div>

      <LogoutCurrentAddress account={account} />

      <div className="text-14 text-r-neutral-body text-center mb-[30px] px-4">
        {t('page.perps.logoutConfirmModal.desc')}
      </div>

      {/* <div className="w-full flex gap-12">
        <Button
          block
          size="large"
          className="h-[48px] text-15 font-medium"
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button
          block
          size="large"
          type="primary"
          danger
          className="h-[48px] text-15 font-medium"
          onClick={onLogout}
        >
          Log out
        </Button>
      </div> */}
      <div
        className={clsx(
          'flex items-center justify-center gap-16',
          'w-full mt-auto px-20 py-16 border-t-[0.5px] border-solid border-rabby-neutral-line'
        )}
      >
        <GasAccountBlueBorderedButton onClick={onCancel} block>
          {t('global.Cancel')}
        </GasAccountBlueBorderedButton>

        <GasAccountRedBorderedButton onClick={onLogout} block>
          {t('page.gasAccount.logoutConfirmModal.logout')}
        </GasAccountRedBorderedButton>
      </div>
    </div>
  );
};

export const PerpsLogoutPopup = (
  props: PopupProps & {
    account: Account | null;
    onLogout?: () => void;
  }
) => {
  const { account, onLogout, ...rest } = props;

  if (!account) return null;

  return (
    <Popup
      placement="bottom"
      height={280}
      isSupportDarkMode
      bodyStyle={{
        padding: 0,
      }}
      destroyOnClose
      push={false}
      closable={false}
      {...rest}
    >
      <LogoutContent
        account={account}
        onLogout={() => {
          onLogout?.();
        }}
        onCancel={() => {
          props.onCancel?.();
        }}
      />
    </Popup>
  );
};

export default PerpsLogoutPopup;
