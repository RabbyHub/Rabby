import React, { useRef } from 'react';
import { useLocation, useHistory } from 'react-router-dom';
import { getUiType } from 'ui/utils';
import { KEYRING_CLASS } from 'consts';
import './style.less';
import { HDManager } from '../HDManager/HDManager';
import { useRabbyDispatch } from '@/ui/store';

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

  if (!state) {
    if (getUiType().isTab) {
      if (history.length) {
        history.goBack();
      } else {
        window.close();
      }
    } else {
      history.replace('/dashboard');
    }
    return null;
  }

  const [isMounted, setIsMounted] = React.useState(false);
  const dispatch = useRabbyDispatch();
  const initMnemonics = async () => {
    if (isMnemonic) {
      dispatch.importMnemonics.switchKeyring({
        stashKeyringId: keyringId.current as number,
      });
    }

    setIsMounted(true);
  };
  React.useEffect(() => {
    initMnemonics();
  }, [query]);

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
