import React, { useCallback, useEffect, useState } from 'react';
import { Modal } from 'antd';
import { snapdom } from '@zumer/snapdom';
import browser from 'webextension-polyfill';
import { getUiType } from '@/ui/utils';
import { SCREENSHOT_CONTEXT_MENU_CLICKED } from '@/constant/screenshot';

const waitForPaint = () =>
  new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });

const captureVisibleTab = async () => {
  const currentWindow = await browser.windows.getCurrent();
  return browser.tabs.captureVisibleTab(currentWindow.id, {
    format: 'png',
  });
};

const getViewportSize = () => {
  return {
    height: document.documentElement.clientHeight || window.innerHeight,
    width: document.documentElement.clientWidth || window.innerWidth,
  };
};

const captureBySnapdom = async () => {
  const viewport = getViewportSize();
  const image = await snapdom.toPng(document.body, {
    backgroundColor: getComputedStyle(document.body).backgroundColor,
    dpr: window.devicePixelRatio,
    fast: true,
    height: viewport.height,
    width: viewport.width,
  });

  return image.src;
};

const captureScreenshot = async () => {
  const uiType = getUiType();

  if (uiType.isPop) {
    return captureBySnapdom();
  }

  return captureVisibleTab().catch(() => {
    return captureBySnapdom();
  });
};

const isCurrentScreenshotTarget = (pageUrl?: string) => {
  return !pageUrl || window.location.href.startsWith(pageUrl);
};

export const ScreenshotContextMenu = () => {
  const [screenshot, setScreenshot] = useState('');
  const [modalVisible, setModalVisible] = useState(false);

  const handleCapture = useCallback(async () => {
    await waitForPaint();

    const dataUrl = await captureScreenshot();

    setScreenshot(dataUrl);
    setModalVisible(true);
  }, []);

  useEffect(() => {
    const uiType = getUiType();
    if (!uiType.isPop && !uiType.isNotification) return;

    const onMessage = (message) => {
      if (message?.type !== SCREENSHOT_CONTEXT_MENU_CLICKED) return;
      if (!isCurrentScreenshotTarget(message.pageUrl)) return;

      handleCapture();
    };

    browser.runtime.onMessage.addListener(onMessage);

    return () => {
      browser.runtime.onMessage.removeListener(onMessage);
    };
  }, [handleCapture]);

  return (
    <>
      <Modal
        centered
        className="rabby-screenshot-modal"
        footer={null}
        title="Screenshot"
        visible={modalVisible}
        width={360}
        onCancel={() => setModalVisible(false)}
      >
        {screenshot ? (
          <img
            className="rabby-screenshot-modal__image"
            src={screenshot}
            alt="Rabby popup screenshot"
          />
        ) : null}
      </Modal>
    </>
  );
};

export default ScreenshotContextMenu;
