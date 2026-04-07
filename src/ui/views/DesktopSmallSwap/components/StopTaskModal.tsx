import { Modal } from 'antd';
import clsx from 'clsx';
import React from 'react';
import { useTranslation } from 'react-i18next';

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
      className="modal-support-darkmode"
    >
      <div className="bg-rb-neutral-InvertHighlight flex flex-col h-full p-[24px]">
        <header className="mb-[16px]">
          <h3 className="text-[20px] leading-[24px] font-medium text-r-neutral-title-1 text-center m-0">
            Stop the current swaps?
          </h3>
        </header>
        <div className="text-center mb-[24px] text-[15px] leading-[18px] text-r-neutral-foot">
          If you stop now, any remaining swaps will not be completed. Please
          note completed swaps cannot be reversed.
        </div>
        <footer className="flex items-center gap-[16px]">
          <button
            type="button"
            className="flex-1 w-[50%]  h-[60px] rounded-[8px] text-[18px] leading-[20px] font-medium bg-rb-neutral-bg-4"
            onClick={onContinue}
          >
            Continue swap
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
            Stop
          </button>
        </footer>
      </div>
    </Modal>
  );
};
