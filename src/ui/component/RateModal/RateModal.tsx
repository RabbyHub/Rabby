/* eslint-enable react-hooks/exhaustive-deps */
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
} from 'react';
import { Button, Input, message } from 'antd';
import { TextAreaRef } from 'antd/lib/input/TextArea';
import { useTranslation } from 'react-i18next';
import { useMount } from 'react-use';

import Popup from '@/ui/component/Popup';
import {
  FEEDBACK_LEN_LIMIT,
  useExposureRateGuide,
  useRateModal,
  useTotalBalanceTextForRate,
} from './hooks';
import ClickableStar from './ClickableStar';

import { ReactComponent as RabbyLogo } from './icons/rabby-logo.svg';
import { ReactComponent as ChromeLogo } from './icons/chrome.svg';
import clsx from 'clsx';
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';

const DASHED_LINE_STYLE = {
  opacity: 0.5,
  height: 0,
  width: '100%',
  borderBottom: '1px dashed var(--r-blue-default, #7084FF)',
};

function useForceDisableRateGuideOnLaunch(modalShow: boolean) {
  const rDispatch = useRabbyDispatch();
  const { disableExposureRateGuide } = useExposureRateGuide();

  const shouldForceDisableOnLaunch = useRabbySelector(
    (s) =>
      s.preference.rateGuideLastExposure
        ?.__UI_FORCE_DISABLE_ON_NEXT_LAUNCH_WINDOW__
  );
  useLayoutEffect(() => {
    if (modalShow) {
      rDispatch.preference.setRateGuideLastExposure({
        __UI_FORCE_DISABLE_ON_NEXT_LAUNCH_WINDOW__: true,
      });
    }
  }, [modalShow]);

  // only called once
  useMount(() => {
    if (shouldForceDisableOnLaunch) {
      disableExposureRateGuide();
    }
  });
}

