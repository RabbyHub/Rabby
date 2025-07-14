import React, { useEffect, useState } from 'react';
import { useWallet } from 'ui/utils';
import { useTranslation } from 'react-i18next';
// import { Button, message } from 'antd';
import IconSuccess from 'ui/assets/success.svg';
import clsx from 'clsx';
// import { Checkbox, PageHeader } from 'ui/component';
import {
  PageBody,
  PageContainer,
  PageHeader,
  PageHeading,
} from 'ui/component/PageContainer';
import {
  Blockquote,
  Button,
  Callout,
  Card,
  Checkbox,
  Flex,
  Heading,
  Text,
} from '@radix-ui/themes';
import { LucideInfo } from 'lucide-react';
import { toast } from 'sonner';

const ResetAccount = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [clearNonce, setClearNonce] = useState(false);
  const wallet = useWallet();
  const { t } = useTranslation();

  const handleCancel = () => {
    setIsVisible(false);
    setClearNonce(false);
    /* setTimeout(() => {
      onCancel();
    }, 500);*/
  };

  const handleResetAccount = async () => {
    const currentAddress = (await wallet.getCurrentAccount())?.address || '';
    await wallet.clearAddressPendingTransactions(currentAddress);
    if (clearNonce) {
      await wallet.clearAddressTransactions(currentAddress);
    }
    /*message.success({
      icon: <img src={IconSuccess} className="icon icon-success" />,
      content: t('page.dashboard.settings.pendingTransactionCleared'),
      duration: 1,
    });*/
    toast.success(t('page.dashboard.settings.pendingTransactionCleared'));
    setIsVisible(false);
    /*setTimeout(() => {
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
        <PageHeading>{t('page.dashboard.settings.clearPending')}</PageHeading>
      </PageHeader>

      <PageBody>
        <Flex direction={'column'} gap={'6'}>
          <ol type={'1'}>
            <Flex direction={'column'} gap={'5'}>
              <li>
                <Text size={'3'} weight={'medium'}>
                  If you need to remove pending transactions from your wallet,
                  {/*{t('page.dashboard.settings.clearPendingTip1')}*/}
                </Text>
              </li>
              <li>
                <Text size={'3'} weight={'medium'}>
                  If you have long pending durations on any network in your
                  wallet.
                  {/*{t('page.dashboard.settings.clearPendingTip1')}*/}
                </Text>
              </li>
            </Flex>
          </ol>

          <Flex direction={'column'} gap={'2'}>
            <Heading size={'3'}>Kindly note:</Heading>
            <Callout.Root highContrast variant={'soft'}>
              <Callout.Text size={'2'}>
                {t('page.dashboard.settings.clearPendingTip2')}
              </Callout.Text>
            </Callout.Root>
            <Callout.Root highContrast variant={'soft'}>
              <Callout.Text size={'2'}>
                {t('page.dashboard.settings.clearPendingWarningTip')}
              </Callout.Text>
            </Callout.Root>
          </Flex>
        </Flex>
      </PageBody>

      <Flex direction={'column'} gap={'4'} p={'4'}>
        <Text as="label" size="2">
          <Flex gap="2">
            <Checkbox
              checked={clearNonce}
              color={'grass'}
              onCheckedChange={() => setClearNonce(!clearNonce)}
            />
            Reset my local nonce data and signature record
          </Flex>
        </Text>

        <Button highContrast size={'3'} onClick={handleResetAccount}>
          {t('global.confirm')}
        </Button>
      </Flex>

      {/*<div
        className={clsx('reset-account-modal', {
          show: isVisible,
          hidden: !visible,
        })}
      >
        <PageHeader forceShowBack onBack={handleCancel}>
          {t('page.dashboard.settings.clearPending')}
        </PageHeader>
        <div>
          <p className="reset-account-content mb-16">
            {t('page.dashboard.settings.clearPendingTip1')}
          </p>
          <p className="reset-account-content">
            {t('page.dashboard.settings.clearPendingTip2')}
          </p>
          <div className="flex items-start gap-[4px] p-[10px] bg-r-red-light rounded-[6px] mt-[20px]">
            <div className="text-r-red-default pt-[2px]">
              <RcIconWarning />
            </div>
            <div className="text-r-red-default text-[13px] leading-[16px] font-medium">
              {t('page.dashboard.settings.clearPendingWarningTip')}
            </div>
          </div>
          <div className="flex flex-col mt-auto popup-footer px-20 bottom-18">
            <div className="absolute left-0 top-[40px] w-full h-0 border-solid border-t-[0.5px] border-rabby-neutral-line"></div>
            <div className="flex justify-center mb-[38px]">
              <Checkbox
                checked={clearNonce}
                unCheckBackground="transparent"
                checkIcon={
                  clearNonce ? undefined : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                    >
                      <path
                        d="M7.97578 13.7748C11.179 13.7748 13.7758 11.1781 13.7758 7.9748C13.7758 4.77155 11.179 2.1748 7.97578 2.1748C4.77253 2.1748 2.17578 4.77155 2.17578 7.9748C2.17578 11.1781 4.77253 13.7748 7.97578 13.7748Z"
                        stroke="var(--r-neutral-body)"
                        stroke-width="0.90625"
                        stroke-miterlimit="10"
                      />
                    </svg>
                  )
                }
                onChange={setClearNonce}
              >
                <span className="text-13 text-r-neutral-body">
                  Also reset my local nonce data and signature record
                </span>
              </Checkbox>
            </div>

            <Button
              type="primary"
              size="large"
              block
              onClick={handleResetAccount}
            >
              {t('global.confirm')}
            </Button>
          </div>
        </div>
      </div>*/}
    </PageContainer>
  );
};

export default ResetAccount;
