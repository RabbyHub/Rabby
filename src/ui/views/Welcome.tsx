import React from 'react';
import { Button } from 'antd';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ImgWelcome } from 'ui/assets';

const Welcome = () => {
  const { t } = useTranslation();
  return (
    <div
      className="h-full pt-[482px] relative"
      style={{
        backgroundImage:
          'linear-gradient(101.58deg, #8BB2FF 1.04%, #7A7CFF 90.78%)',
      }}
    >
      <div
        className="absolute top-[95px] left-[31px] bg-no-repeat bg-cover w-[337px] h-[337px]"
        style={{ backgroundImage: `url(${ImgWelcome})` }}
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
