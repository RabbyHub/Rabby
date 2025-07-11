import { query2obj } from '@/ui/utils/url';
import React, { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { Switch } from 'antd';
import { useRabbyDispatch, useRabbySelector, connectStore } from 'ui/store';
import AuthenticationModalPromise from 'ui/component/AuthenticationModal';
import { PageHeader } from 'ui/component';
import { isSameAddress, useAddressSource, useWallet } from 'ui/utils';
import { AddressBackup } from './AddressBackup';
import { AddressDelete } from './AddressDelete';
import { AddressInfo } from './AddressInfo';
import './style.less';

const AddressDetail = () => {
  const { t } = useTranslation();
  const { search } = useLocation();
  const dispatch = useRabbyDispatch();
  const { whitelist } = useRabbySelector((s) => ({
    whitelist: s.whitelist.whitelist,
  }));
  const wallet = useWallet();
  const qs = useMemo(() => query2obj(search), [search]) as {
    address: string;
    type: string;
    brandName: string;
    byImport?: string;
  };

  const { address, type, brandName, byImport } = qs || {};

  const source = useAddressSource({
    type,
    brandName,
    byImport: !!byImport,
    address,
  });

  useEffect(() => {
    dispatch.whitelist.getWhitelist();
  }, []);

  const handleWhitelistChange = async (checked: boolean) => {
    if (!checked) {
      await wallet.removeWhitelist(address);
      const cexId = await wallet.getCexId(address);
      if (cexId) {
        await wallet.updateCexId(address, '');
      }
      return;
    }
    AuthenticationModalPromise({
      title: t('page.addressDetail.add-to-whitelist'),
      cancelText: t('global.Cancel'),
      wallet,
      containerClassName: 'whitelist-confirm-modal',
      validationHandler: async (password) => {
        await wallet.addWhitelist(password, address);
      },
      onFinished() {
        // dispatch.whitelist.getWhitelist();
      },
      onCancel() {
        // do nothing
      },
    });
  };

  if (!address) {
    return null;
  }

  return (
    <div className="page-address-detail overflow-auto">
      <PageHeader wrapperClassName="bg-r-neutral-bg-2" fixed>
        {t('page.addressDetail.address-detail')}
      </PageHeader>
      <AddressInfo
        address={address}
        type={type}
        brandName={brandName}
        source={source}
      ></AddressInfo>

      <div className="rabby-list">
        <div className="rabby-list-item">
          <div className="rabby-list-item-content">
            <div className="rabby-list-item-label">
              {t('page.addressDetail.add-to-whitelist')}
            </div>
            <Switch
              checked={!!whitelist.find((item) => isSameAddress(item, address))}
              onChange={handleWhitelistChange}
            />
          </div>
        </div>
      </div>

      <AddressBackup
        address={address}
        type={type}
        brandName={brandName}
      ></AddressBackup>
      <AddressDelete
        address={address}
        type={type}
        brandName={brandName}
        source={source}
      ></AddressDelete>
    </div>
  );
};

export default connectStore()(AddressDetail);
