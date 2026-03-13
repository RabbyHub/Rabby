import React from 'react';
import clsx from 'clsx';
import { useWallet } from '@/ui/utils';
import { useTranslation } from 'react-i18next';
import { useHistory, useLocation } from 'react-router-dom';
import { Button, message } from 'antd';
import { useMemoizedFn } from 'ahooks';
import browser from 'webextension-polyfill';
import {
  CreateAddressSuccessState,
  useCreateAddressActions,
} from './useCreateAddress';
import type { AddAddressNavigateHandler } from './shared';
import {
  RcCreateAddressSuccessIcon,
  RcCreateAddressSuccessArrowIcon,
} from '@/ui/assets/add-address';
import {
  normalizeSuccessAddresses,
  SuccessAddressCards,
  SuccessAddressCardsRef,
} from './SuccessAddressCards';

export const CreateAddressSuccess: React.FC<{
  isInModal?: boolean;
  onNavigate?: AddAddressNavigateHandler;
  state?: Record<string, any>;
}> = ({ isInModal, onNavigate, state: outerState }) => {
  const history = useHistory();
  const location = useLocation<CreateAddressSuccessState>();
  const wallet = useWallet();
  const { t } = useTranslation();
  const { openAddMoreAddressesPage } = useCreateAddressActions({
    onNavigate,
  });

  const state = (outerState ||
    location.state ||
    {}) as CreateAddressSuccessState;
  const title = state.title || t('page.newAddress.newSeedPhraseCreated');
  const description = state.description || '';
  const addresses = React.useMemo(() => normalizeSuccessAddresses(state), [
    state,
  ]);
  const successAddressCardsRef = React.useRef<SuccessAddressCardsRef>(null);
  const [pendingAction, setPendingAction] = React.useState<
    'done' | 'more' | null
  >(null);

  const handleDone = useMemoizedFn(async () => {
    try {
      setPendingAction('done');
      await successAddressCardsRef.current?.commitAllAliases();
      if (onNavigate) {
        onNavigate('done');
      } else {
        history.push('/dashboard');
      }
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : 'Failed to save alias'
      );
    } finally {
      setPendingAction(null);
    }
  });

  const handleOpenWallet = useMemoizedFn(async () => {
    try {
      setPendingAction('done');
      await successAddressCardsRef.current?.commitAllAliases();
      await wallet.setPageStateCache({
        path: '/dashboard',
        params: {},
        states: {},
      });

      if (browser.action.openPopup) {
        try {
          await browser.action.openPopup();
          return;
        } catch (error) {
          console.error('[CreateAddressSuccess] openPopup failed', error);
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
      setPendingAction(null);
    }
  });

  const handleAddMore = useMemoizedFn(async () => {
    if (!state.publicKey) {
      return;
    }

    try {
      setPendingAction('more');
      const nextItems =
        (await successAddressCardsRef.current?.commitAllAliases()) || addresses;
      openAddMoreAddressesPage({
        publicKey: state.publicKey,
        successState: {
          addresses: nextItems,
          publicKey: state.publicKey,
          title: state.title,
          description: state.description,
        },
      });
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : 'Failed to add address'
      );
    } finally {
      setPendingAction(null);
    }
  });

  if (!addresses.length) {
    return null;
  }

  return (
    <div
      className={clsx(
        'bg-r-neutral-bg-1 flex max-h-[600px] flex-col overflow-hidden px-[20px]',
        isInModal ? 'h-[600px]' : 'h-full min-h-full'
      )}
    >
      <div className="shrink-0 pt-[60px] flex flex-col items-center">
        <RcCreateAddressSuccessIcon className="w-[40px] h-[40px]" />
        <div className="mt-[16px] text-[24px] leading-[29px] font-medium text-r-neutral-title-1 text-center">
          {title}
        </div>
        {description ? (
          <div className="mt-[8px] text-[15px] leading-[18px] text-r-neutral-foot text-center">
            {description}
          </div>
        ) : null}
      </div>

      <div className="mt-[24px] min-h-0 flex-1 overflow-hidden">
        <div className="h-full overflow-auto pr-[2px]">
          <SuccessAddressCards
            ref={successAddressCardsRef}
            addresses={addresses}
          />
        </div>
      </div>

      <div className="shrink-0 pb-[20px] pt-[16px]">
        <Button
          type="primary"
          size="large"
          disabled={pendingAction !== null}
          className="w-full h-[44px] rounded-[8px] text-[13px] leading-[16px] font-medium"
          onClick={
            state.primaryAction === 'open-wallet'
              ? handleOpenWallet
              : handleDone
          }
        >
          {state.primaryAction === 'open-wallet'
            ? t('page.newUserImport.successful.openWallet')
            : t('global.Done')}
        </Button>

        {state.publicKey && state.primaryAction !== 'open-wallet' ? (
          <button
            type="button"
            disabled={pendingAction !== null}
            className={clsx(
              'mt-[14px] flex w-full items-center justify-center gap-[1px] text-[13px] leading-[16px] text-r-neutral-foot',
              pendingAction !== null && 'opacity-50'
            )}
            onClick={handleAddMore}
          >
            <span>
              {t('page.newAddress.addMoreAddressesFromThisSeedPhrase')}
            </span>
            <RcCreateAddressSuccessArrowIcon className="h-[16px] w-[16px]" />
          </button>
        ) : null}
      </div>
    </div>
  );
};
