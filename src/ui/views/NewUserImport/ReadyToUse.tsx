import React from 'react';
// import { Card } from '@/ui/component/NewUserImport';
import clsx from 'clsx';
import { useHistory } from 'react-router-dom';
import { Trans, useTranslation } from 'react-i18next';
import { ReactComponent as RcIconRabbyLogo } from '@/ui/assets/rabby-white.svg';
import { ReactComponent as RcIconExtension } from '@/ui/assets/new-user-import/extension.svg';
import { ReactComponent as RcIconPin } from '@/ui/assets/new-user-import/pin.svg';
import { ReactComponent as RcIconTriangle } from '@/ui/assets/new-user-import/triangle.svg';
import {
  CardBody,
  CardContainer,
  CardHeader,
  CardHeading,
} from 'ui/component/CardContainer';
import { Avatar, Button, Card, Flex, Heading, Text } from '@radix-ui/themes';
import { LucidePin, LucidePuzzle } from 'lucide-react';

export const ReadyToUse = () => {
  const { t } = useTranslation();
  const history = useHistory();

  return (
    <>
      <Card className={'fixed top-[23px] right-[80px] bg-grassA5'}>
        <RcIconTriangle className="absolute top-[-12px] right-[22px]" />
        <Flex align={'center'} gap={'8'}>
          <Flex direction={'column'} gap={'2'}>
            <span className="text-15 font-medium text-r-neutral-title1">
              {t('page.newUserImport.readyToUse.toPin')}
            </span>
            <Flex align={'center'} justify={'center'} gap={'2'}>
              <Trans t={t} i18nKey="page.newUserImport.readyToUse.extensionTip">
                Click
                <LucidePuzzle size={16} /> at the top right corner and then
                <LucidePin size={16} />
              </Trans>
            </Flex>
          </Flex>
        </Flex>
      </Card>

      <CardContainer className={'overflow-auto relative'}>
        {/*<CardHeader showBackButton={false} onPress={history.goBack}>*/}
        {/*  /!*<CardDescription>*!/*/}
        {/*  /!*  {t('page.newUserImport.PasswordCard.desc')}*!/*/}
        {/*  /!*</CardDescription>*!/*/}
        {/*</CardHeader>*/}
        <CardBody>
          <Flex direction={'column'} align={'center'} mt={'32'} gapY={'8'}>
            <Avatar size="8" fallback="" radius={'full'} />
            <Flex
              direction={'column'}
              align={'center'}
              justify={'center'}
              gapY={'4'}
              height={'100%'}
              width={'100%'}
            >
              <Heading align={'center'} size={'7'}>
                {t('page.newUserImport.readyToUse.title')}
              </Heading>
              <Text align={'center'}>
                {t('page.newUserImport.readyToUse.desc')}
              </Text>
            </Flex>

            {/* TODO: Make this button click open the wallet extension popup */}
            <Button highContrast className={'cursor-pointer'} size={'3'}>
              Get Started
            </Button>

            <Card className={'hidden'}>
              <Flex align={'center'} gap={'8'}>
                <Flex direction={'column'} gap={'2'}>
                  <Flex align={'center'} justify={'center'} gap={'2'}>
                    <Trans
                      t={t}
                      i18nKey="page.newUserImport.readyToUse.extensionTipExtended"
                    >
                      Click
                      <LucidePuzzle size={16} /> at the top right corner and
                      then
                      <LucidePin size={16} />
                    </Trans>
                  </Flex>
                </Flex>
              </Flex>
            </Card>
          </Flex>

          {/*<div
            className={clsx(
              'fixed top-[23px] right-[80px]',
              'w-[205px] h-[60px]',
              'py-12 px-16',
              'bg-r-neutral-card-1 rounded-[12px]'
            )}
          >
            <RcIconTriangle className="absolute top-[-12px] right-[22px]" />
            <div className="flex items-center gap-8">
              <div className="w-32 h-32 flex items-center justify-center bg-r-blue-default rounded-full">
                <RcIconRabbyLogo
                  viewBox="0 0 14 14"
                  className="w-[20px] h-[20px]"
                />
              </div>

              <div className="flex flex-col gap-2">
                <span className="text-15 font-medium text-r-neutral-title1">
                  {t('page.newUserImport.readyToUse.pin')}
                </span>
                <div className="flex items-center justify-center gap-4">
                  <Trans
                    t={t}
                    i18nKey="page.newUserImport.readyToUse.extensionTip"
                  >
                    Click
                    <RcIconExtension />
                    adn then
                    <RcIconPin />
                  </Trans>
                </div>
              </div>
            </div>
          </div>*/}
        </CardBody>
      </CardContainer>

      {/*<Card onBack={history.goBack}>
        <div className="flex flex-col items-center">
          <div className="mt-[82px] w-80 h-80 flex items-center justify-center bg-r-blue-default rounded-full">
            <RcIconRabbyLogo
              viewBox="0 0 14 14"
              className="w-[52px] h-[46px]"
            />
          </div>
          <div className="mt-32 mb-12 text-24 font-medium text-r-neutral-title1">
            {t('page.newUserImport.readyToUse.title')}
          </div>
          <div className="max-w-[320px] text-14 font-normal text-r-neutral-foot text-center">
            {t('page.newUserImport.readyToUse.desc')}
          </div>
        </div>

        <div
          className={clsx(
            'fixed top-[23px] right-[80px]',
            'w-[205px] h-[60px]',
            'py-12 px-16',
            'bg-r-neutral-card-1 rounded-[12px]'
          )}
        >
          <RcIconTriangle className="absolute top-[-12px] right-[22px]" />
          <div className="flex items-center gap-8">
            <div className="w-32 h-32 flex items-center justify-center bg-r-blue-default rounded-full">
              <RcIconRabbyLogo
                viewBox="0 0 14 14"
                className="w-[20px] h-[20px]"
              />
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-15 font-medium text-r-neutral-title1">
                {t('page.newUserImport.readyToUse.pin')}
              </span>
              <div className="flex items-center justify-center gap-4">
                <Trans
                  t={t}
                  i18nKey="page.newUserImport.readyToUse.extensionTip"
                >
                  Click
                  <RcIconExtension />
                  adn then
                  <RcIconPin />
                </Trans>
              </div>
            </div>
          </div>
        </div>
      </Card>*/}
    </>
  );
};
