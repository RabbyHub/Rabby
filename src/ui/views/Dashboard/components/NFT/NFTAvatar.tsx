import { NFTItem } from '@/background/service/openapi';
import { CHAINS_ENUM } from '@/constant';
import { Image } from 'antd';
import clsx from 'clsx';
import React from 'react';
// import IconImgLoading from 'ui/assets/img-loading.svg';
import IconImgFail from 'ui/assets/img-fail-1.svg';
import IconNFTDefault from 'ui/assets/nft-default.svg';
import IconUnknown from 'ui/assets/token-default.svg';
import IconZoom from 'ui/assets/zoom.svg';
import { getChain } from 'utils';

type AvatarProps = {
  content?: string;
  thumbnail?: boolean;
  chain?: string;
  type?: NFTItem['content_type'];
  className?: string;
  style?: React.CSSProperties;
  onPreview?: () => void;
  amount?: number;
};

const Thumbnail = ({
  content,
  type,
}: Pick<AvatarProps, 'content' | 'type'>) => {
  const src =
    type && ['image', 'image_url'].includes(type) && content
      ? content
      : IconNFTDefault;
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
  if (type && ['video_url', 'audio_url'].includes(type) && content) {
    return (
      <video
        src={content}
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
  amount,
}: AvatarProps) => {
  const logo = getChain(chain)?.logo || IconUnknown;
  const isShowLogo = chain && chain.toUpperCase() !== CHAINS_ENUM.ETH;

  return (
    <div className={clsx('nft-avatar', className)} style={style}>
      {thumbnail ? (
        <Thumbnail content={content} type={type} />
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
