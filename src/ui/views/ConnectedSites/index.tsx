import React from 'react';
import { useState, useEffect } from 'react';
import { CloseOutlined } from '@ant-design/icons';
import { PageHeader, Field } from 'ui/component';
import { useWallet } from 'ui/utils';
import { ConnectedSite } from 'background/service/permission';
import './style.less';

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
    <div className="connected-sites">
      <PageHeader>Connected Sites</PageHeader>
      {sites.map((site) => (
        <Field
          key={site.origin}
          leftIcon={<img src={site.icon} className="icon icon-site" />}
          rightIcon={
            <CloseOutlined onClick={() => handleRemove(site.origin)} />
          }
        >
          <div className="site-info">
            <p className="text-13 font-medium">{site.origin}</p>
            <p className="text-12">
              {site.name} {site.name}
            </p>
          </div>
        </Field>
      ))}
    </div>
  );
};

export default ConnectedSites;
