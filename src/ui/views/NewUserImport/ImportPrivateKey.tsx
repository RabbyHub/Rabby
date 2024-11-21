import { Card } from '@/ui/component/NewUserImport';
import { useMemoizedFn } from 'ahooks';
import { Button, Form, Input } from 'antd';
import clsx from 'clsx';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router-dom';
import { useNewUserGuideStore } from './hooks/useNewUserGuideStore';

export const NewUserImportPrivateKey = () => {
  const { t } = useTranslation();
  const { store, setStore, clearStore } = useNewUserGuideStore();

  const history = useHistory();

  const [form] = Form.useForm<{
    privateKey: string;
  }>();

  const handleSubmit = useMemoizedFn(() => {
    // todo
    const { privateKey } = form.getFieldsValue();
    if (!privateKey) {
      form.setFields([
        {
          name: 'privateKey',
          errors: ['Please input your private key'],
        },
      ]);
      return;
    }
    setStore({
      privateKey: privateKey,
    });
    history.push('/new-user/import/private-key/set-password');
  });

  return (
    <Card
      onBack={() => {
        history.goBack();
        clearStore();
      }}
      step={1}
      className="flex flex-col"
    >
      <div className="flex-1 mt-[18px]">
        <div className="text-r-neutral-title1 text-center text-[20px] font-semibold leading-[24px]">
          {t('page.newUserImport.importPrivateKey.title')}
        </div>
        <Form
          form={form}
          className="mt-[20px]"
          initialValues={{
            privateKey: store.privateKey,
          }}
        >
          <Form.Item
            name="privateKey"
            rules={[
              {
                required: true,
              },
            ]}
          >
            <Input
              className="h-[52px] border-[1px] border-rabby-blue-default border-solid"
              type="password"
            />
          </Form.Item>
        </Form>
      </div>

      <Button
        onClick={handleSubmit}
        block
        type="primary"
        className={clsx(
          'mt-[48px] h-[56px] shadow-none rounded-[8px]',
          'text-[17px] font-medium'
        )}
      >
        {t('global.Confirm')}
      </Button>
    </Card>
  );
};
