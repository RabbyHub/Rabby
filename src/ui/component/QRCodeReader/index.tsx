import React, { useEffect, useRef } from 'react';
import { BrowserQRCodeReader } from '@zxing/library';
import './style.less';

interface QRCodeReaderProps {
  onSuccess(text: string): void;
  onError?(): void;
  width?: number;
  height?: number;
}

const QRCodeReader = ({
  onSuccess,
  onError,
  width = 100,
  height = 100,
}: QRCodeReaderProps) => {
  const videoEl = useRef<HTMLVideoElement>(null);
  const controls = useRef<any>(null);
  const init = async () => {
    try {
      const reader = new BrowserQRCodeReader();
      controls.current = reader;
      await reader.getVideoInputDevices();
      const result = await reader.decodeFromInputVideoDevice(
        undefined,
        videoEl.current!
      );
      onSuccess(result.getText());
    } catch (e) {
      onError && onError();
    }
  };

  useEffect(() => {
    init();
    return () => {
      if (controls.current) {
        controls.current.reset();
        controls.current.stop();
        controls.current = null;
      }
    };
  });
  return (
    <video
      style={{ width: `${width}px`, height: `${height}px` }}
      ref={videoEl}
      className="qrcode-reader-comp"
    ></video>
  );
};

export default QRCodeReader;
