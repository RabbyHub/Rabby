import { ReactComponent as RcIconArrow } from '@/ui/assets/ecology/icon-arrow-right-cc.svg';
import { ReactComponent as RcIconChecked } from '@/ui/assets/ecology/icon-checked-cc.svg';
import { ReactComponent as RcIconUncheck } from '@/ui/assets/ecology/icon-uncheck-cc.svg';
import { ReactComponent as RcIconJump } from '@/ui/assets/ecology/icon-jump-cc.svg';
import { ReactComponent as RcIconAlarm } from '@/ui/assets/ecology/icon-alarm-cc.svg';
import { Popup } from '@/ui/component';
import { findChain } from '@/utils/chain';
import { DbkBridgeHistoryItem } from '@rabby-wallet/rabby-api/dist/types';
import { Virtuoso } from 'react-virtuoso';
import { DbkBridgeStatus } from '../../../utils';
import React from 'react';
import { formatAmount, openInTab, sinceTime } from '@/ui/utils';
import clsx from 'clsx';
import { Chain } from '@/types/chain';
import { getTxScanLink } from '@/utils';
import { Loading3QuartersOutlined } from '@ant-design/icons';
import { DbkButton } from '../../../components/DbkButton';
import ImgEmpty from 'ui/assets/swap/empty.svg';
import { useTranslation } from 'react-i18next';

