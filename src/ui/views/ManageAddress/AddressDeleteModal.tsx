import {
  BRAND_ALIAN_TYPE_TEXT,
  KEYRING_ICONS,
  WALLET_BRAND_CONTENT,
} from '@/constant';
import { Popup } from '@/ui/component';
import { useWalletConnectIcon } from '@/ui/component/WalletConnect/useWalletConnectIcon';
import { Button } from 'antd';
import React, { useMemo } from 'react';
import { IDisplayedAccountWithBalance } from 'ui/models/accountToDisplay';
import { ReactComponent as IconDelete } from '@/ui/assets/address/red-delete.svg';

type DelectModalProps = {
  visible: boolean;
  onClose(): void;
  onSubmit(): void;
};
export const AddressDeleteModal = ({
  visible,
  onClose,
  onSubmit,
  item,
  count,
}: DelectModalProps & {
  item: IDisplayedAccountWithBalance;
  count: number;
}) => {
  const { address, brandName, type } = item;
  const brandIcon = useWalletConnectIcon({
    address,
    brandName,
    type,
  });

  const addressTypeIcon = useMemo(
    () =>
      brandIcon ||
      KEYRING_ICONS[type] ||
      WALLET_BRAND_CONTENT?.[brandName]?.image,
    [type, brandName, brandIcon]
  );
  const renderBrand = useMemo(() => {
    if (brandName && WALLET_BRAND_CONTENT[brandName]) {
      return WALLET_BRAND_CONTENT[brandName].name;
    } else if (BRAND_ALIAN_TYPE_TEXT[type]) {
      return BRAND_ALIAN_TYPE_TEXT[type];
    }
    return type;
  }, [brandName]);

  return (
    <Popup visible={visible} title={null} height={220} onClose={onClose}>
      <div className="flex items-center relative w-[48px] h-[48px] mx-auto">
        <img src={addressTypeIcon} className="w-[48px] h-[48px]" />
        <IconDelete className="absolute -bottom-4 -right-4" />
      </div>
      <div className="text-center mt-20 mb-[36px] text-gray-title text-20 font-medium">
        Delete {count} {renderBrand} {count > 1 ? 'addresses' : 'address'}
      </div>
      <footer className="flex gap-[16px]">
        <Button type="primary" size="large" block onClick={onClose}>
          Cancel
        </Button>
        <Button
          onClick={onSubmit}
          type="primary"
          ghost
          size="large"
          className={'rabby-btn-ghost'}
          block
        >
          Confirm Delete
        </Button>
      </footer>
    </Popup>
  );
};
