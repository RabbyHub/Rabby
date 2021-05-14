import React from 'react';
import { useState, useEffect } from 'react';
import { Button } from 'antd';
import { StrayHeader } from 'ui/component';
import { useWallet } from 'ui/utils';
import { ConnectedSite } from 'background/service/permission';

const ConnectedSites = () => {
  const [sites, setSites] = useState<ConnectedSite[]>([]);
  const wallet = useWallet();

  const getSites = async () => {
    const sites = await wallet.getConnectedSites();

    setSites(sites);
  };

  useEffect(() => {
    getSites();
  }, []);

  const handleRemove = (origin: string) => {
    wallet.removeConnectedSite(origin);
    getSites();
  };

  return (
    <>
      <StrayHeader title={'Connected Sites'} />
      {sites.map((site) => (
        <div
          className="rounded py-2 px-3 bg-gray-100 mb-2 flex items-center"
          key={site.origin}
        >
          <div className="font-bold flex-1 text-sm">{site.origin}</div>
          <div>
            <Button
              onClick={() => handleRemove(site.origin)}
              size="small"
              className="text-xs px-4 text-gray-500"
            >
              remove
            </Button>
          </div>
        </div>
      ))}
    </>
  );
};

export default ConnectedSites;
