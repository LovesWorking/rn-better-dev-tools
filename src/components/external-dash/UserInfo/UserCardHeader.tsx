import React from "react";
import { User } from "../types/User";
import {
  PlatformIcon,
  getDisplayPlatform,
  getPlatformBgColor,
} from "../utils/platformUtils";

interface Props {
  userData: User;
  isTargeted: boolean;
  expanded: boolean;
  onToggleExpanded: () => void;
}

export const UserCardHeader: React.FC<Props> = ({
  userData,
  isTargeted,
  expanded,
  onToggleExpanded,
}) => {
  const platform = userData.platform || "Unknown";
  const displayPlatform = getDisplayPlatform(platform);
  const isConnected =
    userData.isConnected !== undefined ? userData.isConnected : true;
  const connectionStatusText = isConnected ? "Connected" : "Disconnected";

  return (
    <div
      className="flex justify-between items-center cursor-pointer group select-none p-5 w-full"
      onClick={(e) => {
        e.stopPropagation();
        onToggleExpanded();
      }}
    >
      <div className="flex items-center space-x-4">
        <div className="relative">
          <div
            className={`w-2 h-2 rounded-full transition-colors duration-500 ease-out
              ${isConnected ? "bg-green-500" : "bg-red-500"}
             `}
          >
            {isConnected && (
              <div className="absolute -inset-1 rounded-full bg-green-500/30 animate-pulse"></div>
            )}
          </div>
        </div>

        <h2
          className={`text-lg font-medium tracking-tight antialiased transition-all duration-500 ease-out
          ${
            isTargeted
              ? "text-blue-300 drop-shadow-[0_0_12px_rgba(59,130,246,0.3)]"
              : "text-[#F5F5F7]"
          }`}
        >
          {userData.deviceName}
        </h2>

        <span
          className={`px-3 py-1 text-xs font-medium rounded-full flex items-center gap-1.5 transition-all duration-500 ease-out
          ${getPlatformBgColor(platform)}
          ${
            isTargeted
              ? "ring-1 ring-blue-400/30 shadow-[0_0_8px_rgba(59,130,246,0.2)]"
              : ""
          }`}
        >
          <PlatformIcon platform={platform} />
          {displayPlatform}
        </span>
      </div>

      <div className="flex items-center space-x-4">
        <span
          className={`px-3 py-1 text-xs font-medium rounded-full transition-all duration-500 ease-out
            ${
              userData.deviceId
                ? isConnected
                  ? "bg-green-900/80 text-green-300 shadow-[0_0_8px_rgba(74,222,128,0.1)]"
                  : "bg-red-900/80 text-red-300 shadow-[0_0_8px_rgba(248,113,113,0.1)]"
                : "bg-yellow-900/80 text-yellow-300 shadow-[0_0_8px_rgba(250,204,21,0.1)]"
            }
          `}
        >
          {userData.deviceId ? connectionStatusText : "Legacy"}
        </span>

        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={`h-4 w-4 transition-all duration-500 ease-out
            ${expanded ? "rotate-180" : ""}
            ${isTargeted ? "text-blue-400" : "text-[#A1A1A6]"}
            group-hover:text-[#F5F5F7]`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </div>
    </div>
  );
};
