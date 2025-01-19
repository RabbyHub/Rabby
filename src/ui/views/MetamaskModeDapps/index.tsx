import { useThemeMode } from '@/ui/hooks/usePreference';
import { useRequest } from 'ahooks';
import { message } from 'antd';
import { ConnectedSite } from 'background/service/permission';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { ReactComponent as RcIconDelete } from 'ui/assets/metamask-mode-dapps/delete-cc.svg';
import IconMetamaskModeDark from 'ui/assets/metamask-mode-dapps/icon-metamask-mode-dark.svg';
import IconMetamaskMode from 'ui/assets/metamask-mode-dapps/icon-metamask-mode.svg';
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

export const MetamaskModeDapps = () => {
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
        <PageHeader canBack={false} closeable>
          {t('page.metamaskModeDapps.title')}
        </PageHeader>
      </header>
      <div className="rounded-[6px] px-[12px] pt-[24px] pb-[20px] bg-r-neutral-card-1 mb-[20px]">
        <img
          src={isDarkTheme ? IconMetamaskModeDark : IconMetamaskMode}
          alt=""
          className="block mx-auto w-[221px] h-[54px] mb-[6px]"
        />
        <div className="text-r-neutral-body text-[13px] leading-[140%]">
          {t('page.metamaskModeDapps.desc')}
        </div>
      </div>
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
          className="mt-[80px]"
        />
      )}
    </div>
  );
};
