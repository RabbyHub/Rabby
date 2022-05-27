import React from 'react';
import { Button } from 'antd';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const Welcome = () => {
  const { t } = useTranslation();
  return (
    <div
      className="h-full pt-[482px] relative"
      style={{ backgroundColor: '#FFD523' }}
    >
      <img
        className="absolute top-[95px] select-none left-[31px] bg-no-repeat bg-cover w-[337px] h-[344px]"
        src="./images/welcome-image.svg"
      />
      <Link to="/password" replace>
        <Button
          size="large"
          className="w-[288px] h-[48px] block rounded-full mx-auto text-black bg-white text-12 border-none focus:bg-yellow-light"
        >
          {t('Get Started')}
        </Button>
      </Link>
    </div>
  );
};

export default Welcome;
