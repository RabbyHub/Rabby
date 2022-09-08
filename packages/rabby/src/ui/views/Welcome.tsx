import React from 'react';
import { Button } from 'antd';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const Welcome = () => {
  const { t } = useTranslation();
  return (
    <div
      className="h-full pt-[482px] relative welcome"
      style={{
        backgroundImage:
          'linear-gradient(101.58deg, #8BB2FF 1.04%, #7A7CFF 90.78%)',
      }}
    >
      <img
        className="absolute top-[95px] select-none left-[31px] bg-no-repeat bg-cover w-[337px] h-[344px]"
        src="./images/welcome-image.svg"
      />
      <Link to="/password" replace>
        <Button
          size="large"
          className="w-[288px] h-[48px] block mx-auto text-blue-light bg-white border-none"
        >
          {t('Get Started')}
        </Button>
      </Link>
    </div>
  );
};

export default Welcome;
