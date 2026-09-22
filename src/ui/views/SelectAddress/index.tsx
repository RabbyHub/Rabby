import React, { useRef } from 'react';
import { useLocation, useHistory } from 'react-router-dom';
import { KEYRING_CLASS } from 'consts';
import './style.less';
import { HDManager } from '../HDManager/HDManager';
import { useImportMnemonicsStore } from '@/ui/state/importMnemonics';
import { matomoRequestEvent } from '@/utils/matomo-request';
import { ga4 } from '@/utils/ga4';
import { message } from 'antd';
import { KEYRING_IMPORT_EXPIRED_MESSAGE } from '@/constant/message';

type State = {
  keyring: string;
  isMnemonics?: boolean;
  isWebHID?: boolean;
  path?: string;
  keyringId?: number | null;
  ledgerLive?: boolean;
  brand?: string;
};

const SelectAddress = () => {
  const history = useHistory();
  const { state: locationState, search } = useLocation<{
    keyring: string;
    isMnemonics?: boolean;
    isWebHID?: boolean;
    path?: string;
    keyringId?: number | null;
    ledgerLive?: boolean;
    brand?: string;
  }>();
  const state = { ...locationState };
  const query = React.useMemo(() => new URLSearchParams(search), [search]);
  const hasReportedRef = useRef(false);

  state.keyring = state?.keyring || (query.get('hd') as string);
  state.brand = state?.brand || (query.get('brand') as string);
  const queryKeyringId = query.get('keyringId');
  if (state.keyringId == null && queryKeyringId && queryKeyringId !== 'null') {
    state.keyringId = Number(queryKeyringId);
  }
  const { keyring, brand } = state;
  const keyringId = state.keyringId ?? null;
  const isMnemonic = keyring === KEYRING_CLASS.MNEMONIC;
  const invalidImport =
    !keyring ||
    ((isMnemonic || keyringId !== null) &&
      (!Number.isSafeInteger(keyringId) || keyringId! <= 0));

  const [initializedKeyringId, setInitializedKeyringId] = React.useState<
    number | null
  >();
  const initMnemonics = async () => {
    if (invalidImport) {
      message.error(KEYRING_IMPORT_EXPIRED_MESSAGE);
      history.replace('/add-address');
      return;
    }
    if (isMnemonic) {
      useImportMnemonicsStore.getState().switchKeyring({
        stashKeyringId: keyringId as number,
      });
    }

    setInitializedKeyringId(keyringId);
  };
  React.useEffect(() => {
    initMnemonics();
  }, [keyring, keyringId, invalidImport]);

  React.useEffect(() => {
    if (invalidImport || hasReportedRef.current) {
      return;
    }
    if (!state.keyring) {
      return;
    }
    hasReportedRef.current = true;
    const mnemonicSuffix =
      state.keyring === KEYRING_CLASS.MNEMONIC ? '_Add' : '';
    matomoRequestEvent({
      category: 'User',
      action: 'importAddress',
      label: `${state.keyring}${mnemonicSuffix}`,
    });
    ga4.fireEvent(`Import_${state.keyring}${mnemonicSuffix}`, {
      event_category: 'Import Address',
    });
  }, [state.keyring, invalidImport]);

  if (invalidImport) return null;
  if (isMnemonic) {
    if (initializedKeyringId !== keyringId) return null;
  }

  return (
    <HDManager
      key={`${keyring}:${keyringId}`}
      keyringId={keyringId}
      keyring={keyring}
      brand={brand}
    />
  );
};

export default SelectAddress;
