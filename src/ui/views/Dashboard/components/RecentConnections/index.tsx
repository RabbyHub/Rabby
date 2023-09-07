import { Empty, Modal, Popup } from '@/ui/component';
import { message } from 'antd';
import { ConnectedSite } from 'background/service/permission';
import React, { useEffect, useMemo, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { matomoRequestEvent } from '@/utils/matomo-request';
import { openInTab, useWallet } from 'ui/utils';
import ConnectionList from './ConnectionList';
import './style.less';
import { useRabbyDispatch, useRabbySelector } from 'ui/store';

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

  const handleSort = (sites: ConnectedSite[]) => {
    const list = sites.concat(recentList);
    dispatch.permission.reorderWebsites(list);
  };

  const handleFavoriteChange = (item: ConnectedSite) => {
    if (item.isTop) {
      dispatch.permission.unFavoriteWebsite(item.origin);
      matomoRequestEvent({
        category: 'Dapps',
        action: 'unfavoriteDapp',
        label: item.origin,
      });
    } else {
      dispatch.permission.favoriteWebsite(item.origin);
      matomoRequestEvent({
        category: 'Dapps',
        action: 'favoriteDapp',
        label: item.origin,
      });
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
      okText: t('page.dashboard.recentConnection.disconnectAll'),
      width: 320,
      onOk: removeAll,
      autoFocusButton: null,
      content: (
        <div>
          <div className="title">
            <Trans
              count={recentList.length}
              i18nKey="page.dashboard.recentConnection.disconnectRecentlyUsed.title"
            ></Trans>
          </div>
          <div className="desc">
            {t(
              'page.dashboard.recentConnection.disconnectRecentlyUsed.description'
            )}
          </div>
        </div>
      ),
    });
  };

  useEffect(() => {
    dispatch.permission.getWebsites();
  }, []);

  return (
    <Popup
      visible={visible}
      height={523}
      onClose={onClose}
      title={t('page.dashboard.recentConnection.title')}
      closable
    >
      <div className="recent-connections-popup">
        {visible && (
          <ConnectionList
            onRemove={handleRemove}
            data={pinnedList}
            onFavoriteChange={handleFavoriteChange}
            title={t('page.dashboard.recentConnection.pinned')}
            empty={
              <div className="list-empty">
                {t('page.dashboard.recentConnection.noPinnedDapps')}
              </div>
            }
            extra={
              pinnedList.length > 0
                ? t('page.dashboard.recentConnection.dragToSort')
                : null
            }
            onClick={handleClick}
            onSort={handleSort}
            sortable={true}
          ></ConnectionList>
        )}
        <ConnectionList
          onRemove={handleRemove}
          onClick={handleClick}
          onFavoriteChange={handleFavoriteChange}
          data={recentList}
          title={t('page.dashboard.recentConnection.recentlyConnected')}
          extra={
            recentList.length > 0 ? (
              <a onClick={handleRemoveAll}>
                {t('page.dashboard.recentConnection.disconnectAll')}
              </a>
            ) : null
          }
          empty={
            <div className="list-empty mb-[-24px] rounded-b-none">
              <Empty
                desc={t(
                  'page.dashboard.recentConnection.noRecentlyConnectedDapps'
                )}
                className="pt-[68px] pb-[181px]"
              ></Empty>
            </div>
          }
        ></ConnectionList>
      </div>
    </Popup>
  );
};
export default RecentConnections;
