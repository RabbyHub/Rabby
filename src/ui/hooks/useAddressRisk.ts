/* eslint "react-hooks/exhaustive-deps": ["error"] */
/* eslint-enable react-hooks/exhaustive-deps */
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import PQueue from 'p-queue';
import { isValidAddress } from '@ethereumjs/util';
import { AddrDescResponse } from '@rabby-wallet/rabby-api/dist/types';

import { useRabbyDispatch, useRabbySelector } from '../store';
import { IExchange } from '../component/CexSelect';

import { isSameAddress, useWallet } from '../utils';
import { KEYRING_CLASS } from 'consts';
import { useDebouncedValue } from './useDebounceValue';

const queue = new PQueue({ intervalCap: 5, concurrency: 5, interval: 1000 });

const waitQueueFinished = (q: PQueue) => {
  return new Promise((resolve) => {
    q.on('empty', () => {
      if (q.pending <= 0) {
        resolve(null);
      }
    });
  });
};

export const enum RiskType {
  NEVER_SEND = 1,
  SCAM_ADDRESS = 2,
  CONTRACT_ADDRESS = 3,
  CEX_NO_DEPOSIT = 4,

  FORBIDDEN_TIP = 5,
}

const riskTypePriority = {
  [RiskType.FORBIDDEN_TIP]: 10e-1,
  [RiskType.CEX_NO_DEPOSIT]: 10,
  [RiskType.NEVER_SEND]: 10e1,
  [RiskType.CONTRACT_ADDRESS]: 10e3,
  [RiskType.SCAM_ADDRESS]: 10e4,
};

export function sortRisksDesc(a: { type: RiskType }, b: { type: RiskType }) {
  return (
    riskTypePriority[b.type as keyof typeof riskTypePriority] -
    riskTypePriority[a.type as keyof typeof riskTypePriority]
  );
}

