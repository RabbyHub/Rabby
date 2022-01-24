import React, {
  FunctionComponent,
  useEffect,
  useState,
  memo,
  forwardRef,
  useImperativeHandle,
} from 'react';
import { Tooltip, Input } from 'antd';
import clsx from 'clsx';
import { useTranslation, Trans } from 'react-i18next';
import { Account } from 'background/service/preference';
import { ChainWithBalance } from 'background/service/openapi';
import { useWallet, useWalletRequest } from 'ui/utils';
import { AddressViewer } from 'ui/component';
import {
  CHAINS,
  KEYRING_ICONS,
  WALLET_BRAND_CONTENT,
  KEYRING_TYPE_TEXT,
  BRAND_ALIAN_TYPE_TEXT,
} from 'consts';
import IconEditPen from 'ui/assets/editpen.svg';
import IconCorrect from 'ui/assets/dashboard/contacts/correct.png';
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
    index?: number;
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
  index?: number;
  editing?: boolean;
  showImportIcon?: boolean;
  showIndex?: boolean;
  importedAccount?: boolean;
  isMnemonics?: boolean;
  importedLength?: number;
  canEditing?(editing: boolean): void;
  stopEditing?: boolean;
  retriveAlianName?(): void;
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
        onClick,
        index,
        editing = true,
        showImportIcon = true,
        showIndex = false,
        importedAccount = false,
        isMnemonics = false,
        importedLength = 0,
        canEditing,
        stopEditing = false,
        retriveAlianName,
      }: AddressItemProps,
      ref
    ) => {
      if (!account) {
        return null;
      }
      const { t } = useTranslation();
      const wallet = useWallet();
      const [alianName, setAlianName] = useState<string>(
        account?.alianName || ''
      );
      const [displayName, setDisplayName] = useState<string>(
        account?.alianName || ''
      );
      const isDisabled = hiddenAddresses.find(
        (item) => item.address === account.address && item.type === keyring.type
      );

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

      const handleAlianNameChange = (
        e: React.ChangeEvent<HTMLInputElement>
      ) => {
        e.stopPropagation();
        setAlianName(e.target.value);
      };

      const alianNameConfirm = async (e?) => {
        e && e.stopPropagation();
        if (!alianName || alianName.trim() === '') {
          return;
        }
        canEditing && canEditing(false);
        await updateAlianName(alianName);
        setDisplayName(alianName);
        if (editing) {
          return;
        }
      };

      useImperativeHandle(ref, () => ({
        alianNameConfirm,
      }));

      const updateAlianName = async (alianName) => {
        await wallet.updateAlianName(
          account?.address?.toLowerCase(),
          alianName
        );
        retriveAlianName && retriveAlianName();
      };

      const changeName = async () => {
        if (!alianName) {
          const existAlianName = await wallet.getAlianName(
            account?.address?.toLowerCase()
          );
          if (existAlianName) {
            setAlianName(existAlianName);
            setDisplayName(existAlianName);
          } else {
            const alianName = `${
              BRAND_ALIAN_TYPE_TEXT[account?.brandName || account?.type] ||
              account?.brandName
            } ${importedLength + (index || 0) + 1}`;
            setAlianName(alianName);
            setDisplayName(alianName);
            updateAlianName(alianName);
          }
        }
      };

      const inputName = (e) => {
        e.stopPropagation();
        canEditing && canEditing(true);
      };

      useEffect(() => {
        if (importedAccount) {
          changeName();
        }
      }, []);

      return (
        <li
          className={className}
          onClick={(e) => {
            e.stopPropagation();
            onClick && onClick(account.address, keyring, account.brandName);
            canEditing && canEditing(false);
          }}
        >
          <div
            className={clsx(
              'flex items-center relative',
              isDisabled && 'opacity-40'
            )}
            onClick={(e) => {
              e.stopPropagation();
            }}
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
            {importedAccount && isMnemonics && (
              <div className="number-index">{account.index}</div>
            )}
            <div className={clsx('address-info', { 'ml-0': !showImportIcon })}>
              {(showImportIcon || editing) && (
                <div className="brand-name flex">
                  {!stopEditing && editing ? (
                    <Input
                      value={alianName}
                      defaultValue={alianName}
                      onChange={handleAlianNameChange}
                      onPressEnter={alianNameConfirm}
                      onClick={(e) => e.stopPropagation()}
                      autoFocus={!stopEditing}
                      maxLength={20}
                      min={0}
                    />
                  ) : (
                    <div className="display-name">{displayName}</div>
                  )}
                  {stopEditing && editing && (
                    <img
                      className="edit-name"
                      src={IconEditPen}
                      onClick={inputName}
                    />
                  )}
                  {!stopEditing && editing && (
                    <img
                      className="edit-name w-[16px] h-[16px]"
                      src={IconCorrect}
                      onClick={alianNameConfirm}
                    />
                  )}
                </div>
              )}
              <AddressViewer
                address={account?.address?.toLowerCase()}
                showArrow={false}
                index={account.index || index}
                showImportIcon={showImportIcon}
                className={
                  showImportIcon || !showIndex
                    ? 'subtitle'
                    : 'import-color flex'
                }
                showIndex={showIndex}
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
