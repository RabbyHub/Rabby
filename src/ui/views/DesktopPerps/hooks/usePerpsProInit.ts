import { useEffect } from 'react';
import { usePerpsDefaultAccount } from '../../Perps/hooks/usePerpsDefaultAccount';
import { getPerpsSDK } from '../../Perps/sdkManager';
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { useWallet } from '@/ui/utils';
import { PERPS_AGENT_NAME } from '../../Perps/constants';
import { usePerpsProState } from './usePerpsProState';
import { preloadSound } from '@/ui/utils/sound';

export const usePerpsProInit = () => {
  usePerpsDefaultAccount({
    isPro: true,
  });

  const { ensureLoginApproveSign } = usePerpsProState();

  const selectedCoin = useRabbySelector((state) => state.perps.selectedCoin);
  const currentPerpsAccount = useRabbySelector(
    (state) => state.perps.currentPerpsAccount
  );
  const isInitialized = useRabbySelector((state) => state.perps.isInitialized);
  const dispatch = useRabbyDispatch();
  const wallet = useWallet();

  useEffect(() => {
    dispatch.perps.initFavoritedCoins(undefined);
    dispatch.perps.initMarketSlippage(undefined);
    dispatch.perps.initSoundEnabled(undefined);
  }, [dispatch]);

  useEffect(() => {
    preloadSound('/sounds/order-filled.mp3');
  }, []);

  useEffect(() => {
    const sdk = getPerpsSDK();
    const { unsubscribe } = sdk.ws.subscribeToActiveAssetCtx(
      selectedCoin,
      (data) => {
        dispatch.perps.setWsActiveAssetCtx(data);
      }
    );
    return () => {
      unsubscribe();
    };
  }, [selectedCoin]);

  useEffect(() => {
    if (!selectedCoin || !currentPerpsAccount?.address) {
      return;
    }

    const sdk = getPerpsSDK();
    const { unsubscribe } = sdk.ws.subscribeToActiveAssetData(
      selectedCoin,
      currentPerpsAccount?.address,
      (data) => {
        dispatch.perps.setWsActiveAssetData(data);
      }
    );
    return () => {
      unsubscribe();
    };
  }, [selectedCoin, currentPerpsAccount?.address]);

  useEffect(() => {
    if (isInitialized) {
      return;
    }

    const initIsLogin = async () => {
      try {
        const initAccount = currentPerpsAccount;
        if (!initAccount) {
          return false;
        }
        const {
          vault,
          agentAddress,
        } = await wallet.getOrCreatePerpsAgentWallet(initAccount.address);
        const sdk = getPerpsSDK();
        // 开始恢复登录态
        sdk.initAccount(
          initAccount.address,
          vault,
          agentAddress,
          PERPS_AGENT_NAME
        );
        await dispatch.perps.loginPerpsAccount({
          account: initAccount,
          isPro: true,
        });
        ensureLoginApproveSign(initAccount, agentAddress);

        await dispatch.perps.fetchMarketData(undefined);

        dispatch.perps.setInitialized(true);
        return true;
      } catch (error) {
        console.error('Failed to init Perps state:', error);
      }
    };

    initIsLogin();
  }, [
    wallet,
    dispatch,
    isInitialized,
    currentPerpsAccount?.address,
    currentPerpsAccount?.type,
  ]);
};
