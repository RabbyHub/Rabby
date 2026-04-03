import { Account } from '@/background/service/preference';
import { RcIconArrowRightCC } from '@/ui/assets/dashboard';
import { DesktopAccountSelector } from '@/ui/component/DesktopAccountSelector';
import { useCurrentAccount } from '@/ui/hooks/backgroundState/useAccount';
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import clsx from 'clsx';
import React, { useEffect, useMemo, useState } from 'react';
import IconRabby from 'ui/assets/rabby.svg';

import { db } from '@/db';
import { findChain } from '@/utils/chain';
import { useLiveQuery } from 'dexie-react-hooks';
import { sortBy } from 'lodash';
import { ChainPillList } from './components/ChainPillList';
import { LowValueTokenSelector } from './components/LowValueTokenSelector';
import { ReceiveSummary } from './components/ReceiveSummary';
import { defaultTokenFilter } from '@/ui/utils/portfolio/lpToken';
import { DisplayedToken } from '@/ui/utils/portfolio/project';
import { useRequest } from 'ahooks';
import { sleep, useWallet } from '@/ui/utils';
import {
  buildSwapTxs,
  getActiveProvider,
  useBatchSwapTask,
} from './hooks/useBatchSwapTask';
import { DEX } from '@/constant';
import { DEX_ENUM } from '@rabby-wallet/rabby-swap';
import { useQuoteMethods } from '../Swap/hooks/quote';

