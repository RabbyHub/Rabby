import { useThemeMode } from '@/ui/hooks/usePreference';
import { useMemoizedFn, useRequest } from 'ahooks';
// import { message, Switch } from 'antd';
import { ConnectedSite } from 'background/service/permission';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { ReactComponent as RcIconRight } from 'ui/assets/arrow-right-cc.svg';
import IconMetamaskModeDark from 'ui/assets/metamask-mode-dapps/icon-metamask-mode-dark.svg';
import IconMetamaskMode from 'ui/assets/metamask-mode-dapps/icon-metamask-mode.svg';
import { ReactComponent as RcIconDown } from 'ui/assets/metamask-mode-dapps/arrow-down-2-cc.svg';
// import { Empty, FallbackSiteLogo, PageHeader } from 'ui/component';
import { getCurrentTab, useWallet } from 'ui/utils';
import { Link } from 'react-router-dom';
import './style.less';
import { getOriginFromUrl } from '@/utils';
import clsx from 'clsx';
import IconDapps from 'ui/assets/dapps.svg';
import {
  PageBody,
  PageContainer,
  PageHeader,
  PageHeading,
} from 'ui/component/PageContainer';
import {
  Box,
  Button,
  Callout,
  Card,
  Flex,
  Heading,
  Switch,
  Text,
} from '@radix-ui/themes';
import { LucideBlocks, LucideChevronRight, LucideInfo } from 'lucide-react';
import { FallbackSiteLogo } from '@/ui/component';
import { toast } from 'sonner';

