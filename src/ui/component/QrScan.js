// extension has a bug when use `getUserMedia`
// here we hack it with an iframed inject into current page to get the permission to use `getUserMedia`
// ref: https://bugs.chromium.org/p/chromium/issues/detail?id=160337
import React, { useEffect, createRef } from 'react';
import QrScanner from 'qr-scanner';
import QrScannerWorkerPath from '!!file-loader!qr-scanner/qr-scanner-worker.min.js';

QrScanner.WORKER_PATH = QrScannerWorkerPath;

const QrScan = () => {
  const videoRef = createRef();

  const initQrScanner = () => {
    const qrScanner = new QrScanner(videoRef.current, result => console.log('decoded qr code:', result));

    qrScanner.start();
  }

  // useEffect(() => {
  //   const s = document.createElement('iframe');
  //   s.src = chrome.runtime.getURL('user-media-permission.html');
  //   s.onload = function () {
  //     setTimeout(() => {
  //       initQrScanner();
  //     }, 1000);
  //   };
  //   (document.head || document.documentElement).appendChild(s);
  // }, []);

  return <video ref={videoRef} />
};

export default QrScan;
