import React from 'react';
import clsx from 'clsx';
import { useHistory } from 'react-router-dom';
import { formatUsdValue } from '@/ui/utils';
import { ellipsisAddress } from '@/ui/utils/address';
import { UseSeedPhrase } from '@/ui/views/AddFromCurrentSeedPhrase/hooks';
import {
  DisplayedAccount,
  TypeKeyringGroup,
} from '@/ui/views/ManageAddress/hooks';
import { useTranslation } from 'react-i18next';
import { message } from 'antd';
import { useMemoizedFn } from 'ahooks';
import { useCreateAddressActions } from './useCreateAddress';
import {
  RcAddNewAddressBackIcon,
  RcAddNewAddressChevronIcon,
  RcAddNewAddressCreateSeedIcon,
  RcAddNewAddressSeedBaseIcon,
  RcAddNewAddressSeedInnerIcon,
  RcAddNewAddressSeedLineIcon,
  RcAddNewAddressAddBgIcon,
  RcAddNewAddressAddVerticalIcon,
  RcAddNewAddressAddHorizontalIcon,
  RcAddNewAddressCopyFrontIcon,
  RcAddNewAddressCopyBackIcon,
} from '@/ui/assets/add-address';

const MAX_VISIBLE_ADDRESSES = 3;

type SeedPhraseGroupView = TypeKeyringGroup & {
  key: string;
  totalBalance: number;
  sortedAccounts: DisplayedAccount[];
};

const SeedPhraseIcon = () => {
  return (
    <div className="relative w-[20px] h-[20px] shrink-0 overflow-hidden">
      <RcAddNewAddressSeedBaseIcon className="absolute left-1/2 top-1/2 w-[16px] h-[16px] -translate-x-1/2 -translate-y-1/2" />
      <RcAddNewAddressSeedInnerIcon className="absolute left-1/2 top-[9.5px] w-[6.22px] h-[7px] -translate-x-1/2 -translate-y-1/2" />
      <RcAddNewAddressSeedLineIcon className="absolute left-1/2 top-[11.44px] w-[4.82px] h-[1.26px] -translate-x-1/2 -translate-y-1/2" />
    </div>
  );
};

const AddIcon = () => {
  return (
    <div className="relative w-[16px] h-[16px] shrink-0 rounded-[2.857px]">
      <RcAddNewAddressAddBgIcon className="absolute left-1/2 top-1/2 w-[12.8px] h-[12.8px] -translate-x-1/2 -translate-y-1/2" />
      <RcAddNewAddressAddVerticalIcon className="absolute left-1/2 top-1/2 w-[1px] h-[6.4px] -translate-x-1/2 -translate-y-1/2" />
      <RcAddNewAddressAddHorizontalIcon className="absolute left-1/2 top-1/2 w-[6.4px] h-[1px] -translate-x-1/2 -translate-y-1/2" />
    </div>
  );
};

const CopyIcon = ({ className }: { className?: string }) => {
  return (
    <div className={clsx('relative w-[14px] h-[14px] shrink-0', className)}>
      <RcAddNewAddressCopyFrontIcon className="absolute left-[calc(50%+1.17px)] top-[calc(50%-1.17px)] w-[8.75px] h-[8.75px] -translate-x-1/2 -translate-y-1/2" />
      <RcAddNewAddressCopyBackIcon className="absolute left-[calc(50%-1.17px)] top-[calc(50%+1.17px)] w-[8.75px] h-[8.75px] -translate-x-1/2 -translate-y-1/2" />
    </div>
  );
};

const Chevron = ({
  expanded,
  className,
}: {
  expanded: boolean;
  className?: string;
}) => {
  return (
    <RcAddNewAddressChevronIcon
      className={clsx(
        'w-[20px] h-[20px] shrink-0 transition-transform',
        expanded ? '-rotate-90' : 'rotate-90',
        className
      )}
    />
  );
};

const Header = ({ title, onBack }: { title: string; onBack: () => void }) => {
  return (
    <div className="sticky top-0 z-10 bg-r-neutral-bg-2 px-[20px] pb-[11px]">
      <div className="relative h-[48px] flex items-center justify-center">
        <button
          type="button"
          onClick={onBack}
          className="absolute left-0 w-[20px] h-[20px] flex items-center justify-center"
        >
          <RcAddNewAddressBackIcon className="w-[20px] h-[20px]" />
        </button>
        <div className="text-[20px] leading-[24px] font-medium text-r-neutral-title-1">
          {title}
        </div>
      </div>
    </div>
  );
};

