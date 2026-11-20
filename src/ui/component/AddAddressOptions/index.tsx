import React from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { UI_TYPE } from '@/constant/ui';
import { WALLET_BRAND_CONTENT, IWalletBrandContent } from 'consts';
import { connectStore } from '@/ui/store';
import { useAddAddressWalletOptions } from '@/ui/views/AddAddress/shared';
import { Item } from '@/ui/component';
import { ReactComponent as RcRightArrow } from 'ui/assets/address/right-arrow.svg';
import {
  RcAddAddressOptionCreateIcon,
  RcAddAddressOptionSeedPhraseIcon,
  RcAddAddressOptionPrivateKeyIcon,
  RcAddAddressOptionHardwareIcon,
  RcAddAddressOptionWatchIcon,
} from '@/ui/assets/add-address';
import { UseSeedPhrase } from '@/ui/views/AddFromCurrentSeedPhrase/hooks';
import { message } from 'antd';
import { useCreateAddressActions } from '@/ui/views/AddAddress/useCreateAddress';

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
    <div
      className={clsx(
        'w-28 h-28 rounded-[6px] flex items-center justify-center shrink-0',
        backgroundClassName
      )}
    >
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
    <Item
      py={15}
      px={16}
      className={clsx('h-[60px]', className)}
      rightIconClassName="shrink-0"
      onClick={option.onClick}
    >
      <div className="flex items-center min-w-0">
        {option.icon}
        <div className="ml-12 text-r-neutral-title-1 text-15 font-medium text-left">
          {option.label}
        </div>
      </div>
    </Item>
  );
};

const AddAddressOptions: React.FC<{
  onNavigate?(type: string, state?: Record<string, any>): void;
}> = ({ onNavigate }) => {
  const history = useHistory();
  const location = useLocation();
  const { t } = useTranslation();
  const { connectRouter } = useAddAddressWalletOptions({ onNavigate });
  const { seedPhraseList } = UseSeedPhrase();
  // Set when entered from a pending ImportAddress approval whose requested type
  // didn't match a known brand — forward it so a manual pick can still complete it.
  const approvalId = (location.state as any)?.approvalId;

  const { createNewSeedPhrase } = useCreateAddressActions({
    onNavigate,
  });

  const [preventMount, setPreventMount] = React.useState(true);

  React.useEffect(() => {
    if (!location.state) {
      setPreventMount(false);
      return;
    }

    const { type, address, chainId, approvalId } = location.state as any;
    const brandContentKey = Object.keys(WALLET_BRAND_CONTENT).find((key) => {
      const item = WALLET_BRAND_CONTENT[key] as IWalletBrandContent;
      return item.name === type;
    });

    if (brandContentKey) {
      connectRouter(WALLET_BRAND_CONTENT[brandContentKey], {
        address,
        chainId,
        approvalId,
      });
      return;
    }

    setPreventMount(false);
  }, [location.state, connectRouter]);

  const pendingRef = React.useRef(false);

  const setPendingAction = React.useCallback((action: boolean) => {
    pendingRef.current = action;
  }, []);

  const options = React.useMemo<AddAddressOption[]>(
    () => [
      {
        key: 'add-new-address',
        label: t('page.newAddress.addNewAddress'),
        icon: <RcAddAddressOptionCreateIcon />,
        onClick: async () => {
          if (pendingRef.current) {
            return;
          }
          if (seedPhraseList?.length > 0) {
            if (UI_TYPE.isDesktop) {
              onNavigate?.('add-new-address');
            } else {
              history.push('/add-address/new-address');
            }
          } else {
            try {
              setPendingAction(true);
              await createNewSeedPhrase();
            } catch (error) {
              message.error(
                error instanceof Error
                  ? error.message
                  : 'Failed to create seed phrase'
              );
            } finally {
              setPendingAction(false);
            }
          }
        },
      },
      {
        key: 'import-seed-phrase',
        label: t('page.newAddress.importSeedPhrase'),
        icon: <RcAddAddressOptionSeedPhraseIcon />,
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
        icon: <RcAddAddressOptionPrivateKeyIcon />,
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
        icon: <RcAddAddressOptionHardwareIcon />,
        onClick: () => {
          if (UI_TYPE.isDesktop) {
            onNavigate?.('hardware-wallets', { approvalId });
          } else {
            history.push({
              pathname: '/add-address/hardware-wallets',
              state: { approvalId },
            });
          }
        },
      },
      {
        key: 'watch-address',
        label: t('page.newAddress.watchAddress'),
        icon: <RcAddAddressOptionWatchIcon />,
        onClick: () => {
          if (UI_TYPE.isDesktop) {
            onNavigate?.('watch-address');
          } else {
            history.push('/import/watch-address');
          }
        },
      },
    ],
    [
      history,
      onNavigate,
      t,
      createNewSeedPhrase,
      seedPhraseList?.length,
      approvalId,
    ]
  );

  if (preventMount) {
    return null;
  }

  return (
    <div
      className={clsx(
        'min-h-[500px] flex flex-col',
        UI_TYPE.isDesktop ? 'w-full' : ''
      )}
    >
      <div className="flex flex-col gap-12">
        {options.map((option) => (
          <AddAddressRow key={option.key} option={option} />
        ))}
      </div>

      <button
        type="button"
        className="mt-auto pt-24 inline-flex items-center justify-center gap-2 self-center text-r-neutral-foot text-12 font-normal"
        onClick={() => {
          if (UI_TYPE.isDesktop) {
            onNavigate?.('institutional-wallets', { approvalId });
          } else {
            history.push({
              pathname: '/add-address/institutional-wallets',
              state: { approvalId },
            });
          }
        }}
      >
        <span>{t('page.newAddress.connectInstitutionalWallets')}</span>
        <RcRightArrow viewBox="0 0 20 20" className="w-14 h-14" />
      </button>
    </div>
  );
};

export default connectStore()(AddAddressOptions);
