import { Modal } from 'antd';
import clsx from 'clsx';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { createGlobalStyle } from 'styled-components';

const GlobalStyle = createGlobalStyle`
  .small-swap-stop-task-modal {
    .ant-modal-content {
      border-radius: 16px;
      border: none;
    }
  }
`;

export const StopTaskModal: React.FC<{
  visible: boolean;
  onContinue?: () => void;
  onStop?: () => void;
}> = ({ visible, onContinue, onStop }) => {
  const { t } = useTranslation();
  return (
    <Modal
      visible={visible}
      footer={null}
      width={480}
      centered
      bodyStyle={{
        padding: 0,
      }}
      maskStyle={{
        zIndex: 1000,
        backdropFilter: 'blur(8px)',
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
      }}
      closable={false}
      destroyOnClose
      className="modal-support-darkmode small-swap-stop-task-modal"
    >
      <GlobalStyle />
      <div className="flex flex-col h-full p-[24px]">
        <header className="mb-[16px]">
          <h3 className="text-[20px] leading-[24px] font-medium text-r-neutral-title-1 text-center m-0">
            {t('page.desktopSmallSwap.stopTaskModal.title')}
          </h3>
        </header>
        <div className="text-center mb-[24px] text-[15px] leading-[18px] text-r-neutral-foot min-h-[36px]">
          {t('page.desktopSmallSwap.stopTaskModal.description')}
        </div>
        <footer className="flex items-center gap-[16px]">
          <button
            type="button"
            className={clsx(
              'flex-1 w-[50%]  h-[60px] rounded-[8px] bg-rb-neutral-bg-4',
              'text-[18px] leading-[20px] font-medium text-r-neutral-title1'
            )}
            onClick={onContinue}
          >
            {t('page.desktopSmallSwap.stopTaskModal.continueSwap')}
          </button>
          <button
            type="button"
            className={clsx(
              'w-[50%] h-[60px] rounded-[8px] transition-opacity',
              'text-[18px] leading-[20px] font-medium text-r-neutral-title2',
              'bg-r-red-default'
            )}
            onClick={onStop}
          >
            {t('page.desktopSmallSwap.stopTaskModal.stop')}
          </button>
        </footer>
      </div>
    </Modal>
  );
};
