import { NFTItem } from '@/background/service/openapi';
import { Image } from 'antd';
import clsx from 'clsx';
import React from 'react';
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
};

// check if the url is a valid http(s) url
const isValidHttpUrl = (url?: string): boolean => {
  if (!url) return false;
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
};

// sanitize the url to remove javascript and data protocols
const sanitizeUrl = (url?: string): string | null => {
  if (!url || typeof url !== 'string') return null;
  const cleanedUrl = url.replace(/javascript:/gi, '').replace(/data:/gi, '');
  if (!isValidHttpUrl(cleanedUrl)) return null;
  return cleanedUrl;
};

const Thumbnail = ({
  content,
  type,
  unknown,
}: Pick<AvatarProps, 'content' | 'type' | 'unknown'>) => {
  const sanitizedUrl = sanitizeUrl(content);
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
  const src =
    type && ['image', 'image_url'].includes(type) && content
      ? content
      : unknown || IconNFTDefault;
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
  if (type && ['image', 'image_url'].includes(type) && content) {
    return (
      <Image
        src={content}
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
  const sanitizedUrl = sanitizeUrl(content);
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
}: AvatarProps) => {
  const logo = getChain(chain)?.logo || IconUnknown;
  const isShowLogo = !!chain;
  return (
    <div className={clsx('nft-avatar', className)} style={style}>
      {thumbnail ? (
        <Thumbnail content={content} type={type} unknown={unknown} />
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
