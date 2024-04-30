import { TestnetChainBase } from '@/background/service/customTestnet';
import { CustomTestnetForm } from '@/ui/views/CustomTestnet/components/CustomTestnetForm';
import { useMount, useRequest } from 'ahooks';
import { Button } from 'antd';
import { useForm } from 'antd/lib/form/Form';
import clsx from 'clsx';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useApproval, useWallet } from 'ui/utils';
import { AddEthereumChainParams } from './type';
import { matomoRequestEvent } from '@/utils/matomo-request';

interface AddChainProps {
  data: AddEthereumChainParams[];
  session: {
    origin: string;
    icon: string;
    name: string;
  };
}

const AddChain = ({ params }: { params: AddChainProps }) => {
  const wallet = useWallet();
  const [, resolveApproval, rejectApproval] = useApproval();
  const { t } = useTranslation();

  const { data, session } = params;
  const [addChainParams] = data;

  const [form] = useForm<TestnetChainBase>();
  useEffect(() => {
    form.setFieldsValue({
      id: +addChainParams.chainId,
      name: addChainParams.chainName,
      rpcUrl: addChainParams.rpcUrls?.[0],
      nativeTokenSymbol: addChainParams.nativeCurrency?.symbol,
      scanLink: addChainParams.blockExplorerUrls?.[0],
    });
  }, [form, addChainParams]);

  useMount(() => {
    matomoRequestEvent({
      category: 'Custom Network',
      action: 'Dapp Add Network',
    });
  });

  const { loading, runAsync: runAddChain } = useRequest(
    async () => {
      await form.validateFields();
      const values = form.getFieldsValue();

      const res = await wallet.addCustomTestnet(values, {
        ga: {
          source: 'dapp',
        },
      });
      if ('error' in res) {
        form.setFields([
          {
            name: res.error.key,
            errors: [res.error.message],
          },
        ]);
        throw new Error(res.error.message);
      }

      const site = await wallet.getConnectedSite(session.origin)!;
      if (site) {
        await wallet.updateConnectSite(site?.origin, {
          ...site,
          chain: res.enum,
        });
      }
    },
    {
      manual: true,
    }
  );

  const handleConfirm = async () => {
    await runAddChain();
    resolveApproval();
  };

  return (
    <div className="h-[100vh] relative flex flex-col ">
      <div className="p-[20px] text-center bg-r-blue-default text-r-neutral-title2 text-[20px] leading-[24px] font-medium">
        {t('page.addChain.title')}
      </div>
      <div className="p-[20px] flex-1 overflow-auto">
        <div className="text-center text-r-neutral-body text-[13px] leading-[16px] mb-[20px] p-[10px] bg-r-neutral-card2 rounded-[6px]">
          {t('page.addChain.desc')}
        </div>
        <CustomTestnetForm form={form} idDisabled />
      </div>
      <div
        className={clsx(
          'flex items-center px-[20px] py-[18px] gap-[16px]',
          // 'absolute left-0 right-0 bottom-0',
          'bg-r-neutral-bg1 border-t-[0.5px] border-t-rabby-neutral-line'
        )}
      >
        <Button
          type="primary"
          size="large"
          ghost
          className="rabby-btn-ghost w-[172px]"
          onClick={() => rejectApproval()}
        >
          {t('global.cancelButton')}
        </Button>

        <Button
          type="primary"
          className="w-[172px]"
          size="large"
          loading={loading}
          onClick={handleConfirm}
        >
          {t('global.addButton')}
        </Button>
      </div>
    </div>
  );
};

export default AddChain;
