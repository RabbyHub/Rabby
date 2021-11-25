import React, {
  FunctionComponent,
  useEffect,
  useState,
  useImperativeHandle,
  forwardRef,
  memo,
} from 'react';
import { Skeleton, Tooltip, Input } from 'antd';
import clsx from 'clsx';
import { useTranslation, Trans } from 'react-i18next';
import { Account } from 'background/service/preference';
import { ChainWithBalance } from 'background/service/openapi';
import { useWallet, useWalletRequest } from 'ui/utils';
import { AddressViewer } from 'ui/component';
import { splitNumberByStep } from 'ui/utils/number';
import {
  CHAINS,
  KEYRING_ICONS,
  WALLET_BRAND_CONTENT,
  KEYRING_TYPE_TEXT,
  BRAND_ALIAN_TYPE_TEXT,
} from 'consts';
import IconEmptyChain from 'ui/assets/chain-logos/empty.svg';
import IconMoreChain from 'ui/assets/more-chain-round-dark.svg';
import IconEditPen from 'ui/assets/editpen.svg';
import IconCorrect from 'ui/assets/correct.svg';
interface DisplayChainWithWhiteLogo extends ChainWithBalance {
  logo?: string;
  whiteLogo?: string;
}

export interface AddressItemProps {
  account: {
    address: string;
    type: string;
    brandName: string;
    alianName?: string;
  };
  keyring?: any;
  ActionButton?: FunctionComponent<{
    data: string;
    account: Account;
    keyring: any;
  }>;
  className?: string;
  hiddenAddresses?: { type: string; address: string }[];
  onClick?(account: string, keyring: any, brandName: string): void;
  showAssets?: boolean;
  noNeedBalance?: boolean;
  currentAccount?: any;
  icon?: string;
  showNumber?: boolean;
  updateAllAlianNames?(): void;
  index?: number;
  editing?: boolean;
  showImportIcon?: boolean;
}

const formatChain = (item: ChainWithBalance): DisplayChainWithWhiteLogo => {
  const chainsArray = Object.values(CHAINS);
  const chain = chainsArray.find((chain) => chain.id === item.community_id);

  return {
    ...item,
    logo: chain?.logo || item.logo_url,
    whiteLogo: chain?.whiteLogo,
  };
};

