import React, { useEffect, useState } from 'react';

import { Button } from 'antd';

import { ReactComponent as RcIconChecked } from '@/ui/assets/ecology/icon-checked-cc.svg';
import { useThemeMode } from '@/ui/hooks/usePreference';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import Modal from '../Modal';
import styled from 'styled-components';

const StyledModal = styled(Modal)`
  .ant-modal-close-x {
    width: 64px;
    height: 64px;
  }
`;

export const EcologyNoticeModal = ({
  visible,
  onCancel,
  onConfirm,
  className,
}: {
  visible?: boolean;
  onConfirm?: (checked: boolean) => void;
  className?: string;
  onCancel?(): void;
}) => {
  const { t } = useTranslation();
  const { isDarkTheme } = useThemeMode();
  const [isChecked, setIsChecked] = useState(true);

  useEffect(() => {
    if (!visible) {
      setIsChecked(true);
    }
  }, [visible]);

  return (
    <StyledModal
      visible={visible}
      centered
      width={360}
      cancelText={null}
      okText={null}
      footer={null}
      onCancel={onCancel}
      className={clsx('modal-support-darkmode', className)}
      bodyStyle={{
        paddingLeft: 20,
        paddingRight: 20,
      }}
    >
      <div className="text-center text-[20px] leading-[24px] font-medium mb-[12px] text-r-neutral-title-1">
        {t('component.EcologyNoticeModal.title')}
      </div>
      <div className="text-[13px] leading-[18px] text-r-neutral-body mb-[20px]">
        {t('component.EcologyNoticeModal.desc')}
      </div>
      <div
        className="flex items-center gap-[6px] justify-center cursor-pointer mb-[20px]"
        onClick={() => {
          setIsChecked(!isChecked);
        }}
      >
        {isChecked ? (
          <RcIconChecked className="text-r-blue-default" />
        ) : (
          <RcIconChecked className="text-r-neutral-line" />
        )}
        <div className="text-[13px] leading-[16px] text-r-neutral-body">
          {t('component.EcologyNoticeModal.notRemind')}
        </div>
      </div>
      <footer className="flex justify-center">
        <Button
          type="primary"
          className="w-full h-[44px]"
          onClick={() => {
            onConfirm?.(isChecked);
          }}
        >
          {t('global.Confirm')}
        </Button>
      </footer>
    </StyledModal>
  );
};
