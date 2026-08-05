import React from 'react';
import { Drawer } from 'antd';
import { useMemoizedFn } from 'ahooks';
import { useTranslation } from 'react-i18next';
import { ReactComponent as RcIconCloseCC } from 'ui/assets/component/close-cc.svg';
import { ReactComponent as RcIconBackCC } from 'ui/assets/back-cc.svg';
import { SettingsHome } from './SettingsHome';
import { OrderConfirmationsPanel } from './OrderConfirmationsPanel';
import { AccountTypePanel } from './AccountTypePanel';

/** Pages of the drawer's internal stack. `home` is always the entry point. */
export type PerpsSettingsPage = 'home' | 'orderConfirmations' | 'accountType';

interface PerpsSettingsDrawerProps {
  visible: boolean;
  onClose: () => void;
}

export const PerpsSettingsDrawer: React.FC<PerpsSettingsDrawerProps> = ({
  visible,
  onClose,
}) => {
  const { t } = useTranslation();
  const [page, setPage] = React.useState<PerpsSettingsPage>('home');

  // `destroyOnClose` unmounts the body, but this component (and therefore
  // `page`) survives — reset explicitly so a sub-page left behind by the last
  // session isn't what the user sees on the next open.
  React.useLayoutEffect(() => {
    if (visible) {
      setPage('home');
    }
  }, [visible]);

  const goHome = useMemoizedFn(() => setPage('home'));

  const title =
    page === 'accountType'
      ? t('page.perpsPro.settings.accountTypeTitle')
      : page === 'orderConfirmations'
      ? t('page.perpsPro.settings.orderConfirmationsTitle')
      : t('page.perpsPro.settings.title');

  return (
    <Drawer
      visible={visible}
      onClose={onClose}
      placement="right"
      width={400}
      // The header below carries the close button, so antd's own header and
      // close affordance are both switched off.
      closable={false}
      destroyOnClose
      push={false}
      bodyStyle={{ padding: 0, height: '100%' }}
      drawerStyle={{ background: 'var(--rb-neutral-bg-0)' }}
      maskStyle={{
        backdropFilter: 'blur(8px)',
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
      }}
      className="desktop-perps-settings-drawer"
    >
      <div className="flex h-full flex-col bg-rb-neutral-bg-0">
        <div className="flex h-[56px] shrink-0 items-center gap-[7px] px-[20px]">
          {page !== 'home' ? (
            <button
              type="button"
              onClick={goHome}
              className="flex shrink-0 items-center justify-center border-none bg-transparent p-0 cursor-pointer text-rb-neutral-title-1 hover:text-rb-brand-default"
            >
              <RcIconBackCC className="w-[20px] h-[20px]" />
            </button>
          ) : null}
          <span className="text-[20px] leading-[24px] font-medium text-rb-neutral-title-1 truncate">
            {title}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="ml-auto flex shrink-0 items-center justify-center border-none bg-transparent p-0 cursor-pointer text-rb-neutral-body hover:text-rb-brand-default"
          >
            <RcIconCloseCC className="w-[20px] h-[20px]" />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto">
          {page === 'home' ? (
            <SettingsHome onNavigate={setPage} />
          ) : page === 'orderConfirmations' ? (
            <OrderConfirmationsPanel />
          ) : (
            <AccountTypePanel />
          )}
        </div>
      </div>
    </Drawer>
  );
};

export default PerpsSettingsDrawer;
