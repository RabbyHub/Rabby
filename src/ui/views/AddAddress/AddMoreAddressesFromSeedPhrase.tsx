import React from 'react';
import clsx from 'clsx';
import { Button, message } from 'antd';
import { useMemoizedFn } from 'ahooks';
import { useHistory, useLocation } from 'react-router-dom';
import { Virtuoso } from 'react-virtuoso';
import { KEYRING_CLASS } from '@/constant';
import { useEnterPassphraseModal } from '@/ui/hooks/useEnterPassphraseModal';
import { usePopupContainer } from '@/ui/hooks/usePopupContainer';
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
  CREATE_ADDRESS_SUCCESS_PATH,
} from './useCreateAddress';
import { PageHeader, Popup } from '@/ui/component';
import { AddAddressNavigateHandler } from './shared';
import {
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
        'flex items-center px-[16px] py-[10px]'
      )}
      onClick={onToggle}
      disabled={item.imported}
    >
      <span className="absolute top-6 left-6 text-[10px] leading-normal text-r-neutral-foot">
        {item.index}.
      </span>

      <div className="flex items-center max-w-[212px] gap-[6px]">
        <span className="text-[15px] leading-normal font-medium text-r-neutral-title-1">
          {ellipsisAddress(item.address)}
        </span>
        <span className="text-[13px] leading-normal text-r-neutral-foot relative top-1">
          {formatUsdValue(item.balance || 0)}
        </span>
      </div>

      <div className="ml-auto flex items-center gap-[14px]">
        {item.imported && (
          <div className="rounded-[2px] bg-r-blue-light-1 px-[4px] py-[2px] text-[11px] font-medium text-r-blue-default">
            {t('component.MultiSelectAddressList.imported')}
          </div>
        )}
        <SelectionIcon
          checked={item.imported || checked}
          disabled={item.imported}
        />
      </div>
    </button>
  );
};

const SettingsSheet = ({
  visible,
  setting,
  maxAccountCount,
  onClose,
  onConfirm,
  getContainer,
}: {
  visible: boolean;
  setting: SettingData;
  maxAccountCount: number;
  onClose: () => void;
  onConfirm: (setting: SettingData) => void;
  getContainer?: HTMLElement | (() => HTMLElement) | false;
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
    <Popup
      visible={visible}
      onCancel={onClose}
      getContainer={getContainer}
      height={540}
      bodyStyle={{ padding: 0 }}
      isSupportDarkMode
      isNew
      closable={false}
    >
      <div className="relative h-full">
        <div className="relative h-[52px] overflow-hidden">
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[20px] leading-[24px] font-medium text-r-neutral-title-1 whitespace-nowrap">
            {t('page.newAddress.hd.customAddressHdPath')}
          </div>
        </div>

        <div className="px-[20px] pb-[96px]">
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
          <Button
            type="primary"
            size="large"
            className="h-[44px] w-full rounded-[6px] text-[16px] leading-[19px] font-medium"
            onClick={() =>
              onConfirm({
                ...draft,
                startNo: Math.max(1, draft.startNo || 1),
              })
            }
          >
            {t('global.confirm')}
          </Button>
        </div>
      </div>
    </Popup>
  );
};

export const AddMoreAddressesFromSeedPhrase: React.FC<{
  isInModal?: boolean;
  onNavigate?: AddAddressNavigateHandler;
  state?: Record<string, any>;
}> = ({ isInModal, onNavigate, state: outerState }) => {
  const history = useHistory();
  const location = useLocation<AddMoreAddressesState>();
  const wallet = useWallet();
  const dispatch = useRabbyDispatch();
  const { getContainer } = usePopupContainer();
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
        successState:
          (outerState as AddMoreAddressesState | undefined)?.successState ||
          location.state?.successState,
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

  const handleBack = useMemoizedFn(() => {
    if (state.successState) {
      if (onNavigate) {
        onNavigate('create-address-success', state.successState);
        return;
      }
      history.push({
        pathname: CREATE_ADDRESS_SUCCESS_PATH,
        state: state.successState,
      });
      return;
    }
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
    if (keyringId == null) {
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
    if (keyringId == null) {
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
    if (!selectedAddresses.length || keyringId == null) {
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
        title: t('page.newAddress.addressAddedCount', {
          count: addresses.length,
        }),
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

  const selectedAddressSet = React.useMemo(
    () => new Set(selectedAddresses.map((address) => address.toLowerCase())),
    [selectedAddresses]
  );

  const renderAddressRow = React.useCallback(
    (_index: number, item: AddressRowData) => {
      return (
        <div className="pb-[8px]">
          <AddressRow
            item={item}
            checked={
              !!item.address &&
              selectedAddressSet.has(item.address.toLowerCase())
            }
            onToggle={() => handleToggle(item)}
          />
        </div>
      );
    },
    [handleToggle, selectedAddressSet]
  );

  return (
    <div
      className={clsx(
        'bg-r-neutral-bg-2 relative flex flex-col px-20',
        'overflow-hidden'
      )}
      style={{ height: isInModal ? 600 : '100vh' }}
    >
      <PageHeader
        fixed
        className="pt-[20px]"
        forceShowBack
        onBack={handleBack}
        rightSlot={
          <button
            type="button"
            className="absolute bottom-0 right-0 flex h-[20px] w-[20px] items-center justify-center"
            onClick={() => setVisibleAdvanced(true)}
          >
            <SettingGlyph />
          </button>
        }
      >
        {t('page.newAddress.importMoreWallets')}
      </PageHeader>

      <div className="min-h-0 flex flex-1 flex-col">
        <div className="min-h-0 flex-1">
          <Virtuoso
            data={displayRows}
            className="min-h-0 h-full"
            style={{ height: '100%' }}
            fixedItemHeight={LIST_ITEM_HEIGHT}
            overscan={240}
            itemContent={renderAddressRow}
          />
        </div>

        <div className="bg-r-neutral-bg-2 pb-[20px] pt-[8px]">
          <Button
            type="primary"
            size="large"
            disabled={!selectedAddresses.length || loading || submitting}
            className="w-full h-[44px] rounded-[6px] text-[16px] leading-[19px] font-medium"
            onClick={handleConfirm}
          >
            {t('global.confirm')}
          </Button>
        </div>
      </div>

      <SettingsSheet
        visible={visibleAdvanced}
        setting={setting}
        maxAccountCount={maxAccountCount}
        onClose={() => setVisibleAdvanced(false)}
        onConfirm={handleConfirmAdvanced}
        getContainer={getContainer}
      />
    </div>
  );
};
