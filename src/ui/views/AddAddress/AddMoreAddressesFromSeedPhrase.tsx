import React from 'react';
import clsx from 'clsx';
import { message } from 'antd';
import { useMemoizedFn, useSize } from 'ahooks';
import { useHistory, useLocation } from 'react-router-dom';
import { FixedSizeList, ListChildComponentProps } from 'react-window';
import { KEYRING_CLASS } from '@/constant';
import { useEnterPassphraseModal } from '@/ui/hooks/useEnterPassphraseModal';
import { useRabbyDispatch } from '@/ui/store';
import { formatUsdValue, useWallet } from '@/ui/utils';
import { ellipsisAddress } from '@/ui/utils/address';
import { useTranslation } from 'react-i18next';
import {
  DEFAULT_SETTING_DATA,
  MAX_ACCOUNT_COUNT,
  SettingData,
} from '../HDManager/AdvancedSettings';
import { HDPathType } from '../HDManager/HDPathTypeButton';
import { fetchAccountsInfo } from '../HDManager/utils';
import { Account } from '../HDManager/AccountList';
import {
  useCreateAddressActions,
  AddMoreAddressesState,
} from './useCreateAddress';
import { AddAddressNavigateHandler } from './shared';
import {
  RcAddMoreAddressesBackIcon,
  RcAddMoreAddressesSettingIcon,
  RcAddMoreAddressesSettingCenterIcon,
  RcAddMoreAddressesCheckedIcon,
  RcAddMoreAddressesCheckmarkIcon,
  RcAddMoreAddressesUncheckedIcon,
  RcAddMoreAddressesSheetOuterIcon,
  RcAddMoreAddressesSheetInnerIcon,
  RcAddMoreAddressesSheetUncheckedIcon,
} from '@/ui/assets/add-address';

const FETCH_STEP = 5;
const LIST_ITEM_HEIGHT = 60;

interface AddressRowData extends Account {
  imported: boolean;
  placeholder?: boolean;
}

interface AddressListData {
  rows: AddressRowData[];
  selectedAddresses: string[];
  onToggle: (item: AddressRowData) => void;
}

const HD_PATH_OPTIONS: {
  type: HDPathType;
  title: string;
  descKey: string;
  heightClassName: string;
}[] = [
  {
    type: HDPathType.BIP44,
    title: 'BIP44',
    descKey: 'page.newAddress.hd.mnemonic.hdPathType.bip44',
    heightClassName: 'h-[96px]',
  },
  {
    type: HDPathType.LedgerLive,
    title: 'Ledger Live',
    descKey: 'page.newAddress.hd.mnemonic.hdPathType.ledgerLive',
    heightClassName: 'h-[80px]',
  },
  {
    type: HDPathType.Legacy,
    title: 'Legacy',
    descKey: 'page.newAddress.hd.mnemonic.hdPathType.legacy',
    heightClassName: 'h-[80px]',
  },
];

const SelectionIcon = ({
  checked,
  disabled,
}: {
  checked: boolean;
  disabled?: boolean;
}) => {
  if (!checked) {
    return <RcAddMoreAddressesUncheckedIcon className="w-[20px] h-[20px]" />;
  }

  return (
    <div
      className={clsx('relative w-[20px] h-[20px]', disabled && 'opacity-50')}
    >
      <RcAddMoreAddressesCheckedIcon className="w-[18px] h-[18px] m-[1px]" />
      <RcAddMoreAddressesCheckmarkIcon className="absolute left-[5.42px] top-[7px] w-[9.17px] h-[6.11px]" />
    </div>
  );
};

const PopupSelectionIcon = ({ checked }: { checked: boolean }) => {
  if (!checked) {
    return (
      <RcAddMoreAddressesSheetUncheckedIcon className="w-[12.8px] h-[12.8px]" />
    );
  }

  return (
    <div className="relative w-[16px] h-[16px]">
      <RcAddMoreAddressesSheetOuterIcon className="w-[12.8px] h-[12.8px] absolute left-[1.6px] top-[1.6px]" />
      <RcAddMoreAddressesSheetInnerIcon className="w-[6px] h-[6px] absolute left-[5px] top-[5px]" />
    </div>
  );
};

