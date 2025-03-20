import { Popup } from '@/ui/component';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { EcologyContent } from './EcologyContent';

interface Props {
  visible?: boolean;
  onClose?(): void;
}
export const EcologyPopup = ({ visible, onClose }: Props) => {
  const { t } = useTranslation();

  return (
    <Popup
      visible={visible}
      height={'fit-content'}
      onClose={onClose}
      push={false}
      title={t('page.dashboard.echologyPopup.title')}
    >
      <EcologyContent />
    </Popup>
  );
};
