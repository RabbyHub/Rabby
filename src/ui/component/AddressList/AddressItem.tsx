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
import { useWallet } from 'ui/utils';
import { AddressViewer, Copy } from 'ui/component';
import {
  KEYRING_ICONS,
  WALLET_BRAND_CONTENT,
  KEYRING_TYPE_TEXT,
  BRAND_ALIAN_TYPE_TEXT,
} from 'consts';
import IconEditPen from 'ui/assets/editpen.svg';
import IconCorrect from 'ui/assets/dashboard/contacts/correct.png';
import { useDebounce } from 'react-use';

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
  ellipsis?: boolean;
  showEditIcon?: boolean;
}

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
        canEditing,
        stopEditing = false,
        retriveAlianName,
        ellipsis = true,
        showEditIcon = true,
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
              i18nKey="component.AddressList.AddressItem.addressTypeTip"
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

      useDebounce(
        () => {
          if (!showEditIcon) {
            alianNameConfirm();
          }
        },
        200,
        [alianName, showEditIcon]
      );

      const updateAlianName = async (alianName) => {
        await wallet.updateAlianName(
          account?.address?.toLowerCase(),
          alianName
        );
        retriveAlianName && retriveAlianName();
      };

      const inputName = (e) => {
        e.stopPropagation();
        canEditing && canEditing(true);
      };

      useEffect(() => {
        (async () => {
          if (!alianName) {
            const alias = await wallet.getAlianName(account.address);
            setAlianName(alias || '');
            setDisplayName(alias || '');
          }
        })();
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
                    WALLET_BRAND_CONTENT[account.brandName]?.image ||
                    KEYRING_ICONS[account.type]
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
                      maxLength={50}
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
                  {!stopEditing && editing && showEditIcon && (
                    <img
                      className="edit-name w-[16px] h-[16px]"
                      src={IconCorrect}
                      onClick={alianNameConfirm}
                    />
                  )}
                </div>
              )}
              <div className="flex items-center">
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
                  ellipsis={ellipsis}
                />
                <Copy
                  variant="address"
                  data={account?.address}
                  className="w-14 h-14 ml-4"
                ></Copy>
              </div>
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
