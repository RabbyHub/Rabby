import React, { useState, useEffect } from 'react';
import { getOriginName, hashCode } from 'ui/utils';
import './style.less';

const bgColorList = [
  '#F69373',
  '#91D672',
  '#C0E36C',
  '#A47CDF',
  '#6BD5D6',
  '#ED7DBC',
  '#7C93EF',
  '#65BBC0',
  '#6EB7FB',
  '#6091CD',
  '#F6B56F',
  '#DFA167',
];

const FallbackImage = ({
  url,
  origin,
  width,
  height,
  style = {},
}: {
  url: string;
  origin: string;
  width: string;
  height: string;
  style?: React.CSSProperties;
}) => {
  const [loadFaild, setLoadFaild] = useState(false);
  const [bgColor, setBgColor] = useState('');
  const handleImageLoadError = () => {
    setLoadFaild(true);
  };

  useEffect(() => {
    const bgIndex = Math.abs(hashCode(origin) % 12);
    setBgColor(bgColorList[bgIndex]);
  }, []);

  useEffect(() => {
    if (!url) setLoadFaild(true);
  }, [url]);

  const originName = getOriginName(origin);

  return loadFaild ? (
    <div
      className="fallback-site-logo"
      style={{ backgroundColor: bgColor, width, height, ...style }}
    >
      {originName[0].toUpperCase()}
    </div>
  ) : (
    <img
      src={url}
      alt={origin}
      style={{ width, height, ...style }}
      onError={handleImageLoadError}
    />
  );
};

export default FallbackImage;
