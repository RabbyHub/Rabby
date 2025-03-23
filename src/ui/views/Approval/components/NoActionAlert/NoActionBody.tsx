import { noop } from '@/ui/utils';
import { useTranslation } from 'react-i18next';
import { ReactComponent as IconEmail } from '@/ui/assets/add-chain/email.svg';
import React from 'react';
import { Loading3QuartersOutlined } from '@ant-design/icons';
import { Spin } from 'antd';
import clsx from 'clsx';

interface Props {
  isRequested?: boolean;
  requestedCount: number;
  isRequesting?: boolean;
  handleRequest(): void;
}
export const NoActionBody: React.FC<Props> = ({
  isRequested,
  requestedCount,
  isRequesting,
  handleRequest,
}) => {
  const { t } = useTranslation();

  return (
    <>
      <div className="h-[0.5px] bg-r-neutral-line w-full my-12" />
      <div className="leading-[16px]">
        {isRequested ? (
          <div className="text-r-neutral-foot text-center">
            {requestedCount > 1
              ? t('page.switchChain.requestsReceivedPlural', {
                  count: requestedCount,
                })
              : t('page.switchChain.requestsReceived')}
          </div>
        ) : (
          <div
            className={clsx(
              'gap-x-6 flex items-center justify-center',
              'cursor-pointer hover:opacity-70',
              isRequesting && 'opacity-70'
            )}
            onClick={isRequesting ? noop : handleRequest}
          >
            {isRequesting ? (
              <Spin
                indicator={
                  <Loading3QuartersOutlined style={{ fontSize: 16 }} spin />
                }
              />
            ) : (
              <IconEmail className="w-16" />
            )}
            <span className="text-r-blue-default">
              {t('page.switchChain.requestRabbyToSupport')}
            </span>
          </div>
        )}
      </div>
    </>
  );
};
