import { Popup } from '@/ui/component';
import { ConnectedSite } from 'background/service/permission';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
    item.isTop
      ? wallet.unpinConnectedSite(item.origin)
      : wallet.topConnectedSite(item.origin);
    getConnectedSites();
  };

  useEffect(() => {
    getConnectedSites();
  }, []);

  return (
    <Popup visible={visible} height={484} onClose={onClose}>
      <div className="recent-connections-popup">
        <ConnectionList
          data={pinnedList}
          onFavoriteChange={handleFavoriteChange}
          title={t('Pinned')}
          empty={<div className="list-empty">{t('No pinned dapps')}</div>}
          extra={pinnedList.length > 0 ? t('Drag to sort') : null}
          onClick={handleClick}
          onSort={handleSort}
          sort={true}
        ></ConnectionList>
        <ConnectionList
          onClick={handleClick}
          onFavoriteChange={handleFavoriteChange}
          data={recentList}
          title={t('Recent')}
          empty={
            <div className="list-empty mb-[-24px] rounded-b-none">
              <div className="text-center pt-[85px] pb-[125px] text-gray-comment text-14">
                <img
                  className="w-[100px] h-[100px]"
                  src="./images/nodata-tx.png"
                />
                {t('No dapps')}
              </div>
            </div>
          }
        ></ConnectionList>
      </div>
    </Popup>
  );
};
export default RecentConnections;
