import React, { useState } from 'react';
import { Button } from 'antd';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import WelcomeHeaderImg from 'ui/assets/welcome-header.svg';
import WelcomeStep1 from 'ui/assets/welcome-step-1.png';
import WelcomeStep2 from 'ui/assets/welcome-step-2.png';

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
    margin-bottom: 45px;
  }
  .step-image {
    width: 317px;
    margin-left: auto;
    margin-right: auto;
    margin-bottom: 67px;
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
          <img className="step-image" src={WelcomeStep1} alt="" />
          <footer>
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
          <img className="step-image" src={WelcomeStep2} alt="" />
          <footer>
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
