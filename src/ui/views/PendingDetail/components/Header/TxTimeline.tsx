import React from 'react';
import styled from 'styled-components';

import iconSpin from '@/ui/assets/pending/icon-spin-1.svg';
import { TxRequest } from '@rabby-wallet/rabby-api/dist/types';
import { Timeline } from 'antd';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';

const Wrapper = styled.div`
  min-width: 376px;
  max-height: 600px;
  overflow-y: auto;
  .ant-timeline-item-head {
    background-color: transparent;
  }
  .ant-timeline-item-content {
    top: -4px;
    min-height: 48px;
  }
  .ant-timeline-item-pending {
    padding-bottom: 0;
    .ant-timeline-item-content {
      min-height: 0;
    }
  }
  .ant-timeline-item-tail {
    border-left: 1px solid var(--r-neutral-line, #d3d8e0);
    border-left: 0.5px solid var(--r-neutral-line, #d3d8e0);
  }
  .ant-timeline.ant-timeline-pending
    .ant-timeline-item-last
    .ant-timeline-item-tail {
    border-left: 1px dashed var(--r-neutral-line, #d3d8e0);
    border-left: 0.5px dashed var(--r-neutral-line, #d3d8e0);
  }
`;

export const TxTimeline = ({ txRequest }: { txRequest: TxRequest }) => {
  const { t } = useTranslation();

  const Dot = (
    <div className="bg-r-neutral-foot rounded-full w-[8px] h-[8px]"></div>
  );
  return (
    <Wrapper>
      <div className="p-[24px]">
        <Timeline
          pending={
            <div className="text-r-neutral-foot text-[15px] leading-[18px] font-medium">
              {t('page.pendingDetail.TxTimeline.pending')}
            </div>
          }
          pendingDot={
            <img src={iconSpin} className="w-[14px] h-[14px] animate-spin" />
          }
        >
          <Timeline.Item dot={Dot}>
            <div className="text-r-neutral-title-1 text-[15px] leading-[18px] font-medium">
              {dayjs.unix(txRequest.create_at).format('HH:mm')}{' '}
              {t('page.pendingDetail.TxTimeline.created')}
            </div>
          </Timeline.Item>

          {txRequest?.push_at_list?.map((item, index) => {
            return (
              <Timeline.Item dot={Dot} key={index}>
                <div className="text-r-neutral-title-1 text-[15px] leading-[18px] font-medium">
                  {dayjs.unix(item).format('HH:mm')}{' '}
                  {index + 1 === txRequest?.push_at_list?.length
                    ? t('page.pendingDetail.TxTimeline.broadcasted')
                    : t('page.pendingDetail.TxTimeline.broadcastedCount', {
                        count: index + 1,
                        ordinal: true,
                      })}
                </div>
              </Timeline.Item>
            );
          })}
        </Timeline>
      </div>
    </Wrapper>
  );
};
