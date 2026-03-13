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
import { IMPORT_ADDRESS_SUCCESS_RETURN_TO_QUERY_KEY as RETURN_TO_QUERY_KEY } from './useCreateAddress';
import type { CreateAddressSuccessState } from './useCreateAddress';
import {
  normalizeSuccessAddresses,
  SuccessAddressCards,
  SuccessAddressCardsRef,
} from './SuccessAddressCards';
import { BRAND_ALIAN_TYPE_TEXT } from '@/constant';
import { ReactComponent as RcIconExternalCC } from '@/ui/assets/new-user-import/external-cc.svg';

export const ImportAddressSuccess: React.FC<{
  isInModal?: boolean;
  onNavigate?: AddAddressNavigateHandler;
  state?: Record<string, any>;
}> = ({ isInModal, onNavigate, state: outerState }) => {
  const history = useHistory();
  const location = useLocation<CreateAddressSuccessState>();
  const { t } = useTranslation();
  const returnToSelectAddressSearchFromQuery = React.useMemo(() => {
    const query = new URLSearchParams(location.search);
    return query.get(RETURN_TO_QUERY_KEY) || '';
  }, [location.search]);

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
  const returnToSelectAddressSearch =
    returnToSelectAddressSearchFromQuery || state.returnToSelectAddressSearch;

  const addMoreSourceName = React.useMemo(() => {
    const query = new URLSearchParams(returnToSelectAddressSearch);
    const brand = query.get('brand') || '';
    const hd = query.get('hd') || '';

    return (
      BRAND_ALIAN_TYPE_TEXT?.[brand] ||
      BRAND_ALIAN_TYPE_TEXT?.[hd] ||
      brand ||
      hd
    );
  }, [returnToSelectAddressSearch]);
  const successAddressCardsRef = React.useRef<SuccessAddressCardsRef>(null);
  const [pendingAction, setPendingAction] = React.useState(false);

  const handleOpenWallet = useMemoizedFn(async () => {
    try {
      setPendingAction(true);
      await successAddressCardsRef.current?.commitAllAliases();
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

  const handleImportMore = useMemoizedFn(async () => {
    if (!returnToSelectAddressSearch) {
      return;
    }

    try {
      setPendingAction(true);
      await successAddressCardsRef.current?.commitAllAliases();
      history.replace({
        pathname: '/import/select-address',
        search: returnToSelectAddressSearch,
      });
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : 'Failed to continue import'
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
      <div className="mx-auto mt-[8px] flex h-[586px] w-[600px] flex-col rounded-[8px] bg-r-neutral-card-1 px-[120px] pb-[32px] pt-[32px]">
        <div className="shrink-0 flex flex-col items-center">
          <RcCreateAddressSuccessIcon className="h-[40px] w-[40px]" />
          <div className="mt-[16px] text-center text-[24px] font-medium leading-[29px] text-r-neutral-title-1">
            {title}
          </div>
          <div className="mt-[8px] text-center text-[15px] leading-[18px] text-r-neutral-foot">
            {description}
          </div>
        </div>

        <div className="mt-[24px] min-h-0 flex-1 overflow-hidden">
          <SuccessAddressCards
            ref={successAddressCardsRef}
            addresses={addresses}
          />
        </div>

        <div className="shrink-0 pt-[16px]">
          <Button
            type="primary"
            size="large"
            disabled={pendingAction}
            className="h-[44px] w-full rounded-[8px] text-[15px] font-medium leading-[18px]"
            onClick={handleOpenWallet}
          >
            {t('page.newUserImport.successful.openWallet')}
          </Button>

          {returnToSelectAddressSearch ? (
            <div
              className="w-full flex items-center justify-center gap-2 text-[13px] leading-[16px] text-r-neutral-foot mt-[16px] cursor-pointer"
              onClick={handleImportMore}
            >
              <span>
                {t('page.newUserImport.successful.addMoreFrom', {
                  name: addMoreSourceName,
                })}
              </span>
              <RcIconExternalCC className="h-[16px] w-[16px]" />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default ImportAddressSuccess;
