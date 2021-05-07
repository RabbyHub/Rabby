import React from 'react';

const Connect = ({ params: { icon, origin } }) => {
  return (
    <>
      <div className="font-bold mt-12 mb-4">Request for connection</div>
      <div>
        <img src={icon} /> {origin}
      </div>
    </>
  );
};

export default Connect;
