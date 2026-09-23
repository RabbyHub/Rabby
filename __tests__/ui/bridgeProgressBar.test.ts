import type { BridgeHistory } from '@rabby-wallet/rabby-api/dist/types';
import type { BridgeTxHistoryItem } from '@/background/service/transactionHistory';
import { getBridgeHistoryDetail } from '@/ui/views/Bridge/utils/historyStatus';
import {
  BRIDGE_PROGRESS_DELAY_MS,
  getBridgePopupState,
  getBridgeProgressBar,
} from '@/ui/views/Bridge/utils/progressBar';

const now = 1_700_000_000_000;

const item = (overrides: Record<string, unknown> = {}): BridgeTxHistoryItem =>
  (({
    status: 'pending',
    estimatedDuration: 20,
    fromToken: { symbol: 'ETH' },
    toToken: { symbol: 'ETH' },
    ...overrides,
  } as unknown) as BridgeTxHistoryItem);

describe('getBridgeProgressBar', () => {
  it('hides the estimate while the source chain is still pending', () => {
    expect(
      getBridgeProgressBar(
        item({
          createdAt: now - BRIDGE_PROGRESS_DELAY_MS - 1,
          estimatedDuration: 60,
        }),
        now
      )
    ).toEqual({
      step1: 'sourceLoading',
      step2: 'queued',
      footer: { kind: 'none' },
    });
  });

  it('counts down only after the source chain completes and the quote is over 5 seconds', () => {
    expect(
      getBridgeProgressBar(
        item({
          status: 'fromSuccess',
          estimatedDuration: 6,
          fromTxCompleteTs: now,
        }),
        now
      ).footer
    ).toEqual({ kind: 'countdown', time: '0:06' });

    expect(
      getBridgeProgressBar(
        item({
          status: 'fromSuccess',
          estimatedDuration: 3,
          fromTxCompleteTs: now - 4_000,
        }),
        now
      ).footer
    ).toEqual({ kind: 'none' });

    expect(
      getBridgeProgressBar(
        item({
          status: 'fromSuccess',
          estimatedDuration: 3,
          fromTxCompleteTs: now - 5_000,
        }),
        now
      ).footer
    ).toEqual({ kind: 'stillBridging' });
  });

  it('keeps the countdown after the remaining time drops below 5 seconds', () => {
    expect(
      getBridgeProgressBar(
        item({
          status: 'fromSuccess',
          estimatedDuration: 20,
          fromTxCompleteTs: now - 16_000,
        }),
        now
      )
    ).toMatchObject({
      step1: 'success',
      step2: 'destLoading',
      footer: { kind: 'countdown', time: '0:04' },
    });
  });

  it('shows Still Bridging once the estimate has passed and before 30 minutes', () => {
    expect(
      getBridgeProgressBar(
        item({
          status: 'fromSuccess',
          estimatedDuration: 20,
          fromTxCompleteTs: now - 20_000,
        }),
        now
      ).footer
    ).toEqual({ kind: 'stillBridging' });
  });

  it('shows the delayed state 30 minutes after the source chain completes', () => {
    expect(
      getBridgeProgressBar(
        item({
          status: 'fromSuccess',
          estimatedDuration: 60 * 60,
          fromTxCompleteTs: now - BRIDGE_PROGRESS_DELAY_MS,
        }),
        now
      )
    ).toEqual({
      step1: 'success',
      step2: 'destDelayed',
      footer: { kind: 'delayed' },
    });
  });

  it('drops the footer when the destination chain is complete', () => {
    expect(
      getBridgeProgressBar(item({ status: 'allSuccess' }), now).footer
    ).toEqual({ kind: 'none' });
  });

  it('uses the source-failure copy when the source transaction fails', () => {
    expect(getBridgeProgressBar(item({ status: 'fromFailed' }), now)).toEqual({
      step1: 'sourceFailed',
      step2: 'undo',
      footer: { kind: 'sourceFailed' },
    });
  });

  it('links a refund when the failed bridge has an actual token', () => {
    expect(
      getBridgeProgressBar(
        item({
          status: 'failed',
          toTxId: '0xrefund',
          actualToToken: { id: 'usdc', chain: 'eth', symbol: 'USDC' },
        }),
        now
      )
    ).toEqual({
      step1: 'success',
      step2: 'undo',
      footer: {
        kind: 'refund',
        isOriginalToken: false,
        txId: '0xrefund',
        chainServerId: 'eth',
      },
    });
  });

  it('asks for support when a failed bridge has no refund token', () => {
    expect(
      getBridgeProgressBar(item({ status: 'failed' }), now).footer
    ).toEqual({ kind: 'failedNoRefund' });
  });

  it('asks for support when a refund token has no destination tx link', () => {
    expect(
      getBridgeProgressBar(
        item({
          status: 'failed',
          actualToToken: { id: 'usdc', chain: 'eth', symbol: 'USDC' },
        }),
        now
      ).footer
    ).toEqual({ kind: 'failedNoRefund' });
  });
});

