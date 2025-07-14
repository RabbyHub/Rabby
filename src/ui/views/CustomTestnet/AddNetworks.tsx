import {
  TestnetChain,
  TestnetChainBase,
} from '@/background/service/customTestnet';
import ThemeIcon from '@/ui/component/ThemeMode/ThemeIcon';
import { useMemoizedFn, useRequest } from 'ahooks';
// import { Button, Form, Modal } from 'antd';
import clsx from 'clsx';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
// import { ReactComponent as RcIconFlash } from 'ui/assets/custom-testnet/icon-flash.svg';
// import { ReactComponent as RcIconRight } from 'ui/assets/custom-testnet/icon-right.svg';
// import { PageHeader, Popup } from 'ui/component';
import { useWallet } from 'ui/utils';
// import { AddFromChainList } from '../AddFromChainList';
// import { CustomTestnetForm } from './CustomTestnetForm';
import { matomoRequestEvent } from '@/utils/matomo-request';
// import { ConfirmModifyRpcModal } from './ConfirmModifyRpcModal';
import { useHistory } from 'react-router-dom';
import {
  PageBody,
  PageContainer,
  PageHeader,
  PageHeading,
} from 'ui/component/PageContainer';
import {
  Button,
  Callout,
  Card,
  Checkbox,
  CheckboxCards,
  Flex,
  Separator,
  Switch,
  Text,
  TextField,
} from '@radix-ui/themes';
import { updateChainStore } from '@/utils/chain';
import { sortBy } from 'lodash';
import { LucideX, LucideXOctagon } from 'lucide-react';
import { toast } from 'sonner';

const Wrapper = styled.div`
  height: 100%;
  padding: 20px 0 76px 0;
`;

const Footer = styled.div`
  height: 84px;
  border-top: 0.5px solid var(--r-neutral-line, rgba(255, 255, 255, 0.1));
  background: var(--r-neutral-bg1, #fff);
  padding: 18px 20px;
  display: flex;
  justify-content: space-between;
  gap: 16px;
  width: 100%;
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
`;

