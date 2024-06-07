import {
  TestnetChain,
  TestnetChainBase,
} from '@/background/service/customTestnet';
import { useWallet } from '@/ui/utils';
import { updateChainStore } from '@/utils/chain';
import {
  useMemoizedFn,
  useMount,
  useRequest,
  useSetState,
  useUnmount,
} from 'ahooks';
import { Button, message } from 'antd';
import React from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import IconSuccess from 'ui/assets/success.svg';
import { PageHeader } from 'ui/component';
import { CustomTestnetItem } from './components/CustomTestnetItem';
import { EditCustomTestnetModal } from './components/EditTestnetModal';
import './style.less';
import { Emtpy } from './components/Empty';
import { useHistory } from 'react-router-dom';
import { sortBy } from 'lodash';
import { matomoRequestEvent } from '@/utils/matomo-request';

const Footer = styled.div`
  height: 84px;
  border-top: 0.5px solid var(--r-neutral-line, rgba(255, 255, 255, 0.1));
  background: var(--r-neutral-bg1, rgba(255, 255, 255, 0.06));
  padding: 20px;
  display: flex;
  justify-content: center;
`;

export const CustomTestnet = () => {
  const { t } = useTranslation();
  const wallet = useWallet();
  const history = useHistory();

  const [state, setState] = useSetState<{
    isShowModal: boolean;
    current?: TestnetChainBase | null;
    isEdit: boolean;
  }>({
    isShowModal: false,
    current: null,
    isEdit: false,
    ...(history.location?.state as any),
  });

  const handleAddClick = () => {
    const next = {
      isShowModal: true,
      current: null,
      isEdit: false,
    };
    setState(next);
    wallet.setPageStateCache({
      path: history.location.pathname,
      states: {
        ...next,
      },
    });
    matomoRequestEvent({
      category: 'Custom Network',
      action: 'Click Add Network',
    });
  };

  const { data: list, runAsync: runGetCustomTestnetList } = useRequest(
    async () => {
      const res = await wallet.getCustomTestnetList();
      return sortBy(res, 'name');
    }
  );

  const handleConfirm = useMemoizedFn(async () => {
    setState({
      isShowModal: false,
      current: null,
      isEdit: false,
    });
    const list = await runGetCustomTestnetList();
    updateChainStore({
      testnetList: list,
    });
    wallet.clearPageStateCache();
  });

  const handleRemoveClick = useMemoizedFn(async (item: TestnetChain) => {
    await wallet.removeCustomTestnet(item.id);
    message.success({
      duration: 0.5,
      icon: <i />,
      content: (
        <div>
          <div className="flex gap-4 mb-4">
            <img src={IconSuccess} alt="" />
            {t('global.Deleted')}
          </div>
        </div>
      ),
    });
    const list = await runGetCustomTestnetList();
    updateChainStore({
      testnetList: list,
    });
  });

  const handleEditClick = useMemoizedFn(async (item: TestnetChain) => {
    const next = {
      isShowModal: true,
      current: item,
      isEdit: true,
    };
    setState(next);
    wallet.setPageStateCache({
      path: history.location.pathname,
      states: {
        ...next,
      },
    });
  });

  useMount(async () => {
    const cache = await wallet.getPageStateCache();
    if (cache?.path === history.location.pathname) {
      setState({
        ...(cache.states as any),
      });
    }
  });

  return (
    <div className="custom-testnet">
      <PageHeader
        className="pt-[24px] mx-[20px] mb-16"
        canBack={false}
        closeable
        onClose={() => {
          if (history.length > 1) {
            history.goBack();
          } else {
            history.replace('/');
          }
        }}
      >
        {t('page.customTestnet.title')}
      </PageHeader>
      <p className="text-r-neutral-body text-[13px] text-center leading-[16px] mb-20 px-20">
        {t('page.customTestnet.desc')}
      </p>
      {!list?.length ? (
        <Emtpy description={t('page.customTestnet.empty')} />
      ) : (
        <div className="flex flex-col gap-[12px] px-[20px] flex-1 overflow-auto pb-[12px]">
          {list?.map((item) => (
            <CustomTestnetItem
              item={item as any}
              key={item.id}
              className="bg-r-neutral-card1"
              onEdit={handleEditClick}
              onRemove={handleRemoveClick}
              editable
            />
          ))}
        </div>
      )}
      <Footer>
        <Button size="large" type="primary" block onClick={handleAddClick}>
          {t('page.customTestnet.add')}
        </Button>
      </Footer>
      <EditCustomTestnetModal
        ctx={{
          ga: {
            source: 'setting',
          },
        }}
        visible={state.isShowModal}
        data={state.current}
        isEdit={state.isEdit}
        onCancel={() => {
          setState({
            isShowModal: false,
            current: null,
            isEdit: false,
          });
          wallet.clearPageStateCache();
        }}
        onChange={(values) => {
          wallet.setPageStateCache({
            path: history.location.pathname,
            states: {
              ...state,
              current: values,
            },
          });
        }}
        onConfirm={handleConfirm}
      />
    </div>
  );
};
