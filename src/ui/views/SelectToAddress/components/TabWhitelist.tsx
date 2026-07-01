/* eslint "react-hooks/exhaustive-deps": ["error"] */
/* eslint-enable react-hooks/exhaustive-deps */
import React, { useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import { useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { Button, message, Switch } from 'antd';
import {
  closestCenter,
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  MeasuringStrategy,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { EmptyWhitelistHolder } from '../components/EmptyWhitelistHolder';
import { AccountItem } from '@/ui/component/AccountSelector/AccountItem';
import { ellipsisAddress } from '@/ui/utils/address';

import { getUiType, isSameAddress, useWallet } from '@/ui/utils';
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { groupBy } from 'lodash';
import { findAccountByPriority } from '@/utils/account';
import { padWatchAccount } from '../util';
import { IDisplayedAccountWithBalance } from '@/ui/models/accountToDisplay';

// icons
import { ReactComponent as RcIconDeleteAddress } from 'ui/assets/address/delete.svg';
import { ReactComponent as IconAdd } from '@/ui/assets/address/add.svg';
import IconSuccess from 'ui/assets/success.svg';
import qs from 'qs';

const WhitelistItemWrapper = styled.div`
  background-color: var(--r-neutral-card1);
  position: relative;
  border-radius: 12px;
  margin-top: 12px;

  &:first-child {
    margin-top: 0;
  }

  .whitelist-item {
    gap: 12px !important;
  }
  .icon-delete-container {
    display: flex;
    opacity: 0;
    &:hover {
      g {
        stroke: #ec5151;
      }
    }
  }
  &:hover {
    .icon-delete-container {
      opacity: 1;
    }
  }

  &.is-whitelist-item-dragging {
    .icon-delete-container,
    .edit-pen,
    .copy-icon {
      display: none !important;
      opacity: 0 !important;
      pointer-events: none !important;
    }
  }

  &.is-whitelist-item-drag-overlay {
    .whitelist-item {
      border-color: var(--r-blue-default, #7084ff) !important;
      background-color: var(--r-blue-light1, #eef1ff) !important;
    }
  }
`;

const isTab = getUiType().isTab;
const isDesktop = getUiType().isDesktop;
const getContainer =
  isTab || isDesktop ? '.js-rabby-popup-container' : undefined;

const DND_DISABLED_SELECTOR = '.icon-delete-container, .edit-pen, .copy-icon';

const handleDndDisabledPointerDownCapture: React.PointerEventHandler<HTMLDivElement> = (
  event
) => {
  const target = event.target;
  if (target instanceof Element && target.closest(DND_DISABLED_SELECTOR)) {
    event.stopPropagation();
  }
};

const WhitelistItemContent = ({
  item,
  onDelete,
  onSelect,
  suppressClickRef,
}: {
  item: IDisplayedAccountWithBalance;
  onDelete: (address: string) => void;
  onSelect: (account: IDisplayedAccountWithBalance) => void;
  suppressClickRef: React.MutableRefObject<boolean>;
}) => {
  return (
    <>
      <div
        className="absolute icon-delete-container w-[20px] left-[-20px] h-full top-0  justify-center items-center"
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
      >
        <RcIconDeleteAddress
          className="cursor-pointer w-[16px] h-[16px] icon icon-delete"
          onClick={(event) => {
            event.stopPropagation();
            onDelete(item.address);
          }}
        />
      </div>
      <AccountItem
        getContainer={getContainer}
        className="group whitelist-item"
        balance={0}
        showWhitelistIcon
        allowEditAlias
        hideBalance
        address={item.address}
        alias={ellipsisAddress(item.address)}
        type={item.type}
        brandName={item.brandName}
        onClick={() => {
          if (suppressClickRef.current) {
            return;
          }
          onSelect(item);
        }}
      />
    </>
  );
};

const StaticWhitelistItem = ({
  item,
  isFirstAfterPwdHint,
  onDelete,
  onSelect,
  suppressClickRef,
}: {
  item: IDisplayedAccountWithBalance;
  isFirstAfterPwdHint: boolean;
  onDelete: (address: string) => void;
  onSelect: (account: IDisplayedAccountWithBalance) => void;
  suppressClickRef: React.MutableRefObject<boolean>;
}) => {
  return (
    <WhitelistItemWrapper
      {...(isFirstAfterPwdHint && {
        style: { marginTop: 0 },
      })}
      onPointerDownCapture={handleDndDisabledPointerDownCapture}
    >
      <WhitelistItemContent
        item={item}
        onDelete={onDelete}
        onSelect={onSelect}
        suppressClickRef={suppressClickRef}
      />
    </WhitelistItemWrapper>
  );
};

const SortableWhitelistItem = ({
  id,
  item,
  isFirstAfterPwdHint,
  onDelete,
  onSelect,
  suppressClickRef,
}: {
  id: string;
  item: IDisplayedAccountWithBalance;
  isFirstAfterPwdHint: boolean;
  onDelete: (address: string) => void;
  onSelect: (account: IDisplayedAccountWithBalance) => void;
  suppressClickRef: React.MutableRefObject<boolean>;
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    cursor: isDragging ? 'grabbing' : 'grab',
    opacity: isDragging ? 0.4 : 1,
    ...(isFirstAfterPwdHint ? { marginTop: 0 } : {}),
  };

  return (
    <WhitelistItemWrapper
      ref={setNodeRef}
      style={style}
      className={clsx(isDragging && 'is-whitelist-item-dragging')}
      onPointerDownCapture={handleDndDisabledPointerDownCapture}
      {...attributes}
      {...listeners}
    >
      <WhitelistItemContent
        item={item}
        onDelete={onDelete}
        onSelect={onSelect}
        suppressClickRef={suppressClickRef}
      />
    </WhitelistItemWrapper>
  );
};

export default function TabWhitelist({
  unimportedBalances = {},
  handleChange,
  onManagePwdForNonWhitelistedTx,
}: {
  unimportedBalances: Record<string, number>;
  handleChange: (account: IDisplayedAccountWithBalance) => void;
  onManagePwdForNonWhitelistedTx: () => void;
}) {
  const history = useHistory();
  const dispatch = useRabbyDispatch();
  const wallet = useWallet();
  const { t } = useTranslation();

  const { accountsList, whitelist } = useRabbySelector((s) => ({
    accountsList: s.accountToDisplay.accountsList,
    whitelist: s.whitelist.whitelist,
  }));

  const importedWhitelistAccounts = useMemo<
    IDisplayedAccountWithBalance[]
  >(() => {
    const groupAccounts = groupBy(accountsList, (item) =>
      item.address.toLowerCase()
    );
    const uniqueAccounts = Object.values(groupAccounts).map((item) =>
      findAccountByPriority(item)
    ) as IDisplayedAccountWithBalance[];
    return [...uniqueAccounts].filter((a) =>
      whitelist?.some((w) => isSameAddress(w, a.address))
    );
  }, [accountsList, whitelist]);

  const importedWhitelistAccountMap = useMemo(() => {
    return importedWhitelistAccounts.reduce<
      Record<string, typeof importedWhitelistAccounts[number]>
    >((acc, item) => {
      acc[item.address.toLowerCase()] = item;
      return acc;
    }, {});
  }, [importedWhitelistAccounts]);

  const allAccounts = useMemo<IDisplayedAccountWithBalance[]>(() => {
    return (whitelist || []).map((address) => {
      const lowerAddress = address.toLowerCase();
      const importedAccount = importedWhitelistAccountMap[lowerAddress];

      if (importedAccount) {
        return importedAccount;
      }

      return {
        ...padWatchAccount(address),
        balance: unimportedBalances[lowerAddress],
      };
    });
  }, [importedWhitelistAccountMap, unimportedBalances, whitelist]);

  const sortableWhitelistIds = useMemo(
    () => (whitelist || []).map((address) => address.toLowerCase()),
    [whitelist]
  );

  const canSortWhitelist = useMemo(() => {
    return (
      allAccounts.length > 1 &&
      new Set(sortableWhitelistIds).size === sortableWhitelistIds.length
    );
  }, [allAccounts.length, sortableWhitelistIds]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeOverlayWidth, setActiveOverlayWidth] = useState<number | null>(
    null
  );

  const activeWhitelistItem = useMemo(() => {
    if (!activeId) {
      return null;
    }

    const activeIndex = sortableWhitelistIds.findIndex((id) => id === activeId);
    if (activeIndex === -1) {
      return null;
    }

    return allAccounts[activeIndex] || null;
  }, [activeId, allAccounts, sortableWhitelistIds]);

  const suppressClickRef = useRef(false);
  const resetSuppressClick = () => {
    window.setTimeout(() => {
      suppressClickRef.current = false;
    }, 0);
  };

  const resetActiveDragState = () => {
    setActiveId(null);
    setActiveOverlayWidth(null);
  };

  const handleDragStart = (event: DragStartEvent) => {
    suppressClickRef.current = true;
    setActiveId(String(event.active.id));
    setActiveOverlayWidth(event.active.rect.current.initial?.width ?? null);
  };

  const handleDragCancel = () => {
    resetActiveDragState();
    resetSuppressClick();
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    resetActiveDragState();

    if (!over || active.id === over.id) {
      resetSuppressClick();
      return;
    }

    const activeId = String(active.id);
    const overId = String(over.id);
    const oldIndex = sortableWhitelistIds.findIndex((id) => id === activeId);
    const newIndex = sortableWhitelistIds.findIndex((id) => id === overId);

    if (oldIndex === -1 || newIndex === -1) {
      resetSuppressClick();
      return;
    }

    const nextWhitelist = [...whitelist];
    const [removed] = nextWhitelist.splice(oldIndex, 1);
    nextWhitelist.splice(newIndex, 0, removed);

    dispatch.whitelist.updateWhitelistOrder(nextWhitelist);
    resetSuppressClick();
  };

  const handleDeleteWhitelist = async (address: string) => {
    await wallet.removeWhitelist(address);
    const isImported = importedWhitelistAccounts.some((a) =>
      isSameAddress(a.address, address)
    );
    if (!isImported) {
      await wallet.removeContactInfo(address);
    } else {
      const cexId = await wallet.getCexId(address);
      if (cexId) {
        await wallet.updateCexId(address, '');
      }
    }
    dispatch.whitelist.getWhitelist();
    dispatch.contactBook.getContactBookAsync();
    message.success({
      icon: <img src={IconSuccess} className="icon icon-success" />,
      content: t('page.whitelist.tips.removed'),
    });
  };

  const isEnabledPwdForNonWhitelistedTx = useRabbySelector(
    (state) => state.preference.isEnabledPwdForNonWhitelistedTx
  );

  return (
    <div className="h-full static">
      {isEnabledPwdForNonWhitelistedTx && (
        <div className="flex-1 overflow-y-auto px-[20px] mb-[12px]">
          <div className="flex justify-between items-center px-[10px] py-[8px] bg-r-yellow-light rounded-[8px] bg-r-neutral-card1">
            <span className="text-[13px] font-normal text-r-neutral-title1">
              {t(
                'page.selectToAddress.whitelist.PwdForNonWhitelistedTx.enabledHint'
              )}
            </span>

            <Switch
              checked={isEnabledPwdForNonWhitelistedTx}
              onChange={() => {
                onManagePwdForNonWhitelistedTx();
              }}
            />
          </div>
        </div>
      )}

      {/* WhiteList or Imported Addresses List */}
      <div
        className="flex-1 overflow-y-auto px-[20px]"
        style={{ paddingBottom: 84 }}
      >
        <div className="h-full">
          {allAccounts.length > 0 ? (
            canSortWhitelist ? (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                measuring={{
                  droppable: { strategy: MeasuringStrategy.Always },
                }}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDragCancel={handleDragCancel}
                autoScroll={{
                  threshold: {
                    x: 0,
                    y: 0.2,
                  },
                  acceleration: 10,
                }}
              >
                <SortableContext
                  items={sortableWhitelistIds}
                  strategy={verticalListSortingStrategy}
                >
                  {allAccounts.map((item, index) => (
                    <SortableWhitelistItem
                      key={sortableWhitelistIds[index]}
                      id={sortableWhitelistIds[index]}
                      item={item}
                      isFirstAfterPwdHint={
                        index === 0 && !!isEnabledPwdForNonWhitelistedTx
                      }
                      onDelete={handleDeleteWhitelist}
                      onSelect={handleChange}
                      suppressClickRef={suppressClickRef}
                    />
                  ))}
                </SortableContext>
                <DragOverlay
                  dropAnimation={{
                    duration: 200,
                    easing: 'ease',
                  }}
                  style={{
                    cursor: 'grabbing',
                  }}
                >
                  {activeWhitelistItem ? (
                    <WhitelistItemWrapper
                      className="is-whitelist-item-dragging is-whitelist-item-drag-overlay"
                      style={{
                        marginTop: 0,
                        width: activeOverlayWidth ?? undefined,
                        pointerEvents: 'none',
                      }}
                    >
                      <WhitelistItemContent
                        item={activeWhitelistItem}
                        onDelete={() => {}}
                        onSelect={() => {}}
                        suppressClickRef={suppressClickRef}
                      />
                    </WhitelistItemWrapper>
                  ) : null}
                </DragOverlay>
              </DndContext>
            ) : (
              allAccounts.map((item, index) => (
                <StaticWhitelistItem
                  key={`${item.address}-${item.type}-${index}`}
                  item={item}
                  isFirstAfterPwdHint={
                    index === 0 && !!isEnabledPwdForNonWhitelistedTx
                  }
                  onDelete={handleDeleteWhitelist}
                  onSelect={handleChange}
                  suppressClickRef={suppressClickRef}
                />
              ))
            )
          ) : (
            <EmptyWhitelistHolder
              onAddWhitelist={async () => {
                if (getUiType().isDesktop) {
                  const query = new URLSearchParams(history.location.search);
                  query.set('sendPageType', 'whitelistInput');
                  query.set('action', 'send');
                  wallet.openInDesktop(`desktop/profile?${query.toString()}`, {
                    triggerFocusEventOnDesktop: false,
                  });
                } else {
                  history.push('/whitelist-input');
                }
              }}
            />
          )}
        </div>
      </div>
      {/* Add Whitelist Entry */}

      {allAccounts.length > 0 && (
        <div className="select-to-address-tab-fixed-bottom">
          <div className="px-[20px] w-full">
            <Button
              onClick={() => {
                if (isDesktop) {
                  history.push(
                    `${history.location.pathname}?${qs.stringify({
                      action: 'send',
                      sendPageType: 'whitelistInput',
                    })}`
                  );
                } else {
                  history.push('/whitelist-input');
                }
              }}
              type="primary"
              className={clsx(
                'bg-transparent w-full shadow-none h-[48px] border-rabby-blue-default hover:before:hidden'
              )}
            >
              <div className="flex items-center justify-center space-x-6 text-r-blue-default">
                <IconAdd />
                <span
                  className="text-[13px] font-medium"
                  style={{
                    textShadow: 'none',
                  }}
                >
                  {t('page.selectToAddress.whitelist.addWhitelist')}
                </span>
              </div>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
