import React from 'react';
import { Button, Form, Input, message } from 'antd';
import clsx from 'clsx';
import styled from 'styled-components';
import { useMemoizedFn } from 'ahooks';
import { useTranslation } from 'react-i18next';
import { clearClipboard } from '@/ui/utils/clipboard';
import { useWallet } from '@/ui/utils';
import IconSuccess from 'ui/assets/success.svg';
import PillsSwitch from '@/ui/component/PillsSwitch';
import { ReactComponent as RcRabbyLogo } from '@/ui/assets/logo-rabby-large.svg';
import { ReactComponent as RcUploader } from '@/ui/assets/uploader.svg';
import { ReactComponent as RcClear } from '@/ui/assets/new-user-import/clear-cc.svg';
import { ReactComponent as RcEye } from '@/ui/assets/new-user-import/eye-cc.svg';
import { ReactComponent as RcEyeClose } from '@/ui/assets/new-user-import/eye-close-cc.svg';
import { ReactComponent as RcClose } from '@/ui/assets/new-user-import/close-cc.svg';
import { useCreateAddressActions } from './useCreateAddress';
import { privateKeyToAddress } from 'viem/accounts';

type BulkImportTab = 'privateKey' | 'keyStore';

type BulkImportFormValues = {
  password: string;
};

type PrivateKeyRow = {
  id: string;
  value: string;
  visible: boolean;
};

type ValidatedPrivateKeyResult = {
  validRows: PrivateKeyRow[];
  invalidRowIds: string[];
};

const Page = styled.div`
  min-height: 100vh;
  background: var(--r-neutral-bg-2, #f2f4f7);
  overflow-y: auto;
`;

const Card = styled.div`
  width: 600px;
  min-height: 586px;
  margin: 0 auto;
  border-radius: 8px;
  background: var(--r-neutral-card-1, #fff);
  padding: 32px 50px;
`;

const PasswordInput = styled(Input)`
  &.ant-input {
    height: 52px;
    border-radius: 8px;
    border: 1px solid var(--r-neutral-line, #e0e5ec);
    background: var(--r-neutral-card-1, #fff);
    padding: 0 15px;
    font-size: 15px;
    line-height: 18px;
    color: var(--r-neutral-title-1, #192945);
    box-shadow: none;
  }

  &.ant-input::placeholder {
    color: var(--r-neutral-foot, #6a7587);
  }

  &.ant-input:focus,
  &.ant-input-focused {
    border-color: var(--r-blue-default, #4c65ff);
    box-shadow: none;
  }
  &.ant-input-status-error:not(.ant-input-disabled):not(.ant-input-borderless).ant-input,
  &.ant-input-status-error:not(.ant-input-disabled):not(.ant-input-borderless).ant-input:hover,
  &.ant-input:hover,
  &.ant-input:focus,
  &.ant-input-focused {
    background: var(--r-neutral-card-1, #fff);
  }
`;

const EmptyTextarea = styled.textarea`
  width: 100%;
  height: 100%;
  resize: none;
  border: 0;
  outline: none;
  background: transparent;
  padding: 0;
  color: var(--r-neutral-title-1, #192945);
  font-size: 13px;
  line-height: 16px;
  font-weight: 400;
  white-space: pre-wrap;
  word-break: break-all;
  overflow-wrap: anywhere;

  &::placeholder {
    color: var(--r-neutral-foot, #6a7587);
  }
`;

const HiddenRowInput = styled.input`
  width: 100%;
  background: transparent;
  border: 0;
  outline: none;
  color: var(--r-neutral-title-1, #192945);
  font-size: 13px;
  line-height: 16px;
  height: 16px;
  padding: 0;
  font-weight: 510;
  font-family: 'SF Pro Text', 'SF Pro', -apple-system, BlinkMacSystemFont,
    sans-serif;
  letter-spacing: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: clip;

  &::-ms-reveal,
  &::-ms-clear {
    display: none;
  }
`;

const VisibleRowTextarea = styled.textarea`
  width: 100%;
  resize: none;
  overflow: hidden;
  background: transparent;
  border: 0;
  outline: none;
  padding: 0;
  color: var(--r-neutral-title-1, #192945);
  font-size: 13px;
  line-height: 16px;
  min-height: 16px;
  font-weight: 500;
  /* font-family: 'SF Pro Text', 'SF Pro', -apple-system, BlinkMacSystemFont,
    sans-serif; */
  white-space: pre-wrap;
  word-break: break-all;
  overflow-wrap: anywhere;
`;

