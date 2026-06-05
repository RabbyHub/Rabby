/** Logo + total PnL — rendered inside the widget header as the ball form's visible content. */

import React from 'react';
import { formatPnl } from './format';

/** Hyperliquid mark, centered in the logo. */
const HypeLogo: React.FC = () => (
  <svg
    className="rabby-perps-widget__logo-main"
    xmlns="http://www.w3.org/2000/svg"
    width="21"
    height="16"
    viewBox="0 0 21 16"
    fill="none"
  >
    <path
      d="M20.2493 7.79914C20.2678 9.53556 19.9199 11.1949 19.2365 12.7802C18.2605 15.0377 15.9207 16.8835 13.7842 14.9187C12.0417 13.3173 11.7184 10.0662 9.10775 9.59028C5.65353 9.15294 5.5704 13.3366 3.31377 13.8092C0.798532 14.3431 -0.0357763 9.92469 0.00116728 7.91809C0.0381108 5.91149 0.549164 3.09133 2.73499 3.09133C5.25023 3.09133 5.41955 7.06917 8.6121 6.85371C11.7739 6.62862 11.8292 2.48999 13.895 0.718136C15.6776 -0.812537 17.7741 0.30974 18.8239 2.15234C19.7968 3.85668 20.2246 5.85687 20.2462 7.79914H20.2493Z"
      fill="#50D2C1"
    />
  </svg>
);

/** Rabby badge, overlaid in the bottom-right corner. */
const RabbyBadge: React.FC = () => (
  <svg
    className="rabby-perps-widget__logo-badge"
    xmlns="http://www.w3.org/2000/svg"
    width="12"
    height="12"
    viewBox="0 0 12 12"
    fill="none"
  >
    <g clipPath="url(#rabby-perps-badge-clip)">
      <circle cx="6" cy="6" r="6" fill="#131416" />
      <path
        d="M10.454 6.56166C10.8075 5.77199 9.05996 3.56576 7.39047 2.6466C6.33813 1.93454 5.24161 2.03236 5.01952 2.34501C4.53214 3.03115 6.63337 3.61255 8.03863 4.291C7.73656 4.42219 7.45189 4.65764 7.28449 4.95874C6.7606 4.38679 5.61073 3.89425 4.26147 4.291C3.35224 4.55835 2.5966 5.18866 2.30454 6.14066C2.23358 6.10912 2.15501 6.0916 2.07235 6.0916C1.75625 6.0916 1.5 6.34785 1.5 6.66395C1.5 6.98005 1.75625 7.23629 2.07235 7.23629C2.13094 7.23629 2.31413 7.19699 2.31413 7.19699L5.24161 7.21821C4.07085 9.07549 3.14561 9.347 3.14561 9.66876C3.14561 9.99053 4.0309 9.90334 4.3633 9.7834C5.95455 9.20924 7.66363 7.41984 7.95691 6.90473C9.18849 7.05838 10.2235 7.07656 10.454 6.56166Z"
        fill="url(#rabby-perps-badge-p0)"
      />
      <path
        d="M4.98486 2.69581C5.08678 2.50049 5.75306 2.47975 6.65771 2.90577C7.32354 3.21937 8.03313 3.91931 8.07471 4.09327C8.09259 4.16881 8.10273 4.26488 8.0376 4.29053C6.87803 3.73085 5.24658 3.23674 4.98486 2.69581Z"
        fill="url(#rabby-perps-badge-p1)"
      />
      <path
        d="M4.60455 5.46826C5.57604 5.46827 5.99413 5.78303 6.32721 6.37354C6.56458 6.79448 6.51214 7.46092 6.2608 7.91064C6.49587 7.96888 6.70264 8.0331 6.8858 8.10303C6.58893 8.37946 6.24899 8.66585 5.88776 8.9292C5.39395 8.8032 4.94454 8.68665 4.26373 8.51221C4.55434 8.1952 4.88677 7.77868 5.24127 7.21631L2.61432 7.19775C2.6052 7.09157 2.60286 6.97608 2.60553 6.8501C2.63108 5.64887 4.0701 5.46826 4.60455 5.46826Z"
        fill="url(#rabby-perps-badge-p2)"
      />
      <path
        d="M2.26913 7.07476C2.37648 7.98728 2.89508 8.34489 3.9548 8.45072C5.01451 8.55655 5.62238 8.48556 6.43166 8.55919C7.10756 8.62068 7.71107 8.96511 7.93495 8.84609C8.13645 8.73897 8.02372 8.35195 7.7541 8.10366C7.40462 7.7818 6.92093 7.55803 6.06984 7.47861C6.23945 7.01421 6.19192 6.36307 5.9285 6.00881C5.54762 5.49658 4.84458 5.26499 3.9548 5.36617C3.02518 5.47189 2.13442 5.92956 2.26913 7.07476Z"
        fill="url(#rabby-perps-badge-p3)"
      />
    </g>
    <defs>
      <linearGradient
        id="rabby-perps-badge-p0"
        x1="4.1556"
        y1="5.86236"
        x2="10.3779"
        y2="7.62689"
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#8797FF" />
        <stop offset="1" stopColor="#AAA8FF" />
      </linearGradient>
      <linearGradient
        id="rabby-perps-badge-p1"
        x1="9.32896"
        y1="5.74334"
        x2="4.84027"
        y2="1.24447"
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#3B22A0" />
        <stop offset="1" stopColor="#5156D8" stopOpacity="0" />
      </linearGradient>
      <linearGradient
        id="rabby-perps-badge-p2"
        x1="7.01067"
        y1="8.25751"
        x2="2.70026"
        y2="5.77841"
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#3B1E8F" />
        <stop offset="1" stopColor="#6A6FFB" stopOpacity="0" />
      </linearGradient>
      <linearGradient
        id="rabby-perps-badge-p3"
        x1="4.52673"
        y1="5.81497"
        x2="7.44187"
        y2="9.51895"
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#8898FF" />
        <stop offset="0.983895" stopColor="#5F47F1" />
      </linearGradient>
      <clipPath id="rabby-perps-badge-clip">
        <rect width="12" height="12" fill="white" />
      </clipPath>
    </defs>
  </svg>
);

interface BallProps {
  totalPnl: string;
}

export const Ball: React.FC<BallProps> = ({ totalPnl }) => {
  const pnlNumber = Number(totalPnl);
  const pnlClass =
    pnlNumber > 0
      ? 'rabby-perps-widget__pnl rabby-perps-widget__pnl-pos'
      : pnlNumber < 0
      ? 'rabby-perps-widget__pnl rabby-perps-widget__pnl-neg'
      : 'rabby-perps-widget__pnl';

  return (
    <>
      <span className="rabby-perps-widget__logo">
        <HypeLogo />
        <RabbyBadge />
      </span>
      <span className={pnlClass}>{formatPnl(totalPnl)}</span>
    </>
  );
};
