import React, { useCallback, useMemo } from 'react';
import { Button, Input, message } from 'antd';
import { useTranslation } from 'react-i18next';

import Popup from '@/ui/component/Popup';
import {
  FEEDBACK_LEN_LIMIT,
  useExposureRateGuide,
  useRateModal,
} from './hooks';
import ClickableStar from './ClickableStar';

import { ReactComponent as RabbyLogo } from './icons/rabby-logo.svg';
import { ReactComponent as ChromeLogo } from './icons/chrome.svg';
import clsx from 'clsx';

const DASHED_LINE_STYLE = {
  opacity: 0.5,
  height: 0,
  width: '100%',
  borderBottom: '1px dashed var(--r-blue-default, #7084FF)',
};

export default function RateModal({
  totalBalanceText,
}: {
  totalBalanceText: string;
}) {
  const { t } = useTranslation();
  const { disableExposureRateGuide } = useExposureRateGuide();
  const {
    rateModalShown,
    toggleShowRateModal,

    userStar,
    selectStar,

    userFeedback,
    onChangeFeedback,
    submitFeedback,
    feedbackOverLimit,

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
    return !wantFeedback || !userFeedback.length;
  }, [wantFeedback, userFeedback]);

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
      }}
      destroyOnClose
      className="settings-popup-wrapper"
      isSupportDarkMode
    >
      {!wantFeedback ? (
        <div
          className="flex flex-col items-center justify-between h-[100%] w-[100%]"
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
                disableExposureRateGuide();
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
        <div className="flex flex-col items-center justify-between h-[100%] w-[100%] pt-[24px]">
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
                rows={4}
                className={clsx(
                  'w-[100%] h-[180px] rounded-[8px] p-[12px]',
                  'text-[13px] text-[400] text-r-neutral-title-1',
                  'border-rabby-blue-default border-[1px] border-solid'
                )}
                maxLength={FEEDBACK_LEN_LIMIT}
                onChange={(e) => {
                  onChangeFeedback(e.target.value);
                }}
              />
              <span className="absolute right-[12px] bottom-[12px] text-r-neutral-foot text-[12px] text-[400]">
                {userFeedback.length}/{FEEDBACK_LEN_LIMIT}
              </span>
            </div>
          </div>
          <footer className="flex w-[100%] p-[16px] border-t-[0.5px] border-rabby-neutral-line border-solid pb-[16px]">
            <Button
              disabled={disableSubmit}
              type="primary"
              size="large"
              className="w-[100%] flex flex-row justify-center items-center"
              block
              onClick={() => {
                submitFeedback({ totalBalanceText })
                  .then(() => {
                    message.success(
                      t('page.dashboard.settings.rateModal.feedbackSuccess')
                    );
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
