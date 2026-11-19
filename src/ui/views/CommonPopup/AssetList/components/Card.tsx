import React from 'react';

const Card = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="bg-r-neutral-card-1 rounded-[8px] pt-20 pr-12 pb-12 pl-8">
      {children}
    </div>
  );
};

export default Card;
