import { useThemeMode } from '@/ui/hooks/usePreference';
import { useRequest } from 'ahooks';
import { message, Switch } from 'antd';
import { ConnectedSite } from 'background/service/permission';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Empty, FallbackSiteLogo, PageHeader } from 'ui/component';
import { useWallet } from 'ui/utils';
import './style.less';

const DappCard = (props: {
  data: ConnectedSite;
  onRemove: (site: ConnectedSite) => void;
}) => {
  const { data, onRemove } = props;
  return (
    <div className="dapp-card">
      <FallbackSiteLogo
        className="dapp-card-icon"
        url={data.icon}
        origin={data?.origin}
        width="24px"
      />
      <div className="dapp-card-content">{data.origin}</div>
      <div className="dapp-card-action">
        <Switch
          className="bg-r-blue-default"
          defaultChecked
          onChange={(v) => {
            if (!v) {
              onRemove(data);
            }
          }}
        ></Switch>
      </div>
    </div>
  );
};

export const MetamaskModeDappsList = () => {
  const wallet = useWallet();
  const { t } = useTranslation();
  const { isDarkTheme } = useThemeMode();

  const { data: sites, runAsync } = useRequest(() =>
    wallet.getMetamaskModeSites()
  );
  const handleRemoveMetamaskMode = async (site: ConnectedSite) => {
    await wallet.removeMetamaskModeSite(site);
    runAsync();
    message.success(t('global.Deleted'));
  };

  return (
    <div className="page-metamask-mode-dapps">
      <header className="header">
        <PageHeader canBack={true}>
          {t('page.metamaskModeDapps.title')}
        </PageHeader>
      </header>
      {sites?.length ? (
        <div className="content">
          {(sites || []).map((item) => {
            return (
              <DappCard
                data={item}
                key={item.origin}
                onRemove={handleRemoveMetamaskMode}
              />
            );
          })}
        </div>
      ) : (
        <Empty
          desc={t('page.preferMetamaskDapps.empty')}
          className="mt-[180px]"
        />
      )}
    </div>
  );
};
