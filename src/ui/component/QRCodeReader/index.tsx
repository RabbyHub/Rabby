import React, { useEffect, useRef } from 'react';
import { BrowserQRCodeReader } from '@zxing/browser';
import './style.less';

interface QRCodeReaderProps {
  onSuccess(text: string): void;
  onError?(): void;
  width?: number;
  height?: number;
  isUR?: boolean;
}

const QRCodeReader = ({
  onSuccess,
  onError,
  width = 100,
  height = 100,
  isUR = false,
}: QRCodeReaderProps) => {
  const videoEl = useRef<HTMLVideoElement>(null);
  const controls = useRef<any>(null);
  const init = async () => {
    try {
      const reader = new BrowserQRCodeReader();
      controls.current = reader;
      const devices = await BrowserQRCodeReader.listVideoInputDevices();
      await reader.decodeFromVideoDevice(
        devices[0].deviceId,
        videoEl.current!,
        (result, error) => {
          if (error) return;
          if (result) {
            onSuccess(result.getText());
          }
        }
      );
      // console.log('result', result);
      // onSuccess(result.getText());
    } catch (e: any) {
      if (!/ended/.test(e.message)) {
        // Magic error message for Video stream has ended before any code could be detected
        onError && onError();
      }
    }
  };

  useEffect(() => {
    init();
    return () => {
      if (controls.current) {
        controls.current.stopContinuousDecode();
        controls.current.reset();
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