const MAX_PRIVATE_KEYS = 1000;
const PRIVATE_KEY_SEPARATOR_RE = /[\s,，;；|]+/;
const PRIVATE_KEY_INPUT_SPLITTER_RE = /[\n\r,，;；|]/;
const PRIVATE_KEY_TRAILING_SPLITTER_RE = /[\n\r,，;；|]\s*$/;
const PRIVATE_KEY_SPLITTER_KEYS = new Set(['Enter', ',', '，', ';', '；', '|']);
let rowSeed = 0;

const createPrivateKeyRow = (value = ''): PrivateKeyRow => ({
  id: `private-key-row-${rowSeed++}`,
  value,
  visible: false,
});

const normalizePrivateKey = (value: string) =>
  value.replace(/^0x/i, '').toLowerCase();

const getPrivateKeyAddress = (value: string) => {
  const normalized = normalizePrivateKey(value.trim());
  if (!normalized) {
    return null;
  }

  try {
    return privateKeyToAddress(
      `0x${normalized}` as `0x${string}`
    ).toLowerCase();
  } catch {
    return null;
  }
};

const splitPrivateKeys = (value: string) =>
  value
    .split(PRIVATE_KEY_SEPARATOR_RE)
    .map((item) => item.trim())
    .filter(Boolean);

const buildRowsFromValues = (
  values: string[],
  prevRows: PrivateKeyRow[] = [],
  options?: {
    appendEmpty?: boolean;
    dedupe?: boolean;
  }
) => {
  const shouldDedupe = options?.dedupe !== false;
  const seen = new Set<string>();
  const rows: PrivateKeyRow[] = [];
  let nextRowIndex = 0;

  values.forEach((value) => {
    const trimmed = value.trim();
    if (!trimmed) {
      return;
    }

    const normalized = normalizePrivateKey(trimmed);
    if (shouldDedupe && seen.has(normalized)) {
      return;
    }
    seen.add(normalized);
    rows.push({
      id: prevRows[nextRowIndex]?.id || createPrivateKeyRow().id,
      value: trimmed,
      visible: prevRows[nextRowIndex]?.visible || false,
    });
    nextRowIndex += 1;
  });

  if (options?.appendEmpty && rows.length < MAX_PRIVATE_KEYS) {
    rows.push({
      id: prevRows[nextRowIndex]?.id || createPrivateKeyRow().id,
      value: '',
      visible: false,
    });
  }

  return rows;
};

const extractFilledValues = (rows: PrivateKeyRow[]) =>
  buildRowsFromValues(
    rows.map((item) => item.value),
    rows
  ).map((item) => item.value.trim());

