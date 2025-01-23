import React from 'react';

import { useThemeMode } from '@/ui/hooks/usePreference';
import { getUiType } from '@/ui/utils';
import clsx from 'clsx';
import styled from 'styled-components';

const Container = styled.div<{ $isDarkTheme?: boolean }>`
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background: ${(props) =>
    props.$isDarkTheme
      ? 'linear-gradient(0deg, rgba(0, 0, 0, 0.50) 0%, rgba(0, 0, 0, 0.50) 100%), var(--r-blue-default, #7084FF)'
      : 'var(--r-blue-default, #7084FF)'};
`;

const Main = styled.div`
  width: 400px !important;
  height: 600px;
  border-radius: 16px;
  position: relative;
  overflow: hidden;
  transform: translateX(0);

  .ant-drawer-bottom {
    position: absolute;
  }
  .ant-drawer-mask {
    border-radius: 16px;
  }
  .custom-popup {
    .ant-drawer-content {
      border-radius: 16px;
    }
  }
`;

interface Props {
  className?: string;
  style?: React.CSSProperties;
}

const isTab = getUiType().isTab;
export const FullscreenContainer: React.FC<Props> = ({
  children,
  className,
  style,
}) => {
  const { isDarkTheme } = useThemeMode();
  if (isTab) {
    return (
      <Container $isDarkTheme={isDarkTheme}>
        <Main
          className={clsx('js-rabby-popup-container', className)}
          style={style}
        >
          {children}
        </Main>
      </Container>
    );
  }
  return <>{children}</>;
};
