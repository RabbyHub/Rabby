import { Button, Form, Input, Popover } from 'antd';
import React, { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Popup } from 'ui/component';
import {
  splitNumberByStep,
  useAlias,
  useBalance,
  useAccountInfo,
} from 'ui/utils';
import QRCode from 'qrcode.react';
import IconCopy from 'ui/assets/component/icon-copy.svg';
import IconPen from 'ui/assets/editpen.svg';
import './style.less';
import { copyAddress } from '@/ui/utils/clipboard';
import { useForm } from 'antd/lib/form/Form';
import { KEYRING_CLASS, KEYRING_ICONS, WALLET_BRAND_CONTENT } from '@/constant';
import { connectStore } from '@/ui/store';
import { SessionStatusBar } from '@/ui/component/WalletConnect/SessionStatusBar';
import { LedgerStatusBar } from '@/ui/component/ConnectStatus/LedgerStatusBar';
import { GridPlusStatusBar } from '@/ui/component/ConnectStatus/GridPlusStatusBar';
import { KeystoneStatusBar } from '@/ui/component/ConnectStatus/KeystoneStatusBar';
import { SeedPhraseBar } from './SeedPhraseBar';
import { GnonisSafeInfo } from './GnosisSafeInfo';
import { CoboArgusInfo } from './CoboArugsInfo';
import ThemeIcon from '@/ui/component/ThemeMode/ThemeIcon';
import { useThemeMode } from '@/ui/hooks/usePreference';
import { pickKeyringThemeIcon } from '@/utils/account';

type Props = {
  address: string;
  type: string;
  brandName: string;
  source: string;
};