describe('getBridgePopupState', () => {
  it('hides the estimate while the source chain is still pending', () => {
    expect(
      getBridgePopupState(
        item({ status: 'pending', estimatedDuration: 3 }),
        now
      )
    ).toMatchObject({
      title: 'processing',
      step1: 'processing',
      step2: 'queued',
      caption: { kind: 'none' },
      button: 'back',
    });
  });

  it('counts down a quote of 5 seconds or less after the source chain completes', () => {
    expect(
      getBridgePopupState(
        item({
          status: 'fromSuccess',
          estimatedDuration: 3,
          fromTxCompleteTs: now,
        }),
        now
      ).caption
    ).toEqual({ kind: 'estimate', time: '0:03' });
  });

  it('shows Still Bridging as soon as a short quote expires', () => {
    expect(
      getBridgePopupState(
        item({
          status: 'fromSuccess',
          estimatedDuration: 3,
          fromTxCompleteTs: now - 3_000,
        }),
        now
      )
    ).toMatchObject({
      caption: { kind: 'stillBridging' },
      button: 'back',
    });
  });

  it('switches the button to support after 30 minutes', () => {
    expect(
      getBridgePopupState(
        item({
          status: 'fromSuccess',
          fromTxCompleteTs: now - BRIDGE_PROGRESS_DELAY_MS,
        }),
        now
      )
    ).toMatchObject({
      caption: { kind: 'delayed' },
      button: 'delayedSupport',
    });
  });

  it('keeps a source failure on two steps and opens the source transaction', () => {
    expect(
      getBridgePopupState(item({ status: 'fromFailed' }), now)
    ).toMatchObject({
      step1: 'failed',
      step2: 'refund',
      caption: { kind: 'sourceFailed' },
      button: 'refund',
    });
  });

  it('hides the refund token caption when the refund is the original token', () => {
    expect(
      getBridgePopupState(
        item({
          status: 'failed',
          fromToken: { id: 'eth', chain: 'eth', symbol: 'ETH' },
          toTxId: '0xrefund',
          actualToToken: { id: 'eth', chain: 'eth', symbol: 'ETH' },
        }),
        now
      ).caption
    ).toEqual({ kind: 'none' });
  });

  it('adds a refund step when the destination chain fails with a token', () => {
    expect(
      getBridgePopupState(
        item({
          status: 'failed',
          toTxId: '0xrefund',
          actualToToken: { id: 'usdc', chain: 'eth' },
        }),
        now
      )
    ).toMatchObject({
      title: 'refunded',
      step3: 'refund',
      caption: { kind: 'refunded' },
      button: 'refund',
      refund: { txId: '0xrefund', chainServerId: 'eth' },
    });
  });

  it('uses contact support when a refund token has no destination tx link', () => {
    expect(
      getBridgePopupState(
        item({
          status: 'failed',
          actualToToken: { id: 'usdc', chain: 'eth' },
        }),
        now
      )
    ).toMatchObject({
      title: 'failed',
      caption: { kind: 'failed' },
      button: 'failedSupport',
    });
  });

  it('drops the caption when the destination chain succeeds', () => {
    expect(
      getBridgePopupState(item({ status: 'allSuccess' }), now)
    ).toMatchObject({
      step1: 'completed',
      step2: 'completed',
      caption: { kind: 'none' },
      button: 'back',
    });
  });
});

