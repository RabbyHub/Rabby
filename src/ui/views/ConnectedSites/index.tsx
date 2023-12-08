import React from 'react';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { PageHeader, Field, FallbackSiteLogo } from 'ui/component';
import { SvgIconCross } from 'ui/assets';
import { useWallet } from 'ui/utils';
import { ConnectedSite } from 'background/service/permission';
import './style.less';

const ConnectedSites = () => {
  const [sites, setSites] = useState<ConnectedSite[]>([]);
  const wallet = useWallet();
  const { t } = useTranslation();

  const getSites = async () => {
    const sites = await wallet.getConnectedSites();
    setSites(sites);
  };

  useEffect(() => {
    getSites();
  }, []);

  const handleRemove = async (origin: string) => {
    await wallet.removeConnectedSite(origin);
    getSites();
  };

  const NoDataUI = (
    <div className="no-site">
      <img
        className="no-data-image"
        src="/images/nodata-site.png"
        alt="no site"
      />
      <p className="text-r-neutral-body text-14">{t('No data')}</p>
    </div>
  );

  return (
    <div className="connected-sites">
      <PageHeader>{t('Connected Sites')}</PageHeader>
      {sites.length > 0
        ? sites.map((site) => (
            <Field
              className="border border-white"
              key={site.origin}
              leftIcon={
                <div className="icon icon-site">
                  <FallbackSiteLogo
                    url={site.icon}
                    origin={site.origin}
                    width="28px"
                  />
                </div>
              }
              rightIcon={
                <SvgIconCross
                  className="cross-icon w-8 fill-current text-gray-comment cursor-pointer"
                  onClick={() => handleRemove(site.origin)}
                />
              }
            >
              <div className="site-info">
                <p className="text-13 font-medium text-r-neutral-title-1">
                  {site.origin}
                </p>
              </div>
            </Field>
          ))
        : NoDataUI}
    </div>
  );
};

export default ConnectedSites;
