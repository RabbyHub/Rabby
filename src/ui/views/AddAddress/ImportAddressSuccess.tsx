import React from 'react';
import clsx from 'clsx';
import { Button, message } from 'antd';
import { useMemoizedFn } from 'ahooks';
import { useTranslation } from 'react-i18next';
import { useHistory, useLocation } from 'react-router-dom';
import browser from 'webextension-polyfill';
import { getUiType } from '@/ui/utils';
import { ReactComponent as RcRabbyLogo } from '@/ui/assets/logo-rabby-large.svg';
import { RcCreateAddressSuccessIcon } from '@/ui/assets/add-address';
import type { AddAddressNavigateHandler } from './shared';
import type { CreateAddressSuccessState } from './useCreateAddress';
import {
  normalizeSuccessAddresses,
  SuccessAddressCards,
  useEditableSuccessAddresses,
} from './SuccessAddressCards';

export const ImportAddressSuccess: React.FC<{
  isInModal?: boolean;
  onNavigate?: AddAddressNavigateHandler;
  state?: Record<string, any>;
}> = ({ isInModal, onNavigate, state: outerState }) => {
  const history = useHistory();
  const location = useLocation<CreateAddressSuccessState>();
  const { t } = useTranslation();

  const state = (outerState ||
    location.state ||
    {}) as CreateAddressSuccessState;
  const addresses = React.useMemo(() => normalizeSuccessAddresses(state), [
    state,
  ]);
  const title =
    state.title ||
    t('page.newAddress.addressAddedCount', {
      count: addresses.length,
    });
  const description =
    state.description || t('page.newAddress.openExtensionToGetStarted');
  const [pendingAction, setPendingAction] = React.useState(false);
  const {
    items,
    setItems,
    inputRefs,
    commitAlias,
    commitAllAliases,
  } = useEditableSuccessAddresses(addresses);

  const handleOpenWallet = useMemoizedFn(async () => {
    try {
      setPendingAction(true);
      await commitAllAliases();
      // await wallet.setPageStateCache({
      //   path: '/dashboard',
      //   params: {},
      //   states: {},
      // });
      const uiType = getUiType();

      if (browser.action.openPopup) {
        try {
          if (onNavigate) {
            onNavigate('done');
          } else if (uiType.isTab) {
            window.close();
            await browser.action.openPopup();
          }
          return;
        } catch (error) {
          console.error('[ImportAddressSuccess] openPopup failed', error);
        }
      }

      if (onNavigate) {
        onNavigate('done');
      } else {
        history.push('/dashboard');
      }
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : 'Failed to open wallet'
      );
    } finally {
      setPendingAction(false);
    }
  });

  if (!addresses.length) {
    return null;
  }

  return (
    <div
      className={clsx(
        'bg-r-neutral-bg-2 min-h-full overflow-auto',
        isInModal ? 'h-[600px]' : 'h-full'
      )}
    >
      <div className="mx-auto w-[600px] pt-[114px]">
        <RcRabbyLogo viewBox="0 0 152 44" className="h-[42px] w-[152px]" />
      </div>
      <div className="mx-auto mt-[8px] h-[586px] w-[600px] rounded-[8px] bg-r-neutral-card-1 px-[120px] pb-[32px] pt-[32px]">
        <div className="flex flex-col items-center">
          <RcCreateAddressSuccessIcon className="h-[40px] w-[40px]" />
          <div className="mt-[16px] text-center text-[24px] font-medium leading-[29px] text-r-neutral-title-1">
            {title}
          </div>
          <div className="mt-[8px] text-center text-[15px] leading-[18px] text-r-neutral-foot">
            {description}
          </div>
        </div>

        <SuccessAddressCards
          items={items}
          setItems={setItems}
          inputRefs={inputRefs}
          onCommitAlias={commitAlias}
          listClassName="mt-[24px] flex flex-col gap-[12px]"
          cardClassName="h-[64px] rounded-[8px] border border-rabby-neutral-line px-[7px] py-[5px]"
          aliasWrapClassName="flex h-[30px] items-center rounded-[4px] bg-r-neutral-card-2 px-[8px]"
          aliasInputClassName="w-full border-none bg-transparent text-[15px] font-medium leading-[18px] text-r-neutral-title-1 outline-none"
          addressRowClassName="flex h-[28px] items-center px-[8px]"
          addressTextClassName="text-[13px] leading-[16px] text-r-neutral-foot"
          copyButtonClassName="ml-[4px] h-[14px] w-[14px] shrink-0"
          copyIconClassName="h-[14px] w-[14px]"
        />

        <div className="mt-[94px]">
          <Button
            type="primary"
            size="large"
            disabled={pendingAction}
            className="h-[44px] w-full rounded-[8px] text-[15px] font-medium leading-[18px]"
            onClick={handleOpenWallet}
          >
            {t('page.newUserImport.successful.openWallet')}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ImportAddressSuccess;
