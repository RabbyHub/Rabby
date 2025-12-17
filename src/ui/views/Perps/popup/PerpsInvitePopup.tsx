import IconRabbyWallet from '@/ui/assets/icon-rabby-circle.svg';
import IconHyperliquid from '@/ui/assets/perps/icon-hyperliquid.svg';
import Popup from '@/ui/component/Popup';
import { useRabbySelector } from '@/ui/store';
import { useWallet } from '@/ui/utils';
import { useMemoizedFn, useRequest } from 'ahooks';
import { Button, message } from 'antd';
import clsx from 'clsx';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { ReactComponent as RcIconCloseCC } from 'ui/assets/component/close-cc.svg';
import { checkPerpsReference } from '../utils';
import { KEYRING_CLASS } from '@/constant';

export const PerpsInvitePopup: React.FC<{
  onInvite?: () => void | Promise<void>;
}> = ({ onInvite }) => {
  const { t } = useTranslation();
  const [visible, setVisible] = React.useState(false);

  const currentPerpsAccount = useRabbySelector(
    (store) => store.perps.currentPerpsAccount
  );
  const wallet = useWallet();

  useRequest(
    async () => {
      if (
        currentPerpsAccount?.type === KEYRING_CLASS.MNEMONIC ||
        currentPerpsAccount?.type === KEYRING_CLASS.PRIVATE_KEY
      ) {
        return false;
      }
      return checkPerpsReference({
        wallet,
        account: currentPerpsAccount,
      });
    },
    {
      refreshDeps: [currentPerpsAccount],
      ready: !!currentPerpsAccount?.address,
      onSuccess: (shouldShow) => {
        if (shouldShow) {
          setVisible(true);
          wallet.setPerpsInviteConfig(currentPerpsAccount?.address || '', {
            lastInvitedAt: Date.now(),
          });
        }
      },
    }
  );

  const handleActivate = useMemoizedFn(async () => {
    await onInvite?.();
    setVisible(false);
    message.success(t('page.perps.invitePopup.activatedSuccess'));
  });

  return (
    <Popup
      closable
      placement="bottom"
      visible={visible}
      onCancel={async () => {
        setVisible(false);
      }}
      height={'fit-content'}
      bodyStyle={{
        padding: 0,
        background: 'var(--r-neutral-bg2, #F2F4F7)',
        borderRadius: '16px 16px 0 0',
      }}
      closeIcon={
        <RcIconCloseCC className="w-[20px] h-[20px] text-r-neutral-foot mt-[-2px]" />
      }
      destroyOnClose
      isSupportDarkMode
    >
      <div className="flex flex-col h-full px-[20px] pb-[24px]">
        <div
          className={clsx(
            'text-[20px] leading-[24px] font-medium text-r-neutral-title-1',
            'flex justify-center text-center items-center py-[16px]'
          )}
        >
          {t('page.perps.invitePopup.title')}
        </div>

        <div
          className={clsx(
            'border-[0.5px] border-rabby-neutral-line bg-r-neutral-card-1 rounded-[8px]',
            'flex flex-col items-center',
            'px-[20px] pb-[20px]'
          )}
        >
          <div
            className={clsx(
              'flex items-center justify-center gap-[8px] px-[12px] py-[5px]',
              'rounded-b-[8px] bg-r-neutral-card-2',
              'text-[12px] leading-[14px] text-r-neutral-body'
            )}
          >
            <div className="flex items-center gap-[4px]">
              <img src={IconHyperliquid} className="w-[14px] h-[14px]" alt="" />
              Hyperliquid
            </div>
            <RcIconCloseCC
              viewBox="0 0 20 20"
              className="w-[14px] h-[14px] opacity-50 text-r-neutral-foot"
            />
            <div className="flex items-center gap-[4px]">
              <img src={IconRabbyWallet} className="w-[14px] h-[14px]" alt="" />
              Rabby Wallet
            </div>
          </div>
          <div className="mt-[20px] text-[13px] leading-[16px] text-r-neutral-foot">
            Use Rabby’s code to enable
          </div>
          <div className="relative my-[8px]">
            <div className="flex items-end gap-[6px] relative z-10 pl-[10px] pr-[6px]">
              <div className="text-[44px] leading-[53px] font-bold text-r-blue-default">
                4%
              </div>
              <div className="text-[22px] leading-[30px] font-bold text-r-blue-default pb-[6px]">
                off
              </div>
            </div>
            <div className="absolute left-0 right-0 bottom-[8px] h-[10px] bg-r-blue-light1"></div>
          </div>
          <div className="text-[18px] leading-[21px] font-medium text-r-neutral-title-1">
            Hyperliquid trading fees.
          </div>
          <Button
            type="primary"
            block
            className="mt-[24px] h-[44px] text-[15px] font-medium rounded-[8px]"
            onClick={handleActivate}
          >
            Activate Now
          </Button>
        </div>
      </div>
    </Popup>
  );
};
