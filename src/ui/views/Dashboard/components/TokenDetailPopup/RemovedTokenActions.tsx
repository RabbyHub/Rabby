import React, { useState } from 'react';
import { Button, Menu, message } from 'antd';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import styled from 'styled-components';
import { useRemovedTokens } from '@/ui/hooks/useRemovedTokens';
import { TooltipWithMagnetArrow } from '@/ui/component/Tooltip/TooltipWithMagnetArrow';
import DropdownWithMask from '@/ui/component/DropdownWithMask';
import { ReactComponent as RcIconMore } from '@/ui/assets/desktop/profile/more-cc.svg';

export type RemovedTokenAction = {
  key: string;
  title: string;
  Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  iconSize?: 20 | 24;
  iconClassName?: string;
  onClick: () => void;
  disabled?: boolean;
  disabledReason?: string;
};

const MoreActionsMenu = styled(Menu)`
  &.ant-dropdown-menu {
    background: linear-gradient(
      68.5094deg,
      rgba(var(--r-neutral-bg-1-rgb), 1) 3.7701%,
      rgba(var(--r-neutral-bg-1-rgb), 0.9) 67.021%
    );
  }
`;

/** Keeps restoration visible and folds the existing token actions into More. */
export const RemovedTokenActions = ({
  token,
  actions,
}: {
  token: { id: string; chain: string };
  actions: RemovedTokenAction[];
}) => {
  const { t } = useTranslation();
  const removeRemovedToken = useRemovedTokens(
    (state) => state.removeRemovedToken
  );
  const [restoring, setRestoring] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  const handleRestore = async () => {
    setRestoring(true);
    try {
      await removeRemovedToken({ tokenId: token.id, chain: token.chain });
    } catch (error) {
      console.error('Restore removed token failed:', error);
      message.error(t('page.dashboard.tokenDetail.removed.restoreFailed'));
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div className="relative flex items-center shrink-0 gap-8 px-20 py-14 border-t-[0.5px] border-r-neutral-line bg-r-neutral-bg-2">
      <Button
        type="primary"
        className="flex-1 min-w-0 h-40 p-0 rounded-[8px] text-13 font-medium leading-16"
        loading={restoring}
        disabled={restoring}
        onClick={handleRestore}
      >
        {t('page.dashboard.tokenDetail.removed.restore')}
      </Button>
      <DropdownWithMask
        trigger={['click']}
        placement="topRight"
        align={{ offset: [0, -8] }}
        open={moreOpen}
        onOpenChange={setMoreOpen}
        overlay={
          <MoreActionsMenu
            className="w-[260px] p-0 overflow-hidden border border-r-neutral-bg-1 rounded-[16px] backdrop-blur-[14.5px] shadow-[0_18px_40px_rgba(55,56,63,0.04)]"
            items={actions.map((action) => ({
              key: action.key,
              disabled: action.disabled,
              className: clsx(
                'px-20 py-16 rounded-none text-r-neutral-title-1 text-15 font-semibold leading-[22px]',
                action.disabled
                  ? 'opacity-50'
                  : 'hover:bg-r-blue-light-1 active:bg-r-blue-light-2 active:text-r-blue-default [&.ant-dropdown-menu-item-active]:bg-r-blue-light-1 [&.ant-dropdown-menu-item-active:active]:bg-r-blue-light-2'
              ),
              onClick: () => {
                setMoreOpen(false);
                action.onClick();
              },
              label: (
                <TooltipWithMagnetArrow
                  title={action.disabledReason || ''}
                  visible={action.disabledReason ? undefined : false}
                  overlayClassName="rectangle w-[max-content]"
                >
                  <span className="flex items-center gap-16">
                    <span className="shrink-0 w-20 h-20">
                      <action.Icon
                        className={clsx(
                          'block origin-top-left',
                          action.iconSize === 24
                            ? 'w-24 h-24 scale-[0.8333333333]'
                            : 'w-20 h-20',
                          action.iconClassName
                        )}
                      />
                    </span>
                    <span>{action.title}</span>
                  </span>
                </TooltipWithMagnetArrow>
              ),
            }))}
          />
        }
      >
        <button
          type="button"
          className={clsx(
            'flex items-center justify-center shrink-0 w-40 h-40 p-0 border rounded-[8px] bg-r-neutral-bg-1 cursor-pointer',
            'hover:border-r-blue-default hover:text-r-blue-default active:border-r-blue-default active:bg-r-blue-light-2 active:text-r-blue-default',
            'focus-visible:outline-2 focus-visible:outline-r-blue-default focus-visible:outline-offset-2',
            'border-r-neutral-line text-r-neutral-body'
          )}
          aria-label={t('page.dashboard.tokenDetail.removed.more')}
          aria-haspopup="menu"
          aria-expanded={moreOpen}
        >
          <RcIconMore className="block scale-[1.2]" />
        </button>
      </DropdownWithMask>
    </div>
  );
};
