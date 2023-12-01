import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import cx from 'clsx';
import { RcIconFileJson, RcIconUploader } from 'ui/assets';
import ThemeIcon from './ThemeMode/ThemeIcon';

interface UploaderProps {
  onChange({ file, fileList }: { file: File; fileList: FileList }): void;
  accept?: string;
  className?: string;
  children?: React.ReactNode;
}

enum UPLOADER_STATE {
  INITIAL,
  SELECTED,
}

const Uploader = ({ onChange, accept, className }: UploaderProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploadState, setUploadState] = useState<UPLOADER_STATE>(
    UPLOADER_STATE.INITIAL
  );
  const [filename, setFilename] = useState<string>('');
  const { t } = useTranslation();
  const handleClick = () => {
    if (!inputRef.current) {
      return;
    }

    inputRef.current.click();
  };

  const handleOnChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { files } = e.target;
    if (!files) {
      return;
    }

    if (onChange) {
      onChange({
        file: files[0],
        fileList: files,
      });
      setFilename(files[0]?.name);
      setUploadState(UPLOADER_STATE.SELECTED);
    }
  };
  return (
    <div
      className={cx(
        'uploader rounded bg-r-neutral-card-1 flex items-center justify-center cursor-pointer text-center',
        className
      )}
      onClick={handleClick}
    >
      <input
        type="file"
        accept={accept}
        onChange={handleOnChange}
        onClick={(e) => e.stopPropagation()}
        className="hidden"
        ref={inputRef}
      />
      {uploadState === UPLOADER_STATE.INITIAL && (
        <div className="text-center text-13 text-gray-comment">
          <ThemeIcon src={RcIconUploader} className="mb-12 block mx-auto" />
          <div>{t('component.Uploader.placeholder')}</div>
        </div>
      )}
      {uploadState === UPLOADER_STATE.SELECTED && (
        <div className="text-13 text-gray-comment w-full">
          <ThemeIcon src={RcIconFileJson} className="mb-12 block mx-auto" />
          <div className="overflow-ellipsis overflow-hidden whitespace-nowrap max-w-[80%] mx-auto">
            {filename}
          </div>
        </div>
      )}
    </div>
  );
};

export default Uploader;
