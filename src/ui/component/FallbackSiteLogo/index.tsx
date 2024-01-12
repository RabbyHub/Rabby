import React, { useState, useEffect, useMemo } from 'react';
import cx from 'clsx';
import { getMainDomain } from '@/utils';
import { getOriginName, hashCode } from 'ui/utils';
import { EXTERNAL_RESOURCE_DOMAIN_BLACK_LIST } from '@/constant';
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
  className,
  style = {},
  onClick,
}: {
  url: string;
  origin: string;
  width: string;
  height?: string;
  className?: string;
  style?: React.CSSProperties;
  onClick?(): void;
}) => {
  const [loadFaild, setLoadFaild] = useState(false);
  const [loadSuccess, setLoadSuccess] = useState(false);
  const [logoUrl, setLogoUrl] = useState('');

  const [bgColor, originName] = useMemo(() => {
    const bgIndex = Math.abs(hashCode(origin) % 12);

    return [bgColorList[bgIndex].toLowerCase(), getOriginName(origin)];
  }, [url]);

  const handleImageLoadError = () => {
    setLoadFaild(true);
  };

  const handleImageLoadSuccess = () => {
    setLoadSuccess(true);
  };

  useEffect(() => {
    if (!url) {
      setLoadFaild(true);
      return;
    }
    if (EXTERNAL_RESOURCE_DOMAIN_BLACK_LIST.includes(getMainDomain(url))) {
      setLoadFaild(true);
    } else {
      setLogoUrl(url);
    }
  }, [url]);

  const bgText = `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><text x='16' y='17' dominant-baseline='middle' text-anchor='middle' fill='white' font-size='15' font-weight='500'>${originName?.[0]?.toUpperCase()}</text></svg>`;

  return (
    <div
      className={cx('fallback-site-logo', className)}
      onClick={onClick}
      style={{
        width,
        height: height || width,
        ...style,
      }}
    >
      <div
        className="img-wrapper"
        style={{
          '--background': loadSuccess ? `url(${logoUrl})` : bgColor,
        }}
      >
        {!loadFaild && (
          <img
            src={logoUrl}
            alt={origin}
            style={{
              width,
              height,
              visibility: loadSuccess ? 'visible' : 'hidden',
              ...style,
            }}
            onLoad={handleImageLoadSuccess}
            onError={handleImageLoadError}
          />
        )}
        <img
          src={bgText}
          alt={origin}
          style={{
            width,
            height,
            display: loadSuccess ? 'none' : 'block',
            backgroundColor: bgColor,
            ...style,
          }}
        />
      </div>
    </div>
  );
};

export default FallbackImage;
