import { NFTItem } from '@/background/service/openapi';
import { Image } from 'antd';
import clsx from 'clsx';
import React, { ReactNode } from 'react';
// import IconImgLoading from 'ui/assets/img-loading.svg';
import IconImgFail from 'ui/assets/img-fail-1.svg';
import IconNFTDefault from 'ui/assets/nft-default.svg';
import IconUnknown from 'ui/assets/token-default.svg';
import IconZoom from 'ui/assets/zoom.svg';
import { getChain } from '@/utils';
import './style.less';

type AvatarProps = {
  content?: string;
  thumbnail?: boolean;
  chain?: string;
  type?: NFTItem['content_type'];
  className?: string;
  style?: React.CSSProperties;
  onPreview?: (e) => void;
  amount?: number;
  unknown?: string;
  empty?: ReactNode;
};

// check if the url is a valid http(s) url
const isValidHttpUrl = (url?: string): boolean => {
  if (!url) return false;
  try {
    const urlObj = new URL(url);
    // only allow http(s) URLs with a non-empty hostname
    const isHttp = urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    return isHttp && !!urlObj.hostname;
  } catch {
    return false;
  }
};

const Thumbnail = ({
  content,
  type,
  unknown,
  empty,
}: Pick<AvatarProps, 'content' | 'type' | 'unknown' | 'empty'>) => {
  const sanitizedUrl = isValidHttpUrl(content) ? content : '';
  if (type && ['video_url'].includes(type) && sanitizedUrl) {
    return (
      <video
        src={sanitizedUrl}
        preload="metadata"
        className="nft-avatar-image"
        controlsList="nodownload nofullscreen noplaybackrate"
        disablePictureInPicture
      />
    );
  }

  const isShowEmpty =
    !(type && ['image', 'image_url'].includes(type) && sanitizedUrl) && empty;

  const src =
    type && ['image', 'image_url'].includes(type) && sanitizedUrl
      ? sanitizedUrl
      : unknown || IconNFTDefault;

  if (isShowEmpty) {
    return <>{empty}</>;
  }
  return (
    <Image
      src={src}
      className="nft-avatar-image"
      preview={false}
      fallback={IconImgFail}
      // placeholder={
      //   <Image
      //     className="nft-avatar-image"
      //     preview={false}
      //     src={IconImgLoading}
      //   />
      // }
    ></Image>
  );
};

const Preview = ({ content, type }: Pick<AvatarProps, 'content' | 'type'>) => {
  const sanitizedUrl = isValidHttpUrl(content) ? content : '';
  if (type && ['image', 'image_url'].includes(type) && sanitizedUrl) {
    return (
      <Image
        src={sanitizedUrl}
        className="nft-avatar-image"
        preview={false}
        fallback={IconImgFail}
        // placeholder={
        //   <Image
        //     className="nft-avatar-image"
        //     preview={false}
        //     src={IconNFTDefault}
        //   />
        // }
      ></Image>
    );
  }
  if (type && ['video_url', 'audio_url'].includes(type) && sanitizedUrl) {
    return (
      <video
        src={sanitizedUrl}
        controls
        className="nft-avatar-image"
        controlsList="nodownload nofullscreen noplaybackrate"
        disablePictureInPicture
      />
    );
  }
  return <img src={IconNFTDefault} className="nft-avatar-image" alt="" />;
};

const NFTAvatar = ({
  thumbnail = true,
  type,
  content,
  chain,
  className,
  style,
  onPreview,
  unknown,
  amount,
  empty,
}: AvatarProps) => {
  const logo = getChain(chain)?.logo || IconUnknown;
  const isShowLogo = !!chain;
  return (
    <div className={clsx('nft-avatar', className)} style={style}>
      {thumbnail ? (
        <Thumbnail
          content={content}
          type={type}
          unknown={unknown}
          empty={empty}
        />
      ) : (
        <Preview content={content} type={type}></Preview>
      )}
      {amount && amount > 1 && (
        <div className="nft-avatar-count">x{amount}</div>
      )}
      {isShowLogo && <img src={logo} className="nft-avatar-chain" />}
      {thumbnail && onPreview && (
        <div className="nft-avatar-cover" onClick={onPreview}>
          <img src={IconZoom} alt="" />
        </div>
      )}
    </div>
  );
};

export default NFTAvatar;
