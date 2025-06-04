import React, { useState } from 'react';
import clsx from 'clsx';
import { useHistory, useLocation } from 'react-router-dom';
// import { Card } from '@/ui/component/NewUserImport';
import { ReactComponent as RcIconArrowDownCC } from '@/ui/assets/new-user-import/arrow-down-cc.svg';
import {
  BRAND_ALIAN_TYPE_TEXT,
  KEYRING_CLASS,
  KEYRING_ICONS,
  KEYRING_TYPE,
  WALLET_BRAND_CONTENT,
  WALLET_BRAND_TYPES,
} from '@/constant';
import { Item } from '@/ui/component';
import { useTranslation } from 'react-i18next';
import { Tooltip } from 'antd';
import qs from 'qs';
import {
  Avatar,
  Box,
  Button,
  Card,
  Flex,
  IconButton,
  Text,
} from '@radix-ui/themes';
import {
  LucideArrowLeft,
  LucideChevronDown,
  LucideChevronUp,
  LucideLockKeyhole,
  LucideTextQuote,
} from 'lucide-react';
import {
  CardContainer,
  CardHeader,
  CardHeading,
} from 'ui/component/CardContainer';

export const ImportWalletList = () => {
  const { t } = useTranslation();
  const history = useHistory();

  const [showMore, setShowMore] = useState(false);

  const tipList = React.useMemo(
    () =>
      [
        {
          type: KEYRING_TYPE.HdKeyring,
          // logo: KEYRING_ICONS[KEYRING_TYPE.HdKeyring],
          logo: <LucideTextQuote />,
          useIcon: true,
        },
        {
          type: KEYRING_TYPE.SimpleKeyring,
          // logo: KEYRING_ICONS[KEYRING_TYPE.SimpleKeyring],
          logo: <LucideLockKeyhole />,
          useIcon: true,
        },
        {
          type: KEYRING_CLASS.HARDWARE.LEDGER,
          logo: WALLET_BRAND_CONTENT[WALLET_BRAND_TYPES.LEDGER].icon,
          preventClick:
            WALLET_BRAND_CONTENT[WALLET_BRAND_TYPES.LEDGER].preventClick,
          tipI18nKey:
            WALLET_BRAND_CONTENT[WALLET_BRAND_TYPES.LEDGER].tipI18nKey,
        },
        {
          type: KEYRING_CLASS.HARDWARE.TREZOR,
          logo: WALLET_BRAND_CONTENT[WALLET_BRAND_TYPES.TREZOR].icon,
        },
        {
          type: KEYRING_CLASS.HARDWARE.ONEKEY,
          logo: WALLET_BRAND_CONTENT[WALLET_BRAND_TYPES.ONEKEY].icon,
        },
        {
          type: KEYRING_CLASS.HARDWARE.KEYSTONE,
          logo: WALLET_BRAND_CONTENT[WALLET_BRAND_TYPES.KEYSTONE].icon,
          brand: WALLET_BRAND_CONTENT[WALLET_BRAND_TYPES.KEYSTONE].brand,
        },
        {
          type: KEYRING_CLASS.HARDWARE.GRIDPLUS,
          logo: WALLET_BRAND_CONTENT[WALLET_BRAND_TYPES.GRIDPLUS].icon,
        },
        {
          type: KEYRING_CLASS.HARDWARE.BITBOX02,
          logo: WALLET_BRAND_CONTENT[WALLET_BRAND_TYPES.BITBOX02].icon,
        },
        {
          type: KEYRING_CLASS.GNOSIS,
          logo: WALLET_BRAND_CONTENT[WALLET_BRAND_TYPES.GNOSIS].icon,
        },
        {
          type: KEYRING_CLASS.HARDWARE.KEYSTONE,
          logo: WALLET_BRAND_CONTENT[WALLET_BRAND_TYPES.NGRAVEZERO].icon,
          brand: WALLET_BRAND_CONTENT[WALLET_BRAND_TYPES.NGRAVEZERO].brand,
        },
      ].slice(0, !showMore ? 2 : undefined),
    [showMore]
  );

  const gotoImport = (
    type: typeof tipList[number]['type'],
    brand?: typeof tipList[number]['brand']
  ) => {
    switch (type) {
      case KEYRING_TYPE.SimpleKeyring:
        history.push('/new-user/import/private-key');
        break;
      case KEYRING_TYPE.HdKeyring:
        history.push('/new-user/import/seed-phrase');
        break;
      case KEYRING_CLASS.HARDWARE.LEDGER:
      case KEYRING_CLASS.HARDWARE.KEYSTONE:
      case KEYRING_CLASS.HARDWARE.ONEKEY:
      case KEYRING_CLASS.HARDWARE.TREZOR:
      case KEYRING_CLASS.HARDWARE.GRIDPLUS:
      case KEYRING_CLASS.HARDWARE.BITBOX02:
        history.push({
          pathname: `/new-user/import/${type}/set-password`,
          search: qs.stringify({
            brand,
          }),
        });
        break;
      case KEYRING_CLASS.GNOSIS:
        history.push('/new-user/import/gnosis-address');
        break;
      default:
        history.push('/new-user/import/seed-phrase');
        break;
    }
  };

  return (
    <>
      <CardContainer>
        <CardHeader showBackButton>
          <CardHeading>{t('page.newUserImport.importList.title')}</CardHeading>
        </CardHeader>
        <Flex direction={'column'} gap={'3'} width={'100%'}>
          {tipList.map((item, index) => {
            return (
              <Card
                key={item.type + index}
                className={'w-full bg-orange cursor-pointer'}
                size={'2'}
                onClick={() => {
                  if (item.preventClick) {
                    return;
                  }
                  gotoImport(item.type, item.brand);
                }}
              >
                <Flex gap="3" align="center">
                  {item.useIcon ? (
                    item.logo
                  ) : (
                    <Avatar
                      size="2"
                      src={item.logo as string}
                      radius="full"
                      fallback=""
                    />
                  )}
                  <Box>
                    <Text as="div" size="2" weight="bold">
                      From {item.brand || BRAND_ALIAN_TYPE_TEXT[item.type]}
                    </Text>
                    <Text as="div" size="2" color="gray">
                      {item.type}
                    </Text>
                  </Box>
                </Flex>
              </Card>
            );
          })}
        </Flex>

        {/*{!showMore && (
          <Flex align={'center'} justify={'center'} gap={'2'}>
            <Button
              className={'cursor-pointer'}
              radius={'large'}
              variant={'soft'}
              onClick={() => {
                setShowMore(true);
              }}
            >
              More
              <LucideChevronDown size={16} />
            </Button>
          </Flex>
        )}
        {showMore && (
          <Flex align={'center'} justify={'center'} gap={'2'}>
            <Button
              className={'cursor-pointer'}
              radius={'large'}
              variant={'soft'}
              onClick={() => {
                setShowMore(false);
              }}
            >
              Less
              <LucideChevronUp size={16} />
            </Button>
          </Flex>
        )}*/}
      </CardContainer>
      {/*<Card
        className="relative"
        onBack={() => {
          if (history.length) {
            history.goBack();
          } else {
            history.replace('/new-user/guide');
          }
        }}
        title={t('page.newUserImport.importList.title')}
      >
        <div className="mt-24 flex flex-col items-center justify-center gap-16">
          {tipList.map((item, index) => {
            return (
              <Tooltip
                title={item.tipI18nKey ? t(item.tipI18nKey) : undefined}
                key={item.type + index}
                overlayClassName="rectangle"
              >
                <Item
                  key={item.type + index}
                  bgColor="var(--r-neutral-card2, #F2F4F7)"
                  px={16}
                  py={20}
                  leftIcon={item.logo}
                  leftIconClassName="w-24 h-24 mr-12"
                  disabled={item.preventClick}
                  onClick={() => {
                    if (item.preventClick) {
                      return;
                    }
                    gotoImport(item.type, item.brand);
                  }}
                  className="rounded-[8px] text-[17px] font-medium text-r-neutral-title1"
                >
                  {item.brand || BRAND_ALIAN_TYPE_TEXT[item.type]}
                </Item>
              </Tooltip>
            );
          })}
        </div>
        {!showMore && (
          <div
            onClick={() => {
              setShowMore(true);
            }}
            className={clsx(
              'absolute left-1/2 bottom-24 transform -translate-x-1/2',
              'flex justify-center items-center gap-2',
              'cursor-pointer',
              'text-13 text-r-neutral-foot'
            )}
          >
            <span>More</span>
            <RcIconArrowDownCC
              className="w-[12px] h-[12px]"
              viewBox="0 0 12 12"
            />
          </div>
        )}
      </Card>*/}
    </>
  );
};
