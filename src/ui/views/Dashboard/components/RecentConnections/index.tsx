import { Empty, Modal, Popup } from '@/ui/component';
import { message } from 'antd';
import { ConnectedSite } from 'background/service/permission';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import ReactGA from 'react-ga';
import { openInTab, useWallet } from 'ui/utils';
import ConnectionList from './ConnectionList';
import './style.less';

interface RecentConnectionsProps {
  visible?: boolean;
  onClose?(): void;
}

const RecentConnections = ({
  visible = false,
  onClose,
}: RecentConnectionsProps) => {
  const { t } = useTranslation();
  const [connections, setConnections] = useState<ConnectedSite[]>([]);
  const wallet = useWallet();

  const pinnedList = useMemo(() => {
    return connections
      .filter((item) => item && item.isTop)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [connections]);

  const recentList = useMemo(() => {
    return connections.filter((item) => item && !item.isTop);
  }, [connections]);

  const handleClick = (connection: ConnectedSite) => {
    ReactGA.event({
      category: 'Dapps',
      action: 'openDapp',
      label: connection.origin,
    });

    openInTab(connection.origin);
  };

  const handleSort = (sites: ConnectedSite[]) => {
    const list = sites.concat(recentList);
    setConnections(list);
    wallet.setRecentConnectedSites(list);
  };

  const getConnectedSites = async () => {
    const sites = await wallet.getConnectedSites();
    setConnections(sites.filter((item) => !!item));
  };

  const handleFavoriteChange = (item: ConnectedSite) => {
    if (item.isTop) {
      wallet.unpinConnectedSite(item.origin);
      ReactGA.event({
        category: 'Dapps',
        action: 'unfavoriteDapp',
        label: item.origin,
      });
    } else {
      wallet.topConnectedSite(item.origin);
      ReactGA.event({
        category: 'Dapps',
        action: 'favoriteDapp',
        label: item.origin,
      });
    }

    getConnectedSites();
  };
  const handleRemove = async (origin: string) => {
    await wallet.removeConnectedSite(origin);
    ReactGA.event({
      category: 'Dapps',
      action: 'disconnectDapp',
      label: origin,
    });
    getConnectedSites();
    message.success({
      icon: <i />,
      content: <span className="text-white">{t('Disconnected')}</span>,
    });
  };

  const removeAll = async () => {
    try {
      await wallet.removeAllRecentConnectedSites();
      ReactGA.event({
        category: 'Dapps',
        action: 'disconnectAllDapps',
      });
    } catch (e) {
      console.error(e);
    }
    getConnectedSites();
    message.success({
      icon: <i />,
      content: <span className="text-white">{t('Disconnected')}</span>,
    });
  };

  const handleRemoveAll = async () => {
    Modal.info({
      className: 'recent-connections-confirm-modal',
      centered: true,
      closable: true,
      okText: t('Disconnect All'),
      width: 320,
      onOk: removeAll,
      autoFocusButton: null,
      content: (
        <div>
          <div className="title">
            Disconnect recently used <strong>{recentList.length}</strong> DApps
          </div>
          <div className="desc">Pinned DApps will remain connected</div>
        </div>
      ),
    });
  };

  useEffect(() => {
    getConnectedSites();
  }, []);

  return (
    <Popup
      visible={visible}
      height={580}
      onClose={onClose}
      title="Dapps"
      closable
    >
      <div className="recent-connections-popup">
        {visible && (
          <ConnectionList
            onRemove={handleRemove}
            data={pinnedList}
            onFavoriteChange={handleFavoriteChange}
            title={t('Pinned')}
            empty={<div className="list-empty">{t('No pinned dapps')}</div>}
            extra={pinnedList.length > 0 ? t('Drag to sort') : null}
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
          title={t('Recently connected')}
          extra={
            recentList.length > 0 ? (
              <a onClick={handleRemoveAll}>{t('Disconnect all')}</a>
            ) : null
          }
          empty={
            <div className="list-empty mb-[-24px] rounded-b-none">
              <Empty
                desc={t('No recently connected Dapps')}
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
