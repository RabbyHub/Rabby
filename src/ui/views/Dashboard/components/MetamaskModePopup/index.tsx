import { ConnectedSite } from '@/background/service/permission';
import { FallbackSiteLogo, Popup } from '@/ui/component';
import { useWallet } from '@/ui/utils';
import { message, Switch } from 'antd';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { createGlobalStyle } from 'styled-components';
import IconMetamask from 'ui/assets/dashboard/icon-metamask-yellow.svg';

const GlobalStyle = createGlobalStyle`
  .metamask-mode-popup {
    .ant-drawer-content {
      background: var(--r-neutral-bg2, #F2F4F7);
    }
    .ant-drawer-body {
      padding: 16px 20px 20px 20px;
    }
    .ant-switch-checked {
      background-color: var(--r-blue-default, #7084FF);
    }
  }
`;

interface Props {
  visible?: boolean;
  site: ConnectedSite;
  onChangeMetamaskMode?(v: boolean): void;
  onClose?(): void;
}
export const MetamaskModePopup = ({
  visible,
  onClose,
  site,
  onChangeMetamaskMode,
}: Props) => {
  const { t } = useTranslation();
  const wallet = useWallet();

  return (
    <>
      <GlobalStyle />
      <Popup
        visible={visible}
        height={'fit-content'}
        className="metamask-mode-popup"
        onClose={onClose}
        closable
        push={false}
        title={
          <div className="flex justify-center items-center gap-[8px]">
            <img src={IconMetamask} className="w-[20px]"></img>
            {t('page.dashboard.MetamaskModePopup.title')}
          </div>
        }
      >
        <div>
          <div className="text-center text-[13px] leading-[140%] text-r-neutral-body mb-[20px]">
            {t('page.dashboard.MetamaskModePopup.desc')}
          </div>

          <div className="flex items-center gap-[8px] px-[16px] py-[15px] rounded-[6px] bg-r-neutral-card-1 mb-[47px]">
            <FallbackSiteLogo
              url={site.icon}
              origin={site.origin}
              width="28px"
              className="site-icon"
            ></FallbackSiteLogo>
            <div className="min-w-0">
              <div className="text-r-neutral-title-1 text-[13px] leading-[16px] font-medium mb-[4px] truncate">
                {site.origin}
              </div>
              <div className="text-r-neutral-foot text-[12px] leading-[14px]">
                {t('page.dashboard.MetamaskModePopup.enableDesc')}
              </div>
            </div>
            <div className="ml-auto">
              <Switch
                defaultChecked={site.isMetamaskMode}
                onChange={async (v) => {
                  if (v) {
                    await wallet.addMetamaskModeSite(site);
                    message.success(
                      t('page.dashboard.MetamaskModePopup.toastSuccess')
                    );
                  } else {
                    await wallet.removeMetamaskModeSite(site);
                  }
                  onChangeMetamaskMode?.(v);
                }}
              ></Switch>
            </div>
          </div>

          <div className="text-r-neutral-foot text-[11px] leading-[13px] text-center">
            {t('page.dashboard.MetamaskModePopup.footerText')}
          </div>
        </div>
      </Popup>
    </>
  );
};
