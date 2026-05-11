import { useEffect, useMemo, useRef } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { usePerpsDefaultAccount } from '../../Perps/hooks/usePerpsDefaultAccount';
import { getPerpsSDK } from '../../Perps/sdkManager';
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { useWallet } from '@/ui/utils';
import { PERPS_AGENT_NAME } from '../../Perps/constants';
import { usePerpsProState } from './usePerpsProState';
import { preloadSound } from '@/ui/utils/sound';
import { DARK_MODE_TYPE } from '@/constant';
import { useRequest } from 'ahooks';

export const usePerpsProInit = (isActive = true) => {
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
  const history = useHistory();
  const location = useLocation();

  const urlCoin = useMemo(() => {
    return new URLSearchParams(location.search).get('coin');
  }, [location.search]);

  // Init persisted settings + coin (URL coin > persisted coin)
  useEffect(() => {
    dispatch.perps.initQuoteUnit(undefined);
    dispatch.perps.initFavoritedCoins(undefined);
    dispatch.perps.initMarketSlippage(undefined);
    dispatch.perps.initSoundEnabled(undefined);
    dispatch.perps.initSkipMarketCloseConfirm(undefined);
    if (urlCoin) {
      dispatch.perps.updateSelectedCoin(urlCoin);
    } else {
      dispatch.perps.initSelectedCoin(undefined);
    }
  }, []);

  // URL coin changed -> sync to redux
  const prevUrlCoin = useRef(urlCoin);
  useEffect(() => {
    if (!isActive) return;
    if (prevUrlCoin.current === urlCoin) return;
    prevUrlCoin.current = urlCoin;
    if (urlCoin && urlCoin !== selectedCoin) {
      dispatch.perps.updateSelectedCoin(urlCoin);
    }
  }, [urlCoin, isActive]);

  // selectedCoin changed -> sync to URL
  const prevSelectedCoin = useRef(selectedCoin);
  useEffect(() => {
    if (!isActive) return;
    if (prevSelectedCoin.current === selectedCoin) return;
    prevSelectedCoin.current = selectedCoin;
    if (selectedCoin && selectedCoin !== urlCoin) {
      const searchParams = new URLSearchParams(location.search);
      searchParams.set('coin', selectedCoin);
      history.replace({
        pathname: location.pathname,
        search: searchParams.toString(),
      });
    }
  }, [selectedCoin, isActive]);

  const checkIsNeedSetDarkTheme = async () => {
    const isNeedSetDarkTheme = await wallet.getPerpsIsNeedSetDarkTheme();
    if (isNeedSetDarkTheme) {
      dispatch.preference.switchThemeMode(DARK_MODE_TYPE.dark);
    }
  };

  useEffect(() => {
    checkIsNeedSetDarkTheme();
  }, []);

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

  const lang = useRabbySelector((state) => state.preference.locale);

  const { data: tokenDetail } = useRequest(
    async () => {
      const res = await wallet.openapi.getPerpTokenDetail({
        name: selectedCoin,
        lang,
      });
      dispatch.perps.patchState({ selectedTokenDetail: res });
      return res;
    },
    { refreshDeps: [selectedCoin, lang] }
  );

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
