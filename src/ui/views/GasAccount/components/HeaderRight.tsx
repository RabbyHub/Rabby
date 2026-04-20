import React from 'react';
import { Dropdown, Menu } from 'antd';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';

import { ReactComponent as RcIconMore } from '@/ui/assets/gas-account/more.svg';
import { ReactComponent as RcIconLogout } from '@/ui/assets/gas-account/logout.svg';
import { ReactComponent as RcIconSwitchCC } from '@/ui/assets/gas-account/switch-cc.svg';
import { ReactComponent as RcIconWithdrawCC } from '@/ui/assets/gas-account/withdraw-cc.svg';

export const GasAccountHeader: React.FC<{
  isLogin?: boolean;
  canSwitchWallet?: boolean;
  onSwitchWallet?(): void;
  onWithdraw?(): void;
  onLogout?(): void;
}> = ({ isLogin, canSwitchWallet, onSwitchWallet, onWithdraw, onLogout }) => {
  const { t } = useTranslation();

  if (!isLogin && !canSwitchWallet) {
    return null;
  }

  const menuItems = [
    isLogin
      ? {
          key: 'withdraw',
          icon: (
            <RcIconWithdrawCC className="w-16 h-16 text-r-neutral-title-1" />
          ),
          label: t('page.gasAccount.withdraw'),
          labelClassName: 'text-r-neutral-title-1 text-13 font-medium',
          onClick: onWithdraw,
        }
      : null,
    canSwitchWallet
      ? {
          key: 'switch-wallet',
          icon: <RcIconSwitchCC className="w-16 h-16 text-r-neutral-title-1" />,
          label: t('page.gasAccount.switchAccount'),
          labelClassName: 'text-r-neutral-title-1 text-13 font-medium',
          onClick: onSwitchWallet,
        }
      : null,
    isLogin
      ? {
          key: 'logout',
          icon: <RcIconLogout className="w-16 h-16" />,
          label: t('page.gasAccount.logout'),
          labelClassName: 'text-r-red-default text-13 font-medium',
          onClick: onLogout,
        }
      : null,
  ].filter(Boolean) as Array<{
    key: string;
    icon: React.ReactNode;
    label: string;
    labelClassName: string;
    onClick?: () => void;
  }>;

  const menu = (
    <Menu
      className="bg-r-neutral-card1 rounded-[8px] p-0 overflow-hidden min-w-[200px]"
      style={
        {
          // boxShadow: '0px 8px 24px 0px rgba(0, 0, 0, 0.14)',
        }
      }
      selectable={false}
    >
      {menuItems.map((item, index) => (
        <Menu.Item
          key={item.key}
          className={clsx(
            'px-12 h-[44px] bg-r-neutral-card1 flex items-center',
            index < menuItems.length - 1 &&
              'border-b-[0.5px] border-solid border-rabby-neutral-line'
          )}
          onClick={item.onClick}
        >
          <div className="flex items-center gap-[6px]">
            {item.icon}
            <span className={item.labelClassName}>{item.label}</span>
          </div>
        </Menu.Item>
      ))}
    </Menu>
  );

  return (
    <div className="flex items-center gap-20 absolute bottom-0 right-0">
      <Dropdown overlay={menu} mouseLeaveDelay={0.3}>
        <RcIconMore viewBox="0 0 20 20" className="w-20 h-20 cursor-pointer" />
      </Dropdown>
    </div>
  );
};