export type RiskItem = { type: RiskType; value: string };
type ForBiddenCheckParams = {
  user_addr: string;
  id?: string;
  chain_id?: string;
  to_addr: string;
};
export const useAddressRisks = (options: {
  toAddress: string;
  fromAddress?: string;
  forbiddenCheck?: ForBiddenCheckParams;
  onLoadFinished?: (/* ctx: { risks: Array<RiskItem> } */) => void;
  editCex?: IExchange | null;
  scene?: 'send-poly' | 'send-nft' | 'send-token';
}) => {
  const {
    toAddress,
    fromAddress,
    forbiddenCheck: input_forbiddenCheck,
    editCex,
    onLoadFinished,
    scene = 'send-poly',
  } = options || {};

  const { t } = useTranslation();
  const wallet = useWallet();
  const dispatch = useRabbyDispatch();

  const { accountsList, exchanges } = useRabbySelector((s) => ({
    accountsList: s.accountToDisplay.accountsList,
    exchanges: s.exchange.exchanges,
  }));

  const [addressDesc, setAddressDesc] = useState<
    AddrDescResponse['desc'] | undefined
  >();
  const [forbiddenTip, setForbiddenTip] = useState<string>('');
  const [loadingAddrDesc, setLoadingAddrDesc] = useState(true);
  const [hasNoSent, setHasNoSent] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [loadingHasTransfer, setLoadingHasTransfer] = useState(true);

  const risks = useMemo(() => {
    const isContract = Object.keys(addressDesc?.contract || {}).length > 0;
    const isSafeAddress = Object.keys(addressDesc?.contract || {}).some(
      (key) => {
        const contract = addressDesc?.contract?.[key];
        return !!contract?.multisig;
      }
    );
    return [
      forbiddenTip
        ? {
            type: RiskType.FORBIDDEN_TIP,
            value: forbiddenTip,
          }
        : null,
      addressDesc?.cex?.id && !addressDesc.cex.is_deposit
        ? {
            type: RiskType.CEX_NO_DEPOSIT,
            value:
              scene === 'send-poly'
                ? t('page.sendPoly.riskAlert.riskType.risks.dexNoDeposite')
                : t(
                    'page.selectToAddress.riskAlert.riskType.risks.dexNoDeposite'
                  ),
          }
        : null,
      addressDesc?.is_danger || addressDesc?.is_scam
        ? {
            type: RiskType.SCAM_ADDRESS,
            value:
              scene === 'send-poly'
                ? t('page.sendPoly.riskAlert.riskType.risks.scamAddress')
                : t(
                    'page.selectToAddress.riskAlert.riskType.risks.scamAddress'
                  ),
          }
        : null,
      isContract && !isSafeAddress
        ? {
            type: RiskType.CONTRACT_ADDRESS,
            value:
              scene === 'send-poly'
                ? t('page.sendPoly.riskAlert.riskType.risks.contractAddress')
                : t(
                    'page.selectToAddress.riskAlert.riskType.risks.contractAddress'
                  ),
          }
        : null,
      hasNoSent
        ? {
            type: RiskType.NEVER_SEND,
            value:
              scene === 'send-poly'
                ? t('page.sendPoly.riskAlert.riskType.risks.noSend')
                : t('page.selectToAddress.riskAlert.riskType.risks.noSend'),
          }
        : null,
    ].filter((i) => !!i) as { type: RiskType; value: string }[];
  }, [forbiddenTip, scene, addressDesc, hasNoSent, t]);

  const myTop10AccountList = useMemo(
    () =>
      accountsList
        .filter(
          (e) =>
            !(<string[]>[
              KEYRING_CLASS.WATCH,
              KEYRING_CLASS.GNOSIS,
              KEYRING_CLASS.WALLETCONNECT,
              KEYRING_CLASS.CoboArgus,
            ]).includes(e.type)
        )
        .sort((a, b) => b.balance - a.balance)
        .slice(0, 10),
    [accountsList]
  );

  const caredAddresses = useMemo(() => {
    if (fromAddress) return [fromAddress];

    return myTop10AccountList.map((acc) => acc.address);
  }, [fromAddress, myTop10AccountList]);

  useEffect(() => {
    if (!isValidAddress(toAddress)) {
      return;
    }
    dispatch.accountToDisplay.getAllAccountsToDisplay();
  }, [toAddress, dispatch.accountToDisplay]);

  useLayoutEffect(() => {
    if (toAddress) {
      setAddressDesc(undefined);
      setLoadingAddrDesc(true);
      setHasNoSent(false);
      setHasError(false);
      setLoadingHasTransfer(true);
    }
  }, [toAddress]);

  useEffect(() => {
    (async () => {
      if (!isValidAddress(toAddress)) {
        return;
      }
      setLoadingAddrDesc(true);
      try {
        const addrDescRes = await wallet.openapi.addrDesc(toAddress);
        const cexId = await wallet.getCexId(toAddress);
        if (addrDescRes) {
          if (cexId) {
            const localCexInfo = exchanges.find(
              (e) => e.id.toLowerCase() === cexId?.toLowerCase()
            );
            if (localCexInfo) {
              addrDescRes.desc.cex = {
                id: localCexInfo?.id || '',
                name: localCexInfo?.name || '',
                logo_url: localCexInfo?.logo || '',
                is_deposit: true,
              };
            }
          }
          if (editCex) {
            addrDescRes.desc.cex = {
              id: editCex?.id || '',
              name: editCex?.name || '',
              logo_url: editCex?.logo || '',
              is_deposit: true,
            };
          }
          setAddressDesc(addrDescRes.desc);
        }
      } catch (error) {
        /* empty */
      } finally {
        setLoadingAddrDesc(false);
      }
    })();
  }, [toAddress, dispatch, editCex, exchanges, wallet]);

  const memoForbiddenCheck = useMemo(() => {
    return {
      chain_id: input_forbiddenCheck?.chain_id,
      id: input_forbiddenCheck?.id,
      user_addr: input_forbiddenCheck?.user_addr,
      to_addr: input_forbiddenCheck?.to_addr,
    };
  }, [
    input_forbiddenCheck?.chain_id,
    input_forbiddenCheck?.id,
    input_forbiddenCheck?.user_addr,
    input_forbiddenCheck?.to_addr,
  ]);
  const forbiddenCheck = useDebouncedValue(memoForbiddenCheck, 300);

  const reqForbiddenTip = useCallback(async () => {
    const allValuesSet =
      forbiddenCheck?.chain_id &&
      forbiddenCheck?.to_addr &&
      forbiddenCheck?.user_addr &&
      forbiddenCheck?.id;
    if (allValuesSet) {
      await wallet.openapi
        .checkTokenDepositForbidden({
          chain_id: forbiddenCheck?.chain_id || 'eth',
          to_addr: forbiddenCheck?.to_addr || '',
          user_addr: forbiddenCheck?.user_addr || '',
          id: forbiddenCheck?.id || '',
        })
        .then((res) => {
          setForbiddenTip(res?.msg || '');
        })
        .catch((error) => {
          console.error('checkTokenDepositForbidden error', error);
          setForbiddenTip('');
        });
    } else {
      setForbiddenTip('');
    }
  }, [
    wallet,
    forbiddenCheck?.chain_id,
    forbiddenCheck?.to_addr,
    forbiddenCheck?.user_addr,
    forbiddenCheck?.id,
  ]);

  useEffect(() => {
    reqForbiddenTip();
  }, [reqForbiddenTip]);

  const riskGetRef = useRef({
    currentAddrs: [] as string[],
    controller: null as AbortController | null,
  });
  useEffect(() => {
    if (
      riskGetRef.current.currentAddrs.sort().join(',') ===
        caredAddresses.sort().join(',') ||
      !caredAddresses.length ||
      !isValidAddress(toAddress)
    ) {
      return;
    }

    riskGetRef.current.currentAddrs = caredAddresses;
    const prevController = riskGetRef.current.controller;
    if (prevController) prevController.abort();

    riskGetRef.current.controller = new AbortController();
    const currentController = riskGetRef.current.controller;
    (async () => {
      setLoadingHasTransfer(true);
      setHasError(false);
      let hasSent = false;
      let hasError = false;
      try {
        const hasAborted = (resolveFunc: any) => {
          if (currentController.signal.aborted) {
            resolveFunc();
            queue.clear();
            return true;
          }
        };
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('timeout')), 3000);
        });
        const checkTransferPromise = new Promise<void>((resolve) => {
          caredAddresses.forEach((addr) => {
            if (hasAborted(resolve)) return;
            if (isSameAddress(addr, toAddress)) return;
            queue.add(async () => {
              try {
                if (hasAborted(resolve)) return;
                if (hasSent || hasError) return;
                const res = await wallet.openapi.hasTransferAllChain(
                  addr,
                  toAddress
                );
                if (res?.has_transfer) {
                  hasSent = true;
                  queue.clear();
                  resolve();
                }
              } catch (error) {
                console.error('has_transfer fetch error', error);
                hasError = true;
                queue.clear();
                resolve();
              }
            });
          });
          waitQueueFinished(queue).then(() => resolve());
        });

        await Promise.race([checkTransferPromise, timeoutPromise]);
        setHasNoSent(!hasSent);
        setHasError(hasError);
      } catch (error) {
        console.error('check transfer timeout or error', error);
        setHasError(true);
        setHasNoSent(true);
        queue.clear();
      } finally {
        onLoadFinished?.();
        setLoadingHasTransfer(false);
      }
    })();
  }, [toAddress, caredAddresses, onLoadFinished, wallet]);

  return {
    risks,
    addressDesc,
    hasNoSent,
    loading: loadingHasTransfer || loadingAddrDesc,
    loadingAddrDesc,
    loadingHasTransfer,
    hasNotRisk:
      !risks.length && !loadingHasTransfer && !loadingAddrDesc && !hasError,
  };
};
