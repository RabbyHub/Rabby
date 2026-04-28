import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from 'antd';
import clsx from 'clsx';
import { Popup } from '@/ui/component';
import { PopupProps } from '@/ui/component/Popup';
import { ReactComponent as RcIconCloseCC } from 'ui/assets/component/close-cc.svg';

interface EnableUnifiedAccountContentProps {
  onClose: () => void;
  onConfirm: () => Promise<boolean | void>;
}

const Content: React.FC<EnableUnifiedAccountContentProps> = ({
  onClose,
  onConfirm,
}) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const ok = await onConfirm();
      if (ok !== false) onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-r-neutral-bg2 rounded-t-[16px]">
      <div className="flex items-center justify-center px-20 pt-20 pb-12">
        <div className="text-20 text-center font-medium text-r-neutral-title-1">
          {t('page.perps.EnableUnifiedAccount.title')}
        </div>
      </div>

      <div className="px-20 text-13 leading-[18px] text-r-neutral-foot text-center">
        {t('page.perps.EnableUnifiedAccount.desc')}
      </div>

      <div
        className={clsx(
          'mx-20 mt-16 mb-24 px-12 py-12 rounded-[8px] bg-r-neutral-card1'
        )}
      >
        <div className="text-15 font-medium text-r-neutral-title-1 mb-4">
          <span className="mr-4">💡</span>
          {t('page.perps.EnableUnifiedAccount.important')}
        </div>
        <div className="text-13 leading-[18px] text-r-neutral-foot">
          {t('page.perps.EnableUnifiedAccount.importantTips')}
        </div>
      </div>

      <div className="mt-auto px-20 py-16 border-t-[0.5px] border-solid border-rabby-neutral-line">
        <Button
          block
          size="large"
          type="primary"
          loading={loading}
          onClick={handleConfirm}
          className="h-[48px] text-15 font-medium rounded-[8px]"
        >
          {t('page.perps.EnableUnifiedAccount.confirm')}
        </Button>
      </div>
    </div>
  );
};

export const EnableUnifiedAccountPopup = (
  props: PopupProps & {
    onConfirm: () => Promise<boolean | void>;
  }
) => {
  const { onConfirm, ...rest } = props;
  return (
    <Popup
      placement="bottom"
      height={350}
      isSupportDarkMode
      bodyStyle={{ padding: 0 }}
      destroyOnClose
      push={false}
      closable
      {...rest}
    >
      <Content
        onClose={() => {
          props.onCancel?.();
        }}
        onConfirm={onConfirm}
      />
    </Popup>
  );
};

export default EnableUnifiedAccountPopup;
