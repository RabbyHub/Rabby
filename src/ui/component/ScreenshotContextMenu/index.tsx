import React, { useCallback, useEffect, useState } from 'react';
import { Button, Input, Modal, message } from 'antd';
import { snapdom } from '@zumer/snapdom';
import { useMount, useRequest } from 'ahooks';
import browser from 'webextension-polyfill';
import { getUITypeName, getUiType, useWallet } from '@/ui/utils';
import {
  SCREENSHOT_CONTEXT_MENU_CLICKED,
  SCREENSHOT_FEEDBACK_ENTRY_CLICKED,
} from '@/constant/screenshot';
import clsx from 'clsx';
import Checkbox from '../Checkbox';
import { useScreenshotFeedbacks } from './hooks';

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

const getScreenshotFeedbackPageInfo = () => {
  return {
    uiType: getUITypeName(),
    pageUrl: window.location.href,
    routePath: `${window.location.pathname}${window.location.search}${window.location.hash}`,
    userAgent: window.navigator.userAgent,
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
  includeOperationLogs: boolean;
  screenshot: string;
};

export const ScreenshotContextMenu = () => {
  const wallet = useWallet();
  const { onFeedbackSubmitted } = useScreenshotFeedbacks();
  const [screenshot, setScreenshot] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [description, setDescription] = useState('');
  const [includeOperationLogs, setIncludeOperationLogs] = useState(true);

  const { loading: submitting, run: submitFeedback } = useRequest(
    async (params: SubmitScreenshotFeedbackParams) => {
      const imageUrl = await uploadScreenshot(params.screenshot);

      return wallet.postUserFeedback({
        content: params.description,
        image: imageUrl,
        includeOperationLogs: params.includeOperationLogs,
        pageInfo: getScreenshotFeedbackPageInfo(),
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
    setIncludeOperationLogs(true);
    setModalVisible(true);
  }, []);

  const handleCancel = useCallback(() => {
    setModalVisible(false);
  }, []);

  const handleConfirm = useCallback(() => {
    if (!screenshot || submitting) return;

    submitFeedback({
      description: description.trim(),
      includeOperationLogs,
      screenshot,
    });
  }, [
    description,
    includeOperationLogs,
    screenshot,
    submitFeedback,
    submitting,
  ]);

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
      setIncludeOperationLogs(true);
    }
  }, [modalVisible]);

  useMount(() => {
    wallet.setScreenshotContextMenuVisible(true);
  });

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
              Screenshot to Report Bug
            </h2>
          </header>
          <main className="min-h-0 flex-1 px-[20px]">
            {screenshot ? (
              <div className="rounded-[8px] border-[1px] border-rabby-neutral-line mb-[16px]">
                <img
                  className="w-full mb-[12px] h-[200px] object-contain"
                  src={screenshot}
                  alt="Rabby popup screenshot"
                />
              </div>
            ) : null}
            <Input.TextArea
              placeholder="Describe the issue"
              value={description}
              autoFocus
              rows={3}
              maxLength={300}
              className="resize-none bg-r-neutral-bg-2 text-r-neutral-title1"
              onChange={(event) => setDescription(event.target.value)}
            />
            <div className="flex items-center justify-center mt-[12px]">
              <Checkbox
                checked={includeOperationLogs}
                type="square"
                onChange={setIncludeOperationLogs}
                unCheckBackground="transparent"
                width="14px"
                height="14px"
                checkBoxClassName={clsx(
                  'rounded-[2px] border border-solid',
                  !includeOperationLogs
                    ? 'border-rabby-neutral-foot'
                    : 'border-rabby-blue-default'
                )}
                checkIcon={
                  includeOperationLogs ? (
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <rect
                        width="14"
                        height="14"
                        rx="2"
                        fill="var(--r-blue-default, #4c65ff)"
                      />
                      <path
                        d="M3 7L5.66667 10L11 4"
                        stroke="white"
                        strokeWidth="1.25"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : null
                }
              >
                <span className="text-rabby-neutral-body text-13 font-normal">
                  Send operation logs to Rabby as well
                </span>
              </Checkbox>
            </div>
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
              Cancel
            </button>
            <Button
              type="primary"
              block
              className="w-1/2 h-[48px]"
              onClick={handleConfirm}
              loading={submitting}
              disabled={!screenshot}
            >
              Submit
            </Button>
          </footer>
        </div>
      </Modal>
    </>
  );
};

export default ScreenshotContextMenu;
