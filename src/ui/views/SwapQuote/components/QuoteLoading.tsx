import LessPalette from '@/ui/style/var-defs';
import { Button, Progress } from 'antd';
import { noop } from 'lodash';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { ReactComponent as IconLogo } from '@/ui/assets/swap/logo.svg';
import styled from 'styled-components';
import loadingBg from '@/ui/assets/swap/loading-bg.png';

const Container = styled.div`
  position: relative;
  padding: 110px 60px 48px;
  background-color: #f0f2f5;
  height: 100%;
  display: flex;
  flex-direction: column;
  background-image: url(${loadingBg});
  background-position: center center;
  background-repeat: no-repeat;
  background-size: cover;
`;

const Footer = styled.div`
  display: flex;
  justify-content: center;
  margin-top: auto;
`;

export const QuoteLoading = ({
  successCount = 0,
  completeCount = 0,
  allCount = 100,
  handleCancel = noop,
}) => {
  const { t } = useTranslation();
  return (
    <Container>
      <div className="mb-[12px] text-center text-24 font-bold">
        {t('FetchingQuotes')}
      </div>
      <div className="mb-[3px] text-center text-14 text-gray-subTitle">
        {successCount} quotes found
      </div>
      <Progress
        strokeWidth={4}
        percent={(completeCount / allCount) * 100}
        showInfo={false}
        strokeColor={LessPalette['@primary-color']}
        trailColor={'rgba(134, 151, 255, .3)'}
        status="active"
      />
      <div className="flex justify-center mt-[87px]">
        <IconLogo />
      </div>
      <Footer>
        <Button size="large" className="w-[200px]" onClick={handleCancel}>
          {t('Cancel')}
        </Button>
      </Footer>
    </Container>
  );
};

export default QuoteLoading;
