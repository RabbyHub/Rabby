import React, { useCallback, useEffect, useState } from 'react';
import { Button, Input, Modal, message } from 'antd';
import { snapdom } from '@zumer/snapdom';
import { useRequest } from 'ahooks';
import browser from 'webextension-polyfill';
import { getUITypeName, getUiType, useWallet } from '@/ui/utils';
import {
  SCREENSHOT_CONTEXT_MENU_CLICKED,
  SCREENSHOT_FEEDBACK_ENTRY_CLICKED,
} from '@/constant/screenshot';
import clsx from 'clsx';
import { useScreenshotFeedbacks } from './hooks';
import { useTranslation } from 'react-i18next';

const SCREENSHOT_MODAL_Z_INDEX = 2147483647;

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

const SNAPDOM_RENDER_INFRA_TAGS = new Set([
  'HEAD',
  'STYLE',
  'LINK',
  'DEFS',
  'SYMBOL',
  'LINEARGRADIENT',
  'RADIALGRADIENT',
  'PATTERN',
  'MASK',
  'CLIPPATH',
  'FILTER',
]);

function isElementInViewport(el: Node): boolean {
  if (!(el instanceof Element)) return true;

  if (
    el === document.documentElement ||
    el === document.body ||
    el === document.head ||
    SNAPDOM_RENDER_INFRA_TAGS.has(el.tagName)
  ) {
    return true;
  }

  const rect = el.getBoundingClientRect();
  const vHeight = window.innerHeight || document.documentElement.clientHeight;
  const vWidth = window.innerWidth || document.documentElement.clientWidth;

  return (
    rect.bottom > 0 &&
    rect.right > 0 &&
    rect.top < vHeight &&
    rect.left < vWidth
  );
}

const captureBySnapdom = async () => {
  const viewport = getViewportSize();
  const captureTarget = document.documentElement;

  const image = await snapdom.toPng(captureTarget, {
    backgroundColor: getComputedStyle(document.body).backgroundColor,
    dpr: window.devicePixelRatio,
    fast: true,
    height: viewport.height,
    width: viewport.width,
    filter: isElementInViewport,
    filterMode: 'remove',
  });

  console.log(
    (
      await snapdom.toSvg(captureTarget, {
        backgroundColor: getComputedStyle(document.body).backgroundColor,
        dpr: window.devicePixelRatio,
        fast: true,
        height: viewport.height,
        width: viewport.width,
        filter: isElementInViewport,
        filterMode: 'remove',
      })
    ).src
  );

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

const dataUrlToFile = async (dataUrl: string, filename: string) => {
  const response = await fetch(dataUrl);
  const blob = await response.blob();

  return new File([blob], filename, { type: blob.type || 'image/png' });
};

const uploadScreenshot = async (screenshot: string) => {
  const formData = new FormData();
  const file = await dataUrlToFile(
    screenshot,
    `rabby-screenshot-${Date.now()}.png`
  );

  formData.append('file', file);

  const response = await fetch('https://api.rabby.io/v1/feedback/app/upload', {
    body: formData,
    method: 'POST',
  });

  if (!response.ok) {
    throw new Error('Failed to upload screenshot');
  }

  const result = await response.json();
  const imageUrl = result.image_url;

  if (!imageUrl) {
    throw new Error('Invalid screenshot upload response');
  }

  return imageUrl;
};

const getScreenshotFeedbackUserAgentData = async () => {
  const userAgentData = (window.navigator as any).userAgentData;

  if (!userAgentData) return undefined;

  try {
    const highEntropyValues =
      (await userAgentData.getHighEntropyValues?.([
        'architecture',
        'bitness',
        'fullVersionList',
        'model',
        'platform',
        'platformVersion',
        'uaFullVersion',
      ])) || {};

    return {
      architecture: highEntropyValues.architecture,
      bitness: highEntropyValues.bitness,
      brands: userAgentData.brands,
      fullVersionList: highEntropyValues.fullVersionList,
      mobile: userAgentData.mobile,
      model: highEntropyValues.model,
      platform: highEntropyValues.platform || userAgentData.platform,
      platformVersion: highEntropyValues.platformVersion,
      uaFullVersion: highEntropyValues.uaFullVersion,
    };
  } catch (error) {
    return {
      brands: userAgentData.brands,
      mobile: userAgentData.mobile,
      platform: userAgentData.platform,
    };
  }
};

const getScreenshotFeedbackPageInfo = async () => {
  return {
    uiType: getUITypeName(),
    pageUrl: window.location.href,
    routePath: `${window.location.pathname}${window.location.search}${window.location.hash}`,
    userAgent: window.navigator.userAgent,
    userAgentData: await getScreenshotFeedbackUserAgentData(),
    language: window.navigator.language,
    platform: window.navigator.platform,
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
      dpr: window.devicePixelRatio,
    },
    screen: {
      width: window.screen.width,
      height: window.screen.height,
      availWidth: window.screen.availWidth,
      availHeight: window.screen.availHeight,
    },
  };
};

