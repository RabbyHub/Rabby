import type { BridgeTxHistoryItem } from '@/background/service/transactionHistory';
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
      step2: 'destFailed',
      footer: {
        kind: 'refund',
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
  it('shows the full estimate before the source chain completes', () => {
    expect(
      getBridgePopupState(
        item({ status: 'pending', estimatedDuration: 3 }),
        now
      )
    ).toMatchObject({
      title: 'processing',
      step1: 'processing',
      step2: 'queued',
      caption: { kind: 'estimate', time: '0:03' },
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

  it('keeps a source failure on two steps with go back', () => {
    expect(getBridgePopupState(item({ status: 'fromFailed' }), now)).toMatchObject(
      {
        step1: 'failed',
        step2: 'queued',
        caption: { kind: 'sourceFailed' },
        button: 'back',
      }
    );
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
