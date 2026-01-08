import React from 'react';
import styled, { keyframes } from 'styled-components';

const IframeLoadingOverlay = styled.div`
  position: absolute;
  inset: 0;
  background: var(--rb-neutral-bg-1, #fff);
  display: flex;
  align-items: center;
  justify-content: center;
`;

const loadingBarAnimation = keyframes`
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
`;

const IframeLoadingBar = styled.div`
  position: absolute;
  left: 0;
  top: 0;
  height: 4px;
  width: 100%;
  background: linear-gradient(
    90deg,
    rgba(var(--rb-brand-default-rgb), 0.2) 0%,
    var(--rb-brand-default, #4c65ff) 50%,
    rgba(var(--rb-brand-default-rgb), 0.2) 100%
  );
  background-size: 200% 100%;
  animation: ${loadingBarAnimation} 5s ease-in-out infinite;
`;

const IframeLoadingContent = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  text-align: center;
`;

const IframeLoadingIcon = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: var(--rb-neutral-bg-1, #fff);
  color: var(--rb-brand-default, #4c65ff);
`;

const IframeLoadingIconImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const IframeLoadingText = styled.div`
  font-size: 16px;
  line-height: 19px;
  font-weight: 500;
  color: var(--r-neutral-foot, #6a7587);
  max-width: 240px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

export const DappIframeLoading = ({
  loadingLabel,
  icon,
}: {
  loadingLabel: string;
  icon: string;
}) => {
  return (
    <IframeLoadingOverlay>
      <IframeLoadingBar />
      <IframeLoadingContent>
        <IframeLoadingIcon>
          <IframeLoadingIconImage src={icon} />
        </IframeLoadingIcon>
        <IframeLoadingText>{loadingLabel}</IframeLoadingText>
      </IframeLoadingContent>
    </IframeLoadingOverlay>
  );
};
