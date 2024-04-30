import { Empty, Modal, PageHeader, Popup } from '@/ui/component';
import { Button, message } from 'antd';
import { ConnectedSite } from 'background/service/permission';
import React, { useEffect, useMemo, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { matomoRequestEvent } from '@/utils/matomo-request';
import { openInTab, useWallet } from 'ui/utils';
import ConnectionList from './ConnectionList';
import './style.less';
import { useRabbyDispatch, useRabbySelector } from 'ui/store';
import clsx from 'clsx';
import { SvgIconCross } from '@/ui/assets';

interface RecentConnectionsProps {
  visible?: boolean;
  onClose?(): void;
}

const RecentConnections = ({
  visible = false,
  onClose,
}: RecentConnectionsProps) => {
  const { t } = useTranslation();
  const dispatch = useRabbyDispatch();
  const connections = useRabbySelector((state) => state.permission.websites);

  const list = useMemo(() => {
    return connections.sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [connections]);

  const pinnedList = useMemo(() => {
    return connections
      .filter((item) => item && item.isTop)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [connections]);

  const recentList = useMemo(() => {
    return connections.filter((item) => item && !item.isTop);
  }, [connections]);

  const handleClick = (connection: ConnectedSite) => {
    matomoRequestEvent({
      category: 'Dapps',
      action: 'openDapp',
      label: connection.origin,
      transport: 'beacon',
    });

    openInTab(connection.origin);
  };

  const handlePinChange = (item: ConnectedSite) => {
    if (item.isTop) {
      dispatch.permission.unpinWebsite(item.origin);
    } else {
      dispatch.permission.pinWebsite(item.origin);
    }
  };
  const handleRemove = async (origin: string) => {
    await dispatch.permission.removeWebsite(origin);
    matomoRequestEvent({
      category: 'Dapps',
      action: 'disconnectDapp',
      label: origin,
    });
    message.success({
      icon: <i />,
      content: (
        <span className="text-white">
          {t('page.dashboard.recentConnection.disconnected')}
        </span>
      ),
    });
  };

  const removeAll = async () => {
    try {
      await dispatch.permission.clearAll();
      matomoRequestEvent({
        category: 'Dapps',
        action: 'disconnectAllDapps',
      });
    } catch (e) {
      console.error(e);
    }
    message.success({
      icon: <i />,
      content: (
        <span className="text-white">
          {t('page.dashboard.recentConnection.disconnected')}
        </span>
      ),
    });
  };

  const handleRemoveAll = async () => {
    Modal.info({
      className: 'recent-connections-confirm-modal',
      centered: true,
      closable: true,
      okText: t('global.Confirm'),
      width: 360,
      onOk: removeAll,
      autoFocusButton: null,
      closeIcon: (
        <SvgIconCross className="w-14 fill-current text-r-neutral-body" />
      ),
      content: (
        <div>
          <div className="title">
            <Trans
              count={recentList.length}
              i18nKey="page.dashboard.recentConnection.disconnectRecentlyUsed.title"
            ></Trans>
          </div>
        </div>
      ),
    });
  };

  useEffect(() => {
    dispatch.permission.getWebsites();
  }, []);
  const [isVisible, setIsVisible] = useState(false);

  const handleCancel = () => {
    setIsVisible(false);
    setTimeout(() => {
      onClose?.();
    }, 500);
  };

  useEffect(() => {
    setTimeout(() => {
      setIsVisible(visible);
    }, 100);
  }, [visible]);

  return (
    <div
      className={clsx('recent-connections-popup', {
        show: isVisible,
        hidden: !visible,
      })}
    >
      <PageHeader
        forceShowBack
        onBack={handleCancel}
        className="bg-neutral-bg1 sticky top-0"
      >
        {t('page.dashboard.recentConnection.title')}
      </PageHeader>
      {list?.length ? (
        <>
          <div className="mx-[-20px] px-[20px] h-[calc(100%-100px)] overflow-auto">
            <ConnectionList
              onRemove={handleRemove}
              onClick={handleClick}
              onPin={handlePinChange}
              data={pinnedList}
            ></ConnectionList>
            <ConnectionList
              onRemove={handleRemove}
              onClick={handleClick}
              onPin={handlePinChange}
              data={recentList}
            ></ConnectionList>
          </div>
          <footer
            className={clsx(
              'absolute z-10 bottom-0 left-0 right-0 bg-r-neutral-bg1',
              'border-t-[0.5px] border-t-solid border-t-rabby-neutral-line px-[20px]',
              'py-[16px]'
            )}
          >
            <Button
              ghost
              block
              className="btn-disconnect-all"
              onClick={handleRemoveAll}
            >
              {t('page.dashboard.recentConnection.disconnectAll')}
            </Button>
          </footer>
        </>
      ) : (
        <div className="list-empty mb-[-24px] rounded-b-none">
          <Empty
            desc={t('page.dashboard.recentConnection.noConnectedDapps')}
            className="pt-[68px] pb-[181px]"
          ></Empty>
        </div>
      )}
    </div>
  );
};
export default RecentConnections;
