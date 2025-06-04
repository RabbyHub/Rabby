import { Card } from '@/ui/component/NewUserImport';
import { useMemoizedFn, useRequest } from 'ahooks';
// import { Button, Form, Input, message } from 'antd';
import clsx from 'clsx';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router-dom';
import { useNewUserGuideStore } from './hooks/useNewUserGuideStore';
import { clearClipboard } from '@/ui/utils/clipboard';
import IconSuccess from 'ui/assets/success.svg';
import styled from 'styled-components';
import { useWallet } from '@/ui/utils';
import {
  CardContainer,
  CardHeader,
  CardHeading,
} from 'ui/component/CardContainer';
import { Avatar, Box, Button, Flex, Text, TextField } from '@radix-ui/themes';
import { BRAND_ALIAN_TYPE_TEXT } from 'consts';
import { Form } from 'radix-ui';

const Container = styled.div`
  .ant-input {
    border-radius: 8px;
    border: 1px solid var(--r-neutral-line, #e0e5ec);

    &::placeholder {
      color: var(--r-neutral-foot, #6a7587);
      font-weight: 400;
    }
  }

  .ant-input:focus,
  .ant-input-focused {
    border-color: var(--r-blue-default, #7084ff);
  }

  .ant-form-item-has-error .ant-input {
    border: 1px solid var(--r-red-default, #e34935);
  }
`;

export const NewUserImportPrivateKey = () => {
  const { t } = useTranslation();
  const { setStore, clearStore } = useNewUserGuideStore();
  const [value, setValue] = useState('');

  const history = useHistory();
  const wallet = useWallet();
  const [privateKey, setPrivateKey] = useState<string | undefined>();
  const [isError, setIsError] = useState<boolean>(false);

  // const [form] = Form.useForm<{
  //   privateKey: string;
  // }>();

  const handlePrivateKeyChange = useMemoizedFn((e) => {
    const inputValue = e.target.value;
    setPrivateKey(inputValue);
    privateKeyValidator(undefined, inputValue)
      .then(() => {
        // form.setFields([{ name: 'privateKey', errors: [] }]);
        setIsError(false);
      })
      .catch((err) => {
        // form.setFields([{ name: 'privateKey', errors: [err.message] }]);
        setIsError(true);
      });
  });

  const handleSubmit = useMemoizedFn(async () => {
    // const { privateKey } = await form.validateFields();
    setStore({
      privateKey: privateKey,
    });
    history.push('/new-user/import/private-key/set-password');
  });

  const { runAsync: privateKeyValidator, error, loading } = useRequest(
    async (_, value: string) => {
      if (!value) {
        throw new Error('Please input Private key');
      }
      return wallet.validatePrivateKey(value);
    },
    {
      manual: true,
    }
  );

  return (
    <>
      <CardContainer className={'h-[240px]'}>
        <CardHeader
          showBackButton
          onPress={() => {
            history.goBack();
            clearStore();
          }}
        >
          <CardHeading>
            {t('page.newUserImport.importPrivateKey.title')}
          </CardHeading>
        </CardHeader>
        <Flex
          direction={'column'}
          justify={'between'}
          gap={'6'}
          width={'100%'}
          height={'100%'}
        >
          <Form.Root>
            <Form.Field className="pt-5 grid" name="email">
              <div className="flex items-baseline justify-between">
                {/*<Form.Label>Private Key</Form.Label>*/}
                <Form.Message className="" match="valueMissing">
                  Paste your private key
                </Form.Message>
                <Form.Message className="" match="typeMismatch">
                  Please provide a valid private key
                </Form.Message>
                <Form.Message className="" match="patternMismatch">
                  Please provide a valid private Key
                </Form.Message>
              </div>
              <Form.Control asChild>
                {/*<input*/}
                {/*  className="box-border inline-flex h-[35px] w-full appearance-none items-center justify-center rounded bg-blackA2 px-2.5 text-[15px] leading-none text-white shadow-[0_0_0_1px] shadow-blackA6 outline-none selection:bg-blackA6 selection:text-white hover:shadow-[0_0_0_1px_black] focus:shadow-[0_0_0_2px_black]"*/}
                {/*  type="email"*/}
                {/*  required*/}
                {/*/>*/}
                <TextField.Root
                  className="h-[56px] !rounded-xl"
                  placeholder="Paste your Private key"
                  radius={'large'}
                  variant={'soft'}
                  onChange={handlePrivateKeyChange}
                >
                  <TextField.Slot>
                    {/*<MagnifyingGlassIcon height="16" width="16" />*/}
                  </TextField.Slot>
                </TextField.Root>
              </Form.Control>
            </Form.Field>
            {isError && (
              <Text size={'2'} color={'red'}>
                {'Invalid Private Key' || t('global.InvalidInput')}
              </Text>
            )}
          </Form.Root>

          <Button
            highContrast
            size={'4'}
            disabled={isError || !privateKey}
            onClick={handleSubmit}
            // block
            // type="primary"
            // className={clsx(
            //   'mt-[48px] h-[56px] shadow-none rounded-[8px]',
            //   'text-[17px] font-medium'
            // )}
          >
            {t('global.Confirm')}
          </Button>
        </Flex>
      </CardContainer>

      {/*<Container>
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
            <Form form={form} className="mt-[20px]">
              <Form.Item
                name="privateKey"
                rules={[
                  {
                    validator: privateKeyValidator,
                  },
                ]}
              >
                <Input
                  className="h-[52px]"
                  type="password"
                  autoFocus
                  spellCheck={false}
                  placeholder="Input private key"
                  onChange={(e) => {
                    setValue(e.target.value);
                  }}
                  onPaste={() => {
                    clearClipboard();
                    message.success({
                      icon: (
                        <img src={IconSuccess} className="icon icon-success" />
                      ),
                      content: t(
                        'page.newUserImport.importPrivateKey.pasteCleared'
                      ),
                      duration: 2,
                    });
                  }}
                />
              </Form.Item>
            </Form>
          </div>

          <Button
            onClick={handleSubmit}
            block
            type="primary"
            disabled={!!error || loading || !value}
            className={clsx(
              'mt-[48px] h-[56px] shadow-none rounded-[8px]',
              'text-[17px] font-medium'
            )}
          >
            {t('global.Confirm')}
          </Button>
        </Card>
      </Container>*/}
    </>
  );
};
