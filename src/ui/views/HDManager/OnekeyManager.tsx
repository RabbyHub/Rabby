import React from 'react';
import { TrezorManager } from './TrezorManager';

export const OneKeyManager: React.FC = () => {
  return <TrezorManager HDName="OneKey" />;
};