const SettingGlyph = () => {
  return (
    <div className="relative w-[20px] h-[20px]">
      <RcAddMoreAddressesSettingIcon className="absolute left-[1.67px] top-[1.99px] w-[16.67px] h-[16.02px]" />
      <RcAddMoreAddressesSettingCenterIcon className="absolute left-[7.08px] top-[7.08px] w-[5.83px] h-[5.83px]" />
    </div>
  );
};

const PlaceholderRow = ({ index }: { index: number }) => {
  return (
    <div className="relative h-[52px] rounded-[8px] bg-r-neutral-card-1">
      <span className="absolute left-[12px] top-1/2 -translate-y-1/2 text-[12px] leading-[14px] text-r-neutral-foot">
        {index}.
      </span>
      <div className="absolute left-[33px] top-1/2 h-[20px] w-[188px] -translate-y-1/2 rounded-[4px] bg-r-neutral-card-2" />
    </div>
  );
};

const AddressRow = ({
  item,
  checked,
  onToggle,
}: {
  item: AddressRowData;
  checked: boolean;
  onToggle: () => void;
}) => {
  const { t } = useTranslation();

  if (item.placeholder) {
    return <PlaceholderRow index={item.index} />;
  }

  return (
    <button
      type="button"
      className={clsx(
        'relative h-[52px] w-full rounded-[8px] bg-r-neutral-card-1 text-left',
        item.imported && 'opacity-50'
      )}
      onClick={onToggle}
      disabled={item.imported}
    >
      <span className="absolute left-[12px] top-1/2 -translate-y-1/2 text-[12px] leading-[14px] text-r-neutral-foot">
        {item.index}.
      </span>

      <div className="absolute left-[35px] top-1/2 flex max-w-[212px] -translate-y-1/2 items-center gap-[6px]">
        <span className="text-[15px] leading-[18px] font-medium text-r-neutral-title-1">
          {ellipsisAddress(item.address)}
        </span>
        <span className="text-[13px] leading-[16px] text-r-neutral-foot">
          {formatUsdValue(item.balance || 0)}
        </span>
      </div>

      {item.imported && (
        <div className="absolute left-[253px] top-[17px] rounded-[2px] bg-r-blue-light-1 px-[4px] py-[2px]">
          <span className="text-[11px] leading-[13px] font-medium text-r-blue-default">
            {t('component.MultiSelectAddressList.imported')}
          </span>
        </div>
      )}

      <div className="absolute right-[16px] top-1/2 -translate-y-1/2">
        <SelectionIcon
          checked={item.imported || checked}
          disabled={item.imported}
        />
      </div>
    </button>
  );
};

const AddressListRow = ({
  index,
  style,
  data,
}: ListChildComponentProps<AddressListData>) => {
  const item = data.rows[index];

  return (
    <div style={style} className="w-full">
      <div className="pb-[8px]">
        <AddressRow
          item={item}
          checked={
            !!item.address &&
            data.selectedAddresses.some(
              (address) => address.toLowerCase() === item.address.toLowerCase()
            )
          }
          onToggle={() => data.onToggle(item)}
        />
      </div>
    </div>
  );
};

