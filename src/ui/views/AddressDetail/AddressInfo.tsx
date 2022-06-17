import { Button, Form, Input, message, Popover } from 'antd';
import React, { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Copy, PageHeader, Popup } from 'ui/component';
import { splitNumberByStep, useAlias, useBalance, useWallet } from 'ui/utils';
import QRCode from 'qrcode.react';
import IconCopy from 'ui/assets/component/icon-copy.svg';
import IconPen from 'ui/assets/editpen.svg';
import './style.less';
import { copyAddress } from '@/ui/utils/clipboard';
import { useForm } from 'antd/lib/form/Form';
import { KEYRING_ICONS, WALLET_BRAND_CONTENT } from '@/constant';
import { useLocation } from 'react-router-dom';

type Props = {
  address: string;
  type: string;
  brandName?: string;
  source: string;
};

export const AddressInfo = ({ address, type, brandName, source }: Props) => {
  const wallet = useWallet();
  const { t } = useTranslation();

  const [alias, setAlias] = useAlias(address);
  const [balance] = useBalance(address);
  const [form] = useForm();
  const inputRef = useRef<Input>(null);

  const handleEditMemo = () => {
    form.setFieldsValue({
      memo: alias,
    });
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
    const { destroy } = Popup.info({
      title: 'Edit address memo',
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
              rules={[{ required: true, message: 'Please input address memo' }]}
            >
              <Input
                ref={inputRef}
                className="popup-input h-[48px]"
                size="large"
                placeholder="Please input address memo"
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
                Confirm
              </Button>
            </div>
          </Form>
        </div>
      ),
    });
  };

  return (
    <div className="rabby-list">
      <div className="rabby-list-item">
        <div className="rabby-list-item-content pr-11">
          <div className="rabby-list-item-label">
            Address
            <div className="rabby-list-item-desc flex gap-4 text-[13px]">
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
          <div className="rabby-list-item-label">Memo</div>
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
          <div className="rabby-list-item-label">Assets</div>
          <div className="rabby-list-item-extra">
            ${splitNumberByStep((balance || 0).toFixed(0))}
          </div>
        </div>
      </div>
      <div className="rabby-list-item">
        <div className="rabby-list-item-content">
          <div className="rabby-list-item-label">QR Code</div>
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
          <div className="rabby-list-item-label">Source</div>
          <div className="rabby-list-item-extra flex gap-[4px]">
            <img
              className="w-[16px] h-[16px]"
              src={
                KEYRING_ICONS[type] ||
                WALLET_BRAND_CONTENT[brandName as string]?.image
              }
            />
            {source}
          </div>
        </div>
      </div>
    </div>
  );
};
