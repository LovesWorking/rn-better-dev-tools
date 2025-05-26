import React from "react";
import { PlatformIcon } from "../utils/platformUtils";

interface Props {
  label: string;
  value: string;
  monospace?: boolean;
  className?: string;
  labelClassName?: string;
}

export const InfoRow: React.FC<Props> = ({
  label,
  value,
  monospace,
  className = "text-[#F5F5F7]",
  labelClassName = "text-[#A1A1A6]",
}) => (
  <>
    <div className={`${labelClassName} font-medium antialiased`}>{label}:</div>
    <div
      className={`${className} ${
        monospace ? "font-mono" : ""
      } overflow-hidden text-ellipsis antialiased flex items-center gap-1.5`}
    >
      {label === "Platform" && <PlatformIcon platform={value} />}
      {value}
    </div>
  </>
);
