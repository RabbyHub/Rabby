import React from 'react';
import clsx from 'clsx';
import { message } from 'antd';
import { useMemoizedFn } from 'ahooks';
import { useTranslation } from 'react-i18next';
import { useHistory, useLocation } from 'react-router-dom';
import browser from 'webextension-polyfill';
import { useWallet } from '@/ui/utils';
import { copyAddress } from '@/ui/utils/clipboard';
import { ellipsisAddress } from '@/ui/utils/address';
import { getUiType } from '@/ui/utils';
import { ReactComponent as RcRabbyLogo } from '@/ui/assets/logo-rabby-large.svg';
import {
  RcCreateAddressSuccessCopyIcon,
  RcCreateAddressSuccessIcon,
} from '@/ui/assets/add-address';
import type { AddAddressNavigateHandler } from './shared';
import type {
  CreateAddressSuccessAddress,
  CreateAddressSuccessState,
} from './useCreateAddress';

const normalizeSuccessAddresses = (
  state: CreateAddressSuccessState
): CreateAddressSuccessAddress[] => {
  if (state.addresses?.length) {
    return state.addresses;
  }

  if (state.address) {
    return [
      {
        address: state.address,
        alias: state.alias || '',
      },
    ];
  }

  return [];
};

export const ImportAddressSuccess: React.FC<{
  isInModal?: boolean;
  onNavigate?: AddAddressNavigateHandler;
  state?: Record<string, any>;
}> = ({ isInModal, onNavigate, state: outerState }) => {
  const history = useHistory();
  const location = useLocation<CreateAddressSuccessState>();
  const wallet = useWallet();
  const { t } = useTranslation();

  const state = (outerState ||
    location.state ||
    {}) as CreateAddressSuccessState;
  const addresses = React.useMemo(() => normalizeSuccessAddresses(state), [
    state,
  ]);
  const [items, setItems] = React.useState<CreateAddressSuccessAddress[]>(
    addresses
  );
  const [pendingAction, setPendingAction] = React.useState(false);
  const inputRefs = React.useRef<Record<string, HTMLInputElement | null>>({});
  const committedAliasRef = React.useRef<Record<string, string>>({});

  React.useEffect(() => {
    setItems(addresses);
    committedAliasRef.current = Object.fromEntries(
      addresses.map((item) => [item.address.toLowerCase(), item.alias || ''])
    );
  }, [addresses]);

  React.useEffect(() => {
    let mounted = true;

    Promise.all(
      addresses.map(async (item) => {
        if (item.alias) {
          return item;
        }

        const alias = await wallet.getAlianName(item.address);
        return {
          ...item,
          alias: alias || '',
        };
      })
    ).then((nextItems) => {
      if (!mounted) {
        return;
      }

      setItems(nextItems);
      committedAliasRef.current = Object.fromEntries(
        nextItems.map((item) => [item.address.toLowerCase(), item.alias || ''])
      );
    });

    return () => {
      mounted = false;
    };
  }, [addresses, wallet]);

  React.useLayoutEffect(() => {
    const firstAddress = addresses[0]?.address?.toLowerCase();
    if (!firstAddress) {
      return;
    }

    const input = inputRefs.current[firstAddress];
    if (!input) {
      return;
    }

    input.focus();
    const length = input.value.length;
    input.setSelectionRange(length, length);
  }, [addresses]);

  const commitAlias = useMemoizedFn(async (address: string) => {
    const addressKey = address.toLowerCase();
    const item = items.find(
      (currentItem) => currentItem.address.toLowerCase() === addressKey
    );
    if (!item) {
      return;
    }

    const committedAlias = committedAliasRef.current[addressKey] || '';
    const nextAlias = item.alias.trim() || committedAlias;
    if (!nextAlias || nextAlias === committedAlias) {
      setItems((prev) =>
        prev.map((currentItem) =>
          currentItem.address.toLowerCase() === addressKey
            ? {
                ...currentItem,
                alias: committedAlias,
              }
            : currentItem
        )
      );
      return;
    }

    await wallet.updateAlianName(addressKey, nextAlias);
    committedAliasRef.current[addressKey] = nextAlias;
    setItems((prev) =>
      prev.map((currentItem) =>
        currentItem.address.toLowerCase() === addressKey
          ? {
              ...currentItem,
              alias: nextAlias,
            }
          : currentItem
      )
    );
  });

  const commitAllAliases = useMemoizedFn(async () => {
    await Promise.all(items.map((item) => commitAlias(item.address)));
  });

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
        <RcRabbyLogo className="h-[44px] w-[152px]" />
      </div>
      <div className="mx-auto mt-[8px] h-[586px] w-[600px] rounded-[8px] bg-r-neutral-card-1 px-[120px] pb-[32px] pt-[32px]">
        <div className="flex flex-col items-center">
          <RcCreateAddressSuccessIcon className="h-[40px] w-[40px]" />
          <div className="mt-[16px] text-center text-[24px] font-medium leading-[29px] text-r-neutral-title-1">
            {t('page.newAddress.addressAddedCount', {
              count: addresses.length,
            })}
          </div>
          <div className="mt-[8px] text-center text-[15px] leading-[18px] text-r-neutral-foot">
            {t(
              state.descriptionKey ||
                'page.newAddress.openExtensionToGetStarted'
            )}
          </div>
        </div>

        <div className="mt-[24px] flex flex-col gap-[12px]">
          {items.map((item, index) => (
            <div
              key={item.address}
              className="h-[64px] rounded-[8px] border border-rabby-neutral-line px-[7px] py-[5px]"
            >
              <div className="flex h-[30px] items-center rounded-[4px] bg-r-neutral-card-2 px-[8px]">
                <input
                  ref={(node) => {
                    inputRefs.current[item.address.toLowerCase()] = node;
                  }}
                  value={item.alias}
                  onChange={(e) => {
                    const nextAlias = e.target.value;
                    setItems((prev) =>
                      prev.map((currentItem) =>
                        currentItem.address === item.address
                          ? {
                              ...currentItem,
                              alias: nextAlias,
                            }
                          : currentItem
                      )
                    );
                  }}
                  onBlur={() => {
                    commitAlias(item.address);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      commitAlias(item.address);
                      if (index < items.length - 1) {
                        inputRefs.current[
                          items[index + 1].address.toLowerCase()
                        ]?.focus();
                      }
                    }
                  }}
                  className="w-full border-none bg-transparent text-[15px] font-medium leading-[18px] text-r-neutral-title-1 outline-none"
                />
              </div>

              <div className="flex h-[28px] items-center px-[8px]">
                <div className="text-[13px] leading-[16px] text-r-neutral-foot">
                  {ellipsisAddress(item.address)}
                </div>
                <button
                  type="button"
                  className="ml-[4px] h-[14px] w-[14px] shrink-0"
                  onClick={() => copyAddress(item.address)}
                >
                  <RcCreateAddressSuccessCopyIcon className="h-[14px] w-[14px]" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-[94px]">
          <button
            type="button"
            disabled={pendingAction}
            className={clsx(
              'h-[44px] w-full rounded-[8px] bg-r-blue-default text-[15px] font-medium leading-[18px] text-r-neutral-bg-1',
              pendingAction && 'opacity-50'
            )}
            onClick={handleOpenWallet}
          >
            {t('page.newUserImport.successful.openWallet')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImportAddressSuccess;
