import { CHAINS } from 'consts';
import React, { useMemo } from 'react';
import { useHistory } from 'react-router-dom';
import { PageHeader } from 'ui/component';
import './style.less';

const ChainList = () => {
  const history = useHistory();
  const goBack = () => {
    history.goBack();
  };
  const list = useMemo(() => Object.values(CHAINS), []);

  return (
    <div className="page-chain-list">
      <PageHeader onBack={goBack} fixed>
        {list.length} chains supported
      </PageHeader>
      <div className="chain-list">
        {list.map((item) => {
          return (
            <div className="chain-list-item" key={item.id}>
              <img src={item.logo} alt="" />
              {item.name}
            </div>
          );
        })}
        {list.length % 2 !== 0 && <div className="chain-list-item"></div>}
      </div>
    </div>
  );
};

export default ChainList;
