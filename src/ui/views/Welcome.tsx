import React from 'react';
import { Button } from 'antd';
import { Link } from 'react-router-dom';
import { ImgUnlock } from 'ui/assets';

const Welcome = () => {
  return (
    <div
      className="h-full pt-[95px]"
      style={{
        backgroundImage:
          'linear-gradient(101.58deg, #8BB2FF 1.04%, #7A7CFF 90.78%)',
      }}
    >
      <div
        className="bg-center bg h-[400px] pt-[304px] text-center text-white text-20 bg-no-repeat"
        style={{ backgroundImage: `url(${ImgUnlock})` }}
      >
        A browser plugin for DeFi users
      </div>
      <Link to="/password">
        <Button
          size="large"
          className="w-[288px] block mx-auto text-blue bg-white"
        >
          Get Started
        </Button>
      </Link>
    </div>
  );
};

export default Welcome;
