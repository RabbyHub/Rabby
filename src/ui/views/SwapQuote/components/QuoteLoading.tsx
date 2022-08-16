import LessPalette from '@/ui/style/var-defs';
import { Button, Progress } from 'antd';
import { noop } from 'lodash';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { ReactComponent as IconLogo } from '@/ui/assets/swap/logo.svg';
import styled from 'styled-components';

const Container = styled.div`
  position: relative;
  padding: 110px 60px 58px;
  background-color: #f0f2f5;
  height: 100%;
  display: flex;
  flex-direction: column;
`;

const Footer = styled.div`
  display: flex;
  justify-content: center;
  margin-top: auto;
`;

export const QuoteLoading = ({
  successCount = 0,
  allCount = 100,
  handleCancel = noop,
}) => {
  const { t } = useTranslation();
  return (
    <Container>
      <div className="mb-[12px] text-center">{t('FetchingQuotes')}</div>
      <div className="mb-[12px] text-center"> {successCount} quotes found</div>
      <Progress
        percent={(successCount / allCount) * 100}
        showInfo={false}
        strokeColor={LessPalette['@primary-color']}
        trailColor={'rgba(134, 151, 255, .3)'}
      />
      <div className="flex justify-center">
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