const AccountRow = ({ account }: { account: DisplayedAccount }) => {
  return (
    <div className="flex items-center py-[8px]">
      <SeedPhraseIcon />
      <div className="ml-[8px] min-w-0 flex-1">
        <div className="text-[13px] leading-[16px] font-medium text-r-neutral-title-1 truncate">
          {account.alianName || ellipsisAddress(account.address)}
        </div>
        <div className="mt-[2px] flex items-center text-[12px] leading-[14px] text-r-neutral-body">
          <span>{ellipsisAddress(account.address)}</span>
          <CopyIcon className="ml-[4px]" />
        </div>
      </div>
      <div className="ml-[12px] text-[12px] leading-[14px] text-r-neutral-body text-right">
        {formatUsdValue(account.balance || 0)}
      </div>
    </div>
  );
};

const SeedPhraseCard = ({
  group,
  expanded,
  showAll,
  disabled,
  onToggle,
  onShowMore,
  onAdd,
}: {
  group: SeedPhraseGroupView;
  expanded: boolean;
  showAll: boolean;
  disabled?: boolean;
  onToggle: () => void;
  onShowMore: () => void;
  onAdd: () => void;
}) => {
  const { t } = useTranslation();
  const visibleAccounts = showAll
    ? group.sortedAccounts
    : group.sortedAccounts.slice(0, MAX_VISIBLE_ADDRESSES);
  const hasMoreAccounts = group.sortedAccounts.length > MAX_VISIBLE_ADDRESSES;

  return (
    <div className="bg-r-neutral-card-1 rounded-[6px] overflow-hidden">
      <button
        type="button"
        className="w-full h-[50px] px-[16px] flex items-center"
        onClick={onToggle}
      >
        <div className="text-[15px] leading-[18px] font-medium text-r-neutral-title-1">
          {`Seed Phrase ${(group.index || 0) + 1}`}
        </div>
        <div className="ml-auto text-[13px] leading-[16px] font-medium text-r-neutral-title-1">
          {formatUsdValue(group.totalBalance)}
        </div>
        <Chevron expanded={expanded} className="ml-[6px]" />
      </button>

      {expanded && (
        <div className="border-t border-rabby-neutral-line px-[16px] pt-[6px] pb-[16px]">
          {visibleAccounts.map((account) => (
            <AccountRow key={account.address} account={account} />
          ))}

          {hasMoreAccounts && !showAll && (
            <button
              type="button"
              disabled={disabled}
              className="w-full h-[36px] rounded-[4px] bg-r-neutral-bg-2 text-[13px] leading-[16px] text-r-neutral-foot flex items-center justify-start gap-[2px] mt-[4px] px-[12px]"
              onClick={onShowMore}
            >
              <span>{t('page.newAddress.moreWallets')}</span>
              <Chevron expanded={false} className="w-[14px] h-[14px]" />
            </button>
          )}

          <button
            type="button"
            disabled={disabled}
            className={clsx(
              'mt-[12px] w-full h-[40px] rounded-[4px] bg-r-blue-light-1 text-r-blue-default flex items-center justify-center gap-[6px]',
              disabled && 'opacity-50'
            )}
            onClick={onAdd}
          >
            <AddIcon />
            <span className="text-[13px] leading-[16px] font-medium">
              {t('page.manageAddress.add-address')}
            </span>
          </button>
        </div>
      )}
    </div>
  );
};

