import { INTERNAL_REQUEST_ORIGIN } from '@/constant';
import { useWallet } from '@/ui/utils';
import { getActionTypeText as getActionTypedDataTypeText } from '@/ui/views/Approval/components/TypedDataActions/utils';
import { getActionTypeText } from '@/ui/views/Approval/components/TextActions/utils';
import { parseAction } from '@rabby-wallet/rabby-action';
import { SafeMessage } from '@safe-global/api-kit';
import { useRequest } from 'ahooks';
import { Button, Skeleton } from 'antd';
import { isString } from 'lodash';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import IconUnknown from 'ui/assets/icon-unknown.svg';

export const GnosisMessageExplain = ({
  onView,
  data,
  isViewLoading,
}: {
  data: SafeMessage;
  onView(): void;
  isViewLoading?: boolean;
}) => {
  const { t } = useTranslation();

  const wallet = useWallet();

  const { data: content, loading } = useRequest(
    async () => {
      if (isString(data.message)) {
        const res = await wallet.openapi.parseText({
          text: data.message,
          origin: INTERNAL_REQUEST_ORIGIN,
          address: data.safe,
        });

        const parsed = parseAction({
          type: 'text',
          data: res.action,
          text: data.message,
          sender: data.safe,
        });

        return getActionTypeText(parsed);
      }
      const res = await wallet.openapi.parseTypedData({
        typedData: data.message,
        origin: INTERNAL_REQUEST_ORIGIN,
        address: data.safe,
      });

      const parsed = parseAction({
        type: 'typed_data',
        data: res.action as any,
        typedData: data.message,
        sender: data.safe,
      });

      return getActionTypedDataTypeText(parsed);
    },
    {
      refreshDeps: [data.message, data.safe],
      cacheKey: `getActionTypeText-${data.message}-${data.safe}`,
      staleTime: 30 * 1000,
    }
  );

  if (loading) {
    return <Skeleton.Button active style={{ width: 336, height: 25 }} />;
  }

  return (
    <div className="tx-explain">
      {/* todo icon */}
      <img className="icon icon-explain" src={IconUnknown} />
      <span>{content}</span>
      <Button
        type="primary"
        className="tx-explain__view"
        loading={isViewLoading}
        onClick={onView}
      >
        {t('page.safeQueue.viewBtn')}
      </Button>
    </div>
  );
};
