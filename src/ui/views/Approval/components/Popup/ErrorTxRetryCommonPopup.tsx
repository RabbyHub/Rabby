import { RetryUpdateType } from '@/background/utils/errorTxRetry';
import { Popup } from '@/ui/component';
import { PopupProps } from '@/ui/component/Popup';
import clsx from 'clsx';
import { noop } from 'lodash';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { ReactComponent as RcIconInfoCC } from '@/ui/assets/info-fill-cc.svg';
import { FooterResendCancelGroup } from './FooterResendCancelGroup';

export const ErrorTxRetryCommonPopup: React.FC<{
  description?: React.ReactNode;
  onRetry?: () => void;
  onCancel?: () => void;
  getContainer?: PopupProps['getContainer'];
  retryUpdateType: RetryUpdateType;
  category?: string;
}> = ({
  description,
  onRetry = noop,
  onCancel = noop,
  getContainer,
  retryUpdateType = 'origin',
  category,
}) => {
  const { t } = useTranslation();

  const content = React.useMemo(() => {
    if (category) {
      if (retryUpdateType) {
        return t('page.signFooterBar.qrcode.retryTxFailedBy', {
          category: category,
        });
      }
      return t('page.signFooterBar.qrcode.txFailedBy', {
        category: category,
      });
    }
    return t('page.signFooterBar.qrcode.txFailed');
  }, [category, retryUpdateType]);

  return (
    <Popup
      height={'auto'}
      visible={!!description}
      bodyStyle={{ padding: 0 }}
      maskStyle={{
        backgroundColor: 'transparent',
      }}
      getContainer={getContainer}
    >
      <div className={clsx('flex flex-col items-center', 'flex-1')}>
        <div
          className={clsx(
            'text-[20px] font-medium leading-[24px]',
            'flex items-center ',
            retryUpdateType ? 'mt-[25px]' : 'mt-[41px]'
          )}
        >
          {/* {image ? <img src={image} className="w-20 mr-6" /> : null} */}
          <RcIconInfoCC
            className={clsx(
              'w-24 h-24 mr-8',
              retryUpdateType ? 'text-r-orange-default' : 'text-r-red-default'
            )}
          />
          <span>{content}</span>
        </div>
        <div
          className={clsx(
            'text-r-neutral-foot',
            'mt-[12px]',
            'px-20',
            'text-13 leading-[16px] font-normal text-center',
            'overflow-auto w-full',
            retryUpdateType ? 'mb-[24px]' : 'mb-[37px]'
          )}
        >
          {description}
        </div>

        <div className="text-center w-full">
          <FooterResendCancelGroup
            onCancel={onCancel}
            onResend={onRetry}
            retryUpdateType={retryUpdateType}
          />
        </div>
      </div>
    </Popup>
  );
};
