import { KEYRING_CLASS, KEYRING_TYPE } from './../../constant/index';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useHistory } from 'react-router-dom';
import { Approval } from 'background/service/notification';
import { useWallet } from './WalletContext';
import { getUiType } from './index';
import { KEYRING_TYPE_TEXT, WALLET_BRAND_CONTENT } from '@/constant';
import { LedgerHDPathType, LedgerHDPathTypeLabel } from '@/ui/utils/ledger';
import { useApprovalPopup } from './approval-popup';
import { useRabbyDispatch, useRabbySelector } from '../store';
import { useTranslation } from 'react-i18next';

export const useApproval = () => {
  const wallet = useWallet();
  const history = useHistory();
  const { showPopup, enablePopup } = useApprovalPopup();

  const getApproval: () => Promise<Approval> = wallet.getApproval;

  const resolveApproval = async (
    data?: any,
    stay = false,
    forceReject = false,
    approvalId?: string
  ) => {
    const approval = await getApproval();

    if (approval) {
      wallet.resolveApproval(data, forceReject, approvalId);
    }
    if (stay) {
      return;
    }
    setTimeout(() => {
      if (data && enablePopup(data.type)) {
        return showPopup();
      }
      history.replace('/');
    }, 0);
  };

  const rejectApproval = async (err?, stay = false, isInternal = false) => {
    const approval = await getApproval();
    if (approval?.data?.params?.data?.[0]?.isCoboSafe) {
      wallet.coboSafeResetCurrentAccount();
    }

    if (approval) {
      await wallet.rejectApproval(err, stay, isInternal);
    }
    if (!stay) {
      history.push('/');
    }
  };
  return [getApproval, resolveApproval, rejectApproval] as const;
};

export const useSelectOption = <T>({
  options,
  defaultValue = [],
  onChange,
  value,
}: {
  options: T[];
  defaultValue?: T[];
  onChange?: (arg: T[]) => void;
  value?: T[];
}) => {
  const isControlled = useRef(typeof value !== 'undefined').current;
  const [idxs, setChoosedIdxs] = useState(
    (isControlled ? value! : defaultValue).map((x) => options.indexOf(x))
  );

  useEffect(() => {
    if (!isControlled) {
      return;
    }

    // shallow compare
    if (value && idxs.some((x, i) => options[x] != value[i])) {
      setChoosedIdxs(value.map((x) => options.indexOf(x)));
    }
  }, [value]);

  const changeValue = (idxs: number[]) => {
    setChoosedIdxs([...idxs]);
    onChange && onChange(idxs.map((o) => options[o]));
  };

  const handleRemove = (i: number) => {
    idxs.splice(i, 1);
    changeValue(idxs);
  };

  const handleChoose = (i: number) => {
    if (idxs.includes(i)) {
      return;
    }

    idxs.push(i);
    changeValue(idxs);
  };

  const handleToggle = (i: number) => {
    const inIdxs = idxs.indexOf(i);
    if (inIdxs !== -1) {
      handleRemove(inIdxs);
    } else {
      handleChoose(i);
    }
  };

  const handleClear = () => {
    changeValue([]);
  };

  return [
    idxs.map((o) => options[o]),
    handleRemove,
    handleChoose,
    handleToggle,
    handleClear,
    idxs,
  ] as const;
};

export const useWalletRequest = <TReqArgs extends any[] = any[], TRet = any>(
  requestFn: (...args: TReqArgs) => TRet | Promise<TRet>,
  {
    onSuccess,
    onError,
  }: {
    onSuccess?(ret: TRet, opts: { args: TReqArgs }): void;
    onError?(arg: Error): void;
  }
) => {
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;

    return () => {
      mounted.current = false;
    };
  }, []);
  const [loading, setLoading] = useState<boolean>(false);
  const [res, setRes] = useState<any>();
  const [err, setErr] = useState<any>();

  const run = async (...args: TReqArgs) => {
    setLoading(true);
    try {
      const _res = await Promise.resolve(requestFn(...args));
      if (!mounted.current) {
        return;
      }
      setRes(_res);
      onSuccess && onSuccess(_res, { args });
    } catch (err) {
      if (!mounted.current) {
        return;
      }
      setErr(err);
      onError && onError(err);
    } finally {
      if (mounted.current) {
        setLoading(false);
      }
    }
  };

  return [run, loading, res, err] as const;
};
export interface UseHoverOptions {
  mouseEnterDelayMS?: number;
  mouseLeaveDelayMS?: number;
}

export type HoverProps = Pick<
  React.HTMLAttributes<HTMLElement>,
  'onMouseEnter' | 'onMouseLeave'
>;

export const useHover = ({
  mouseEnterDelayMS = 0,
  mouseLeaveDelayMS = 0,
}: UseHoverOptions = {}): [boolean, HoverProps, () => void] => {
  const [isHovering, setIsHovering] = useState(false);
  let mouseEnterTimer: number | undefined;
  let mouseOutTimer: number | undefined;

  return [
    isHovering,
    {
      onMouseEnter: () => {
        clearTimeout(mouseOutTimer);
        mouseEnterTimer = window.setTimeout(
          () => setIsHovering(true),
          mouseEnterDelayMS
        );
      },
      onMouseLeave: () => {
        clearTimeout(mouseEnterTimer);
        mouseOutTimer = window.setTimeout(
          () => setIsHovering(false),
          mouseLeaveDelayMS
        );
      },
    },
    () => setIsHovering(false),
  ];
};

