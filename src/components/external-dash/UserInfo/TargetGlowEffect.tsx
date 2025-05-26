import React from "react";

interface Props {
  isTargeted: boolean;
}

export const TargetGlowEffect: React.FC<Props> = ({ isTargeted }) => {
  if (!isTargeted) return null;

  return (
    <>
      {/* Extended glow effect - furthest back */}
      <div
        className="absolute -inset-[3px] bg-gradient-to-r from-red-500/10 via-violet-500/10 to-blue-500/10 rounded-2xl blur-xl animate-gradient opacity-70 transition-opacity duration-500 ease-out"
        aria-hidden="true"
      />

      {/* Outer glow effect */}
      <div
        className="absolute -inset-[2px] bg-gradient-to-r from-red-500/30 via-violet-500/30 to-blue-500/30 rounded-2xl blur-md animate-gradient transition-opacity duration-500 ease-out"
        aria-hidden="true"
      />

      {/* Primary glowing border */}
      <div
        className="absolute -inset-[1px] bg-gradient-to-r from-red-500/80 via-violet-500/80 to-blue-500/80 rounded-2xl opacity-90 animate-gradient transition-opacity duration-500 ease-out"
        aria-hidden="true"
      />
    </>
  );
};
