import { useWallet } from 'ui/utils';
import { useTranslation } from 'react-i18next';
import React, { useEffect, useState } from 'react';
import { useRabbyDispatch, useRabbySelector } from 'ui/store';
import clsx from 'clsx';
// import { PageHeader } from 'ui/component';
import { LANGS } from 'consts';
import IconCheck from 'ui/assets/check-2.svg';
import {
  PageBody,
  PageContainer,
  PageHeader,
  PageHeading,
} from '@/ui/component/PageContainer';
import { Card, Flex, RadioCards, Text } from '@radix-ui/themes';
import { LucideCheck, LucideCheckSquare } from 'lucide-react';

const ChangeLanguage = () => {
  const wallet = useWallet();
  const { t } = useTranslation();
  const [isVisible, setIsVisible] = useState(false);

  const locale = useRabbySelector((state) => state.preference.locale);
  const dispatch = useRabbyDispatch();

  /*const handleCancel = () => {
    setIsVisible(false);
    setTimeout(() => {
      onCancel();
    }, 500);
  };*/

  const handleSelect = async (value: string) => {
    dispatch.preference.switchLocale(value);
    /*setIsVisible(false);
    setTimeout(() => {
      onFinish();
    }, 500);*/
  };

  /*useEffect(() => {
    setTimeout(() => {
      setIsVisible(visible);
    }, 100);
  }, [visible]);*/

  return (
    <PageContainer>
      <PageHeader showBackButton>
        <PageHeading>
          {t('page.dashboard.settings.settings.currentLanguage')}
        </PageHeading>
      </PageHeader>
      <PageBody>
        <Flex direction={'column'} gap={'2'}>
          <RadioCards.Root
            color={'grass'}
            columns={{ initial: '2', sm: '2' }}
            defaultValue={locale}
            size="2"
            onValueChange={handleSelect}
          >
            {LANGS.map((item) => {
              return (
                <RadioCards.Item
                  key={item.code}
                  value={item.code}
                  // onChange={() => {
                  //   handleSelect(item.code);
                  // }}
                >
                  <Flex
                    direction="row"
                    align={'center'}
                    justify={'between'}
                    width="100%"
                  >
                    <Text weight="bold">{item.name}</Text>
                    <Text color={'grass'}>
                      {locale === item.code && <LucideCheck size={16} />}
                    </Text>
                  </Flex>
                </RadioCards.Item>

                /*<Card
                key={item.code}
                className={'cursor-pointer hover:bg-blackA10'}
                onClick={() => {
                  handleSelect(item.code);
                }}
              >
                {item.name}
                {locale === item.code && (
                  <img
                    src={IconCheck}
                    alt=""
                    className="auto-lock-option-list-item-icon"
                  />
                )}
              </Card>*/
              );
            })}
          </RadioCards.Root>
        </Flex>
      </PageBody>

      {/*<div
        className={clsx('auto-lock-modal', {
          show: isVisible,
          hidden: !visible,
        })}
      >
        <PageHeader forceShowBack onBack={handleCancel}>
          {t('page.dashboard.settings.settings.currentLanguage')}
        </PageHeader>
        <div className="auto-lock-option-list">
          {LANGS.map((item) => {
            return (
              <div
                className="auto-lock-option-list-item"
                key={item.code}
                onClick={() => {
                  handleSelect(item.code);
                }}
              >
                {item.name}
                {locale === item.code && (
                  <img
                    src={IconCheck}
                    alt=""
                    className="auto-lock-option-list-item-icon"
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>*/}
    </PageContainer>
  );
};

export default ChangeLanguage;
