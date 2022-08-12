import { Skeleton } from 'antd';
import { ExplainTxResponse } from 'background/service/openapi';
import React from 'react';
import IconCheck from 'ui/assets/icon-check.svg';
import IconLoading from 'ui/assets/icon-loading.svg';
import IconWarning, {
  ReactComponent as IconRcWaring,
} from 'ui/assets/icon-warning.svg';

interface PreCheckCardProps {
  loading: boolean;
  version: ExplainTxResponse['pre_exec_version'];
  data: ExplainTxResponse['pre_exec'];
  errors?: {
    msg: string;
    code: number;
  }[];
  isReady: boolean;
}

const PreCheckCard = (props: PreCheckCardProps) => {
  const { loading, version, data, errors, isReady } = props;
  if (!isReady) {
    return (
      <div className="pre-check-card">
        <div className="pre-check-card-header items-center mb-0 gap-[12px]">
          <Skeleton.Avatar active style={{ width: 20, height: 20 }} />
          <Skeleton.Input active style={{ width: 84, height: 15 }} />
        </div>
      </div>
    );
  }
  if (loading) {
    return (
      <div className="pre-check-card">
        <div className="pre-check-card-header items-center mb-0">
          <img
            src={IconLoading}
            className="pre-check-card-icon is-loading"
            alt=""
          />
          <div className="pre-check-card-text-loading">
            Checking for errors...
          </div>
        </div>
      </div>
    );
  }

  if (/^2/.test(String(data.error?.code || ''))) {
    return (
      <div className="pre-check-card ">
        <div className="pre-check-card-header items-start mb-0">
          <IconRcWaring className="pre-check-card-icon gray"></IconRcWaring>
          <div>
            <div className="pre-check-card-title">Error check failed</div>
            <div className="pre-check-card-desc">
              {data.error?.msg}{' '}
              <span className="number">#{data.error?.code}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (
    (data.success || ['v0', 'v1'].includes(version)) &&
    (!errors || errors.length === 0)
  ) {
    return (
      <div className="pre-check-card ">
        <div className="pre-check-card-header items-center mb-0">
          <img src={IconCheck} className="pre-check-card-icon" />
          <div className="pre-check-card-desc">No error found</div>
        </div>
      </div>
    );
  }

  return (
    <div className="pre-check-card">
      <div className="pre-check-card-header">
        <img src={IconWarning} className="pre-check-card-icon" />
        <div className="pre-check-card-title">Transaction may fail </div>
      </div>
      {data.error && version === 'v2' && (
        <div className="pre-check-card-item">
          <div className="pre-check-card-item-icon-wraper">
            <div className="pre-check-card-item-icon is-warning"></div>
          </div>
          <div>
            {data.error?.msg}{' '}
            <span className="number">#{data.error?.code}</span>
          </div>
        </div>
      )}
      {errors?.map((item) => {
        return (
          <div key={`warning_${item.code}`} className="pre-check-card-item">
            <div className="pre-check-card-item-icon-wraper">
              <div className="pre-check-card-item-icon is-warning"></div>
            </div>
            <div>
              {item.msg} <span className="number">#{item.code}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default PreCheckCard;
