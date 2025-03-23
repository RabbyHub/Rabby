import React from 'react';
import browser, { Tabs, Windows } from 'webextension-polyfill';
import { t } from 'i18next';
import { Button } from 'antd';
import { WalletController, WalletControllerType } from './index';
import { getOriginFromUrl } from '@/utils';
import Modal from '../component/Modal';
import { ReactComponent as ExternalLinkAlert } from 'ui/assets/component/external-link-alert.svg';

export const getCurrentTab = async (): Promise<Tabs.Tab> => {
  const tabs = await browser.tabs.query({ active: true, currentWindow: true });

  return tabs[0];
};

export const getCurrentConnectSite = async (
  wallet: WalletController | WalletControllerType
) => {
  const { id, url } = await getCurrentTab();
  if (!id || !url) return null;

  return (wallet as WalletControllerType).getCurrentConnectedSite(
    id,
    getOriginFromUrl(url)
  );
};

export const openInTab = async (
  url?: string,
  needClose = true
): Promise<Tabs.Tab> => {
  const tab = await browser.tabs.create({
    active: true,
    url,
  });

  if (needClose) window.close();

  return tab;
};

export const getCurrentWindow = async (): Promise<number | undefined> => {
  const { id } = await browser.windows.getCurrent({
    windowTypes: ['popup'],
  } as Windows.GetInfo);

  return id;
};

export const openInternalPageInTab = (
  path: string,
  useWebapi = true,
  needClose = true
) => {
  if (useWebapi) {
    openInTab(`./index.html#/${path}`, needClose);
  } else {
    window.open(`./index.html#/${path}`);
  }
};

export const openExternalWebsiteInTab = async (
  url?: string,
  needClose = true
) => {
  return new Promise((resolve, reject) => {
    const modal = Modal.info({
      closable: true,
      className: 'external-link-alert-modal',
      content: (
        <div>
          <div className="flex justify-center mb-16">
            <ExternalLinkAlert className="w-[52px]" />
          </div>
          <h1 className="text-r-neutral-title1 text-center mb-8">
            {t('component.OpenExternalWebsiteModal.title')}
          </h1>
          <p className="text-r-neutral-body text-center text-15 mb-[52px]">
            {t('component.OpenExternalWebsiteModal.content')}
          </p>
          <div className="footer">
            <Button
              type="primary"
              block
              className="h-40 text-15 font-medium"
              onClick={async () => {
                const tab = await browser.tabs.create({
                  active: true,
                  url,
                });
                if (needClose) window.close();
                resolve(tab);
                modal.destroy();
              }}
            >
              {t('component.OpenExternalWebsiteModal.button')}
            </Button>
          </div>
        </div>
      ),
      onCancel() {
        reject('user cancel');
      },
    });
  });
};