const ActivityBridgeStatus = ({
  item,
  status,
  chain,
  onWithdrawStep,
}: {
  item: DbkBridgeHistoryItem;
  status: DbkBridgeStatus;
  chain: Chain;
  onWithdrawStep(status: DbkBridgeStatus): void;
}) => {
  const { t } = useTranslation();
  if (!status || status === 'finalized') {
    return null;
  }
  if (item.is_deposit) {
    return (
      <div className="mt-[16px] flex items-center justify-between">
        <div
          className={clsx(
            'inline-flex items-center gap-[6px]',
            'px-[10px] py-[6px] rounded-full',
            'bg-[rgba(255,124,96,0.10)] text-r-orange-DBK cursor-pointer'
          )}
          onClick={() => {
            openInTab(getTxScanLink(chain.scanLink, item.tx_id));
          }}
        >
          <Loading3QuartersOutlined className="text-[14px] animate-spin block" />
          <div className="text-[13px] leading-[16px] font-bold">
            {t('page.ecology.dbk.bridge.ActivityPopup.status.deposit')}
          </div>
          <RcIconJump />
        </div>

        <div className="inline-flex items-center gap-[2px] px-[10px] py-[6px] rounded-full bg-r-neutral-card-2">
          <RcIconAlarm className="text-r-neutral-foot" />{' '}
          <div className="text-r-neutral-body text-[13px] leading-[16px] font-medium">
            ~ 10 mins
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="mt-[16px] flex flex-col gap-[12px] items-start">
      <div
        className="inline-flex items-center gap-[6px] px-[10px] py-[6px] rounded-full bg-r-green-light cursor-pointer"
        onClick={() => {
          openInTab(getTxScanLink(chain.scanLink, item.tx_id));
        }}
      >
        <RcIconChecked className="text-r-green-default" />
        <div className="text-[13px] leading-[16px] text-r-green-default font-bold">
          {t('page.ecology.dbk.bridge.ActivityPopup.status.withdraw')}
        </div>
        <RcIconJump className="text-r-green-default" />
      </div>
      {status === 'waiting-to-prove' ? (
        <div className="flex items-center justify-between w-full">
          <div
            className={clsx(
              'inline-flex items-center gap-[6px]',
              'px-[10px] py-[6px] rounded-full',
              'bg-[rgba(255,124,96,0.10)] text-r-orange-DBK cursor-pointer'
            )}
          >
            <Loading3QuartersOutlined className="text-[14px] animate-spin block" />
            <div className="text-[13px] leading-[16px] font-bold">
              {t('page.ecology.dbk.bridge.ActivityPopup.status.rootPublished')}
            </div>
          </div>
          <div className="inline-flex items-center gap-[2px] px-[10px] py-[6px] rounded-full bg-r-neutral-card-2">
            <RcIconAlarm className="text-r-neutral-foot" />{' '}
            <div className="text-r-neutral-body text-[13px] leading-[16px] font-medium">
              ~ 1 hour
            </div>
          </div>
        </div>
      ) : [
          'ready-to-prove',
          'waiting-to-finalize',
          'ready-to-finalize',
          'finalized',
        ].includes(status) ? (
        <div className="flex items-center justify-between">
          <div
            className={clsx(
              'inline-flex items-center gap-[6px]',
              'px-[10px] py-[6px] rounded-full',
              'bg-r-green-light text-r-green-default'
            )}
          >
            <RcIconChecked className="text-r-green-default" />
            <div className="text-[13px] leading-[16px] font-bold">
              {t('page.ecology.dbk.bridge.ActivityPopup.status.rootPublished')}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center rounded-full bg-r-neutral-card-2 gap-[6px] text-r-neutral-foot px-[10px] py-[6px]">
            <RcIconUncheck />
            <div className="text-[13px] leading-[16px] font-bold">
              {t('page.ecology.dbk.bridge.ActivityPopup.status.rootPublished')}
            </div>
          </div>
        </div>
      )}
      {status === 'ready-to-prove' ? (
        <div className="flex items-center justify-between w-full">
          <div
            className={clsx(
              'inline-flex items-center gap-[6px]',
              'px-[10px] py-[6px] rounded-full',
              'bg-[rgba(255,124,96,0.10)] text-r-orange-DBK cursor-pointer'
            )}
          >
            <Loading3QuartersOutlined className="text-[14px] animate-spin block" />
            <div className="text-[13px] leading-[16px] font-bold">
              {t('page.ecology.dbk.bridge.ActivityPopup.status.readyToProve')}
            </div>
          </div>
          <DbkButton
            className="h-[28px]"
            size="small"
            onClick={() => {
              onWithdrawStep(status);
            }}
          >
            {t('page.ecology.dbk.bridge.ActivityPopup.proveBtn')}
          </DbkButton>
        </div>
      ) : ['waiting-to-finalize', 'ready-to-finalize', 'finalized'].includes(
          status
        ) ? (
        <div className="flex items-center justify-between">
          <div
            className={clsx(
              'inline-flex items-center gap-[6px]',
              'px-[10px] py-[6px] rounded-full',
              'bg-r-green-light text-r-green-default'
            )}
          >
            <RcIconChecked className="text-r-green-default" />
            <div className="text-[13px] leading-[16px] font-bold">
              {t('page.ecology.dbk.bridge.ActivityPopup.status.proved')}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center rounded-full bg-r-neutral-card-2 gap-[6px] text-r-neutral-foot px-[10px] py-[6px]">
            <RcIconUncheck />
            <div className="text-[13px] leading-[16px] font-bold">
              {t('page.ecology.dbk.bridge.ActivityPopup.status.proved')}
            </div>
          </div>
        </div>
      )}
      {status === 'waiting-to-finalize' ? (
        <div className="flex items-center justify-between w-full">
          <div
            className={clsx(
              'inline-flex items-center gap-[6px]',
              'px-[10px] py-[6px] rounded-full',
              'bg-[rgba(255,124,96,0.10)] text-r-orange-DBK cursor-pointer'
            )}
          >
            <Loading3QuartersOutlined className="text-[14px] animate-spin block" />
            <div className="text-[13px] leading-[16px] font-bold">
              {t(
                'page.ecology.dbk.bridge.ActivityPopup.status.challengePeriod'
              )}
            </div>
          </div>
          <div className="inline-flex items-center gap-[2px] px-[10px] py-[6px] rounded-full bg-r-neutral-card-2">
            <RcIconAlarm className="text-r-neutral-foot" />{' '}
            <div className="text-r-neutral-body text-[13px] leading-[16px] font-medium">
              ~ 7 days
            </div>
          </div>
        </div>
      ) : ['ready-to-finalize', 'finalized'].includes(status) ? (
        <div className="flex items-center justify-between">
          <div
            className={clsx(
              'inline-flex items-center gap-[6px]',
              'px-[10px] py-[6px] rounded-full',
              'bg-r-green-light text-r-green-default'
            )}
          >
            <RcIconChecked className="text-r-green-default" />
            <div className="text-[13px] leading-[16px] font-bold">
              {t(
                'page.ecology.dbk.bridge.ActivityPopup.status.challengePeriod'
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center rounded-full bg-r-neutral-card-2 gap-[6px] text-r-neutral-foot px-[10px] py-[6px]">
            <RcIconUncheck />
            <div className="text-[13px] leading-[16px] font-bold">
              {t(
                'page.ecology.dbk.bridge.ActivityPopup.status.challengePeriod'
              )}
            </div>
          </div>
        </div>
      )}
      {status === 'ready-to-finalize' ? (
        <div className="flex items-center justify-between w-full">
          <div
            className={clsx(
              'inline-flex items-center gap-[6px]',
              'px-[10px] py-[6px] rounded-full',
              'bg-[rgba(255,124,96,0.10)] text-r-orange-DBK'
            )}
          >
            <Loading3QuartersOutlined className="text-[14px] animate-spin block" />
            <div className="text-[13px] leading-[16px] font-bold">
              {t('page.ecology.dbk.bridge.ActivityPopup.status.readyToClaim')}
            </div>
          </div>
          <DbkButton
            className="h-[28px]"
            size="small"
            onClick={() => {
              onWithdrawStep(status);
            }}
          >
            {t('page.ecology.dbk.bridge.ActivityPopup.claimBtn')}
          </DbkButton>
        </div>
      ) : ['finalized'].includes(status) ? (
        <div className="flex items-center justify-between">
          <div
            className={clsx(
              'inline-flex items-center gap-[6px]',
              'px-[10px] py-[6px] rounded-full',
              'bg-r-green-light text-r-green-default'
            )}
          >
            <RcIconChecked className="text-r-green-default" />
            <div className="text-[13px] leading-[16px] font-bold">
              {t('page.ecology.dbk.bridge.ActivityPopup.status.claimed')}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center rounded-full bg-r-neutral-card-2 gap-[6px] text-r-neutral-foot px-[10px] py-[6px]">
            <RcIconUncheck />
            <div className="text-[13px] leading-[16px] font-bold">
              {t('page.ecology.dbk.bridge.ActivityPopup.status.claimed')}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ActivityItem = ({
  item,
  status,
  onWithdrawStep,
}: {
  item: DbkBridgeHistoryItem;
  status: DbkBridgeStatus;
  onWithdrawStep(status: DbkBridgeStatus): void;
}) => {
  const fromChain = findChain({ serverId: item.from_chain_id });
  const targetChain = findChain({ serverId: item.to_chain_id });
  const { t } = useTranslation();
  return (
    <div
      className={clsx(
        'mb-[20px] p-[16px] rounded-[8px] border-[0.5px]',
        status && status !== 'finalized'
          ? 'border-rabby-orange-DBK'
          : 'border-rabby-neutral-line'
      )}
    >
      <div className="flex items-end justify-between mb-[8px]">
        <div className="flex items-end gap-[8px]">
          <div className="text-[15px] leading-[18px] font-bold text-r-neutral-title-1">
            {item.is_deposit
              ? t('page.ecology.dbk.bridge.ActivityPopup.deposit')
              : t('page.ecology.dbk.bridge.ActivityPopup.withdraw')}
          </div>
          <div className="text-[12px] leading-[14px] font-medium text-r-neutral-foot">
            {sinceTime(item.create_at)}
          </div>
        </div>
        <div className="text-[15px] leading-[18px] font-bold text-r-neutral-title-1">
          {formatAmount(item.from_token_amount)} ETH
        </div>
      </div>
      <div className="flex gap-[6px] items-center">
        <div className="flex gap-[6px]">
          <img src={fromChain?.logo} alt="" className="w-[16px] h-[16px]" />
          <div className="text-[13px] leading-[16px] text-r-neutral-body font-semibold">
            {fromChain?.name}
          </div>
        </div>
        <div className="text-r-neutral-foot">
          <RcIconArrow />
        </div>
        <div className="flex gap-[6px]">
          <img src={targetChain?.logo} alt="" className="w-[16px] h-[16px]" />
          <div className="text-[13px] leading-[16px] text-r-neutral-body font-semibold">
            {targetChain?.name}
          </div>
        </div>
      </div>
      <ActivityBridgeStatus
        item={item}
        status={status}
        chain={fromChain!}
        onWithdrawStep={onWithdrawStep}
      ></ActivityBridgeStatus>
    </div>
  );
};

interface ActivityPopupProps {
  visible?: boolean;
  onClose?: () => void;
  data: DbkBridgeHistoryItem[];
  onWithdrawStep: (item: DbkBridgeHistoryItem, status: DbkBridgeStatus) => void;
  statusDict: Record<
    string,
    DbkBridgeHistoryItem & {
      status: DbkBridgeStatus;
    }
  >;
  loadMore: () => void;
}
export const ActivityPopup = ({
  visible,
  onClose,
  data,
  statusDict,
  onWithdrawStep,
  loadMore,
}: ActivityPopupProps) => {
  const isEmpty = !data?.length;
  const { t } = useTranslation();
  return (
    <Popup
      title={
        <div className="font-semibold">
          {t('page.ecology.dbk.bridge.ActivityPopup.title')}
        </div>
      }
      visible={visible}
      height={540}
      closable
      onClose={onClose}
      style={{ fontFamily: "'Lato', sans-serif" }}
    >
      <div className="flex flex-col h-full">
        {isEmpty ? (
          <div className="w-full h-full flex flex-col items-center">
            <img
              src={ImgEmpty}
              className="w-[52px] h-[52px] mx-auto mt-[112px] mb-24"
            />
            <p className="text-center text-r-neutral-foot text-14">
              {t('page.ecology.dbk.bridge.ActivityPopup.empty')}
            </p>
          </div>
        ) : (
          <Virtuoso
            style={{
              height: '100%',
            }}
            data={data || []}
            itemContent={(_, item) => {
              const key = `${item.from_chain_id}:${item.tx_id}`;
              const status = statusDict[key]?.status;
              return (
                <ActivityItem
                  item={item}
                  status={status}
                  onWithdrawStep={(status) => {
                    onWithdrawStep(item, status);
                  }}
                />
              );
            }}
            endReached={loadMore}
            components={{
              Footer: () => {
                // if (loadingMore) {
                //   return <Loading count={4} active />;
                // }
                return null;
              },
            }}
          ></Virtuoso>
        )}
      </div>
    </Popup>
  );
};