const history = (overrides: Record<string, unknown> = {}): BridgeHistory =>
  (({
    status: 'pending',
    create_at: Math.floor(now / 1000),
    from_token: { id: 'eth', chain: 'arb', symbol: 'ETH' },
    to_token: { id: 'eth', chain: 'base', symbol: 'ETH' },
    quote: { pay_token_amount: 1, receive_token_amount: 0.996 },
    actual: { pay_token_amount: 1, receive_token_amount: 0 },
    from_tx: { tx_id: '0xsource' },
    to_tx: {},
    ...overrides,
  } as unknown) as BridgeHistory);

describe('getBridgeHistoryDetail', () => {
  it('keeps source processing after 30 minutes and hides the countdown', () => {
    expect(
      getBridgeHistoryDetail(
        history(),
        item({
          status: 'pending',
          createdAt: now - BRIDGE_PROGRESS_DELAY_MS - 1,
          estimatedDuration: 120,
        }),
        now
      )
    ).toMatchObject({
      scene: 'sourcePending',
      header: 'processing',
      action: { kind: 'none' },
      steps: [
        { mark: 'active', status: 'processing', detail: { kind: 'hash' } },
        { mark: 'waiting', status: 'queued', approx: true, sign: '+' },
      ],
    });
  });

  it('counts down quotes of 5 seconds or less after the source chain completes', () => {
    expect(
      getBridgeHistoryDetail(
        history(),
        item({
          status: 'fromSuccess',
          estimatedDuration: 3,
          fromTxCompleteTs: now,
        }),
        now
      )
    ).toMatchObject({
      scene: 'destCountdown',
      header: 'processing',
      action: { kind: 'countdown', time: '00:03' },
      steps: [
        { mark: 'success', status: 'completed' },
        { mark: 'active', status: 'processing' },
      ],
    });
  });

  it('shows Still Bridging after the estimate and before 30 minutes', () => {
    expect(
      getBridgeHistoryDetail(
        history(),
        item({
          status: 'fromSuccess',
          estimatedDuration: 20,
          fromTxCompleteTs: now - 20_000,
        }),
        now
      )
    ).toMatchObject({
      scene: 'destStillBridging',
      action: { kind: 'stillBridging' },
    });
  });

  it('turns only the title pending 30 minutes after the source chain completes', () => {
    expect(
      getBridgeHistoryDetail(
        history(),
        item({
          status: 'fromSuccess',
          estimatedDuration: 60,
          fromTxCompleteTs: now - BRIDGE_PROGRESS_DELAY_MS,
        }),
        now
      )
    ).toMatchObject({
      scene: 'destDelayed',
      header: 'pending',
      action: { kind: 'delayed' },
      steps: [
        { status: 'completed' },
        { mark: 'active', status: 'processing' },
      ],
    });
  });

  it('does not treat an old create time as a destination delay without a source complete time', () => {
    expect(
      getBridgeHistoryDetail(
        history({
          create_at: Math.floor((now - BRIDGE_PROGRESS_DELAY_MS - 1) / 1000),
        }),
        undefined,
        now
      )
    ).toMatchObject({
      scene: 'destStillBridging',
      header: 'processing',
      action: { kind: 'stillBridging' },
    });
  });

  it('shows both completed steps when the bridge succeeds', () => {
    expect(
      getBridgeHistoryDetail(
        history({
          status: 'completed',
          to_actual_token: { id: 'eth', chain: 'base', symbol: 'ETH' },
          to_tx: { tx_id: '0xdest' },
          actual: { pay_token_amount: 1, receive_token_amount: 0.996 },
        }),
        item({ status: 'allSuccess' }),
        now
      )
    ).toMatchObject({
      scene: 'succeeded',
      header: 'succeeded',
      action: { kind: 'none' },
      steps: [
        {
          mark: 'success',
          approx: false,
          sign: '-',
          detail: { txId: '0xsource' },
        },
        {
          mark: 'success',
          approx: false,
          sign: '+',
          amount: 0.996,
          detail: { txId: '0xdest' },
        },
      ],
    });
  });

  it('uses a two-step refund when the source transaction fails', () => {
    expect(
      getBridgeHistoryDetail(
        history(),
        item({ status: 'fromFailed', hash: '0xsource' }),
        now
      )
    ).toMatchObject({
      scene: 'sourceFailed',
      header: 'refund',
      action: {
        kind: 'details',
        txId: '0xsource',
        chainServerId: 'arb',
      },
      steps: [
        {
          mark: 'failed',
          detail: { kind: 'sendFailed' },
          amount: 1,
          sign: '-',
        },
        {
          mark: 'success',
          status: 'refund',
          detail: { kind: 'tokenNotSent' },
          amount: 1,
          sign: '+',
          chainServerId: 'arb',
        },
      ],
    });
  });

  it('uses a plain Refund title when the refund is the original token', () => {
    const detail = getBridgeHistoryDetail(
      history({
        status: 'failed',
        to_tx: { tx_id: '0xrefund' },
        to_actual_token: { id: 'eth', chain: 'arb', symbol: 'ETH' },
        actual: { pay_token_amount: 1, receive_token_amount: 1 },
      }),
      undefined,
      now
    );

    expect(detail.scene).toBe('refundOriginal');
    expect(detail.action).toEqual({
      kind: 'details',
      txId: '0xrefund',
      chainServerId: 'arb',
    });
    expect(detail.steps).toHaveLength(3);
    expect(detail.steps[1]).toMatchObject({
      detail: { kind: 'bridgeFailed' },
      approx: true,
    });
    expect(detail.steps[2]).toMatchObject({
      chainServerId: 'arb',
      status: 'completed',
      amount: 1,
    });
  });

  it('names the refund token when it is another chain or token', () => {
    expect(
      getBridgeHistoryDetail(
        history({
          status: 'failed',
          to_tx: { tx_id: '0xrefund' },
          to_actual_token: { id: 'usdc', chain: 'arb', symbol: 'USDC' },
          actual: { pay_token_amount: 1, receive_token_amount: 2222 },
        }),
        undefined,
        now
      )
    ).toMatchObject({
      scene: 'refundOther',
      action: {
        kind: 'details',
        refundInSymbol: 'USDC',
        txId: '0xrefund',
        chainServerId: 'arb',
      },
    });

    expect(
      getBridgeHistoryDetail(
        history({
          status: 'failed',
          to_tx: { tx_id: '0xrefund' },
          to_actual_token: { id: 'eth', chain: 'base', symbol: 'ETH' },
        }),
        undefined,
        now
      )
    ).toMatchObject({
      scene: 'refundOther',
      action: {
        kind: 'details',
        refundInSymbol: 'ETH',
      },
    });
  });

  it('keeps a completed bridge successful while the local record is still pending', () => {
    expect(
      getBridgeHistoryDetail(
        history({ status: 'completed' }),
        item({ status: 'pending' }),
        now
      ).scene
    ).toBe('succeeded');
  });

  it('uses a local failure while the api is still pending', () => {
    expect(
      getBridgeHistoryDetail(
        history({ status: 'pending' }),
        item({
          status: 'failed',
          toTxId: '0xrefund',
          actualToToken: { id: 'usdc', chain: 'op', symbol: 'USDC' },
          actualToAmount: 5,
        }),
        now
      ).scene
    ).toBe('refundOther');
  });

  it('asks for support when a failed bridge has no refund transaction', () => {
    expect(
      getBridgeHistoryDetail(
        history({
          status: 'failed',
          to_actual_token: { id: 'usdc', chain: 'arb', symbol: 'USDC' },
        }),
        undefined,
        now
      )
    ).toMatchObject({
      scene: 'failedNoRefund',
      header: 'failed',
      action: { kind: 'support' },
      steps: [{ status: 'completed' }, { status: 'failed' }],
    });
  });
});
