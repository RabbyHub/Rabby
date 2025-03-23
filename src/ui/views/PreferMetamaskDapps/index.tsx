import { useRequest } from 'ahooks';
import { Button, message } from 'antd';
import { ConnectedSite } from 'background/service/permission';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { ReactComponent as RcIconDelete } from 'ui/assets/prefer-metamask-dapps/delete.svg';
import { Empty, FallbackSiteLogo, PageHeader, Popup } from 'ui/component';
import { useWallet } from 'ui/utils';
import './style.less';
import contextMenuImage from 'ui/assets/prefer-metamask-dapps/context-menu.png';

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
        <RcIconDelete
          className="dapp-card-action-delete"
          viewBox="0 0 20 20"
          onClick={() => {
            onRemove(data);
          }}
        ></RcIconDelete>
      </div>
    </div>
  );
};

export const PreferMetamaskDapps = () => {
  const wallet = useWallet();
  const { t } = useTranslation();

  const { data: sites, runAsync } = useRequest(() =>
    wallet.getPreferMetamaskSites()
  );
  const handleRemovePrefeMask = async (site: ConnectedSite) => {
    await wallet.removePreferMetamask(site.origin);
    runAsync();
    message.success(t('global.Deleted'));
  };

  const handleAdd = () => {
    Popup.info({
      title: t('page.preferMetamaskDapps.howToAdd'),
      closable: true,
      className: 'prefer-metamask-popup is-support-darkmode',
      height: 270,
      content: (
        <div className="content">
          <div className="info">
            {t('page.preferMetamaskDapps.howToAddDesc')}
          </div>
          <img src={contextMenuImage} alt="" />
        </div>
      ),
    });
  };

  return (
    <div className="page-prefer-metamask-dapps">
      <header className="header">
        <PageHeader canBack={false} closeable>
          {t('page.preferMetamaskDapps.title')}
        </PageHeader>
        <div className="desc">{t('page.preferMetamaskDapps.desc')}</div>
      </header>
      {sites?.length ? (
        <div className="content">
          {(sites || []).map((item) => {
            return (
              <DappCard
                data={item}
                key={item.origin}
                onRemove={handleRemovePrefeMask}
              />
            );
          })}
        </div>
      ) : (
        <Empty
          desc={t('page.preferMetamaskDapps.empty')}
          className="mt-[80px]"
        />
      )}
      <footer className="footer">
        <Button size="large" block type="primary" onClick={handleAdd}>
          {t('page.preferMetamaskDapps.howToAdd')}
        </Button>
      </footer>
    </div>
  );
};
