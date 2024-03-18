import React from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { StrayPageWithButton } from 'ui/component';
import { hasConnectedImKeyDevice } from '@/ui/utils';
import { HARDWARE_KEYRING_TYPES } from 'consts';
import './style.less';
import { query2obj } from '@/ui/utils/url';

export const ImKeyConnect = () => {
  const history = useHistory();
  const { t } = useTranslation();
  const { search } = useLocation();

  const qs = query2obj(search);
  const isReconnect = !!qs.reconnect;

  const onSubmit = async () => {
    const hasConnectedImKey = await hasConnectedImKeyDevice();

    if (isReconnect) {
      history.push({
        pathname: '/request-permission',
        search: '?type=imkey&reconnect=1',
      });
      return;
    }

    if (hasConnectedImKey) {
      history.push({
        pathname: '/import/select-address',
        state: {
          keyring: HARDWARE_KEYRING_TYPES.ImKey.type,
        },
        search: `?hd=${HARDWARE_KEYRING_TYPES.ImKey.type}`,
      });
    } else {
      history.push({
        pathname: '/request-permission',
        search: '?type=imkey',
      });
    }
  };

  return (
    <StrayPageWithButton
      header={{
        title: t('page.newAddress.imkey.title'),
        center: true,
      }}
      className="stray-page-wide"
      backgroundClassName="bg-r-neutral-card2"
      headerClassName="mb-40 text-r-neutral-title1"
      onSubmit={onSubmit}
      hasBack={false}
      footerFixed={false}
    >
      <div className="connect-ledger">
        <ul className="list-decimal w-[180px] pl-[20px] m-auto text-r-neutral-title1 text-14 leading-[20px] mb-[50px]">
          <li>{t('page.dashboard.hd.imkey.doc1')}</li>
          <li>{t('page.dashboard.hd.imkey.doc2')}</li>
        </ul>
        <img src="/images/imkey-plug.svg" className="ledger-plug" />
      </div>
    </StrayPageWithButton>
  );
};
