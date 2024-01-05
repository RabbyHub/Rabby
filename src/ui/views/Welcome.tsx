import React, { useState } from 'react';
import { Button } from 'antd';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import WelcomeHeaderImg from 'ui/assets/welcome-header.svg';

const Container = styled.div`
  .step {
    padding: 42px 20px 32px 20px;
    background: var(--r-neutral-bg1);
  }
  .step-title {
    font-weight: 700;
    font-size: 22px;
    line-height: 24px;
    text-align: center;
    color: var(--r-neutral-title1);
    margin-bottom: 13px;
  }
  .step-content {
    font-weight: 400;
    font-size: 14px;
    line-height: 24px;
    text-align: center;
    color: var(--r-neutral-title1);
    margin-bottom: 48px;
  }
`;

const Welcome = () => {
  const { t } = useTranslation();
  const [step, setStep] = useState<1 | 2>(1);

  return (
    <Container className="h-full">
      <div className="header">
        <img src={WelcomeHeaderImg} alt="" />
      </div>
      {step === 1 ? (
        <section className="step">
          <div className="step-title">{t('page.welcome.step1.title')}</div>
          <div className="step-content">{t('page.welcome.step1.desc')}</div>
          <img
            src="/images/welcome-step-1.png"
            className="w-[317px] h-[199px] mx-auto rounded-[10px]"
          />
          <footer className="mt-[64px]">
            <Button
              type="primary"
              size="large"
              block
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
              <Button type="primary" size="large" block>
                {t('page.welcome.step2.btnText')}
              </Button>
            </Link>
          </footer>
        </section>
      )}
    </Container>
  );
};

export default Welcome;