export const AddNetwork = () => {
  const wallet = useWallet();
  const [isShowAddFromChainList, setIsShowAddFromChainList] = useState(false);
  const [isShowModifyRpcModal, setIsShowModifyRpcModal] = useState(false);
  // const [form] = Form.useForm();
  const [formValues, setFormValues] = useState<Partial<TestnetChainBase>>({});
  const [error, setError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setFormValues({
      id: undefined,
      name: '',
      nativeTokenSymbol: '',
      rpcUrl: '',
      scanLink: '',
    });
  };

  /*const { loading, runAsync: runAddTestnet } = useRequest(
    (
      data: TestnetChainBase,
      ctx?: {
        ga?: {
          source?: string;
        };
      }
    ) => {
      return isEdit
        ? wallet.updateCustomTestnet(data)
        : wallet.addCustomTestnet(data, ctx);
    },
    {
      manual: true,
    }
  );*/

  const { data: list, runAsync: runGetCustomTestnetList } = useRequest(
    async () => {
      const res = await wallet.getCustomTestnetList();
      return sortBy(res, 'name');
    }
  );

  const handleConfirm = useMemoizedFn(async () => {
    await runGetCustomTestnetList();
    updateChainStore({
      testnetList: list,
    });
    wallet.clearPageStateCache();
  });

  const handleAddNetwork = async () => {
    setIsSubmitting(true);
    // Validate the Submit form
    if (
      !formValues.id ||
      !formValues.name ||
      !formValues.nativeTokenSymbol ||
      !formValues.rpcUrl
    ) {
      setError('Kindly fill all the required fields');
      setIsSubmitting(false);
      return;
    }

    // await form.validateFields();
    // const values = form.getFieldsValue();
    // const res = await runAddTestnet(values, ctx);
    /*if ('error' in res) {
      form.setFields([
        {
          name: [res.error.key],
          errors: [res.error.message],
        },
      ]);
      if (!isEdit && res.error.status === 'alreadySupported') {
        setIsShowModifyRpcModal(true);
        setFormValues(form.getFieldsValue());
      }
    } else {
      onConfirm?.(res);
    }*/

    // Check if the network being added already exists.
    // If it does, use the edit network button instead

    const ctx = {
      ga: {
        source: '',
      },
    };

    console.log('Adding custom testnet with values:', formValues);
    try {
      // const res = await runAddTestnet(values, ctx);
      const addNetworkResult = await wallet.addCustomTestnet(
        formValues as Required<TestnetChainBase>
      );
      console.log('Custom testnet added successfully:', formValues);

      if (addNetworkResult.error) {
        setError(addNetworkResult.error.message);
        toast.error(addNetworkResult.error.key, {
          description: addNetworkResult.error,
        });
        return;
      }

      await handleConfirm();
      toast.success('Network added successfully!');
    } catch (err: any) {
      // Handle error
      if (err?.message) {
        setError(err.message);
      } else {
        setError('An error occurred while adding the network');
      }
      console.error('Error adding network:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const { t } = useTranslation();

  /*useEffect(() => {
    if (data && visible) {
      form.setFieldsValue(data);
    }
  }, [data, visible]);*/

  /*useEffect(() => {
    if (!visible) {
      form.resetFields();
    }
  }, [visible]);*/

  const history = useHistory();

  const isLikeTestNet = formValues.name?.toLowerCase().includes('testnet');

  return (
    <PageContainer>
      <PageHeader showBackButton>
        <PageHeading>
          {t('page.customRpc.AddCustomTestnetModal.title')}
        </PageHeading>
      </PageHeader>

      {(error || isLikeTestNet) && (
        <Flex direction={'column'} gap={'2'} p={'2'}>
          {error && (
            /*<div className="mb-4 rounded-md bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>*/
            <Callout.Root color="red" role="alert">
              <Callout.Icon>
                <LucideXOctagon size={16} strokeWidth={3} />
              </Callout.Icon>
              {/* @ts-expect-error "This is a negligible error */}
              <Callout.Text>{error}</Callout.Text>
            </Callout.Root>
          )}

          {isLikeTestNet && (
            <Flex
              position={'sticky'}
              top={'0'}
              direction={'column'}
              gap={'1'}
              width={'100%'}
            >
              <Card size={'2'}>
                <Flex align={'center'} justify={'between'} width={'100%'}>
                  <Text size={'2'}>This is a Test Network</Text>
                  <Switch checked color={'grass'} size={'2'} />
                </Flex>
              </Card>
              {/*<CheckboxCards.Root
              color={'grass'}
              columns={'1'}
              defaultValue={['1']}
              size="2"
            >
              <CheckboxCards.Item value="1">
                This is a Test Network
              </CheckboxCards.Item>
            </CheckboxCards.Root>*/}
              {/*<Flex gap="2" width={'100%'}>
                    <Text as="label" size="2">
                      {
                        <Checkbox
                          // highContrast
                          color={'grass'}
                          checked={formValues.name
                            ?.toLowerCase()
                            .includes('testnet')}
                          title="Is testnet"
                          onCheckedChange={(value) =>
                            setFormValues({
                              ...formValues,
                              isTestnet: value.valueOf() as boolean,
                            })
                          }
                        />
                      }
                      This is a Test Network
                    </Text>
                  </Flex>*/}
            </Flex>
          )}
          <Separator orientation="horizontal" size="4" />
        </Flex>
      )}

      <PageBody>
        <Flex direction={'column'} px={'2'} py={'4'}>
          <Flex direction={'column'} gap={'5'}>
            <Flex direction={'column'} gap={'2'}>
              <Text size={'2'} weight={'medium'}>
                Network Name
              </Text>
              <TextField.Root
                autoFocus
                required
                autoComplete={'off'}
                className={'h-[56px]'}
                size={'3'}
                variant={'soft'}
                title="Network name"
                placeholder="Network Name"
                value={formValues.name}
                onChange={(e) =>
                  setFormValues({ ...formValues, name: e.target.value })
                }
              />
            </Flex>
            <Flex direction={'column'} gap={'2'}>
              <Text size={'2'} weight={'medium'}>
                Chain Id
              </Text>
              <TextField.Root
                required
                // type={"number"}
                className={'h-[56px]'}
                size={'3'}
                variant={'soft'}
                placeholder="e.g., 0x..."
                value={formValues.id}
                onChange={(e) =>
                  setFormValues({
                    ...formValues,
                    id: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
                title="Chain ID (hex)"
              />
            </Flex>
            <Flex direction={'column'} gap={'2'}>
              <Text size={'2'} weight={'medium'}>
                Symbol
              </Text>
              <TextField.Root
                // type={"text"}
                className={'h-[56px]'}
                size={'3'}
                variant={'soft'}
                placeholder="e.g., ETH"
                value={formValues.nativeTokenSymbol}
                onChange={(e) =>
                  setFormValues({
                    ...formValues,
                    nativeTokenSymbol: e.target.value,
                  })
                }
                title="Symbol"
              />
            </Flex>
            <Flex direction={'column'} gap={'2'}>
              <Text size={'2'} weight={'medium'}>
                RPC URL
              </Text>
              <TextField.Root
                // type="url"
                className={'h-[56px]'}
                size={'3'}
                variant={'soft'}
                placeholder="https://rpc.io"
                value={formValues.rpcUrl}
                onChange={(e) =>
                  setFormValues({ ...formValues, rpcUrl: e.target.value })
                }
                title="RPC URL"
              />
            </Flex>
            <Flex direction={'column'} gap={'2'}>
              <Text size={'2'} weight={'medium'}>
                Block Explorer URL
              </Text>
              <TextField.Root
                // type="url"
                className={'h-[56px]'}
                size={'3'}
                variant={'soft'}
                placeholder="https://explorer.io"
                value={formValues.scanLink}
                onChange={(e) =>
                  setFormValues({
                    ...formValues,
                    scanLink: e.target.value,
                  })
                }
                title="Block explorer URL"
              />
            </Flex>
          </Flex>
        </Flex>
      </PageBody>

      <Flex align={'center'} gapX="4" width={'100%'} p={'4'}>
        <Button
          highContrast
          className="flex-1"
          size={'3'}
          type="submit"
          variant="solid"
          onClick={handleAddNetwork}
        >
          {isSubmitting ? t('global.Loading') : t('global.Confirm')}
        </Button>
        <Button
          className={'w-1/3'}
          size={'3'}
          type="reset"
          color="red"
          variant="solid"
          onClick={resetForm}
        >
          Reset
        </Button>
      </Flex>

      {/*<Popup
        height={height || 520}
        visible={visible}
        onCancel={onCancel}
        bodyStyle={{
          padding: 0,
        }}
        zIndex={zIndex || 1001}
        style={{
          zIndex: zIndex || 1001,
        }}
        maskStyle={maskStyle}
        // isSupportDarkMode
      >
        <Wrapper>
          <PageHeader className="pt-0" forceShowBack={false} canBack={false}>
            {t('page.customRpc.EditCustomTestnetModal.title')}
          </PageHeader>
          <div className="h-[calc(100%-40px)] overflow-auto px-[20px]">
            {isEdit ? null : (
              <div
                className={clsx(
                  'flex items-center gap-[8px]',
                  'bg-r-blue-light1 p-[15px] cursor-pointer rounded-[6px]',
                  'mb-[20px] border-[1px] border-transparent',
                  'hover:border-rabby-blue-default hover:bg-r-blue-light1'
                )}
                onClick={() => {
                  setIsShowAddFromChainList(true);
                  const source = ctx?.ga?.source || 'setting';
                  matomoRequestEvent({
                    category: 'Custom Network',
                    action: 'Click Add From ChanList',
                    label: source,
                  });
                }}
              >
                <ThemeIcon src={RcIconFlash}></ThemeIcon>
                <div className="text-r-neutral-title1 text-[15px] leading-[18px] font-medium">
                  {t('page.customRpc.EditCustomTestnetModal.quickAdd')}
                </div>
                <ThemeIcon src={RcIconRight} className="ml-auto"></ThemeIcon>
              </div>
            )}

            <CustomTestnetForm
              form={form}
              isEdit={isEdit}
              onFieldsChange={() => {
                const values = form.getFieldsValue();
                onChange?.(values);
              }}
            />
          </div>
          <Footer>
            <Button
              type="primary"
              size="large"
              className="rabby-btn-ghost w-[172px]"
              ghost
              onClick={onCancel}
            >
              {t('global.Cancel')}
            </Button>
            <Button
              type="primary"
              loading={loading}
              size="large"
              className="w-[172px]"
              onClick={handleSubmit}
            >
              {loading ? t('global.Loading') : t('global.Confirm')}
            </Button>
          </Footer>
        </Wrapper>
        <AddFromChainList
          visible={isShowAddFromChainList}
          onClose={() => {
            setIsShowAddFromChainList(false);
          }}
          onSelect={(item) => {
            form.setFieldsValue(item);
            setIsShowAddFromChainList(false);
            const source = ctx?.ga?.source || 'setting';
            matomoRequestEvent({
              category: 'Custom Network',
              action: 'Choose ChainList Network',
              label: `${source}_${String(item.id)}`,
            });
          }}
        />
        <ConfirmModifyRpcModal
          visible={isShowModifyRpcModal}
          chainId={formValues.id}
          rpcUrl={formValues.rpcUrl}
          onCancel={() => {
            setIsShowModifyRpcModal(false);
          }}
          onConfirm={() => {
            setIsShowModifyRpcModal(false);
            wallet.clearPageStateCache();
            history.replace({
              pathname: '/custom-rpc',
              state: {
                chainId: formValues.id,
                rpcUrl: formValues.rpcUrl,
              },
            });
          }}
        />
      </Popup>*/}
    </PageContainer>
  );
};
