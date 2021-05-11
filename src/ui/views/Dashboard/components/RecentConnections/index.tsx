import React, { useState } from 'react';
import IconNoData from 'ui/assets/no-data.svg';
import './style.less';

// const ConnectionItem = () => {
//   return <div className="item">

//   </div>;
// };

export default () => {
  const [connections, setConnections] = useState([]);

  return (
    <div className="recent-connections">
      <p className="title">
        {connections.length > 0
          ? 'Recently connected'
          : 'Not connected to any sites yet'}
      </p>
      {connections.length > 0 ? (
        <div className="list"></div>
      ) : (
        <img className="icon icon-no-data" src={IconNoData} />
      )}
    </div>
  );
};
