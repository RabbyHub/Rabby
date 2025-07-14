import { useWallet } from 'ui/utils';
import { useTranslation } from 'react-i18next';
import React, { useState } from 'react';
import { useRabbyDispatch, useRabbySelector } from 'ui/store';
import {
  PageBody,
  PageContainer,
  PageHeader,
  PageHeading,
} from 'ui/component/PageContainer';
import { DARK_MODE_TYPE } from 'consts';
import { Flex, RadioCards, Text } from '@radix-ui/themes';
import { LucideCheck } from 'lucide-react';
import { toast } from 'sonner';

const useAutoLockOptions = () => {
  const { t } = useTranslation();
  return [
    {
      value: 0,
      label: t('page.dashboard.settings.lock.never'),
    },
    {
      value: 7 * 24 * 60,
      label: t('page.dashboard.settings.7Days'),
    },
    {
      value: 24 * 60,
      label: t('page.dashboard.settings.1Day'),
    },
    {
      value: 4 * 60,
      label: t('page.dashboard.settings.4Hours'),
    },
    {
      value: 60,
      label: t('page.dashboard.settings.1Hour'),
    },
    {
      value: 30,
      label: t('page.dashboard.settings.30Minutes'),
    },
    {
      value: 10,
      label: t('page.dashboard.settings.10Minutes'),
    },
    {
      value: 5,
      label: t('page.dashboard.settings.5Minutes'),
    },
  ];
};

const ChangeLockTime = () => {
  const wallet = useWallet();
  const { t } = useTranslation();
  const [isVisible, setIsVisible] = useState(false);
  const AUTO_LOCK_OPTIONS = useAutoLockOptions();
  const autoLockTime = useRabbySelector(
    (state) => state.preference.autoLockTime || 0
  );
  const dispatch = useRabbyDispatch();

  const handleSelect = async (value: number) => {
    dispatch.preference.setAutoLockTime(value);
    toast(`Wallet will auto lock in ${value} minutes`);
  };

  return (
    <PageContainer>
      <PageHeader showBackButton>
        <PageHeading>{t('page.dashboard.settings.autoLockTime')}</PageHeading>
      </PageHeader>

      <PageBody>
        <Flex direction={'column'} gap={'2'}>
          <RadioCards.Root
            color={'grass'}
            columns={{ initial: '2', sm: '2' }}
            defaultValue={autoLockTime.toString()}
            size="2"
            onValueChange={(value) =>
              handleSelect((value as unknown) as number)
            }
          >
            {AUTO_LOCK_OPTIONS.map((item) => {
              return (
                <RadioCards.Item key={item.value} value={item.value.toString()}>
                  <Flex
                    direction="row"
                    align={'center'}
                    justify={'between'}
                    width="100%"
                  >
                    <Text weight="bold">{item.label}</Text>
                    <Text color={'grass'}>
                      {autoLockTime.toString() === item.value.toString() && (
                        <LucideCheck size={16} />
                      )}
                    </Text>
                  </Flex>
                </RadioCards.Item>
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
          {t('page.dashboard.settings.autoLockTime')}
        </PageHeader>
        <div className="auto-lock-option-list">
          {AUTO_LOCK_OPTIONS.map((item) => {
            return (
              <div
                className="auto-lock-option-list-item"
                key={item.value}
                onClick={() => {
                  handleSelect(item.value);
                }}
              >
                {item.label}
                {autoLockTime === item.value && (
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

export default ChangeLockTime;