const BulkImportPrivateKey: React.FC = () => {
  const wallet = useWallet();
  const { t } = useTranslation();
  const { openImportSuccessPage } = useCreateAddressActions();
  const [form] = Form.useForm<BulkImportFormValues>();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const rowInputRefs = React.useRef<
    Record<string, HTMLInputElement | HTMLTextAreaElement | null>
  >({});
  const [selectedTab, setSelectedTab] = React.useState<BulkImportTab>(
    'privateKey'
  );
  const [submitting, setSubmitting] = React.useState(false);
  const [privateKeyInputValue, setPrivateKeyInputValue] = React.useState('');
  const [rows, setRows] = React.useState<PrivateKeyRow[]>([]);
  const [invalidRowIds, setInvalidRowIds] = React.useState<string[]>([]);
  const [privateKeyError, setPrivateKeyError] = React.useState('');
  const [visibleRowHeights, setVisibleRowHeights] = React.useState<
    Record<string, number>
  >({});
  const [pendingFocusRowId, setPendingFocusRowId] = React.useState('');
  const [keyStoreContent, setKeyStoreContent] = React.useState('');
  const [keyStoreFileName, setKeyStoreFileName] = React.useState('');
  const [passwordValue, setPasswordValue] = React.useState('');
  const [keyStoreError, setKeyStoreError] = React.useState('');
  const isPrivateKeyListMode = rows.length > 0;

  const filledPrivateKeyCount = React.useMemo(
    () =>
      isPrivateKeyListMode
        ? extractFilledValues(rows).length
        : splitPrivateKeys(privateKeyInputValue).length,
    [isPrivateKeyListMode, privateKeyInputValue, rows]
  );

  const disabledConfirm = React.useMemo(() => {
    if (submitting) {
      return true;
    }

    if (selectedTab === 'privateKey') {
      return filledPrivateKeyCount === 0;
    }

    return !keyStoreContent || !passwordValue.trim();
  }, [
    filledPrivateKeyCount,
    keyStoreContent,
    passwordValue,
    selectedTab,
    submitting,
  ]);

  const clearPrivateKeyError = useMemoizedFn(() => {
    setInvalidRowIds([]);
    setPrivateKeyError('');
  });

  const applyPrivateKeyLimitError = useMemoizedFn((rawValues: string[]) => {
    const normalizedRows = buildRowsFromValues(rawValues);
    if (normalizedRows.length > MAX_PRIVATE_KEYS) {
      setPrivateKeyError(
        t('page.newAddress.bulkImportPrivateKeyExceeded', {
          count: MAX_PRIVATE_KEYS,
        })
      );
    }

    return normalizedRows.slice(0, MAX_PRIVATE_KEYS).map((item) => item.value);
  });

  const syncRowHeight = useMemoizedFn((rowId: string) => {
    const element = rowInputRefs.current[rowId];
    if (!element || !(element instanceof HTMLTextAreaElement)) {
      return;
    }
    element.style.height = '16px';
    const nextHeight = Math.max(element.scrollHeight, 16);
    element.style.height = `${nextHeight}px`;
    setVisibleRowHeights((prev) =>
      prev[rowId] === nextHeight ? prev : { ...prev, [rowId]: nextHeight }
    );
  });

  const focusRowAtEnd = useMemoizedFn((rowId: string) => {
    const element = rowInputRefs.current[rowId];
    if (!element) {
      return;
    }

    element.focus();
    if (typeof element.setSelectionRange === 'function') {
      const length = element.value.length;
      element.setSelectionRange(length, length);
    }
  });

  const buildEditableRows = useMemoizedFn(
    (
      values: string[],
      options?: {
        appendEmpty?: boolean;
      }
    ) =>
      buildRowsFromValues(values, rows, {
        appendEmpty: options?.appendEmpty,
        dedupe: false,
      })
  );

  const replaceRowWithValues = useMemoizedFn(
    (
      rowId: string,
      values: string[],
      options?: {
        appendEmpty?: boolean;
        focusOffset?: number;
      }
    ) => {
      const index = rows.findIndex((item) => item.id === rowId);
      if (index < 0) {
        return null;
      }

      const currentValues = rows.map((item) => item.value);
      currentValues.splice(index, 1, ...values);

      const nextRows = buildEditableRows(
        applyPrivateKeyLimitError(currentValues),
        {
          appendEmpty: options?.appendEmpty,
        }
      );

      setRows(nextRows);
      setPendingFocusRowId(
        nextRows[index + (options?.focusOffset ?? 0)]?.id || ''
      );

      return nextRows;
    }
  );

  const openPrivateKeyListMode = useMemoizedFn(
    (
      values: string[],
      options?: {
        appendEmpty?: boolean;
        focusLastRow?: boolean;
      }
    ) => {
      const nextRows = buildEditableRows(applyPrivateKeyLimitError(values), {
        appendEmpty: options?.appendEmpty,
      });
      if (options?.focusLastRow) {
        setPendingFocusRowId(nextRows[nextRows.length - 1]?.id || '');
      }

      setRows(nextRows);
      setPrivateKeyInputValue('');
      return nextRows;
    }
  );

  const closePrivateKeyListMode = useMemoizedFn(() => {
    setRows([]);
    setInvalidRowIds([]);
    setPrivateKeyInputValue('');
    setVisibleRowHeights({});
    setPendingFocusRowId('');
  });

  React.useLayoutEffect(() => {
    rows.forEach((row) => {
      if (row.visible) {
        syncRowHeight(row.id);
      }
    });
  }, [rows, syncRowHeight]);

  React.useLayoutEffect(() => {
    if (!pendingFocusRowId) {
      return;
    }

    focusRowAtEnd(pendingFocusRowId);
    setPendingFocusRowId('');
  }, [focusRowAtEnd, pendingFocusRowId, rows]);

  const handleImportSuccess = useMemoizedFn(
    (
      accounts: {
        address: string;
        alianName?: string;
        importedBefore?: boolean;
      }[]
    ) => {
      openImportSuccessPage({
        addresses: accounts.map((item) => ({
          address: item.address,
          alias: item.alianName || '',
          importedBefore: item.importedBefore,
        })),
        publicKey: '',
        title: t('page.newAddress.addressAddedCount', {
          count: accounts.length,
        }),
        description: t('page.newAddress.openExtensionToGetStarted'),
      });
    }
  );

  const handleTextareaChange = useMemoizedFn((nextValue: string) => {
    clearPrivateKeyError();
    setPrivateKeyInputValue(nextValue);

    const trimmedValue = nextValue.trim();
    if (!trimmedValue) {
      return;
    }

    const nextValues = splitPrivateKeys(nextValue);
    openPrivateKeyListMode(nextValues.length ? nextValues : [trimmedValue], {
      focusLastRow: true,
    });
  });

  const handleTextareaBlur = useMemoizedFn(() => {
    const trimmedValue = privateKeyInputValue.trim();
    if (!trimmedValue) {
      setPrivateKeyInputValue('');
      return;
    }
    const nextValues = splitPrivateKeys(trimmedValue);
    openPrivateKeyListMode(nextValues.length ? nextValues : [trimmedValue], {
      focusLastRow: true,
    });
  });

  const handleTextareaPaste = useMemoizedFn(
    (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
      const text = event.clipboardData.getData('text');
      const values = splitPrivateKeys(text);
      const trimmedText = text.trim();
      if (!trimmedText) {
        return;
      }

      event.preventDefault();
      clearPrivateKeyError();
      clearClipboard();
      message.success({
        icon: <img src={IconSuccess} className="icon icon-success" />,
        content: t('page.newAddress.seedPhrase.pastedAndClear'),
        duration: 2,
      });

      openPrivateKeyListMode(values.length ? values : [trimmedText], {
        appendEmpty: true,
        focusLastRow: true,
      });
    }
  );

  const handleRowChange = useMemoizedFn((rowId: string, nextValue: string) => {
    clearPrivateKeyError();

    const tokens = splitPrivateKeys(nextValue);
    const hasInputSplitter = PRIVATE_KEY_INPUT_SPLITTER_RE.test(nextValue);
    const shouldAppendEmpty = PRIVATE_KEY_TRAILING_SPLITTER_RE.test(nextValue);

    if (hasInputSplitter || tokens.length > 1) {
      replaceRowWithValues(rowId, tokens, {
        appendEmpty: shouldAppendEmpty,
        focusOffset: shouldAppendEmpty
          ? tokens.length
          : Math.max(tokens.length - 1, 0),
      });
      return;
    }

    setRows((prev) =>
      prev.map((item) =>
        item.id === rowId ? { ...item, value: nextValue } : item
      )
    );
  });

  const handleSplitCurrentRow = useMemoizedFn(
    (rowId: string, currentRowValue?: string) => {
      const index = rows.findIndex((item) => item.id === rowId);
      if (index < 0) {
        return;
      }

      const currentValue = currentRowValue ?? rows[index]?.value ?? '';
      const tokens = splitPrivateKeys(currentValue);
      if (!tokens.length) {
        return;
      }

      if (tokens.length === 1) {
        const nextRows = buildEditableRows(
          rows.map((item) =>
            item.id === rowId ? currentValue.trim() : item.value
          ),
          {
            appendEmpty: true,
          }
        );

        setRows(nextRows);
        setPendingFocusRowId(nextRows[index + 1]?.id || '');
        return;
      }

      replaceRowWithValues(rowId, tokens, {
        appendEmpty: true,
        focusOffset: tokens.length,
      });
    }
  );

  const handleRowKeyDown = useMemoizedFn(
    (
      rowId: string,
      event: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
      if (event.nativeEvent.isComposing) {
        return;
      }

      if (!PRIVATE_KEY_SPLITTER_KEYS.has(event.key)) {
        return;
      }

      event.preventDefault();
      handleSplitCurrentRow(rowId, event.currentTarget.value);
    }
  );

  const handleRowBlur = useMemoizedFn(
    (rowId: string, currentRowValue?: string) => {
      const nextValues = rows
        .map((item) =>
          item.id === rowId
            ? (currentRowValue ?? item.value).trim()
            : item.value
        )
        .filter(Boolean);
      const shouldAppendTrailingEmptyRow =
        nextValues.length < MAX_PRIVATE_KEYS &&
        (!pendingFocusRowId ||
          rows.filter((item) => !item.value.trim()).length <= 1);

      setRows(
        buildEditableRows(nextValues.slice(0, MAX_PRIVATE_KEYS), {
          appendEmpty: shouldAppendTrailingEmptyRow,
        })
      );
    }
  );

  const handleRowPaste = useMemoizedFn(
    (
      rowId: string,
      event: React.ClipboardEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
      const text = event.clipboardData.getData('text');
      const values = splitPrivateKeys(text);
      if (!values.length) {
        return;
      }

      event.preventDefault();
      clearPrivateKeyError();
      clearClipboard();
      message.success({
        icon: <img src={IconSuccess} className="icon icon-success" />,
        content: t('page.newAddress.seedPhrase.pastedAndClear'),
        duration: 2,
      });

      replaceRowWithValues(rowId, values, {
        appendEmpty: true,
        focusOffset: values.length,
      });
    }
  );

  const handleRemoveRow = useMemoizedFn((rowId: string) => {
    clearPrivateKeyError();
    setVisibleRowHeights((prev) => {
      if (!(rowId in prev)) {
        return prev;
      }
      const next = { ...prev };
      delete next[rowId];
      return next;
    });
    const nextRows = buildEditableRows(
      rows
        .filter((item) => item.id !== rowId)
        .map((item) => item.value)
        .slice(0, MAX_PRIVATE_KEYS),
      {
        appendEmpty: true,
      }
    );

    if (!nextRows.length) {
      closePrivateKeyListMode();
      return;
    }

    setRows(nextRows);
  });

  const handleToggleVisible = useMemoizedFn((rowId: string) => {
    setRows((prev) =>
      prev.map((item) =>
        item.id === rowId ? { ...item, visible: !item.visible } : item
      )
    );
  });

  const handleClearAll = useMemoizedFn(() => {
    clearPrivateKeyError();
    closePrivateKeyListMode();
  });

  const validateRows = useMemoizedFn(
    async (
      sourceRows: PrivateKeyRow[],
      options?: { persistRows?: boolean }
    ): Promise<ValidatedPrivateKeyResult> => {
      const nextInvalidRowIds: string[] = [];
      const normalizedRows = buildRowsFromValues(
        sourceRows.map((item) => item.value).slice(0, MAX_PRIVATE_KEYS),
        sourceRows
      );

      if (!normalizedRows.length) {
        setPrivateKeyError(t('page.newAddress.privateKey.required'));
        setInvalidRowIds([]);
        return {
          validRows: [],
          invalidRowIds: nextInvalidRowIds,
        };
      }

      if (normalizedRows.length > MAX_PRIVATE_KEYS) {
        setPrivateKeyError(
          t('page.newAddress.bulkImportPrivateKeyExceeded', {
            count: MAX_PRIVATE_KEYS,
          })
        );
        setInvalidRowIds([]);
        return {
          validRows: [],
          invalidRowIds: nextInvalidRowIds,
        };
      }

      for (const row of normalizedRows) {
        try {
          if (!getPrivateKeyAddress(row.value.trim())) {
            nextInvalidRowIds.push(row.id);
          }
        } catch {
          nextInvalidRowIds.push(row.id);
        }
      }

      if (options?.persistRows !== false) {
        setRows(
          buildRowsFromValues(
            normalizedRows.map((item) => item.value),
            normalizedRows,
            {
              appendEmpty: normalizedRows.length < MAX_PRIVATE_KEYS,
              dedupe: false,
            }
          )
        );
      }

      if (nextInvalidRowIds.length) {
        setInvalidRowIds(nextInvalidRowIds);
        setPrivateKeyError(t('page.newAddress.bulkImportPrivateKeyInvalid'));
      } else {
        setInvalidRowIds([]);
        setPrivateKeyError('');
      }

      return {
        validRows: normalizedRows,
        invalidRowIds: nextInvalidRowIds,
      };
    }
  );

  const handleBulkImportPrivateKeys = useMemoizedFn(async () => {
    let validationSourceRows = rows;

    if (!isPrivateKeyListMode) {
      const nextValues = splitPrivateKeys(privateKeyInputValue);
      if (!nextValues.length) {
        setPrivateKeyError(t('page.newAddress.privateKey.required'));
        return;
      }

      if (nextValues.length > 1) {
        validationSourceRows = openPrivateKeyListMode(nextValues);
      } else {
        validationSourceRows = openPrivateKeyListMode(nextValues, {
          appendEmpty: true,
        });
      }
    }

    const { validRows, invalidRowIds: nextInvalidRowIds } = await validateRows(
      validationSourceRows
    );
    if (nextInvalidRowIds.length || !validRows.length) {
      return;
    }

    const importedAccounts: {
      address: string;
      alianName?: string;
      importedBefore?: boolean;
    }[] = [];

    try {
      setSubmitting(true);
      const { accounts, duplicateAddresses } = await wallet.importPrivateKeys(
        validRows.map((row) => row.value.trim())
      );
      const duplicateAddressSet = new Set(
        duplicateAddresses.map((address) => address.toLowerCase())
      );
      const accountByAddress = new Map<
        string,
        {
          address: string;
          alianName?: string;
          importedBefore?: boolean;
        }
      >();

      accounts.forEach((account) => {
        accountByAddress.set(account.address.toLowerCase(), account);
      });

      const duplicateAccounts = await Promise.all(
        duplicateAddresses.map(async (address) => ({
          address,
          alianName: (await wallet.getAlianName(address)) || '',
          importedBefore: true,
        }))
      );
      duplicateAccounts.forEach((account) => {
        accountByAddress.set(account.address.toLowerCase(), account);
      });

      const nextImportedAccounts = validRows.reduce<
        {
          address: string;
          alianName?: string;
          importedBefore?: boolean;
        }[]
      >((acc, row) => {
        const address = getPrivateKeyAddress(row.value);
        if (!address) {
          return acc;
        }

        const account = accountByAddress.get(address);
        if (!account) {
          return acc;
        }

        acc.push(
          duplicateAddressSet.has(address)
            ? {
                ...account,
                importedBefore: true,
              }
            : account
        );

        return acc;
      }, []);

      importedAccounts.push(...nextImportedAccounts);

      clearClipboard();
      setInvalidRowIds([]);

      if (importedAccounts.length) {
        handleImportSuccess(importedAccounts);
        return;
      }

      setPrivateKeyError(t('page.newAddress.privateKey.notAValidPrivateKey'));
    } catch (error) {
      setPrivateKeyError(t('page.newAddress.privateKey.notAValidPrivateKey'));
    } finally {
      setSubmitting(false);
    }
  });

  const handleImportKeyStore = useMemoizedFn(async () => {
    const password = form.getFieldValue('password')?.trim();

    if (!keyStoreContent) {
      setKeyStoreError(t('component.Uploader.placeholder'));
      return;
    }

    if (!password) {
      form.setFields([
        {
          name: 'password',
          errors: [t('page.newAddress.keystore.password.required')],
        },
      ]);
      return;
    }

    try {
      setSubmitting(true);
      const accounts = await wallet.importJson(keyStoreContent, password);
      handleImportSuccess(accounts);
    } catch (error) {
      form.setFields([
        {
          name: 'password',
          errors: [
            (error as Error)?.message || t('page.newAddress.incorrectPassword'),
          ],
        },
      ]);
    } finally {
      setSubmitting(false);
    }
  });

  const handleSubmit = useMemoizedFn(async () => {
    if (selectedTab === 'privateKey') {
      await handleBulkImportPrivateKeys();
      return;
    }

    await handleImportKeyStore();
  });

  console.log('row', rows, invalidRowIds);

  return (
    <>
      <Page>
        <div className="mx-auto w-[600px] pt-[84px]">
          <RcRabbyLogo viewBox="0 0 152 44" className="h-[42px] w-[152px]" />
        </div>
        <Card>
          <div className="text-center">
            <h1 className="mb-[8px] text-[20px] font-medium leading-[24px] text-r-neutral-title-1">
              {t('page.newAddress.bulkImportPrivateKey')}
            </h1>
            <p className="mb-[20px] text-[13px] leading-[16px] text-r-neutral-foot">
              {t('page.newAddress.bulkImportPrivateKeySupport')}
            </p>
          </div>

          <div className="mx-auto flex h-[420px] w-[400px] flex-col">
            <PillsSwitch
              value={selectedTab}
              onTabChange={(key) => {
                setSelectedTab(key as BulkImportTab);
                clearPrivateKeyError();
                setKeyStoreError('');
                form.setFields([{ name: 'password', errors: [] }]);
              }}
              options={[
                {
                  key: 'privateKey',
                  label: t('page.newAddress.bulkImportPrivateKeyInputTab'),
                },
                {
                  key: 'keyStore',
                  label: t('page.newAddress.importKeystore'),
                },
              ]}
              className="flex bg-r-neutral-line w-full my-[0] h-[36px] p-[2px] rounded-[8px]"
              itemClassname="w-[50%] py-[7px] text-[15px] leading-[18px] font-medium rounded-[6px] text-center transition-colors"
              itemClassnameInActive="text-r-neutral-body"
              itemClassnameActive="bg-r-neutral-card-1 text-r-blue-default"
            />

            <div className="mt-[20px] flex flex-1 flex-col">
              {selectedTab === 'privateKey' ? (
                <>
                  <div
                    className={clsx(
                      'h-[280px] rounded-[8px] border bg-r-neutral-card-1',
                      invalidRowIds.length || privateKeyError
                        ? 'border-r-red-default'
                        : 'border-rabby-neutral-line'
                    )}
                  >
                    {isPrivateKeyListMode ? (
                      <div className="h-full overflow-y-auto px-[15px] py-[15px]">
                        <div className="">
                          {rows.map((row, index) => {
                            const isInvalid = invalidRowIds.includes(row.id);
                            const isWrappedVisibleRow =
                              row.visible &&
                              (visibleRowHeights[row.id] || 16) > 16;
                            const rowLayoutClass = isWrappedVisibleRow
                              ? 'min-h-[48px] items-start py-[8px]'
                              : 'h-[48px] items-center';

                            return (
                              <div
                                key={row.id}
                                className={clsx(
                                  'group flex items-center w-full rounded-[4px] px-[8px] transition-[background-color,height,padding] duration-150',
                                  rowLayoutClass,
                                  'hover:bg-r-neutral-card-2'
                                )}
                              >
                                <span
                                  className={clsx(
                                    'w-[30px] shrink-0 text-[13px] leading-[16px]',
                                    isWrappedVisibleRow
                                      ? 'self-start'
                                      : 'self-center',
                                    isInvalid
                                      ? 'text-r-red-default'
                                      : 'text-r-neutral-foot'
                                  )}
                                >
                                  {index + 1}.
                                </span>
                                <div
                                  className={clsx(
                                    'w-[260px] shrink-0 flex items-center',
                                    isWrappedVisibleRow
                                      ? 'self-start'
                                      : 'self-center'
                                  )}
                                >
                                  {row.visible ? (
                                    <VisibleRowTextarea
                                      ref={(node) => {
                                        rowInputRefs.current[row.id] = node;
                                      }}
                                      value={row.value}
                                      spellCheck={false}
                                      onKeyDown={(event) =>
                                        handleRowKeyDown(row.id, event)
                                      }
                                      onBlur={(event) =>
                                        handleRowBlur(
                                          row.id,
                                          event.currentTarget.value
                                        )
                                      }
                                      onPaste={(event) =>
                                        handleRowPaste(row.id, event)
                                      }
                                      onChange={(event) => {
                                        handleRowChange(
                                          row.id,
                                          event.target.value
                                        );
                                        syncRowHeight(row.id);
                                      }}
                                      style={{
                                        color: isInvalid
                                          ? 'var(--r-red-default, #e34935)'
                                          : 'var(--r-neutral-title-1, #192945)',
                                      }}
                                    />
                                  ) : (
                                    <HiddenRowInput
                                      ref={(node) => {
                                        rowInputRefs.current[row.id] = node;
                                      }}
                                      value={row.value}
                                      spellCheck={false}
                                      onKeyDown={(event) =>
                                        handleRowKeyDown(row.id, event)
                                      }
                                      onBlur={(event) =>
                                        handleRowBlur(
                                          row.id,
                                          event.currentTarget.value
                                        )
                                      }
                                      onPaste={(event) =>
                                        handleRowPaste(row.id, event)
                                      }
                                      onChange={(event) =>
                                        handleRowChange(
                                          row.id,
                                          event.target.value
                                        )
                                      }
                                      type="text"
                                      style={{
                                        WebkitTextSecurity: 'disc',
                                        color: isInvalid
                                          ? 'var(--r-red-default, #e34935)'
                                          : 'var(--r-neutral-title-1, #192945)',
                                      }}
                                    />
                                  )}
                                </div>
                                <div className="flex-1" />
                                <div className="flex self-center items-center justify-end gap-[10px] pr-[4px] text-r-neutral-foot opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                                  <button
                                    type="button"
                                    className="pointer-events-none flex h-[16px] w-[16px] items-center justify-center group-hover:pointer-events-auto"
                                    onMouseDown={(event) =>
                                      event.preventDefault()
                                    }
                                    onClick={() => handleRemoveRow(row.id)}
                                  >
                                    <RcClose
                                      className="h-[16px] w-[16px] text-r-neutral-foot"
                                      viewBox="0 0 16 16"
                                    />
                                  </button>
                                  <button
                                    type="button"
                                    className="pointer-events-none flex h-[16px] w-[16px] items-center justify-center group-hover:pointer-events-auto"
                                    onMouseDown={(event) =>
                                      event.preventDefault()
                                    }
                                    onClick={() => handleToggleVisible(row.id)}
                                  >
                                    {row.visible ? (
                                      <RcEye
                                        className="h-[16px] w-[16px]"
                                        viewBox="0 0 20 20"
                                      />
                                    ) : (
                                      <RcEyeClose
                                        className="h-[16px] w-[16px]"
                                        viewBox="0 0 20 20"
                                      />
                                    )}
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="h-full px-[15px] py-[15px]">
                        <EmptyTextarea
                          value={privateKeyInputValue}
                          spellCheck={false}
                          placeholder={t(
                            'page.newAddress.bulkImportPrivateKeyPlaceholder'
                          )}
                          onChange={(event) =>
                            handleTextareaChange(event.target.value)
                          }
                          onBlur={handleTextareaBlur}
                          onPaste={handleTextareaPaste}
                          autoFocus
                        />
                      </div>
                    )}
                  </div>

                  <div className="mt-[8px] flex min-h-[20px] items-center justify-between">
                    <div className="text-[12px] leading-[16px] text-r-red-default">
                      {privateKeyError}
                    </div>
                    {filledPrivateKeyCount ? (
                      <button
                        type="button"
                        className="flex h-[16px] w-[16px] items-center justify-center text-r-neutral-foot"
                        onClick={handleClearAll}
                      >
                        <RcClear className="h-[16px] w-[16px]" />
                      </button>
                    ) : null}
                  </div>
                </>
              ) : (
                <Form
                  form={form}
                  className="flex flex-1 flex-col"
                  onValuesChange={(_, values) => {
                    setPasswordValue(values.password || '');
                    setKeyStoreError('');
                    form.setFields([{ name: 'password', errors: [] }]);
                  }}
                >
                  <div className="flex-1">
                    <div
                      className="flex h-[180px] cursor-pointer flex-col items-center justify-center rounded-[8px] bg-r-neutral-card-2"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".json,application/json"
                        className="hidden"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (!file) {
                            return;
                          }

                          setKeyStoreError('');
                          const reader = new FileReader();
                          reader.onload = (loadEvent) => {
                            setKeyStoreContent(
                              String(loadEvent.target?.result || '')
                            );
                            setKeyStoreFileName(file.name);
                          };
                          reader.readAsText(file);
                        }}
                      />
                      <RcUploader className="mb-[8px] h-[40px] w-[40px] text-r-neutral-body" />
                      <div className="text-[13px] leading-[16px] text-r-neutral-body max-w-[300px] truncate">
                        {keyStoreFileName ||
                          t('component.Uploader.placeholder')}
                      </div>
                    </div>
                    {keyStoreError ? (
                      <div className="mt-[8px] text-[12px] leading-[16px] text-r-red-default">
                        {keyStoreError}
                      </div>
                    ) : null}

                    <Form.Item
                      name="password"
                      className="mb-0 mt-[16px] override-ant-form-item-input-has-error"
                    >
                      <PasswordInput
                        type="password"
                        spellCheck={false}
                        placeholder={t(
                          'page.newAddress.keystore.password.placeholder'
                        )}
                      />
                    </Form.Item>
                  </div>
                </Form>
              )}

              <Button
                type="primary"
                size="large"
                disabled={disabledConfirm}
                className="mt-auto h-[44px] w-full rounded-[6px] text-[15px] leading-[18px] font-medium"
                onClick={handleSubmit}
              >
                {t('global.confirm')}
              </Button>
            </div>
          </div>
        </Card>
      </Page>
    </>
  );
};

export default BulkImportPrivateKey;
