import React from "react";
import { User } from "../types/User";
import { InfoRow } from "./InfoRow";
import { EnvironmentVariablesSection } from "./EnvironmentVariablesSection";
import { DeviceSpecificationsSection } from "./DeviceSpecificationsSection";

interface Props {
  userData: User;
  isTargeted: boolean;
  envVariables: Record<string, any>;
  extraDeviceInfo: Record<string, any>;
}

export const UserCardDetails: React.FC<Props> = ({
  userData,
  isTargeted,
  envVariables,
  extraDeviceInfo,
}) => {
  const platform = userData.platform || "Unknown";
  const isConnected =
    userData.isConnected !== undefined ? userData.isConnected : true;
  const connectionStatusText = isConnected ? "Connected" : "Disconnected";

  return (
    <div
      className="grid grid-cols-2 gap-3 text-sm px-5 pb-5 animate-fadeIn border-t border-[#2D2D2F]/70 pt-4 select-text"
      onClick={(e) => e.stopPropagation()}
    >
      <InfoRow label="Socket ID" value={userData.id} monospace />

      {userData.deviceId && (
        <InfoRow label="Device ID" value={userData.deviceId} monospace />
      )}

      <InfoRow label="Platform" value={platform} />

      <InfoRow
        label="Connection Status"
        value={connectionStatusText}
        className={isConnected ? "text-green-400" : "text-red-400"}
      />

      <InfoRow
        label="Connection Type"
        value={
          userData.deviceId ? "Persistent Connection" : "Standard Connection"
        }
      />

      {isTargeted && (
        <InfoRow
          label="Target Status"
          value="Currently Targeted"
          className="text-blue-300"
          labelClassName="text-blue-400"
        />
      )}

      <EnvironmentVariablesSection envVariables={envVariables} />

      <DeviceSpecificationsSection extraDeviceInfo={extraDeviceInfo} />

      <div className="col-span-2 text-xs text-[#A1A1A6] mt-3 flex items-center justify-center space-x-2">
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <span>Click header to collapse</span>
      </div>
    </div>
  );
};
