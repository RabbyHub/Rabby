import { Button, message, Modal } from 'antd';
import React, { useEffect, useState } from 'react';
import Popup from '@/ui/component/Popup';
import {
  BRIDGE_QUOTE_CAPTURE_EVENT,
  BridgeQuoteCaptureBridgeCount,
  clearBridgeQuoteCaptures,
  downloadJsonFile,
  exportValidBridgeQuotes,
  getBridgeQuoteCaptureStats,
} from '../utils/quoteCapture';

const formatTime = (time?: number) => {
  if (!time) {
    return '-';
  }
  return new Date(time).toLocaleString();
};

const formatStamp = (time: number) => {
  const date = new Date(time);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(
    date.getDate()
  )}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
};

export const BridgeQuoteCapturePanel = ({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) => {
  const [requestCount, setRequestCount] = useState(0);
  const [validQuoteCount, setValidQuoteCount] = useState(0);
  const [builtTxCount, setBuiltTxCount] = useState(0);
  const [buildFailCount, setBuildFailCount] = useState(0);
  const [latestRequestedAt, setLatestRequestedAt] = useState<number>();
  const [bridgeCounts, setBridgeCounts] = useState<
    BridgeQuoteCaptureBridgeCount[]
  >([]);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!visible) {
      return;
    }

    let cancelled = false;
    const load = () => {
      getBridgeQuoteCaptureStats()
        .then((stats) => {
          if (cancelled) {
            return;
          }
          setRequestCount(stats.requestCount);
          setValidQuoteCount(stats.validQuoteCount);
          setBuiltTxCount(stats.builtTxCount);
          setBuildFailCount(stats.buildFailCount);
          setLatestRequestedAt(stats.latestRequestedAt);
          setBridgeCounts(stats.bridgeCounts);
        })
        .catch((error) => {
          console.error(error);
        });
    };

    load();
    window.addEventListener(BRIDGE_QUOTE_CAPTURE_EVENT, load);
    return () => {
      cancelled = true;
      window.removeEventListener(BRIDGE_QUOTE_CAPTURE_EVENT, load);
    };
  }, [visible]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const payload = await exportValidBridgeQuotes();
      const text = JSON.stringify(payload, null, 2);
      downloadJsonFile(
        `bridge-valid-quotes-${formatStamp(payload.exportedAt)}.json`,
        text
      );
      message.success({
        className: 'toast-message-2025',
        content: `Exported ${payload.validQuoteCount} valid quotes`,
      });
    } catch (error) {
      console.error(error);
      message.error({
        className: 'toast-message-2025',
        content: 'Export failed',
      });
    } finally {
      setExporting(false);
    }
  };

  const handleClear = () => {
    Modal.confirm({
      title: 'Clear captured bridge quotes?',
      content: 'This removes every stored request from this browser.',
      zIndex: 1450,
      okText: 'Clear',
      cancelText: 'Cancel',
      onOk: async () => {
        await clearBridgeQuoteCaptures();
        message.success({
          className: 'toast-message-2025',
          content: 'Captured quotes cleared',
        });
      },
    });
  };

  return (
    <Popup
      visible={visible}
      onCancel={onClose}
      height={460}
      zIndex={1400}
      push={false}
      closable
      isSupportDarkMode
      isNew
      bodyStyle={{ padding: 20 }}
    >
      <div className="text-20 font-medium text-r-neutral-title1 mb-8">
        Bridge Quote Capture
      </div>
      <div className="text-13 text-r-neutral-foot mb-16 leading-[18px]">
        Each quote is built into a transaction, then stored with that quote.
        Export includes both. Older rows saved before this change have no
        built tx.
      </div>
      <div className="rounded-[8px] bg-r-neutral-card-2 px-12 py-10 mb-16 text-13 text-r-neutral-title1 leading-[22px]">
        <div>Stored requests: {requestCount}</div>
        <div>Valid quotes: {validQuoteCount}</div>
        <div>Built txs: {builtTxCount}</div>
        <div>Build failed: {buildFailCount}</div>
        <div>Latest request: {formatTime(latestRequestedAt)}</div>
      </div>
      <div className="mb-16">
        <div className="text-13 font-medium text-r-neutral-title1 mb-8">
          By bridge
        </div>
        <div className="max-h-[160px] overflow-auto rounded-[8px] bg-r-neutral-card-2 px-12 py-8 text-13 text-r-neutral-title1 leading-[22px]">
          {bridgeCounts.length ? (
            bridgeCounts.map((item) => (
              <div key={item.key} className="flex items-center justify-between gap-12">
                <span className="min-w-0 truncate">{item.name}</span>
                <span className="shrink-0 font-medium">{item.count}</span>
              </div>
            ))
          ) : (
            <div className="text-r-neutral-foot">No valid quotes yet</div>
          )}
        </div>
      </div>
      <div className="flex gap-8">
        <Button
          type="primary"
          block
          loading={exporting}
          disabled={!validQuoteCount}
          onClick={handleExport}
        >
          Export JSON
        </Button>
        <Button block disabled={!requestCount} onClick={handleClear}>
          Clear
        </Button>
      </div>
    </Popup>
  );
};
