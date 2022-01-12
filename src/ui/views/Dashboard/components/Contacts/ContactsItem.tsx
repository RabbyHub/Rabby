import React, {
  FunctionComponent,
  useEffect,
  useState,
  memo,
  forwardRef,
  useImperativeHandle,
} from 'react';
import { Tooltip, Input, message } from 'antd';
import { useHistory } from 'react-router-dom';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { useWallet, useHover } from 'ui/utils';
import { AddressViewer } from 'ui/component';
import IconEditPen from 'ui/assets/editpen.svg';
import IconCorrect from 'ui/assets/dashboard/contacts/correct.png';
import IconSuccess from 'ui/assets/success.svg';
import IconAddressCopy from 'ui/assets/address-copy.png';
import IconSend from 'ui/assets/dashboard/contacts/send-icon.png';

import { Account } from './index';

export interface ContactsItem {
  account: {
    address: string;
    type?: string;
    brandName?: string;
    alianName?: string;
    index?: number;
    name?: string;
  };
  index: number;
  setEditIndex(index: number): void;
  editIndex: number;
  accounts: Account[];
}

const ContactsItem = memo(
  forwardRef(
    (
      {
        account,
        onClick,
        className,
        index,
        setEditIndex,
        editIndex,
        accounts,
        ...rest
      }: ContactsItem & Record<string, any>,
      ref: React.ForwardedRef<any>
    ) => {
      const { t } = useTranslation();
      const history = useHistory();
      const [address, setAddress] = useState<string>(account?.address || '');
      const [alianName, setAlianName] = useState<string>(
        account?.alianName || account?.name || ''
      );
      const [copySuccess, setCopySuccess] = useState(false);
      const startEdit = index === editIndex;
      const newInput = !account.address && !account.alianName && !account.name;
      const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        e.stopPropagation();
        setAddress(e.target.value);
      };
      const handleAlianNameChange = (
        e: React.ChangeEvent<HTMLInputElement>
      ) => {
        e.stopPropagation();
        setAlianName(e.target.value);
      };
      const addressConfirm = async (e?: any) => {
        e && e.stopPropagation();
        if (!address || address.trim() === '') {
          return;
        }
      };
      const alianNameConfirm = async (e?: any) => {
        e && e.stopPropagation();
        if (!alianName || alianName.trim() === '') {
          return;
        }
      };
      const validateAddressAndName = async () => {
        const dupicatedName = accounts
          .filter((item) => item.address !== address)
          .find(
            (item) => item.alianName === alianName || item.name === alianName
          );
        const duplicatedAddress = accounts.find(
          (item) => item.address === address.toLowerCase()
        );
        console.log(dupicatedName, duplicatedAddress, 4444);
      };
      const sendToken = () => {
        history.push(
          `/send-token?address=${account?.address}&name=${
            account?.alianName || account?.name
          }`
        );
      };
      return (
        <div className={clsx('contact-item-wrapper', newInput && 'hover')}>
          {newInput ? (
            <Input
              value={address}
              defaultValue={address}
              className="address-input"
              onChange={handleAddressChange}
              onPressEnter={addressConfirm}
              onClick={(e) => e.stopPropagation()}
              autoFocus={newInput}
              maxLength={20}
              min={0}
              placeholder="Enter Address"
            />
          ) : (
            <AddressViewer
              address={account.address}
              showArrow={false}
              className={'view-address-color'}
            />
          )}

          {!startEdit && (
            <img
              onClick={(e) => {
                e.stopPropagation;
                navigator.clipboard.writeText(account?.address);
                message.success({
                  icon: <img src={IconSuccess} className="icon icon-success" />,
                  content: t('Copied'),
                  duration: 0.5,
                });
              }}
              src={IconAddressCopy}
              id={'copyIcon'}
              className={clsx('copy-icon', {
                success: copySuccess,
              })}
            />
          )}
          {startEdit ? (
            <Input
              value={alianName}
              defaultValue={alianName}
              className="name-input"
              onChange={handleAlianNameChange}
              onPressEnter={alianNameConfirm}
              onClick={(e) => e.stopPropagation()}
              //autoFocus={!stopEditing}
              placeholder="Enter Memo"
              maxLength={20}
              min={0}
            />
          ) : (
            <div className="alian-name">
              {account?.alianName || account?.name}
            </div>
          )}
          {!startEdit && (
            <div className="edit-name-wrapper">
              <img className="edit-name" src={IconSend} onClick={sendToken} />
            </div>
          )}
          {startEdit && (
            <img
              className="correct"
              src={IconCorrect}
              onClick={(e) => {
                e.stopPropagation();
                validateAddressAndName();
              }}
            />
          )}
        </div>
      );
    }
  )
);

export default ContactsItem;
