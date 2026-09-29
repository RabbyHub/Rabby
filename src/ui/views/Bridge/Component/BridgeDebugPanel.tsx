import React, { useMemo, useState } from 'react';
import type {
  BridgeHistory,
  TokenItem,
} from '@rabby-wallet/rabby-api/dist/types';
import type { BridgeTxHistoryItem } from '@/background/service/transactionHistory';
import { Popup } from '@/ui/component';
import { openInternalPageInTab } from '@/ui/utils/webapi';
import { BridgeProgressCard } from './BridgeProgressCard';
import { BridgeStatusPopup } from './BridgeStatusPopup';
import IconUnknown from '@/ui/assets/token-default.svg';

// 临时 UI 测试入口，发布前关闭。
export const SHOW_BRIDGE_DEBUG = true;

const scenes = [
  'Source pending',
  'Source failed',
  'Estimate ≤5s',
  'Countdown',
  'Still Bridging',
  'Bridge Delayed',
  'Completed',
  'Refund original token',
  'Refund other token',
  'Failed / Contact Support',
];
const buttonClass =
  'rounded px-8 py-4 text-12 text-r-blue-default bg-r-blue-light-1';
const hash = `0x${'1'.repeat(64)}`;
const refundHash = `0x${'2'.repeat(64)}`;
const token = (chain: string, symbol = 'ETH'): TokenItem =>
  ({
    id: symbol === 'ETH' ? chain : '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    chain,
    symbol,
    display_symbol: symbol,
    name: symbol,
    decimals: symbol === 'ETH' ? 18 : 6,
    logo_url: IconUnknown,
    price: symbol === 'ETH' ? 3000 : 1,
    amount: 1,
    is_verified: true,
  } as TokenItem);

// 仅传给展示组件，不写缓存或提交交易。
const createPreview = (scene: number) => {
  const now = Date.now();
  const local: BridgeTxHistoryItem = {
    address: '',
    fromChainId: 1,
    toChainId: 8453,
    fromToken: token('eth'),
    toToken: token('base'),
    slippage: 1,
    fromAmount: 0.1,
    toAmount: 0.099,
    dexId: 'relay',
    status: 'fromSuccess',
    hash,
    estimatedDuration: scene === 2 ? 3 : 60,
    createdAt: now - 60_000,
    fromTxCompleteTs: now,
  };
  if (scene === 0) {
    local.status = 'pending';
    local.fromTxCompleteTs = undefined;
  } else if (scene === 1) {
    local.status = 'fromFailed';
  } else if (scene === 4 || scene === 5) {
    local.fromTxCompleteTs = now - (scene === 4 ? 90_000 : 31 * 60_000);
    local.createdAt = local.fromTxCompleteTs - 60_000;
  } else if (scene >= 6) {
    local.status = scene === 6 ? 'allSuccess' : 'failed';
    if (scene < 9) {
      local.toTxId = refundHash;
      local.actualToToken =
        scene === 7
          ? local.fromToken
          : scene === 8
          ? token('eth', 'USDC')
          : local.toToken;
      local.actualToAmount = scene === 8 ? 299 : 0.099;
    }
  }
  const data = {
    aggregator: { id: 'relay', name: 'Relay', logo_url: IconUnknown },
    bridge: { id: 'relay', name: 'Relay', logo_url: IconUnknown },
    from_token: local.fromToken,
    to_token: local.toToken,
    to_actual_token: local.actualToToken,
    quote: {
      pay_token_amount: local.fromAmount,
      receive_token_amount: local.toAmount,
    },
    actual: {
      pay_token_amount: local.fromAmount,
      receive_token_amount: local.actualToAmount,
    },
    detail_url: `https://etherscan.io/tx/${hash}`,
    status:
      scene === 6
        ? 'completed'
        : scene === 1 || scene >= 7
        ? 'failed'
        : 'pending',
    create_at: local.createdAt / 1000,
    from_tx: {
      tx_id: hash,
      chain_id: 'eth',
      status: scene === 0 ? 'pending' : scene === 1 ? 'failed' : 'success',
      time_at: local.fromTxCompleteTs
        ? local.fromTxCompleteTs / 1000
        : undefined,
    },
    to_tx: { tx_id: local.toTxId },
  } as BridgeHistory;
  return { local, data };
};

/** 共用状态样例，直接渲染正式组件。 */
export const BridgeDebugPanel = ({
  renderHistory,
}: {
  renderHistory?: (
    data: BridgeHistory,
    local: BridgeTxHistoryItem,
    variant: 'detail' | 'general'
  ) => React.ReactNode;
}) => {
  const [expanded, setExpanded] = useState(false);
  const [scene, setScene] = useState(0);
  const [revision, setRevision] = useState(0);
  const [visible, setVisible] = useState(false);
  const [variant, setVariant] = useState<'detail' | 'general'>('detail');
  const { local, data } = useMemo(() => createPreview(scene), [
    scene,
    revision,
  ]);
  return (
    <div
      className={
        renderHistory
          ? 'shrink-0 p-8 text-r-neutral-title-1'
          : 'absolute top-[52px] right-0 z-50 max-h-[340px] max-w-full overflow-y-auto rounded-8 bg-r-neutral-bg-2 p-8 text-r-neutral-title-1 shadow-lg'
      }
    >
      <button
        type="button"
        className={buttonClass}
        onClick={() => setExpanded(!expanded)}
      >
        {renderHistory ? 'Test history / navigation' : 'Test progress / popup'}
      </button>
      {expanded && (
        <div className="mt-8 space-y-8">
          <div className="flex flex-wrap gap-4">
            {scenes.map((label, index) => (
              <button
                type="button"
                key={label}
                className={`${buttonClass} ${
                  scene === index ? 'underline font-medium' : ''
                }`}
                onClick={() => {
                  setScene(index);
                  setRevision((value) => value + 1);
                }}
              >
                {label}
              </button>
            ))}
          </div>
          {renderHistory ? (
            <>
              <div className="flex gap-8">
                <button
                  type="button"
                  className={buttonClass}
                  onClick={() =>
                    setVariant(variant === 'detail' ? 'general' : 'detail')
                  }
                >
                  Variant: {variant}
                </button>
                <button
                  type="button"
                  className={buttonClass}
                  onClick={() => {
                    const query = new URLSearchParams({
                      fromChainServerId: data.from_token.chain,
                      fromTokenId: data.from_token.id,
                      toChainServerId: data.to_token.chain,
                      toTokenId: data.to_token.id,
                      inputAmount: String(data.quote.pay_token_amount),
                    });
                    // 新页面重新读取路由参数，避免当前 Bridge 已挂载。
                    openInternalPageInTab(`bridge?${query}`, true, false);
                  }}
                >
                  Test: open Bridge with these tokens
                </button>
              </div>
              {renderHistory(data, local, variant)}
            </>
          ) : (
            <BridgeProgressCard data={local} onOpen={() => setVisible(true)}>
              <span className="text-15 font-medium">ETH → ETH · Test</span>
            </BridgeProgressCard>
          )}
        </div>
      )}
      <Popup
        visible={visible}
        onClose={() => setVisible(false)}
        placement="bottom"
        closable
        destroyOnClose
        isSupportDarkMode
        isNew
        contentWrapperStyle={{ height: 440 }}
        bodyStyle={{
          padding: 0,
          height: 440,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          background: 'var(--r-neutral-bg2, #F2F4F7)',
        }}
      >
        <BridgeStatusPopup
          key={`${scene}-${revision}`}
          data={local}
          onClose={() => setVisible(false)}
        />
      </Popup>
    </div>
  );
};