const AddressInfo1 = ({ address, type, brandName, source }: Props) => {
  const [alias, setAlias] = useAlias(address);
  const [balance] = useBalance(address);
  const [form] = useForm();
  const inputRef = useRef<Input>(null);
  const accountInfo = useAccountInfo(type, address, brandName);
  const { t } = useTranslation();

  const isGnosis = type === KEYRING_CLASS.GNOSIS;
  const isCoboArugs = type === KEYRING_CLASS.CoboArgus;

  const handleEditMemo = () => {
    form.setFieldsValue({
      memo: alias,
    });
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
    const { destroy } = Popup.info({
      title: t('page.addressDetail.edit-memo-title'),
      isSupportDarkMode: true,
      height: 215,
      content: (
        <div className="pt-[4px]">
          <Form
            form={form}
            onFinish={async () => {
              form
                .validateFields()
                .then((values) => {
                  return setAlias(values.memo);
                })
                .then(() => {
                  destroy();
                });
            }}
            initialValues={{
              memo: alias,
            }}
          >
            <Form.Item
              name="memo"
              className="h-[80px] mb-0"
              rules={[
                {
                  required: true,
                  message: t('page.addressDetail.please-input-address-note'),
                },
              ]}
            >
              <Input
                ref={inputRef}
                className="popup-input h-[48px]"
                size="large"
                placeholder={t('page.addressDetail.please-input-address-note')}
                autoFocus
                allowClear
                spellCheck={false}
                autoComplete="off"
                maxLength={50}
              ></Input>
            </Form.Item>
            <div className="text-center">
              <Button
                type="primary"
                size="large"
                className="w-[200px]"
                htmlType="submit"
              >
                {t('global.Confirm')}
              </Button>
            </div>
          </Form>
        </div>
      ),
    });
  };

  const { isDarkTheme } = useThemeMode();

  return (
    <div className="rabby-list">
      <div className="rabby-list-item">
        <div className="rabby-list-item-content pr-11">
          <div className="rabby-list-item-label">
            {t('page.addressDetail.address')}
            <div className="rabby-list-item-desc flex gap-4 text-[12px]">
              {address}
              <img
                src={IconCopy}
                className="w-14 h-14 flex-shrink-0 cursor-pointer"
                onClick={() => {
                  copyAddress(address);
                }}
              />
            </div>
          </div>
          <div className="rabby-list-item-extra"></div>
          <div className="rabby-list-item-arrow"></div>
        </div>
      </div>
      <div className="rabby-list-item">
        <div className="rabby-list-item-content">
          <div className="rabby-list-item-label">
            {t('page.addressDetail.address-note')}
          </div>
          <div
            className="rabby-list-item-extra flex gap-[10px]"
            onClick={handleEditMemo}
          >
            <div className="ellipsis" title={alias}>
              {alias}
            </div>
            <img src={IconPen} className="cursor-pointer" alt="" />
          </div>
        </div>
      </div>
      <div className="rabby-list-item">
        <div className="rabby-list-item-content">
          <div className="rabby-list-item-label">
            {t('page.addressDetail.assets')}
          </div>
          <div
            className="rabby-list-item-extra truncate"
            title={splitNumberByStep((balance || 0).toFixed(0))}
          >
            ${splitNumberByStep((balance || 0).toFixed(0))}
          </div>
        </div>
      </div>
      <div className="rabby-list-item">
        <div className="rabby-list-item-content">
          <div className="rabby-list-item-label">
            {t('page.addressDetail.qr-code')}
          </div>
          <div className="rabby-list-item-extra">
            <Popover
              placement="bottomLeft"
              // trigger="click"
              overlayClassName="page-address-detail-qrcode-popover"
              align={{
                offset: [-16, 6],
              }}
              content={<QRCode value={address} size={140}></QRCode>}
            >
              <QRCode
                value={address}
                size={28}
                className="cursor-pointer"
              ></QRCode>
            </Popover>
          </div>
        </div>
      </div>
      <div className="rabby-list-item">
        <div className="rabby-list-item-content">
          <div className="rabby-list-item-label">
            {t('page.addressDetail.source')}
          </div>
          <div className="rabby-list-item-extra flex gap-[4px] max-w-full">
            <ThemeIcon
              className="w-[16px] h-[16px]"
              src={
                pickKeyringThemeIcon(type as any, isDarkTheme) ||
                pickKeyringThemeIcon(brandName as any, isDarkTheme) ||
                KEYRING_ICONS[type] ||
                WALLET_BRAND_CONTENT[brandName as string]?.image
              }
            />
            {source}
          </div>
        </div>
        {type === KEYRING_CLASS.WALLETCONNECT && (
          <div className="pb-[20px]">
            <SessionStatusBar
              className="text-r-neutral-body bg-r-neutral-bg2 connect-status"
              address={address}
              brandName={brandName}
              type={type}
            />
          </div>
        )}
        {type === KEYRING_CLASS.HARDWARE.LEDGER && (
          <div className="pb-[20px]">
            <LedgerStatusBar className="text-r-neutral-body bg-r-neutral-bg2 connect-status" />
          </div>
        )}
        {brandName === 'Keystone' && (
          <div className="pb-[20px]">
            <KeystoneStatusBar className="text-r-neutral-body bg-r-neutral-bg2 connect-status" />
          </div>
        )}
        {type === KEYRING_CLASS.HARDWARE.GRIDPLUS && (
          <div className="pb-[20px]">
            <GridPlusStatusBar className="text-r-neutral-body bg-r-neutral-bg2 connect-status" />
          </div>
        )}
        {type === KEYRING_CLASS.MNEMONIC && (
          <div className="pb-[20px]">
            <SeedPhraseBar address={address} />
          </div>
        )}
        {type === KEYRING_CLASS.Coinbase && (
          <div className="pb-[20px]">
            <SessionStatusBar
              className="text-r-neutral-body bg-r-neutral-bg2 connect-status"
              address={address}
              brandName={KEYRING_CLASS.Coinbase}
              type={KEYRING_CLASS.Coinbase}
            />
          </div>
        )}
      </div>
      {accountInfo && (
        <div className="rabby-list-item">
          <div className="rabby-list-item-content">
            <div className="rabby-list-item-label">
              {t('page.addressDetail.hd-path')}
            </div>
            <div className="rabby-list-item-extra flex gap-[4px]">{`${accountInfo.hdPathTypeLabel} #${accountInfo.index}`}</div>
          </div>
        </div>
      )}

      {isGnosis ? (
        <GnonisSafeInfo address={address} type={type} brandName={brandName} />
      ) : null}

      {isCoboArugs ? <CoboArgusInfo address={address} /> : null}
    </div>
  );
};

export const AddressInfo = connectStore()(AddressInfo1);
