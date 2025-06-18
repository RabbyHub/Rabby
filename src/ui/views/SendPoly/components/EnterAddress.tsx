import React, { useState, useMemo, useEffect } from 'react';
import { Input, Form, Button } from 'antd';
import { useTranslation } from 'react-i18next';
import { isValidAddress } from '@ethereumjs/util';
import { useWallet } from 'ui/utils';
import { debounce } from 'lodash';

export const EnterAddress = ({
  onNext,
}: {
  onNext: (address: string) => void;
}) => {
  const { t } = useTranslation();
  const wallet = useWallet();
  const [form] = Form.useForm();
  const [ensResult, setEnsResult] = useState<null | {
    addr: string;
    name: string;
  }>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [isValidAddr, setIsValidAddr] = useState(false);

  const handleConfirmENS = (result: string) => {
    form.setFieldsValue({
      address: result,
    });
    setIsValidAddr(true);
    setTags([`ENS: ${ensResult!.name}`]);
    setEnsResult(null);
  };

  const handleKeyDown = useMemo(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'enter') {
        if (ensResult) {
          e.preventDefault();
          handleConfirmENS(ensResult.addr);
        }
      }
    };
    return handler;
  }, [ensResult]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  const handleValuesChange = useMemo(
    () =>
      debounce(async ({ address }: { address: string }) => {
        setTags([]);
        if (!isValidAddress(address)) {
          setIsValidAddr(false);
          try {
            const result = await wallet.openapi.getEnsAddressByName(address);
            if (result && result.addr) {
              setEnsResult(result);
            }
          } catch (e) {
            setEnsResult(null);
          }
        } else {
          setIsValidAddr(true);
          setEnsResult(null);
        }
      }, 300),
    [wallet]
  );

  const handleNextClick = () => {
    const address = form.getFieldValue('address');
    onNext(address);
  };

  return (
    <Form
      autoComplete="off"
      onValuesChange={handleValuesChange}
      onFinish={handleNextClick}
      form={form}
      className="flex flex-1 flex-col"
    >
      <div className="relative flex-1 overflow-auto">
        <Form.Item
          name="address"
          className="rounded-[8px] overflow-hidden"
          rules={[
            {
              required: true,
              message: t('page.newAddress.addContacts.required'),
            },
          ]}
        >
          <Input.TextArea
            maxLength={44}
            placeholder="Enter address / ENS"
            allowClear
            autoFocus
            size="large"
            spellCheck={false}
            rows={4}
            className="border-bright-on-active rounded-[8px] leading-normal"
          />
        </Form.Item>
        {tags.length > 0 && (
          <ul className="mt-[13px]">
            {tags.map((tag) => (
              <li
                className="border-none pl-0 py-0 text-[13px] text-r-neutral-body font-medium"
                key={tag}
              >
                {tag}
              </li>
            ))}
          </ul>
        )}
        {ensResult && (
          <div
            className="mt-[12px] p-[12px] bg-r-neutral-card1 rounded-[8px]"
            onClick={() => handleConfirmENS(ensResult.addr)}
          >
            <div className="flex items-center gap-[8px] break-all">
              <span className="flex-1">{ensResult.addr}</span>
            </div>
          </div>
        )}
      </div>
      <div className={'footer'}>
        <div className="btn-wrapper w-[100%] px-[20px] flex justify-center">
          <Button
            disabled={!isValidAddr}
            type="primary"
            htmlType="submit"
            size="large"
            className="w-[100%] h-[48px] text-[16px]"
          >
            {t('global.confirm')}
          </Button>
        </div>
      </div>
    </Form>
  );
};