export const useAlias = (address: string) => {
  const wallet = useWallet();
  const [name, setName] = useState<string>();
  useEffect(() => {
    if (address) {
      wallet.getAlianName(address).then(setName);
    }
  }, [address]);

  const updateAlias = useCallback(
    async (alias: string) => {
      await wallet.updateAlianName(address, alias);
      setName(alias);
    },
    [address, wallet]
  );

  return [name, updateAlias] as const;
};

export const useBalance = (address: string) => {
  const [cacheBalance, setCacheBalance] = useState<number>();
  const [balance, setBalance] = useState<number>();
  const wallet = useWallet();
  useEffect(() => {
    let flag = true;
    setBalance(undefined);
    setCacheBalance(undefined);
    if (address) {
      wallet
        .getAddressCacheBalance(address)
        .then((d) => flag && setCacheBalance(d?.total_usd_value || 0));
      wallet
        .getInMemoryAddressBalance(address)
        .then((d) => flag && setBalance(d.total_usd_value));
    }
    return () => {
      flag = false;
    };
  }, [address]);

  return [balance ?? cacheBalance] as const;
};

export const useAddressSource = ({
  type,
  brandName,
  byImport = false,
  address,
}: {
  type: string;
  brandName: string;
  byImport?: boolean;
  address?: string;
}) => {
  const { t } = useTranslation();
  const [source, setSource] = useState<string>('');
  const wallet = useWallet();

  useEffect(() => {
    if (byImport === true && KEYRING_TYPE.HdKeyring === type) {
      if (address) {
        wallet
          .getMnemonicKeyringIfNeedPassphrase('address', address)
          .then((needPassphrase) => {
            if (needPassphrase) {
              setSource(t('constant.IMPORTED_HD_KEYRING_NEED_PASSPHRASE'));
            } else {
              setSource(t('constant.IMPORTED_HD_KEYRING'));
            }
          });
      } else {
        setSource(t('constant.IMPORTED_HD_KEYRING'));
      }
      return;
    }
    const dict = {
      [KEYRING_TYPE.HdKeyring]: t('constant.KEYRING_TYPE_TEXT.HdKeyring'),
      [KEYRING_TYPE.SimpleKeyring]: t(
        'constant.KEYRING_TYPE_TEXT.SimpleKeyring'
      ),
      [KEYRING_TYPE.WatchAddressKeyring]: t(
        'constant.KEYRING_TYPE_TEXT.WatchAddressKeyring'
      ),
    };
    if (dict[type]) {
      setSource(dict[type]);
      return;
    }
    if (KEYRING_TYPE_TEXT[type]) {
      setSource(KEYRING_TYPE_TEXT[type]);
      return;
    }
    if (WALLET_BRAND_CONTENT[brandName]) {
      setSource(WALLET_BRAND_CONTENT[brandName].name);
      return;
    }
  }, [type, brandName, byImport, address]);

  return source;
};

export const useAccountInfo = (
  type: string,
  address: string,
  brand?: string
) => {
  const wallet = useWallet();
  const [account, setAccount] = useState<{
    address: string;
    hdPathType: LedgerHDPathType;
    hdPathTypeLabel: string;
    index: number;
  }>();
  const dispatch = useRabbyDispatch();
  const isLedger = type === KEYRING_CLASS.HARDWARE.LEDGER;
  const isGridPlus = type === KEYRING_CLASS.HARDWARE.GRIDPLUS;
  const isTrezorLike =
    type === KEYRING_CLASS.HARDWARE.TREZOR ||
    type === KEYRING_CLASS.HARDWARE.ONEKEY;
  const isMnemonics = type === KEYRING_CLASS.MNEMONIC;
  const isKeystone = brand === 'Keystone';
  const mnemonicAccounts = useRabbySelector((state) => state.account);
  const fetAccountInfo = useCallback(() => {
    wallet.requestKeyring(type, 'getAccountInfo', null, address).then((res) => {
      setAccount({
        ...res,
        hdPathTypeLabel: LedgerHDPathTypeLabel[res.hdPathType],
      });
    });
  }, []);

  const fetchTrezorLikeAccount = useCallback(() => {
    wallet
      .requestKeyring(type, 'indexFromAddress', null, address)
      .then((index) => {
        setAccount({
          address,
          index: index + 1,
          hdPathType: LedgerHDPathType.BIP44,
          hdPathTypeLabel: LedgerHDPathTypeLabel.BIP44,
        });
      });
  }, []);

  const fetchMnemonicsAccount = useCallback(async () => {
    const info = await wallet.getMnemonicAddressInfo(address);
    if (info) {
      setAccount({
        address,
        index: info.index + 1,
        hdPathType: info.hdPathType,
        hdPathTypeLabel: LedgerHDPathTypeLabel[info.hdPathType],
      });
    }
  }, []);

  useEffect(() => {
    if (isLedger || isGridPlus || isKeystone) {
      fetAccountInfo();
    } else if (isTrezorLike) {
      fetchTrezorLikeAccount();
    } else if (isMnemonics) {
      fetchMnemonicsAccount();
    }
  }, [address]);

  return account;
};
