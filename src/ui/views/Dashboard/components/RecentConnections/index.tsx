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
    const sites = await wallet.getRecentConnectedSites();
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
      <div className="recent-connections">
        <ConnectionList
          data={pinnedList}
          onFavoriteChange={handleFavoriteChange}
          title={t('Pinned')}
          empty={t('No pinned dapps')}
          extra={pinnedList.length > 0 ? t('drag to sort') : null}
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
            <div className="text-center py-[85px] text-gray-comment text-14">
              <img
                className="w-[100px] h-[100px]"
                src="./images/nodata-tx.png"
              />
              {t('No dapps')}
            </div>
          }
        ></ConnectionList>
      </div>
    </Popup>
  );
};
export default RecentConnections;
