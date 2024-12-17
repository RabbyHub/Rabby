import { Slider, SliderSingleProps } from 'antd';
import React from 'react';
import styled from 'styled-components';

const StyledSlider = styled(Slider)`
  .ant-slider-rail {
    background-color: var(--r-blue-light1, #eef1ff);
  }
  .ant-slider-track,
  &:hover .ant-slider-track {
    background: var(--r-blue-default, #7084ff);
  }
  &:hover > .ant-slider-handle {
    border: none !important;
    box-shadow: none !important;
  }
  .ant-slider-handle {
    margin-top: -14px;
    width: 32px;
    height: 32px;
    background-color: transparent;
    overflow: hidden;
    border: none;
    box-shadow: none;
    &::before,
    &::after {
      position: absolute;
      content: '';
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      border-radius: 50%;
    }
    &::before {
      width: 16px;
      height: 16px;
      background-color: white;
    }
    &::after {
      width: 12px;
      height: 12px;
      background-color: var(--r-blue-default, #7084ff);
    }

    &:hover {
      border: none;
      box-shadow: none;
      &::before {
        width: 20px;
        height: 20px;
      }
      &::after {
        width: 16px;
        height: 16px;
      }
    }
  }
`;

export const SwapSlider = (props: SliderSingleProps) => {
  return <StyledSlider {...props} />;
};
