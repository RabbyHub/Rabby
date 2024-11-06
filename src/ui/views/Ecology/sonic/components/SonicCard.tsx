import React from 'react';

export const SonicCard = ({
  children,
  className,
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) => {
  return (
    <div
      className={`rounded-[8px] bg-rabby-sonic-card border border-rabby-sonic-card-border text-rabby-sonic-card-foreground p-[12px] relative overflow-hidden shadow-lg ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
};
