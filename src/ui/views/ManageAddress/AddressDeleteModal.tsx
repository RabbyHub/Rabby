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
import { useTranslation } from 'react-i18next';
import ThemeIcon from '@/ui/component/ThemeMode/ThemeIcon';
import { useThemeMode } from '@/ui/hooks/usePreference';
import { pickKeyringThemeIcon } from '@/utils/account';

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
  const { t } = useTranslation();
  const { address, brandName, type } = item;
  const brandIcon = useWalletConnectIcon({
    address,
    brandName,
    type,
  });
  const { isDarkTheme } = useThemeMode();

  const addressTypeIcon = useMemo(
    () =>
      brandIcon ||
      pickKeyringThemeIcon(type as any, isDarkTheme) ||
      KEYRING_ICONS[type] ||
      pickKeyringThemeIcon(brandName as any, isDarkTheme) ||
      WALLET_BRAND_CONTENT?.[brandName]?.maybeSvg ||
      WALLET_BRAND_CONTENT?.[brandName]?.image,
    [type, brandName, brandIcon, isDarkTheme]
  );
  const renderBrand = useMemo(() => {
    if (brandName && WALLET_BRAND_CONTENT[brandName]) {
      return WALLET_BRAND_CONTENT[brandName].name;
    } else if (BRAND_ALIAN_TYPE_TEXT[type]) {
      return BRAND_ALIAN_TYPE_TEXT[type];
    }
    return type;
  }, [type, brandName]);

  return (
    <Popup visible={visible} title={null} height={220} onClose={onClose}>
      <div className="flex items-center relative w-[48px] h-[48px] mx-auto">
        <ThemeIcon src={addressTypeIcon} className="w-[48px] h-[48px]" />
        <IconDelete className="absolute -bottom-4 -right-4" />
      </div>
      <div className="text-center mt-20 mb-[36px] text-r-neutral-title-1 text-20 font-medium">
        {t('page.manageAddress.delete-title', {
          count,
          brand: renderBrand,
        })}
      </div>
      <footer className="flex gap-[16px]">
        <Button type="primary" size="large" block onClick={onClose}>
          {t('page.manageAddress.cancel')}
        </Button>
        <Button
          onClick={onSubmit}
          type="primary"
          ghost
          size="large"
          className={'rabby-btn-ghost'}
          block
        >
          {t('page.manageAddress.confirm-delete')}
        </Button>
      </footer>
    </Popup>
  );
};
