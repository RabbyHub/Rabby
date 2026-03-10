import React from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import './style.less';
import { UI_TYPE } from '@/constant/ui';
import { WALLET_BRAND_CONTENT, IWalletBrandContent } from 'consts';
import { connectStore } from '@/ui/store';
import { useAddAddressWalletOptions } from '@/ui/views/AddAddress/shared';
import { ReactComponent as RcRightArrow } from 'ui/assets/address/right-arrow.svg';
import {
  RcAddAddressOptionCreateIcon,
  RcAddAddressOptionSeedPhraseIcon,
  RcAddAddressOptionPrivateKeyIcon,
  RcAddAddressOptionHardwareIcon,
  RcAddAddressOptionWatchIcon,
} from '@/ui/assets/add-address';

type AddAddressOption = {
  key: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
};

const RowIcon = ({
  backgroundClassName,
  children,
}: {
  backgroundClassName: string;
  children: React.ReactNode;
}) => {
  return (
    <div className={clsx('add-address-options__row-icon', backgroundClassName)}>
      {children}
    </div>
  );
};

const AddAddressRow = ({
  option,
  className,
}: {
  option: AddAddressOption;
  className?: string;
}) => {
  return (
    <button
      type="button"
      className={clsx('add-address-options__row', className)}
      onClick={option.onClick}
    >
      <div className="add-address-options__row-content">
        {option.icon}
        <div className="add-address-options__row-label">{option.label}</div>
      </div>
      <RcRightArrow className="add-address-options__row-arrow" />
    </button>
  );
};

const AddAddressOptions: React.FC<{
  onNavigate?(type: string, state?: Record<string, any>): void;
}> = ({ onNavigate }) => {
  const history = useHistory();
  const location = useLocation();
  const { t } = useTranslation();
  const { connectRouter } = useAddAddressWalletOptions({ onNavigate });

  const [preventMount, setPreventMount] = React.useState(true);

  React.useEffect(() => {
    if (!location.state) {
      setPreventMount(false);
      return;
    }

    const { type, address, chainId } = location.state as any;
    const brandContentKey = Object.keys(WALLET_BRAND_CONTENT).find((key) => {
      const item = WALLET_BRAND_CONTENT[key] as IWalletBrandContent;
      return item.name === type;
    });

    if (brandContentKey) {
      connectRouter(WALLET_BRAND_CONTENT[brandContentKey], {
        address,
        chainId,
      });
      return;
    }

    setPreventMount(false);
  }, [location.state, connectRouter]);

  const options = React.useMemo<AddAddressOption[]>(
    () => [
      {
        key: 'add-new-address',
        label: t('page.newAddress.addNewAddress'),
        icon: (
          <RowIcon backgroundClassName="bg-[#D8F2E7]">
            <RcAddAddressOptionCreateIcon className="w-[16px] h-[16px]" />
          </RowIcon>
        ),
        onClick: () => {
          if (UI_TYPE.isDesktop) {
            onNavigate?.('add-new-address');
          } else {
            history.push('/add-address/new-address');
          }
        },
      },
      {
        key: 'import-seed-phrase',
        label: t('page.newAddress.importSeedPhrase'),
        icon: (
          <RcAddAddressOptionSeedPhraseIcon className="add-address-options__asset-icon" />
        ),
        onClick: () => {
          if (UI_TYPE.isDesktop) {
            onNavigate?.('import-key-or-seed', { tab: 'seedPhrase' });
          } else {
            history.push('/add-address/import?tab=seedPhrase');
          }
        },
      },
      {
        key: 'import-private-key',
        label: t('page.newAddress.importPrivateKey'),
        icon: (
          <RcAddAddressOptionPrivateKeyIcon className="add-address-options__asset-icon" />
        ),
        onClick: () => {
          if (UI_TYPE.isDesktop) {
            onNavigate?.('import-key-or-seed', { tab: 'privateKey' });
          } else {
            history.push('/add-address/import?tab=privateKey');
          }
        },
      },
      {
        key: 'connect-hardware-wallet',
        label: t('page.newAddress.connectHardwareWallets'),
        icon: (
          <RcAddAddressOptionHardwareIcon className="add-address-options__asset-icon" />
        ),
        onClick: () => {
          if (UI_TYPE.isDesktop) {
            onNavigate?.('hardware-wallets');
          } else {
            history.push('/add-address/hardware-wallets');
          }
        },
      },
      {
        key: 'watch-address',
        label: t('page.newAddress.watchAddress'),
        icon: (
          <RcAddAddressOptionWatchIcon className="add-address-options__asset-icon" />
        ),
        onClick: () => {
          if (UI_TYPE.isDesktop) {
            onNavigate?.('watch-address');
          } else {
            history.push('/import/watch-address');
          }
        },
      },
    ],
    [history, onNavigate, t]
  );

  if (preventMount) {
    return null;
  }

  return (
    <div
      className={clsx('add-address-options', UI_TYPE.isDesktop ? 'w-full' : '')}
    >
      <div className="add-address-options__list">
        {options.map((option) => (
          <AddAddressRow key={option.key} option={option} />
        ))}
      </div>

      <button
        type="button"
        className="add-address-options__institutional-entry"
        onClick={() => {
          if (UI_TYPE.isDesktop) {
            onNavigate?.('institutional-wallets');
          } else {
            history.push('/add-address/institutional-wallets');
          }
        }}
      >
        <span>{t('page.newAddress.connectInstitutionalWallets')}</span>
        <RcRightArrow className="add-address-options__institutional-arrow" />
      </button>
    </div>
  );
};

export default connectStore()(AddAddressOptions);
