import React, { useMemo, useState } from 'react';
import { PageHeader } from '@/ui/component';
import { useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useWallet } from '@/ui/utils';
import { useCurrentAccount } from '@/ui/hooks/backgroundState/useAccount';
import { findChainByEnum } from '@/utils/chain';
import { HyperliquidSDK } from '@rabby-wallet/hyperliquid-sdk';
import { CHAINS_ENUM } from '@debank/common';

const formatUSD = (v?: number) => `$${(v || 0).toFixed(2)}`;

export const Perps: React.FC = () => {
  const history = useHistory();
  const { t } = useTranslation();
  const wallet = useWallet();
  const current = useCurrentAccount();
  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState<number>(100);
  const [available, setAvailable] = useState<number>(50);
  const chain = useMemo(() => findChainByEnum(CHAINS_ENUM.ETH), []);

  const goBack = () => {
    if (history.length > 1) {
      history.goBack();
      return;
    }
    history.push('/dashboard');
  };

  const handleDeposit = async () => {
    if (!current?.address || !chain) return;
    try {
      setLoading(true);

      // await wallet.sendRequest(
      //   {
      //     method: 'eth_sendTransaction',
      //     params: [
      //       {
      //         from: current.address,
      //         to,
      //         data: data || '0x',
      //         value: value || '0x0',
      //         chainId: chain.id,
      //       },
      //     ],
      //   },
      //   { isBuild: true }
      // );
      setBalance((v) => v + 10);
      setAvailable((v) => v + 10);
    } catch (e) {
      console.error(e?.message || e);
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async () => {
    if (!current?.address || !chain) return;
    try {
      setLoading(true);
      setBalance((v) => (v - 10 < 0 ? 0 : v - 10));
      setAvailable((v) => (v - 10 < 0 ? 0 : v - 10));
    } catch (e) {
      console.error(e?.message || e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full min-h-full bg-r-neutral-bg2 flex flex-col">
      <PageHeader
        className="mx-[20px] pt-[20px] mb-[20px]"
        forceShowBack
        onBack={goBack}
      >
        <span className="text-20 font-medium text-r-neutral-title-1">
          Perps
        </span>
      </PageHeader>

      <div className="flex-1 overflow-auto mx-20">
        <div className="bg-r-neutral-card1 rounded-[12px] p-20 shadow-sm">
          <div className="text-28 font-semibold text-r-neutral-title-1">
            {formatUSD(balance)}
          </div>
          <div className="text-13 text-r-neutral-foot mt-6">
            Available: {formatUSD(available)}
          </div>
          <div className="flex gap-12 mt-16">
            <button
              className="h-40 px-16 rounded-[8px] border border-rabby-neutral-line text-r-neutral-title-1 bg-transparent hover:bg-r-neutral-bg3"
              onClick={handleWithdraw}
              disabled={loading}
            >
              Withdraw
            </button>
            <button
              className="h-40 px-16 rounded-[8px] text-white bg-r-blue-default hover:bg-r-blue-light"
              onClick={handleDeposit}
              disabled={loading}
            >
              Deposit
            </button>
          </div>
        </div>

        <div className="mt-20">
          <div className="text-13 text-r-neutral-foot mb-8">Positions</div>
          <div className="space-y-8">
            <div className="bg-r-neutral-card1 rounded-[12px] p-12 flex items-center justify-between">
              <div className="flex items-center gap-10">
                <div className="w-28 h-28 rounded-full bg-black/10" />
                <div>
                  <div className="text-13 text-r-neutral-title-1">
                    BTC - USD
                  </div>
                  <div className="text-12 text-r-neutral-foot">Short 10x</div>
                </div>
              </div>
              <div className="text-13 text-r-neutral-title-1">$110.00</div>
            </div>

            <div className="bg-r-neutral-card1 rounded-[12px] p-12 flex items-center justify-between">
              <div className="flex items-center gap-10">
                <div className="w-28 h-28 rounded-full bg-black/10" />
                <div>
                  <div className="text-13 text-r-neutral-title-1">
                    ETH - USD
                  </div>
                  <div className="text-12 text-r-neutral-foot">Short 25x</div>
                </div>
              </div>
              <div className="text-13 text-r-neutral-title-1">$55.50</div>
            </div>

            <div className="bg-r-neutral-card1 rounded-[12px] p-12 flex items-center justify-between">
              <div className="flex items-center gap-10">
                <div className="w-28 h-28 rounded-full bg-black/10" />
                <div>
                  <div className="text-13 text-r-neutral-title-1">
                    SOL - USD
                  </div>
                  <div className="text-12 text-r-neutral-foot">Long 25x</div>
                </div>
              </div>
              <div className="text-13 text-r-neutral-title-1">$32.94</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Perps;
