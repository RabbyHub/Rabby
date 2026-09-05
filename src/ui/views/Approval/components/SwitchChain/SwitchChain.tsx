import {
  TestnetChainBase,
  createTestnetChain,
} from '@/background/service/customTestnet';
import { CustomTestnetForm } from '@/ui/views/CustomTestnet/components/CustomTestnetForm';
import { useMount, useRequest } from 'ahooks';
import { Button, Spin } from 'antd';
import { useForm } from 'antd/lib/form/Form';
import BigNumber from 'bignumber.js';
import clsx from 'clsx';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useApproval, useWallet } from 'ui/utils';
import { SwitchEthereumChainParams } from './type';
import { LoadingOutlined } from '@ant-design/icons';
import { useThemeMode } from '@/ui/hooks/usePreference';
import { matomoRequestEvent } from '@/utils/matomo-request';

interface SwitchChainProps {
  data: SwitchEthereumChainParams[];
  session: {
    origin: string;
    icon: string;
    name: string;
  };
}

const SwitchChain = ({ params }: { params: SwitchChainProps }) => {
  const wallet = useWallet();
  const [, resolveApproval, rejectApproval] = useApproval();
  const { t } = useTranslation();

  const { data, session } = params;

  const chainId = data?.[0]?.chainId;

  const [form] = useForm<TestnetChainBase>();
  const { loading: isFetching } = useRequest(
    async () => {
      if (chainId) {
        const res = await wallet.openapi.getChainListByIds({
          ids: new BigNumber(chainId).toString(),
        });

        const item = res?.[0];
        if (!item) {
          return;
        }

        return createTestnetChain({
          name: item.name,
          id: item.chain_id,
          nativeTokenSymbol: item.native_currency.symbol,
          rpcUrl: item.rpc || '',
          scanLink: item.explorer || '',
        });
      }
    },
    {
      refreshDeps: [chainId],
      onSuccess: (res) => {
        if (res) {
          form.setFieldsValue(res);
        }
      },
    }
  );

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

  const { isDarkTheme } = useThemeMode();

  return (
    <div className="h-[100vh] relative flex flex-col ">
      <div className="p-[20px] text-center bg-r-blue-default text-r-neutral-title2 text-[20px] leading-[24px] font-medium">
        {t('page.switchChain.title')}
      </div>
      <div className="p-[20px] flex-1 overflow-auto">
        <div className="text-center text-r-neutral-body text-[13px] leading-[16px]  p-[10px] bg-r-neutral-card2 rounded-[6px]">
          {t('page.switchChain.desc')}
        </div>

        <div className="py-[20px] relative">
          <CustomTestnetForm form={form} />
          {isFetching ? (
            <div
              className={clsx(
                'absolute top-0 left-[-20px] bottom-0 right-[-20px]',
                'flex items-center justify-center',
                isDarkTheme
                  ? 'bg-[rgba(0,0,0,0.3)]'
                  : 'bg-[rgba(255,255,255,0.3)]'
              )}
            >
              <div className="text-r-neutral-body flex flex-col items-center ">
                <LoadingOutlined style={{ fontSize: 22 }} spin />
                <div className="text-[13px] leading-[16px] mt-[6px]">
                  Loading
                </div>
              </div>
            </div>
          ) : null}
        </div>
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

export default SwitchChain;