export const DesktopSmallSwap: React.FC<{
  isActive?: boolean;
  style?: React.CSSProperties;
}> = ({ isActive = true, style }) => {
  const dispatch = useRabbyDispatch();
  const currentAccount = useCurrentAccount();
  const wallet = useWallet();

  const [chainServerId, setChainServerId] = useState('');

  const handleAccountChange = (account: Account) => {
    dispatch.account.changeAccountAsync(account);
  };

  const chainList = useLiveQuery(() => {
    return db.balance
      .where('address')
      .equalsIgnoreCase(currentAccount?.address || '')
      .first()
      .then((data) => {
        return sortBy(data?.chain_list || [], (item) => -(item.usd_value || 0));
      });
  }, [currentAccount?.address]);

  if (chainList?.length && !chainServerId) {
    setChainServerId(chainList[0].id);
  }

  const chain = useMemo(() => {
    console.log('chainList', chainList, chainServerId);
    return findChain({
      serverId: chainServerId,
    });
  }, [chainList, chainServerId]);

  const tokenList = useLiveQuery(() => {
    if (!currentAccount?.address || !chainServerId) {
      return [];
    }
    return db.token
      .where('[owner_addr+chain]')
      .equals([currentAccount?.address?.toLowerCase() || '', chainServerId])
      .toArray();
  }, [currentAccount?.address, chainServerId, chain?.nativeTokenAddress]);

  const [selectedTokenIds, setSelectedTokenIds] = useState<string[]>([]);
  const handleSelectedChange = (ids: string[]) => {
    setSelectedTokenIds(ids);
    task.init(tokenList?.filter((item) => ids.includes(item.id)) || []);
  };

  const { data: receiveToken } = useRequest(
    async () => {
      if (!chain) {
        return null;
      }
      return wallet.openapi.getToken(
        currentAccount?.address || '',
        chain.serverId,
        chain.nativeTokenAddress
      );
    },
    {
      refreshDeps: [chain, currentAccount?.address],
    }
  );

  console.log('receiveToken', receiveToken);

  const supportedDEXList = useRabbySelector((s) => s.swap.supportedDEXList);
  const dexId = (supportedDEXList.filter((e) => DEX[e]) as DEX_ENUM[])[0];
  const { getDexQuote } = useQuoteMethods();

  // getDexQuote({
  //   ...params,
  //   dexId,
  //   sharedTasks: {
  //     preFetched: sharedPreFetched,
  //     recommendNonceTask: sharedRecommendNonceTask || undefined,
  //   },
  // });
  const task = useBatchSwapTask({
    chain: chain || undefined,
    account: currentAccount || undefined,
    receiveToken: receiveToken || undefined,
    slippage: '3',
  });
  const onStart = async () => {
    console.log('start swap');
    const payToken = tokenList?.find((item) => item.id === selectedTokenIds[0]);
    if (
      !payToken ||
      !chain ||
      !receiveToken ||
      !currentAccount?.address ||
      !dexId
    ) {
      return;
    }

    // const activeProvider = await getActiveProvider({
    //   chain,
    //   currentAddress: currentAccount.address,
    //   dexId,
    //   getDexQuote,
    //   payToken,
    //   receiveToken,
    //   slippage: '3',
    // });
    // console.log('activeProvider', activeProvider);

    // task.init(
    //   tokenList?.filter((item) => selectedTokenIds.includes(item.id)) || []
    // );
    // await sleep(100);
    // task.start(
    //   tokenList?.filter((item) => selectedTokenIds.includes(item.id)) || []
    // );
    // const payToken = tokenList?.find((item) => item.id === selectedTokenIds[0]);
    // const slippage = 3;
    // console.log('payToken', payToken);
    // if (!chain || !payToken || !receiveToken || !currentAccount) {
    //   return;
    // }
    // const isOpenOcean = dexId === DEX_ENUM.OPENOCEAN;
    // const isSwapWrappedToken = isSwapWrapToken(
    //   payToken.id,
    //   receiveToken.id,
    //   chain.enum
    // );
    // const feeAfterDiscount = isSwapWrappedToken ? '0' : '0.25';
    // // 获取报价
    // const quote = await getQuote(
    //   isSwapWrappedToken ? DEX_ENUM.WRAPTOKEN : dexId,
    //   {
    //     fromToken: payToken.id,
    //     toToken: receiveToken.id,
    //     feeAddress: SWAP_FEE_ADDRESS,
    //     fromTokenDecimals: payToken.decimals,
    //     amount: new BigNumber(payToken.raw_amount_hex_str || 0).toFixed(0, 1),
    //     userAddress: currentAccount?.address,
    //     slippage: Number(slippage),
    //     feeRate:
    //       feeAfterDiscount === '0' && isOpenOcean
    //         ? undefined
    //         : Number(feeAfterDiscount) || 0,
    //     chain: chain.enum,
    //     fee: true,
    //     chainServerId: chain.serverId,
    //     nativeTokenAddress: chain.nativeTokenAddress,
    //     insufficient: false,
    //   },
    //   wallet.openapi
    // );

    // console.log('quote', quote);

    // 构建交易
  };

  console.log('render', task);

  return (
    <div
      className={clsx(
        'h-full overflow-auto bg-r-neutral-bg-2',
        !isActive && 'hidden'
      )}
      style={style}
    >
      <div className="max-w-[1248px] min-w-[1200px] mx-auto px-[24px] pt-[32px] pb-[40px] min-h-full">
        <header className="flex items-start justify-between gap-[24px] mb-[32px]">
          <div className="min-w-0">
            <div className="flex items-center gap-[16px]">
              <img src={IconRabby} alt="Rabby" />
              <div className="space-y-[8px]">
                <div className="text-[24px] leading-[29px] font-semibold text-r-neutral-title1">
                  Dust converter
                </div>
                <div className="text-[15px] leading-[18px] text-r-neutral-foot">
                  Clear out low-value tokens on the blockchain to make your
                  asset list simpler!
                </div>
              </div>
            </div>
          </div>

          <DesktopAccountSelector
            value={currentAccount}
            onChange={handleAccountChange}
          />
        </header>

        <ChainPillList
          data={chainList}
          value={chainServerId}
          onChange={setChainServerId}
        />

        <div className="flex items-stretch justify-between gap-[24px]">
          <LowValueTokenSelector
            chain={chain}
            tokenList={tokenList || []}
            selectedTokenIds={selectedTokenIds}
            onSelectedChange={handleSelectedChange}
            task={task}
          />

          <div className="w-[64px] flex items-center justify-center flex-shrink-0">
            <button
              type="button"
              className="w-[48px] h-[48px] rounded-full border border-rabby-neutral-line bg-r-neutral-card-1 flex items-center justify-center text-r-neutral-foot hover:text-r-blue-default hover:border-r-blue-default"
              style={{ boxShadow: '0 12px 24px rgba(25, 41, 69, 0.08)' }}
            >
              <RcIconArrowRightCC className="w-[18px] h-[18px]" />
            </button>
          </div>

          <ReceiveSummary
            token={receiveToken}
            chain={chain}
            task={task}
            onStart={onStart}
            // onStart={() => {
            //   if (!chain || !receiveToken) {
            //     return;
            //   }
            //   buildSwapTxs({
            //     // todo
            //     wallet,
            //     chain: chain.enum,
            //     quote: activeProvider?.quote,
            //     needApprove: activeProvider.shouldApproveToken,
            //     spender:
            //       activeProvider?.name === DEX_ENUM.WRAPTOKEN
            //         ? ''
            //         : DEX_SPENDER_WHITELIST[activeProvider.name][chain],
            //     pay_token_id: payToken.id,
            //     unlimited: false,
            //     shouldTwoStepApprove: activeProvider.shouldTwoStepApprove,
            //     gasPrice:
            //       payTokenIsNativeToken && passGasPrice
            //         ? gasList?.find((e) => e.level === gasLevel)?.price
            //         : undefined,
            //     postSwapParams: {
            //       quote: {
            //         pay_token_id: payToken.id,
            //         pay_token_amount: Number(inputAmount),
            //         receive_token_id: receiveToken!.id,
            //         receive_token_amount: new BigNumber(
            //           activeProvider?.quote.toTokenAmount
            //         )
            //           .div(
            //             10 **
            //             (activeProvider?.quote.toTokenDecimals ||
            //               receiveToken.decimals)
            //           )
            //           .toNumber(),
            //         slippage: new BigNumber(slippage).div(100).toNumber(),
            //       },
            //       dex_id: activeProvider?.name || 'WrapToken',
            //     },
            //     addHistoryData: {
            //       address: userAddress,
            //       chainId: findChain({ enum: chain })?.id || 0,
            //       fromToken: payToken,
            //       toToken: receiveToken,
            //       fromAmount: Number(inputAmount),
            //       toAmount: new BigNumber(activeProvider?.quote.toTokenAmount)
            //         .div(
            //           10 **
            //           (activeProvider?.quote.toTokenDecimals ||
            //             receiveToken.decimals)
            //         )
            //         .toNumber(),
            //       slippage: new BigNumber(slippage).div(100).toNumber(),
            //       dexId: activeProvider?.name || 'WrapToken',
            //       status: 'pending',
            //       createdAt: Date.now(),
            //     },
            //   })
            // }}
          />
        </div>
      </div>
    </div>
  );
};
