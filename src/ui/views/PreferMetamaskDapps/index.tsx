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
    message.success('Deleted');
  };

  const handleAdd = () => {
    Popup.info({
      title: 'How to Add',
      closable: true,
      className: 'prefer-metamask-popup',
      height: 270,
      content: (
        <div className="content">
          <div className="info">
            Right click on the website and find this option
          </div>
          <img src={contextMenuImage} alt="" />
        </div>
      ),
    });
  };

  return (
    <div className="page-prefer-metamask-dapps">
      <header className="header">
        <PageHeader>{t('MetaMask Preferred Dapps')}</PageHeader>
        <div className="desc">
          The following dapps will remain connected through MetaMask, regardless
          of the wallet you've flipped to
        </div>
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
        <Empty desc="No dapps" className="mt-[80px]" />
      )}
      <footer className="footer">
        <Button type="primary" onClick={handleAdd}>
          How to Add
        </Button>
      </footer>
    </div>
  );
};
