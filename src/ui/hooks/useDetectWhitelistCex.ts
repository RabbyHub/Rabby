import { useCallback, useEffect, useRef } from 'react';
import { isSameAddress, useWallet } from '@/ui/utils';
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { KEYRING_CLASS } from '@/constant';
import PQueue from 'p-queue';

const queue = new PQueue({
  concurrency: 5,
  interval: 1000,
  intervalCap: 5,
});

export const useDetectWhitelistCex = () => {
  const wallet = useWallet();
  const dispatch = useRabbyDispatch();
  const { accountsList, whitelist, whitelistEnabled } = useRabbySelector(
    (s) => ({
      accountsList: s.accountToDisplay.accountsList,
      whitelist: s.whitelist.whitelist,
      whitelistEnabled: s.whitelist.enabled,
    })
  );
  const initialized = useRef(false);

  useEffect(() => {
    dispatch.accountToDisplay.getAllAccountsToDisplay();
    dispatch.whitelist.getWhitelistEnabled();
    dispatch.whitelist.getWhitelist();
  }, []);

  const initDetect = useCallback(async () => {
    if (!whitelistEnabled || initialized.current) {
      return;
    }
    const coreAccountList = accountsList.filter(
      (acc) => acc.type !== KEYRING_CLASS.WATCH
    );
    const filteredAddresses = whitelist.filter(
      (addr) => !coreAccountList.some((acc) => isSameAddress(acc.address, addr))
    );
    const top10Addresses = filteredAddresses.slice(0, 10);

    top10Addresses.map((address) => {
      return queue.add(async () => {
        try {
          const exist = await wallet.getCexId(address);
          if (exist) {
            return;
          }
          const result = await wallet.openapi.addrDesc(address);
          if (result.desc.cex?.id && result.desc.cex?.is_deposit) {
            await wallet.updateCexId(address, result.desc.cex.id);
          }
        } catch (error) {
          console.error(
            'Failed to fetch CEX info for address:',
            address.slice(-4),
            error
          );
        }
      });
    });
    initialized.current = true;
  }, [wallet, whitelistEnabled, accountsList, whitelist]);

  useEffect(() => {
    if (whitelistEnabled && whitelist.length > 0 && !initialized.current) {
      initDetect();
    }
  }, [whitelistEnabled, whitelist, initDetect]);

  return {
    initDetect,
  };
};