export const MetamaskModeDappsGuide = () => {
  const wallet = useWallet();
  const { t } = useTranslation();
  const { isDarkTheme } = useThemeMode();

  const { data: site, mutate, runAsync } = useRequest(async () => {
    const tab = await getCurrentTab();
    if (!tab.id || !tab.url) return;
    const domain = getOriginFromUrl(tab.url);
    const current = await wallet.getCurrentSite(tab.id, domain);
    return current;
  });

  console.log(site);

  const handleChangeMetamaskMode = useMemoizedFn(async (v) => {
    if (!site) {
      return;
    }
    if (v) {
      await wallet.addMetamaskModeSite(site);
      /*message.success(
        <div className="text-r-neutral-title2 text-[13px] leading-[16px]">
          {t('page.metamaskModeDappsGuide.toast.enabled')}
        </div>
      );*/
      toast.success(t('page.metamaskModeDappsGuide.toast.enabled'));
    } else {
      await wallet.removeMetamaskModeSite(site);
      /*message.success(
        <div className="text-r-neutral-title2 text-[13px] leading-[16px]">
          {t('page.metamaskModeDappsGuide.toast.disabled')}
        </div>
      );*/
      toast(t('page.metamaskModeDappsGuide.toast.disabled'));
    }
    mutate((pre) => {
      if (!pre) {
        return pre;
      }
      return {
        ...pre,
        isMetamaskMode: v,
      };
    });
    runAsync();
  });

  return (
    <PageContainer>
      <PageHeader showBackButton>
        <PageHeading>{t('page.metamaskModeDappsGuide.title')}</PageHeading>
      </PageHeader>

      <PageBody>
        <Callout.Root color="gray" variant="soft" highContrast>
          <Callout.Icon>
            <LucideInfo size={16} />
          </Callout.Icon>
          <Callout.Text>{t('page.metamaskModeDappsGuide.alert')}</Callout.Text>
        </Callout.Root>

        <Flex direction={'column'} gap={'5'}>
          <Flex direction={'column'} gap={'4'} py={'5'}>
            <Text>
              <Heading size={'4'}>
                {t('page.metamaskModeDappsGuide.step1')}
              </Heading>
              <Text size={'2'}>
                {t('page.metamaskModeDappsGuide.step1Desc')}
              </Text>
            </Text>

            <Box>
              {site ? (
                <Card size={'2'}>
                  <Flex align={'center'} justify={'between'}>
                    <Flex align={'center'} gap={'2'}>
                      <FallbackSiteLogo
                        url={site.icon}
                        origin={site.origin}
                        width="24px"
                        className=""
                      />
                      <Text size={'2'} weight={'medium'}>
                        {site.origin}
                      </Text>
                    </Flex>
                    <Switch
                      checked={site.isMetamaskMode}
                      color={'grass'}
                      onCheckedChange={handleChangeMetamaskMode}
                    ></Switch>
                  </Flex>
                </Card>
              ) : (
                <Card size={'2'}>
                  <Flex align={'center'} gap={'3'}>
                    <LucideBlocks size={20} />
                    <Text size={'2'} weight={'medium'}>
                      {t('page.metamaskModeDappsGuide.noDappFound')}
                    </Text>
                  </Flex>
                </Card>
              )}
            </Box>
          </Flex>

          <Flex direction={'column'}>
            <Text>
              <Heading size={'4'}>
                {t('page.metamaskModeDappsGuide.step2')}
              </Heading>
              <Text size={'2'}>
                {t('page.metamaskModeDappsGuide.step2Desc')}
              </Text>
            </Text>
          </Flex>
        </Flex>
      </PageBody>

      <Flex width="100%" justify="center" p={'5'}>
        <Link to="/metamask-mode-dapps/list">
          <Button color={'gray'} radius={'large'} variant={'soft'}>
            {t('page.metamaskModeDappsGuide.manage')}
            <LucideChevronRight size={16} />
          </Button>
        </Link>
      </Flex>

      {/*<div className="page-metamask-mode-dapps-guide pb-[24px]">
        <header className="header mb-[15px]">
          <PageHeader canBack={false} closeable>
            <div className="text-[15px] font-medium leading-[18px] text-r-neutral-title1">
              {t('page.metamaskModeDappsGuide.title')}
            </div>
          </PageHeader>
        </header>
        <main className="flex-1">
          <div className="text-[16px] leading-[22px] font-medium text-r-neutral-title1 mb-[20px]">
            {t('page.metamaskModeDappsGuide.alert')}
          </div>
          <div className="bg-r-neutral-card-1 rounded-[8px] p-[12px]">
            <div className="mb-[8px]">
              <div className="text-r-neutral-title1 text-[15px] leading-[18px] font-medium mb-[6px]">
                {t('page.metamaskModeDappsGuide.step1')}
              </div>
              <div className="text-[12px] leading-[14px] text-r-neutral-body">
                {t('page.metamaskModeDappsGuide.step1Desc')}
              </div>
              {site ? (
                <div
                  className={clsx(
                    'flex items-center gap-[8px]',
                    'px-[16px] py-[12px] mt-[12px] mb-[16px] rounded-[6px]',
                    'bg-r-neutral-card-2'
                  )}
                >
                  <FallbackSiteLogo
                    url={site.icon}
                    origin={site.origin}
                    width="24px"
                    className=""
                  ></FallbackSiteLogo>
                  <div className="min-w-0">
                    <div className="text-r-neutral-title-1 text-[13px] leading-[16px] font-medium truncate">
                      {site.origin}
                    </div>
                  </div>
                  <div className="ml-auto">
                    <Switch
                      checked={site.isMetamaskMode}
                      onChange={handleChangeMetamaskMode}
                    ></Switch>
                  </div>
                </div>
              ) : (
                <div
                  className={clsx(
                    'flex items-center gap-[8px] h-[56px]',
                    'px-[16px] py-[12px] mt-[12px] mb-[16px] rounded-[6px]',
                    'bg-r-neutral-card-2'
                  )}
                >
                  <img src={IconDapps} className="w-[20px] h-[20px]" alt="" />
                  <div className="text-r-neutral-foot text-[13px] leading-[16px] font-medium">
                    {t('page.metamaskModeDappsGuide.noDappFound')}
                  </div>
                </div>
              )}
              <div className="flex items-center justify-center text-r-neutral-line">
                <RcIconDown />
              </div>
            </div>
            <div>
              <div className="text-r-neutral-title1 text-[15px] leading-[18px] font-medium mb-[6px]">
                {t('page.metamaskModeDappsGuide.step2')}
              </div>
              <div className="text-[12px] leading-[14px] text-r-neutral-body">
                {t('page.metamaskModeDappsGuide.step2Desc')}
              </div>
              <div className="flex items-center justify-center pt-[16px] pb-[36px]">
                <img
                  src={isDarkTheme ? IconMetamaskModeDark : IconMetamaskMode}
                  alt=""
                />
              </div>
            </div>
          </div>
        </main>
        <footer>
          <Link
            to="/metamask-mode-dapps/list"
            className="text-r-neutral-foot text-[13px] leading-[16px] flex items-center justify-center"
          >
            {t('page.metamaskModeDappsGuide.manage')}
            <RcIconRight viewBox="0 0 20 20" className="w-[16px] h-[16px]" />
          </Link>
        </footer>
      </div>*/}
    </PageContainer>
  );
};