const SettingsSheet = ({
  visible,
  setting,
  maxAccountCount,
  onClose,
  onConfirm,
}: {
  visible: boolean;
  setting: SettingData;
  maxAccountCount: number;
  onClose: () => void;
  onConfirm: (setting: SettingData) => void;
}) => {
  const { t } = useTranslation();
  const [draft, setDraft] = React.useState(setting);

  React.useEffect(() => {
    setDraft(setting);
  }, [setting]);

  if (!visible) {
    return null;
  }

  return (
    <div className="absolute inset-0 z-20">
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      <div className="absolute bottom-0 left-1/2 h-[540px] w-[400px] -translate-x-1/2 overflow-hidden rounded-t-[16px] bg-r-neutral-bg-2 shadow-[0px_-12px_20px_0px_rgba(19,20,26,0.05)]">
        <div className="relative h-[52px]">
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[20px] leading-[24px] font-medium text-r-neutral-title-1">
            {t('page.newAddress.hd.customAddressHdPath')}
          </div>
        </div>

        <div className="px-[20px] pt-0 pb-[96px]">
          <div className="flex flex-col gap-[8px]">
            {HD_PATH_OPTIONS.map((option) => (
              <button
                key={option.type}
                type="button"
                className={clsx(
                  'relative w-full rounded-[8px] bg-r-neutral-card-1 pl-[36px] pr-[12px] text-left',
                  option.heightClassName
                )}
                onClick={() =>
                  setDraft((prev) => ({
                    ...prev,
                    type: option.type,
                  }))
                }
              >
                <div className="absolute left-[12px] top-[20px]">
                  <PopupSelectionIcon checked={draft.type === option.type} />
                </div>
                <div className="flex h-full flex-col justify-center gap-[6px]">
                  <div className="text-[15px] leading-[18px] font-medium text-r-neutral-title-1">
                    {option.title}
                  </div>
                  <div className="w-[312px] text-[13px] leading-[16px] text-r-neutral-foot">
                    {t(option.descKey)}
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className="mt-[12px] flex flex-col gap-[8px]">
            <div className="text-[12px] leading-[14px] text-r-neutral-foot">
              {t('page.newAddress.hd.selectIndexTip')}
            </div>
            <input
              type="number"
              min={1}
              value={draft.startNo}
              onChange={(e) => {
                const value = Number(e.target.value);
                setDraft((prev) => ({
                  ...prev,
                  startNo: Number.isFinite(value) && value > 0 ? value : 1,
                }));
              }}
              className="h-[44px] w-full rounded-[8px] border border-rabby-neutral-line bg-r-neutral-card-1 px-[11px] text-[13px] leading-[16px] text-r-neutral-title-1 outline-none"
            />
            <div className="opacity-50 text-[12px] leading-[14px] text-r-neutral-foot">
              {t('page.newAddress.hd.manageAddressFrom', [
                draft.startNo,
                draft.startNo + maxAccountCount - 1,
              ])}
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 h-[80px] w-full border-t border-rabby-neutral-line bg-r-neutral-bg-2 px-[20px] py-[18px]">
          <button
            type="button"
            className="h-[44px] w-full rounded-[6px] bg-r-blue-default text-[16px] leading-[19px] font-medium text-r-neutral-bg-1"
            onClick={() =>
              onConfirm({
                ...draft,
                startNo: Math.max(1, draft.startNo || 1),
              })
            }
          >
            {t('global.confirm')}
          </button>
        </div>
      </div>
    </div>
  );
};

export const AddMoreAddressesFromSeedPhrase: React.FC<{
  onNavigate?: AddAddressNavigateHandler;
  state?: Record<string, any>;
}> = ({ onNavigate, state: outerState }) => {
  const history = useHistory();
  const location = useLocation<AddMoreAddressesState>();
  const wallet = useWallet();
  const dispatch = useRabbyDispatch();
  const { t } = useTranslation();
  const invokeEnterPassphrase = useEnterPassphraseModal('publickey');
  const { openSuccessPage } = useCreateAddressActions({
    onNavigate,
  });

  const query = React.useMemo(() => new URLSearchParams(location.search), [
    location.search,
  ]);
  const state = React.useMemo(
    () =>
      ({
        publicKey:
          (outerState as AddMoreAddressesState | undefined)?.publicKey ||
          location.state?.publicKey ||
          query.get('publicKey') ||
          '',
      } as AddMoreAddressesState),
    [location.state, outerState, query]
  );

  const [keyringId, setKeyringId] = React.useState<number | null>(null);
  const [maxAccountCount, setMaxAccountCount] = React.useState<number>(
    MAX_ACCOUNT_COUNT
  );
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [visibleAdvanced, setVisibleAdvanced] = React.useState(false);
  const [setting, setSetting] = React.useState<SettingData>({
    ...DEFAULT_SETTING_DATA,
    type: HDPathType.BIP44,
  });
  const [rows, setRows] = React.useState<AddressRowData[]>([]);
  const [selectedAddresses, setSelectedAddresses] = React.useState<string[]>(
    []
  );
  const listContainerRef = React.useRef<HTMLDivElement>(null);
  const listContainerSize = useSize(listContainerRef);

  const handleBack = useMemoizedFn(() => {
    if (history.length > 1) {
      history.goBack();
      return;
    }
    if (onNavigate) {
      onNavigate('done');
      return;
    }
    history.push('/dashboard');
  });

  const loadAccounts = useMemoizedFn(async (params?: SettingData) => {
    const activeSetting = params || setting;
    if (!keyringId) {
      return;
    }

    setLoading(true);
    try {
      if (activeSetting.type) {
        await wallet.requestKeyring(
          KEYRING_CLASS.MNEMONIC,
          'setHDPathType',
          keyringId,
          activeSetting.type
        );
      }

      const maxCount =
        (await wallet.requestKeyring(
          KEYRING_CLASS.MNEMONIC,
          'getMaxAccountLimit',
          keyringId,
          null
        )) ?? MAX_ACCOUNT_COUNT;
      setMaxAccountCount(maxCount);

      const start = activeSetting.startNo - 1;
      const end = start + maxCount;

      const rawAccounts: Account[] = [];
      for (let i = start; i < end; i += FETCH_STEP) {
        const batch = await dispatch.importMnemonics.getAccounts({
          start: i,
          end: Math.min(i + FETCH_STEP, end),
        });
        rawAccounts.push(
          ...batch.map((item) => ({
            address: item.address,
            balance: item.balance,
            index: item.index || 0,
          }))
        );
      }

      const importedAccounts = await dispatch.importMnemonics.getImportedAccounts(
        {}
      );
      const importedSet = new Set(
        importedAccounts.map((item) => item.address.toLowerCase())
      );
      const accountsWithInfo = await fetchAccountsInfo(wallet, rawAccounts);

      const list = accountsWithInfo.map((item) => ({
        ...item,
        imported: importedSet.has(item.address.toLowerCase()),
      }));

      const placeholders: AddressRowData[] = [];
      for (let i = list.length; i < maxCount; i++) {
        placeholders.push({
          address: '',
          index: activeSetting.startNo + i,
          imported: false,
          placeholder: true,
        });
      }

      setRows([...list, ...placeholders]);
      setSelectedAddresses((prev) => {
        const nextSelected = prev.filter((address) =>
          list.some(
            (item) =>
              !item.imported &&
              item.address.toLowerCase() === address.toLowerCase()
          )
        );
        return nextSelected;
      });
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : 'Failed to load addresses'
      );
    } finally {
      setLoading(false);
    }
  });

  React.useEffect(() => {
    const init = async () => {
      if (!state.publicKey) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        await invokeEnterPassphrase(state.publicKey);
        const nextKeyringId = await wallet.getMnemonicKeyRingIdFromPublicKey(
          state.publicKey
        );

        dispatch.importMnemonics.switchKeyring({
          stashKeyringId: Number(nextKeyringId),
        });
        setKeyringId(Number(nextKeyringId));
      } catch (error) {
        message.error(
          error instanceof Error
            ? error.message
            : 'Failed to load seed phrase addresses'
        );
        setLoading(false);
      }
    };

    init();
  }, [
    dispatch.importMnemonics,
    invokeEnterPassphrase,
    state.publicKey,
    wallet,
  ]);

  React.useEffect(() => {
    if (!keyringId) {
      return;
    }
    loadAccounts(setting);
  }, [keyringId, loadAccounts, setting]);

  const handleToggle = useMemoizedFn((item: AddressRowData) => {
    if (!item.address || item.imported) {
      return;
    }

    setSelectedAddresses((prev) => {
      const exists = prev.some(
        (address) => address.toLowerCase() === item.address.toLowerCase()
      );

      if (exists) {
        return prev.filter(
          (address) => address.toLowerCase() !== item.address.toLowerCase()
        );
      }

      return [...prev, item.address];
    });
  });

  const handleConfirm = useMemoizedFn(async () => {
    if (!selectedAddresses.length || !keyringId) {
      return;
    }

    try {
      setSubmitting(true);
      const selectedRows = rows
        .filter((item) =>
          selectedAddresses.some(
            (address) => address.toLowerCase() === item.address.toLowerCase()
          )
        )
        .sort((a, b) => (a.index || 0) - (b.index || 0));

      const selectedRowAddresses = selectedRows.map((item) => item.address);

      await dispatch.importMnemonics.setSelectedAccounts(selectedRowAddresses);
      await dispatch.importMnemonics.confirmAllImportingAccountsAsync();
      await wallet.requestKeyring(
        KEYRING_CLASS.MNEMONIC,
        'setCurrentUsedHDPathType',
        keyringId
      );
      await dispatch.account.getCurrentAccountAsync();

      const addresses = await Promise.all(
        selectedRows.map(async (item) => ({
          address: item.address,
          alias: (await wallet.getAlianName(item.address)) || '',
        }))
      );

      openSuccessPage({
        addresses,
        publicKey: state.publicKey,
        titleKey: 'page.newAddress.newAddressAdded',
      });
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : 'Failed to add address'
      );
    } finally {
      setSubmitting(false);
    }
  });

  const handleConfirmAdvanced = useMemoizedFn((nextSetting: SettingData) => {
    setVisibleAdvanced(false);
    setSetting({
      ...nextSetting,
      startNo: Math.max(1, nextSetting.startNo || 1),
    });
  });

  if (!state.publicKey) {
    return null;
  }

  const displayRows = rows.length
    ? rows
    : loading
    ? Array.from({
        length: maxAccountCount,
      }).map((_, index) => ({
        address: '',
        index: setting.startNo + index,
        imported: false,
        placeholder: true,
      }))
    : [];

  const listHeight = Math.max(0, Math.floor(listContainerSize?.height || 0));
  const listWidth = Math.max(0, Math.floor(listContainerSize?.width || 0));

  return (
    <div className="relative flex h-full max-h-[600px] flex-col overflow-hidden bg-r-neutral-bg-2">
      <div className="h-[52px] shrink-0 relative flex items-center justify-center">
        <button
          type="button"
          className="absolute left-[20px] top-1/2 -translate-y-1/2 w-[20px] h-[20px] flex items-center justify-center"
          onClick={handleBack}
        >
          <RcAddMoreAddressesBackIcon className="w-[20px] h-[20px]" />
        </button>
        <div className="text-[20px] leading-[24px] font-medium text-r-neutral-title-1">
          {t('page.newAddress.importMoreWallets')}
        </div>
        <button
          type="button"
          className="absolute right-[20px] top-1/2 -translate-y-1/2 w-[20px] h-[20px] flex items-center justify-center"
          onClick={() => setVisibleAdvanced(true)}
        >
          <SettingGlyph />
        </button>
      </div>

      <div className="min-h-0 flex-1 px-[20px] pb-[8px]">
        <div ref={listContainerRef} className="h-full w-full">
          {listHeight > 0 && listWidth > 0 ? (
            <FixedSizeList
              height={listHeight}
              width={listWidth}
              itemCount={displayRows.length}
              itemSize={LIST_ITEM_HEIGHT}
              itemData={{
                rows: displayRows,
                selectedAddresses,
                onToggle: handleToggle,
              }}
              overscanCount={4}
            >
              {AddressListRow}
            </FixedSizeList>
          ) : null}
        </div>
      </div>

      <div className="shrink-0 border-t border-rabby-neutral-line bg-r-neutral-bg-2 px-[20px] py-[18px]">
        <button
          type="button"
          disabled={!selectedAddresses.length || loading || submitting}
          className={clsx(
            'w-full h-[44px] rounded-[6px] bg-r-blue-default text-[16px] leading-[19px] font-medium text-r-neutral-bg-1',
            (!selectedAddresses.length || loading || submitting) && 'opacity-50'
          )}
          onClick={handleConfirm}
        >
          {t('global.confirm')}
        </button>
      </div>

      <SettingsSheet
        visible={visibleAdvanced}
        setting={setting}
        maxAccountCount={maxAccountCount}
        onClose={() => setVisibleAdvanced(false)}
        onConfirm={handleConfirmAdvanced}
      />
    </div>
  );
};