export const AddNewAddress: React.FC<{
  isInModal?: boolean;
  onBack?(): void;
  onNavigate?(type: string, state?: Record<string, any>): void;
}> = ({ isInModal, onBack, onNavigate }) => {
  const history = useHistory();
  const { t } = useTranslation();
  const { seedPhraseList } = UseSeedPhrase();
  const {
    createNewSeedPhrase,
    deriveNextAddressFromSeedPhrase,
  } = useCreateAddressActions({
    onNavigate,
  });
  const [pendingAction, setPendingAction] = React.useState<string | null>(null);

  const groups = React.useMemo<SeedPhraseGroupView[]>(
    () =>
      seedPhraseList
        .map((group) => {
          const sortedAccounts = [...group.list].sort(
            (a, b) => Number(b.balance || 0) - Number(a.balance || 0)
          );
          const totalBalance = sortedAccounts.reduce(
            (sum, account) => sum + Number(account.balance || 0),
            0
          );

          return {
            ...group,
            key:
              group.publicKey ||
              `${group.type}-${group.brandName || ''}-${group.index || 0}`,
            totalBalance,
            sortedAccounts,
          };
        })
        .sort((a, b) => {
          if (b.totalBalance !== a.totalBalance) {
            return b.totalBalance - a.totalBalance;
          }
          if (b.sortedAccounts.length !== a.sortedAccounts.length) {
            return b.sortedAccounts.length - a.sortedAccounts.length;
          }
          return (a.index || 0) - (b.index || 0);
        }),
    [seedPhraseList]
  );

  const [expandedMap, setExpandedMap] = React.useState<Record<string, boolean>>(
    {}
  );
  const [showAllMap, setShowAllMap] = React.useState<Record<string, boolean>>(
    {}
  );

  React.useEffect(() => {
    setExpandedMap((prev) =>
      groups.reduce((acc, group) => {
        acc[group.key] = prev[group.key] ?? group.totalBalance > 0;
        return acc;
      }, {} as Record<string, boolean>)
    );
    setShowAllMap((prev) =>
      groups.reduce((acc, group) => {
        acc[group.key] = prev[group.key] ?? false;
        return acc;
      }, {} as Record<string, boolean>)
    );
  }, [groups]);

  const handleBack = React.useCallback(() => {
    if (onBack) {
      onBack();
      return;
    }
    history.goBack();
  }, [history, onBack]);

  const handleCreateSeedPhrase = useMemoizedFn(async () => {
    try {
      setPendingAction('create-seed-phrase');
      await createNewSeedPhrase();
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : 'Failed to create seed phrase'
      );
    } finally {
      setPendingAction(null);
    }
  });

  const handleAddAddress = useMemoizedFn(async (publicKey: string) => {
    if (!publicKey) {
      return;
    }

    try {
      setPendingAction(publicKey);
      await deriveNextAddressFromSeedPhrase(publicKey);
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : 'Failed to add address'
      );
    } finally {
      setPendingAction(null);
    }
  });

  return (
    <div
      className={clsx(
        'bg-r-neutral-bg-2 flex flex-col',
        isInModal ? 'h-[600px] overflow-auto' : 'min-h-full'
      )}
    >
      <Header title={t('page.newAddress.addNewAddress')} onBack={handleBack} />

      <div className="px-[20px] pb-[20px] flex flex-col gap-[12px]">
        <button
          type="button"
          disabled={pendingAction !== null}
          className={clsx(
            'w-full h-[56px] rounded-[6px] bg-r-neutral-card-1 px-[16px] flex items-center',
            pendingAction !== null && 'opacity-50'
          )}
          onClick={handleCreateSeedPhrase}
        >
          <RcAddNewAddressCreateSeedIcon className="w-[24px] h-[24px] shrink-0" />
          <span className="ml-[12px] text-[15px] leading-[18px] font-medium text-r-neutral-title-1">
            {t('page.newAddress.createANewSeedPhrase')}
          </span>
          <RcAddNewAddressChevronIcon className="ml-auto w-[20px] h-[20px] shrink-0 rotate-180" />
        </button>

        {groups.map((group) => (
          <SeedPhraseCard
            key={group.key}
            group={group}
            expanded={!!expandedMap[group.key]}
            showAll={!!showAllMap[group.key]}
            disabled={pendingAction !== null}
            onToggle={() => {
              setExpandedMap((prev) => ({
                ...prev,
                [group.key]: !prev[group.key],
              }));
            }}
            onShowMore={() => {
              setShowAllMap((prev) => ({
                ...prev,
                [group.key]: true,
              }));
            }}
            onAdd={() => {
              handleAddAddress(group.publicKey || '');
            }}
          />
        ))}
      </div>
    </div>
  );
};
