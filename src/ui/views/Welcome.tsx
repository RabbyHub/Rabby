import React, { useState } from 'react';
// import { Button } from 'antd';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import WelcomeHeaderImg from 'ui/assets/welcome-header.svg';
import { Box, Button, Card, Flex, Heading, Text } from '@radix-ui/themes';

const Container = styled.div`
  .step {
    padding: 42px 20px 32px 20px;
    //background: var(--r-neutral-bg1);
  }

  .step-title {
    font-weight: 700;
    font-size: 22px;
    line-height: 24px;
    text-align: center;
    //color: var(--r-neutral-title1);
    margin-bottom: 13px;
  }

  .step-content {
    font-weight: 400;
    font-size: 14px;
    line-height: 24px;
    text-align: center;
    //color: var(--r-neutral-title1);
    margin-bottom: 48px;
  }
`;

function OldWelcome() {
  const { t } = useTranslation();
  const [step, setStep] = useState<1 | 2>(1);

  return (
    <Container className="h-full">
      <div className={''}>
        <div className="header">
          <img src={WelcomeHeaderImg} alt="" />
        </div>
        {step === 1 ? (
          <section className="step">
            <div className="step-title">{t('page.welcome.step1.title')}</div>
            <div className="step-content">{t('page.welcome.step1.desc')}</div>

            <Heading>{t('page.welcome.step1.title')}</Heading>
            <div className="step-content">{t('page.welcome.step1.desc')}</div>
            <img
              src="/images/welcome-step-1.png"
              className="w-[317px] h-[199px] mx-auto rounded-[10px]"
            />
            <footer className="mt-[64px]">
              <Button
                // type="primary"
                // size="large"
                // block
                highContrast
                className={'cursor-pointer'}
                size={'4'}
                onClick={() => {
                  setStep(2);
                }}
              >
                {t('global.next')}
              </Button>
            </footer>
          </section>
        ) : (
          <section className="step">
            <div className="step-title">{t('page.welcome.step2.title')}</div>
            <div className="step-content">{t('page.welcome.step2.desc')}</div>
            <img
              src="/images/welcome-step-2.png"
              className="bg-r-neutral-card2 w-[317px] h-[199px] mx-auto rounded-[10px]"
            />
            <footer className="mt-[64px]">
              <Link to="/no-address" replace>
                <Button type="button" size="4">
                  {t('page.welcome.step2.btnText')}
                </Button>
              </Link>
            </footer>
          </section>
        )}
      </div>
    </Container>
  );
}

const Welcome = () => {
  const { t } = useTranslation();
  const [step, setStep] = useState<1 | 2>(1);

  return (
    <Flex
      className={'p-8'}
      direction={'row'}
      align={'center'}
      justify={'center'}
      height={'100dvh'}
      width={'100%'}
    >
      <Flex
        flexBasis={{ sm: '200px', lg: '40%' }}
        direction={'column'}
        align={'center'}
        width={'100%'}
        height={'100%'}
        justify={'center'}
        px={'3'}
        className={''}
      >
        <Heading size={'8'}>Welcome to WalletPro</Heading>
        <Text>The wallet made for humans</Text>
      </Flex>
      <Card asChild>
        <Flex
          align={'center'}
          justify={'center'}
          flexBasis={{ sm: '0', lg: '60%' }}
          width={'100%'}
          height={'100%'}
        >
          <Flex
            direction="column"
            align={'center'}
            justify={'center'}
            gap="3"
            height={'100%'}
            width={'100%'}
          >
            <div className={''}>
              {/*<div className="header">
                <img src={WelcomeHeaderImg} alt="" />
              </div>*/}
              {step === 1 ? (
                <Flex direction={'column'} gapY={'9'}>
                  <Box>
                    <Heading>
                      {'Get Started at the Click of a button' ||
                        t('page.welcome.step1.title')}
                    </Heading>
                    <Text>{t('page.welcome.step1.desc')}</Text>
                  </Box>
                  <Flex height={'400px'} py={'8'}>
                    <img
                      src="/images/welcome-step-1.png"
                      className="w-[317px] h-auto mx-auto rounded-[10px]"
                    />
                  </Flex>
                  <Button
                    highContrast
                    className={'cursor-pointer'}
                    size={'4'}
                    onClick={() => {
                      setStep(2);
                    }}
                  >
                    {t('global.next')}
                  </Button>
                </Flex>
              ) : (
                <Flex direction={'column'} gapY={'9'}>
                  <Box>
                    <Heading size={'6'} align={'center'}>
                      {t('page.welcome.step2.title')}
                    </Heading>
                    <Text>{t('page.welcome.step2.desc')}</Text>
                  </Box>
                  <Flex height={'400px'} py={'8'}>
                    <img
                      src="/images/welcome-step-2.png"
                      className="bg-r-neutral-card2 w-[317px] h-[199px] mx-auto rounded-[10px]"
                    />
                  </Flex>
                  <Link to="/no-address" replace>
                    <Button
                      highContrast
                      type="button"
                      size="4"
                      className={'w-full cursor-pointer'}
                    >
                      {t('page.welcome.step2.btnText')}
                    </Button>
                  </Link>
                </Flex>
              )}
            </div>
          </Flex>
        </Flex>
      </Card>
    </Flex>
  );
};

export default Welcome;