type SubmitScreenshotFeedbackParams = {
  description: string;
  screenshot: string;
};

export const ScreenshotContextMenu = () => {
  const wallet = useWallet();
  const { onFeedbackSubmitted } = useScreenshotFeedbacks();
  const [screenshot, setScreenshot] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [description, setDescription] = useState('');
  const { t } = useTranslation();

  const { loading: submitting, run: submitFeedback } = useRequest(
    async (params: SubmitScreenshotFeedbackParams) => {
      const imageUrl = await uploadScreenshot(params.screenshot);

      return wallet.postUserFeedback({
        content: params.description,
        image: imageUrl,
        pageInfo: await getScreenshotFeedbackPageInfo(),
      });
    },
    {
      manual: true,
      onError(error) {
        console.error('Failed to submit feedback', error);
        message.error(error?.message || 'Failed to submit feedback');
      },
      onSuccess(feedback) {
        if (feedback?.id) {
          onFeedbackSubmitted(feedback);
        }
        console.log('Feedback submitted successfully');
        message.success('Feedback submitted');
        setModalVisible(false);
      },
    }
  );

  const handleCapture = useCallback(async () => {
    await waitForPaint();

    const dataUrl = await captureScreenshot();

    setScreenshot(dataUrl);
    setDescription('');
    setModalVisible(true);
  }, []);

  const handleCancel = useCallback(() => {
    setModalVisible(false);
  }, []);

  const handleConfirm = useCallback(() => {
    if (!screenshot || submitting) return;

    submitFeedback({
      description: description.trim(),
      screenshot,
    });
  }, [description, screenshot, submitFeedback, submitting]);

  useEffect(() => {
    const uiType = getUiType();
    const isScreenshotTarget =
      uiType.isPop || uiType.isNotification || uiType.isTab || uiType.isDesktop;

    if (!isScreenshotTarget) return;

    const onMessage = (message) => {
      if (message?.type !== SCREENSHOT_CONTEXT_MENU_CLICKED) return;
      if (!isCurrentScreenshotTarget(message.pageUrl)) return;

      handleCapture();
    };

    browser.runtime.onMessage.addListener(onMessage);
    window.addEventListener(SCREENSHOT_FEEDBACK_ENTRY_CLICKED, handleCapture);

    return () => {
      browser.runtime.onMessage.removeListener(onMessage);
      window.removeEventListener(
        SCREENSHOT_FEEDBACK_ENTRY_CLICKED,
        handleCapture
      );
    };
  }, [handleCapture]);

  useEffect(() => {
    if (!modalVisible) {
      setScreenshot('');
      setDescription('');
    }
  }, [modalVisible]);

  return (
    <>
      <Modal
        centered
        className="rabby-screenshot-modal modal-support-darkmode"
        footer={false}
        visible={modalVisible}
        width={360}
        zIndex={SCREENSHOT_MODAL_Z_INDEX}
        onCancel={handleCancel}
        closable={false}
        bodyStyle={{ padding: 0 }}
        destroyOnClose
      >
        <div className="flex flex-col h-[500px]">
          <header className="px-[20px]">
            <h2 className="text-center text-[20px] leading-[24px] font-medium text-r-neutral-title1 py-[16px]">
              {t('component.screenshotModal.title')}
            </h2>
          </header>
          <main className="min-h-0 flex-1 px-[20px] flex flex-col pb-[16px]">
            {screenshot ? (
              <div className="rounded-[8px] border-[1px] border-rabby-neutral-line mb-[16px]">
                <img
                  className="w-full h-[254px] object-contain"
                  src={screenshot}
                  alt="Rabby popup screenshot"
                />
              </div>
            ) : null}
            <Input.TextArea
              placeholder={t('component.screenshotModal.placeholder')}
              value={description}
              autoFocus
              maxLength={300}
              className="resize-none bg-r-neutral-bg-2 text-r-neutral-title1 min-h-0 flex-1"
              onChange={(event) => setDescription(event.target.value)}
            />
          </main>
          <footer
            className={clsx(
              'flex items-center justify-center gap-[12px]',
              'py-[16px] px-[20px] border-t-[0.5px] border-rabby-neutral-line'
            )}
          >
            <button
              onClick={handleCancel}
              type="button"
              className={clsx(
                'w-1/2 h-[48px] border-[1px] border-r-blue-default text-r-blue-default',
                'hover:bg-[#8697FF1A] active:bg-[#0000001A]',
                'rounded-[8px]',
                'before:content-none',
                'z-10',
                'flex items-center justify-center gap-2'
              )}
            >
              {t('global.Cancel')}
            </button>
            <Button
              type="primary"
              block
              className="w-1/2 h-[48px]"
              onClick={handleConfirm}
              loading={submitting}
              disabled={!screenshot}
            >
              {t('global.Submit')}
            </Button>
          </footer>
        </div>
      </Modal>
    </>
  );
};

export default ScreenshotContextMenu;
