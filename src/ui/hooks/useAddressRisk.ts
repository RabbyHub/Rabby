import { AddrDescResponse } from '@rabby-wallet/rabby-api/dist/types';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import PQueue from 'p-queue';
import { useRabbyDispatch, useRabbySelector } from '../store';
import { isValidAddress } from '@ethereumjs/util';
import { isSameAddress, useWallet } from '../utils';
import { KEYRING_CLASS } from 'consts';
import { IExchange } from '../component/CexSelect';
import { useTranslation } from 'react-i18next';

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
}

export const useAddressRisks = (
  address: string,
  editCex?: IExchange | null
) => {
  const [addressDesc, setAddressDesc] = useState<
    AddrDescResponse['desc'] | undefined
  >();
  const { t } = useTranslation();
  const [loadingAddrDesc, setLoadingAddrDesc] = useState(true);
  const [hasNoSend, setHasNoSend] = useState(false);
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
      addressDesc?.cex?.id && !addressDesc.cex.is_deposit
        ? {
            type: RiskType.CEX_NO_DEPOSIT,
            value: t('page.sendPoly.riskAlert.riskType.risks.dexNoDeposite'),
          }
        : null,
      addressDesc?.is_danger || addressDesc?.is_scam
        ? {
            type: RiskType.SCAM_ADDRESS,
            value: t('page.sendPoly.riskAlert.riskType.risks.scamAddress'),
          }
        : null,
      isContract && !isSafeAddress
        ? {
            type: RiskType.CONTRACT_ADDRESS,
            value: t('page.sendPoly.riskAlert.riskType.risks.contractAddress'),
          }
        : null,
      hasNoSend
        ? {
            type: RiskType.NEVER_SEND,
            value: t('page.sendPoly.riskAlert.riskType.risks.noSend'),
          }
        : null,
    ].filter((i) => !!i) as { type: RiskType; value: string }[];
  }, [addressDesc, hasNoSend]);
  const dispatch = useRabbyDispatch();
  const wallet = useWallet();
  const { accountsList, exchanges } = useRabbySelector((s) => ({
    accountsList: s.accountToDisplay.accountsList,
    exchanges: s.exchange.exchanges,
  }));
  const myTop10AccountList = useMemo(
    () =>
      accountsList
        .filter(
          (acc) =>
            acc.type !== KEYRING_CLASS.WATCH &&
            acc.type !== KEYRING_CLASS.GNOSIS
        )
        .sort((a, b) => a.balance - b.balance)
        .slice(0, 10),
    [accountsList]
  );
  useEffect(() => {
    if (!isValidAddress(address)) {
      return;
    }
    dispatch.accountToDisplay.getAllAccountsToDisplay();
  }, []);

  const riskGetRef = useRef(false);

  useLayoutEffect(() => {
    if (address) {
      riskGetRef.current = false;
      setAddressDesc(undefined);
      setLoadingAddrDesc(true);
      setHasNoSend(false);
      setLoadingHasTransfer(true);
    }
  }, [address]);

  useEffect(() => {
    (async () => {
      if (!isValidAddress(address)) {
        return;
      }
      setLoadingAddrDesc(true);
      try {
        const addrDescRes = await wallet.openapi.addrDesc(address);
        const cexId = await wallet.getCexId(address);
        if (addrDescRes) {
          if (cexId) {
            const localCexInfo = exchanges.find(
              (e) => e.id.toLocaleLowerCase() === cexId?.toLocaleLowerCase()
            );
            if (localCexInfo) {
              addrDescRes.desc.cex = {
                id: localCexInfo?.id || '',
                name: localCexInfo?.name || '',
                logo_url: localCexInfo?.logo || '',
                is_deposit: true,
              };
            }
            if (editCex) {
              addrDescRes.desc.cex = {
                id: editCex?.id || '',
                name: editCex?.name || '',
                logo_url: editCex?.logo || '',
                is_deposit: true,
              };
            }
          }
          setAddressDesc(addrDescRes.desc);
        }
      } catch (error) {
        /* empty */
      } finally {
        setLoadingAddrDesc(false);
      }
    })();
  }, [address, dispatch, editCex]);

  useEffect(() => {
    if (
      riskGetRef.current ||
      !myTop10AccountList.length ||
      !isValidAddress(address)
    ) {
      return;
    }
    riskGetRef.current = true;
    (async () => {
      setLoadingHasTransfer(true);
      let hasSended = false;
      let hasError = false;
      try {
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('timeout')), 2000);
        });
        const checkTransferPromise = new Promise<void>((resolve) => {
          myTop10AccountList.forEach((acc) => {
            if (isSameAddress(acc.address, address)) {
              return;
            }
            queue.add(async () => {
              try {
                if (hasSended || hasError) {
                  return;
                }
                const res = await wallet.openapi.hasTransferAllChain(
                  acc.address,
                  address
                );
                if (res?.has_transfer) {
                  hasSended = true;
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
        if (!hasSended && !hasError) {
          setHasNoSend(true);
        }
      } catch (error) {
        console.error('check transfer timeout or error', error);
        queue.clear();
      } finally {
        setLoadingHasTransfer(false);
      }
    })();
  }, [address, myTop10AccountList, wallet]);

  return {
    risks,
    addressDesc,
    hasNoSend,
    loading: loadingHasTransfer || loadingAddrDesc,
    loadingAddrDesc,
    loadingHasTransfer,
  };
};