export default function RateModal() {
  const { t } = useTranslation();
  const {
    rateModalShown,
    toggleShowRateModal,

    userStar,

    userFeedback,
    onChangeFeedback,
    feedbackOverLimit,
    isSubmitting,
    pushRateDetails,

    openAppRateUrl,
  } = useRateModal();

  const closeModal = useCallback(() => {
    toggleShowRateModal(false, {
      disableExposureOnClose: true,
    });
  }, [toggleShowRateModal]);

  const wantFeedback = useMemo(() => {
    return userStar <= 3;
  }, [userStar]);

  const disableSubmit = useMemo(() => {
    return feedbackOverLimit || !wantFeedback || !userFeedback.length;
  }, [feedbackOverLimit, wantFeedback, userFeedback]);

  const inputRef = useRef<TextAreaRef>(null);
  useEffect(() => {
    if (rateModalShown && wantFeedback) {
      // Focus on the feedback input when the modal is shown and feedback is requested
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [rateModalShown, wantFeedback]);

  useForceDisableRateGuideOnLaunch(rateModalShown);
  const {
    top10TotalBalanceText: totalBalanceText,
  } = useTotalBalanceTextForRate();

  return (
    <Popup
      closable
      visible={rateModalShown}
      onClose={() => {
        toggleShowRateModal(false, { disableExposureOnClose: true });
      }}
      height={488}
      bodyStyle={{
        height: '100%',
        padding: 0,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'var(--r-neutral-bg2, #F2F4F7)',
        borderTopLeftRadius: '16px',
        borderTopRightRadius: '16px',
      }}
      destroyOnClose
      className="settings-popup-wrapper"
      isSupportDarkMode
    >
      {!wantFeedback ? (
        <div
          className={clsx(
            'flex flex-col items-center justify-between h-[100%] w-[100%]',
            !rateModalShown && 'hidden'
          )}
          style={{
            padding: '47px 0 23px 0',
          }}
        >
          <div className="flex flex-col items-center justify-center w-[100%] px-[20px]">
            <div className="w-[80px] h-[80px] flex items-center justify-center mb-[16px]">
              <RabbyLogo className="w-[100%] h-[100%]" />
            </div>

            <div
              className="flex items-center justify-center"
              style={{ gap: 20 }}
            >
              {Array.from({ length: 5 }, (_, index) => (
                <ClickableStar
                  key={`star-${index}`}
                  disabled
                  isFilled={userStar >= index + 1}
                  className="h-[32px]"
                  size={32}
                />
              ))}
            </div>
            <div
              style={{
                marginTop: 21,
                marginBottom: 41,
                ...DASHED_LINE_STYLE,
              }}
            />
            <span className="text-[24px] text-r-neutral-title-1 text-[600]">
              😊 {t('page.dashboard.settings.rateModal.thxTitle')}
            </span>

            <span className="mt-[21px] text-[18px] text-center text-r-neutral-title-1 text-[500]">
              {t('page.dashboard.settings.rateModal.thxDesc')}
            </span>
          </div>
          <footer className="flex w-[100%] px-[20px] pb-[23px]">
            <Button
              type="primary"
              size="large"
              className="w-[100%] flex flex-row justify-center items-center"
              block
              onClick={() => {
                openAppRateUrl();
                closeModal();
              }}
            >
              <ChromeLogo width={18} height={18} className="mr-[8px]" />
              <span className="text-r-neutral-title-2 text-[16px] font-[500]">
                {t('page.dashboard.settings.rateModal.rateOnChromeStoreButton')}
              </span>
            </Button>
          </footer>
        </div>
      ) : (
        <div
          className={clsx(
            'flex flex-col items-center justify-between h-[100%] w-[100%] pt-[24px]',
            !rateModalShown && 'hidden'
          )}
        >
          <div className="flex flex-col items-center justify-center w-[100%] px-[20px]">
            <div className="w-[52px] h-[52px] flex items-center justify-center mb-[16px]">
              <RabbyLogo className="w-[100%] h-[100%]" />
            </div>

            <div
              className="flex items-center justify-center"
              style={{ gap: 20 }}
            >
              {Array.from({ length: 5 }, (_, index) => (
                <ClickableStar
                  key={`star-${index}`}
                  disabled
                  isFilled={userStar >= index + 1}
                  className="h-[20px]"
                  size={20}
                />
              ))}
            </div>
            <div
              style={{
                marginTop: 20,
                marginBottom: 20,
                ...DASHED_LINE_STYLE,
              }}
            />

            <span className="mb-[16px] text-[18px] text-center text-r-neutral-title-1 text-[500]">
              {t('page.dashboard.settings.rateModal.feedbackDesc')}
            </span>

            <div className="relative w-[100%]">
              <Input.TextArea
                placeholder={t(
                  'page.dashboard.settings.rateModal.feedbackPlaceholder'
                )}
                ref={inputRef}
                autoFocus
                rows={4}
                style={{
                  background: 'var(--r-neutral-card-1, #FFFFFF) !important',
                }}
                className={clsx(
                  'w-[100%] h-[180px] rounded-[8px] p-[12px]',
                  'text-[13px] text-[400] text-r-neutral-title-1',
                  'bg-r-neutral-card-1 border-rabby-blue-default border-[1px] border-solid',
                  feedbackOverLimit && 'border-rabby-red-default'
                )}
                // maxLength={FEEDBACK_LEN_LIMIT}
                onChange={(e) => {
                  onChangeFeedback(e.target.value);
                }}
              />
              <span
                className={clsx(
                  'absolute right-[12px] bottom-[12px] text-r-neutral-foot text-[12px] text-[400]',
                  feedbackOverLimit && 'text-rabby-red-default'
                )}
              >
                {userFeedback.length}/{FEEDBACK_LEN_LIMIT}
              </span>
            </div>
          </div>
          <footer className="flex w-[100%] p-[16px] border-t-[0.5px] border-rabby-neutral-line border-solid pb-[16px]">
            <Button
              disabled={disableSubmit}
              loading={isSubmitting}
              type="primary"
              size="large"
              className="w-[100%] flex flex-row justify-center items-center"
              block
              onClick={() => {
                pushRateDetails({ totalBalanceText })
                  .then(() => {
                    message.success({
                      className: 'toast-message-2025',
                      content: t(
                        'page.dashboard.settings.rateModal.feedbackSuccess'
                      ),
                    });
                  })
                  .finally(() => {
                    closeModal();
                  });
              }}
            >
              <span className="text-r-neutral-title-2 text-[16px] font-[500]">
                {t('page.dashboard.settings.rateModal.submitFeedbackButton')}
              </span>
            </Button>
          </footer>
        </div>
      )}
    </Popup>
  );
}
