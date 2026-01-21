import { Modal, ModalProps } from 'antd';
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { useWallet } from '@/ui/utils';
import { useCurrentAccount } from '@/ui/hooks/backgroundState/useAccount';
import { useMemoizedFn, useRequest } from 'ahooks';
import { DesktopLoading } from '../DesktopLoading';
import { Empty } from '@/ui/component';
import { DesktopHistoryItem } from '../DesktopHistoryItem';
import { last } from 'lodash';
import { SvgIconCross } from 'ui/assets';
import { ReactComponent as RcIconClose } from '@/ui/assets/dapp-search/cc-close.svg';

export const HideScamTransactionModal: React.FC<ModalProps> = (props) => {
  const { t } = useTranslation();
  const { ...modalProps } = props;

  const wallet = useWallet();
  const currentAccount = useCurrentAccount();

  const getAllTxHistory = useMemoizedFn(
    (params: Parameters<typeof wallet.openapi.getAllTxHistory>[0]) => {
      const getHistory = wallet.openapi.getAllTxHistory;

      return getHistory(params).then((res) => {
        if (res.history_list) {
          res.history_list = res.history_list.filter((item) => {
            return !item.is_scam;
          });
        }
        return res;
      });
    }
  );

  const fetchData = useMemoizedFn(async () => {
    const { address } = currentAccount!;

    const apiLevel = await wallet.getAPIConfig([], 'ApiLevel', false);
    if (apiLevel >= 1) {
      return {
        list: [],
      };
    }

    const res = await getAllTxHistory({
      id: address,
    });

    const { project_dict, cate_dict, history_list: list } = res;
    const displayList = list
      .map((item) => ({
        ...item,
        projectDict: project_dict,
        cateDict: cate_dict,
        tokenDict: 'token_dict' in res ? res.token_dict : undefined,
        tokenUUIDDict:
          'token_uuid_dict' in res ? res.token_uuid_dict : undefined,
      }))
      .sort((v1, v2) => v2.time_at - v1.time_at);
    return {
      last: last(displayList)?.time_at,
      list: displayList,
    };
  });

  const { data, loading } = useRequest(() => fetchData(), {
    refreshDeps: [currentAccount?.address],
    ready: !!currentAccount && modalProps.visible,
  });

  const isEmpty = (data?.list?.length || 0) <= 0 && !loading;

  return (
    <Modal
      {...modalProps}
      width={1148}
      title={null}
      className="modal-support-darkmode global-desktop-modal"
      bodyStyle={{
        background: 'transparent',
        padding: 0,
      }}
      centered
      maskClosable={true}
      footer={null}
      zIndex={1000}
      maskStyle={{
        zIndex: 1000,
        backdropFilter: 'blur(8px)',
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
      }}
      destroyOnClose
    >
      <header className="text-center py-[15px] sticky top-0 z-10 bg-rb-neutral-bg-1 relative">
        <div className="text-[20px] leading-[24px] font-medium text-rb-neutral-title-1">
          {t('page.transactions.filterScam.title')}
        </div>
        <div className="text-[13px] leading-[16px] text-rb-neutral-foot">
          {t('page.transactions.filterScam.loading')}
        </div>
        <div className="absolute right-[20px] top-0 bottom-0 flex items-center">
          <div onClick={modalProps.onCancel}>
            <RcIconClose
              viewBox="0 0 14 14"
              className="w-[20px] h-[20px] text-r-neutral-foot hover:text-r-neutral-title-1 cursor-pointer"
            />
          </div>
        </div>
      </header>
      <section className="px-[34px] pb-[34px]">
        {loading ? (
          <div className="overflow-hidden">
            <DesktopLoading count={8} active />
          </div>
        ) : (
          <>
            {isEmpty ? (
              <Empty
                title={t('page.transactions.empty.title')}
                className="pt-[108px]"
              />
            ) : (
              <div className="overflow-hidden">
                {data?.list?.map((item) => (
                  <DesktopHistoryItem
                    key={item.id}
                    data={item}
                    projectDict={item.projectDict}
                    cateDict={item.cateDict}
                    tokenDict={item.tokenDict || item.tokenUUIDDict || {}}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </section>
    </Modal>
  );
};