export const useCurrentBalance = (
  account: string | undefined,
  update = false,
  noNeedBalance = false
) => {
  const wallet = useWallet();
  const [balance, setBalance] = useState<number | null>(null);
  const [chainBalances, setChainBalances] = useState<
    DisplayChainWithWhiteLogo[]
  >([]);

  const [getAddressBalance] = useWalletRequest(wallet.getAddressBalance, {
    onSuccess({ total_usd_value, chain_list }) {
      setBalance(total_usd_value);
      setChainBalances(
        chain_list.filter((item) => item.usd_value > 0).map(formatChain)
      );
    },
    onError() {
      setBalance(NaN);
    },
  });

  const getCurrentBalance = async () => {
    if (!account || noNeedBalance) return;
    const cacheData = await wallet.getAddressCacheBalance(account);
    if (cacheData) {
      setBalance(cacheData.total_usd_value);
      if (update) {
        getAddressBalance(account.toLowerCase());
      }
    } else {
      getAddressBalance(account.toLowerCase());
    }
  };

  useEffect(() => {
    getCurrentBalance();
    if (!noNeedBalance) {
      wallet.getAddressCacheBalance(account).then((cache) => {
        setChainBalances(
          cache
            ? cache.chain_list
                .filter((item) => item.usd_value > 0)
                .map(formatChain)
            : []
        );
      });
    }
  }, [account]);

  return [balance, chainBalances, getAddressBalance] as const;
};
const AddressItem = memo(
  forwardRef(
    (
      {
        account,
        keyring,
        ActionButton,
        hiddenAddresses = [],
        className,
        showAssets,
        onClick,
        noNeedBalance = false,
        currentAccount = null,
        updateAllAlianNames,
        icon = '',
        index,
        editing = true,
        showImportIcon = true,
      }: AddressItemProps,
      ref
    ) => {
      if (!account) {
        return null;
      }
      const { t } = useTranslation();
      const wallet = useWallet();
      const [isLoading, setIsLoading] = useState(false);
      const [startEdit, setStartEdit] = useState(false);
      const [alianName, setAlianName] = useState<string>('');
      const [balance, chainBalances, getAddressBalance] = useCurrentBalance(
        account.address,
        false,
        noNeedBalance
      );

      const updateBalance = async () => {
        setIsLoading(true);
        await getAddressBalance(account.address.toLowerCase());
        setIsLoading(false);
      };

      useImperativeHandle(ref, () => ({
        updateBalance,
      }));

      const isDisabled = hiddenAddresses.find(
        (item) => item.address === account.address && item.type === keyring.type
      );

      const isCurrentAddress =
        currentAccount?.address === account.address &&
        currentAccount?.type === account.type &&
        currentAccount?.brandName === account.brandName;

      const formatAddressTooltip = (type: string, brandName: string) => {
        if (KEYRING_TYPE_TEXT[type]) {
          return t(KEYRING_TYPE_TEXT[type]);
        }
        if (WALLET_BRAND_CONTENT[brandName]) {
          return (
            <Trans
              i18nKey="addressTypeTip"
              values={{
                type: WALLET_BRAND_CONTENT[brandName].name,
              }}
            />
          );
        }
        return '';
      };
      const displayChainList = () => {
        const result = chainBalances.map((item) => (
          <img
            src={item.logo}
            className="w-16 h-16 mr-6"
            key={item.id}
            alt={`${item.name}: $${item.usd_value.toFixed(2)}`}
            title={`${item.name}: $${item.usd_value.toFixed(2)}`}
            style={{ opacity: isLoading ? 0 : 1 }}
          />
        ));
        if (result.length > 9) {
          return result
            .slice(0, 9)
            .concat(
              <img
                src={IconMoreChain}
                className="w-16 h-16 mr-6"
                key="more"
                style={{ opacity: isLoading ? 0 : 1 }}
              />
            );
        }
        return result;
      };
      const handleAlianNameChange = (
        e: React.ChangeEvent<HTMLInputElement>
      ) => {
        setAlianName(e.target.value);
      };
      const alianNameConfirm = async () => {
        if (!alianName) {
          return;
        }
        await wallet.updateAlianName(account?.address, alianName);
        if (editing) {
          setStartEdit(false);
          return;
        } else {
          if (updateAllAlianNames) {
            await updateAllAlianNames();
          }
        }
        setStartEdit(false);
      };
      const displayName =
        alianName ||
        account?.alianName ||
        (!showImportIcon &&
          index &&
          BRAND_ALIAN_TYPE_TEXT[account?.brandName] &&
          `${BRAND_ALIAN_TYPE_TEXT[account?.brandName]} ${index + 1}`) ||
        account?.brandName;
      return (
        <li
          className={className}
          onClick={() =>
            onClick && onClick(account.address, keyring, account.brandName)
          }
        >
          <div
            className={clsx(
              'flex items-center flex-wrap relative',
              isDisabled && 'opacity-40'
            )}
          >
            {showImportIcon && (
              <Tooltip
                overlayClassName="rectangle addressType__tooltip"
                placement="topRight"
                title={formatAddressTooltip(
                  account.type,
                  BRAND_ALIAN_TYPE_TEXT[account.brandName] || account.brandName
                )}
              >
                <img
                  src={
                    KEYRING_ICONS[account.type] ||
                    WALLET_BRAND_CONTENT[account.brandName]?.image
                  }
                  className={clsx('icon icon-hardware', {
                    'opacity-40': isDisabled,
                  })}
                />
              </Tooltip>
            )}
            <div className="address-info">
              <div className="brand-name flex">
                {startEdit && editing ? (
                  <Input
                    value={
                      startEdit
                        ? alianName
                        : account?.alianName || account?.brandName
                    }
                    defaultValue={
                      alianName || account?.alianName || account?.brandName
                    }
                    onChange={handleAlianNameChange}
                    onPressEnter={alianNameConfirm}
                    autoFocus={startEdit}
                    maxLength={20}
                    min={0}
                  />
                ) : (
                  displayName
                )}
                {!startEdit && editing && (
                  <img
                    className="edit-name"
                    src={IconEditPen}
                    onClick={() => setStartEdit(true)}
                  />
                )}
                {startEdit && editing && (
                  <img
                    className="edit-name w-[16px] h-[16px]"
                    src={IconCorrect}
                    onClick={alianNameConfirm}
                  />
                )}
              </div>
              <AddressViewer
                address={account.address}
                showArrow={false}
                className="subtitle"
              />
            </div>
          </div>
          {keyring && (
            <div className="action-button flex items-center flex-shrink-0 cursor-pointer">
              {ActionButton && (
                <ActionButton
                  data={account.address}
                  account={account}
                  keyring={keyring}
                />
              )}
            </div>
          )}
        </li>
      );
    }
  )
);

export default AddressItem;
