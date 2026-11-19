import React, { useState } from 'react';
import { Button } from 'antd';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import WelcomeHeaderImg from 'ui/assets/welcome-header.svg';

const Welcome = () => {
  const { t } = useTranslation();
  const [step, setStep] = useState<1 | 2>(1);

  return (
    <div className="h-full">
      <div className="header">
        <img src={WelcomeHeaderImg} alt="" />
      </div>
      {step === 1 ? (
        <section className="step pt-[42px] px-20 pb-32 bg-r-neutral-bg1">
          <div className="step-title font-bold text-[22px] leading-[24px] text-center text-r-neutral-title1 mb-[13px]">
            {t('page.welcome.step1.title')}
          </div>
          <div className="step-content font-normal text-[14px] leading-[24px] text-center text-r-neutral-title1 mb-[48px]">
            {t('page.welcome.step1.desc')}
          </div>
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
        <section className="step pt-[42px] px-20 pb-32 bg-r-neutral-bg1">
          <div className="step-title font-bold text-[22px] leading-[24px] text-center text-r-neutral-title1 mb-[13px]">
            {t('page.welcome.step2.title')}
          </div>
          <div className="step-content font-normal text-[14px] leading-[24px] text-center text-r-neutral-title1 mb-[48px]">
            {t('page.welcome.step2.desc')}
          </div>
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
    </div>
  );
};

export default Welcome;
