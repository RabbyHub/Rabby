import React, { useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { KEYRING_CLASS } from 'consts';
import './style.less';
import { HDManager } from '../HDManager/HDManager';
import { useImportMnemonicsStore } from '@/ui/state/importMnemonics';

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
  const { state = {} as State, search } = useLocation<{
    keyring: string;
    isMnemonics?: boolean;
    isWebHID?: boolean;
    path?: string;
    keyringId?: number | null;
    ledgerLive?: boolean;
    brand?: string;
  }>();
  const query = new URLSearchParams(search);

  state.keyring = state?.keyring || (query.get('hd') as string);
  state.brand = state?.brand || (query.get('brand') as string);
  if (query.get('keyringId') && !state.keyringId) {
    state.keyringId = Number(query.get('keyringId') as string);
  }

  const [isMounted, setIsMounted] = React.useState(false);
  const initMnemonics = async () => {
    if (isMnemonic) {
      useImportMnemonicsStore.getState().switchKeyring({
        stashKeyringId: keyringId.current as number,
      });
    }

    setIsMounted(true);
  };
  // Keyed on the search string: `query` is a new object on every render, which
  // re-ran this (and switchKeyring) after every render.
  React.useEffect(() => {
    initMnemonics();
  }, [search]);

  const { keyring, brand } = state;
  const keyringId = useRef<number | null | undefined>(state.keyringId);
  const isMnemonic = keyring === KEYRING_CLASS.MNEMONIC;

  if (isMnemonic) {
    if (!isMounted) return null;
  }

  return (
    <HDManager
      keyringId={keyringId.current ?? null}
      keyring={keyring}
      brand={brand}
    />
  );
};

export default SelectAddress;
