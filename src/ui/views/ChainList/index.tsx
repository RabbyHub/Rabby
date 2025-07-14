import { TooltipWithMagnetArrow } from '@/ui/component/Tooltip/TooltipWithMagnetArrow';
import { getChainList, getMainnetChainList } from '@/utils/chain';
import { Chain } from '@debank/common';
import React from 'react';
import { useTranslation } from 'react-i18next';
// import { PageHeader } from 'ui/component';
// import './style.less';
import {
  PageBody,
  PageContainer,
  PageHeader,
  PageHeading,
} from 'ui/component/PageContainer';
import { Avatar, Card, Flex, Grid, Text, Tooltip } from '@radix-ui/themes';

const List = ({ list }: { list: Chain[] }) => {
  return (
    <div className="overflow-auto max-h-full">
      <div className="chain-list">
        {list.map((item) => {
          return (
            <div className="chain-list-item" key={item.id}>
              <img src={item.logo} alt="" />
              <TooltipWithMagnetArrow
                title={item.name}
                className="rectangle w-[max-content]"
              >
                <span className="overflow-hidden overflow-ellipsis">
                  {item.name}
                </span>
              </TooltipWithMagnetArrow>
            </div>
          );
        })}
        {list.length % 2 !== 0 && <div className="chain-list-item"></div>}
      </div>
    </div>
  );
};

const ChainList = () => {
  const { t } = useTranslation();

  const list = getChainList('mainnet');

  return (
    <PageContainer>
      <PageHeader showBackButton>
        <PageHeading>
          {t('page.chainList.title', { count: list.length })}
        </PageHeading>
      </PageHeader>

      <PageBody>
        <Grid columns={'2'} gap={'2'} py={'3'}>
          {list.map((item) => {
            return (
              <Card key={item.id}>
                <Flex align={'center'} gap={'3'}>
                  <Avatar size={'1'} src={item.logo} fallback="A" />
                  <Tooltip content="Add to library">
                    <Text truncate size={'2'}>
                      {item.name}
                    </Text>
                  </Tooltip>
                </Flex>
              </Card>
            );
          })}
        </Grid>
      </PageBody>

      {/*<div className="page-chain-list">
        <PageHeader className="transparent-wrap" canBack={false} closeable fixed>
          {t('page.chainList.title', { count: list.length })}
        </PageHeader>

        <List list={list} />
      </div>*/}
    </PageContainer>
  );
};

export default ChainList;
