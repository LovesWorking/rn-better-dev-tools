import React, { useState } from "react";
import { User } from "./types/User";
import {
  TargetGlowEffect,
  UserCardHeader,
  UserCardDetails,
} from "./UserInfo/index";

interface Props {
  userData: User;
  isTargeted?: boolean;
}

export const UserInfo: React.FC<Props> = ({ userData, isTargeted = false }) => {
  const [expanded, setExpanded] = useState(false);

  // Parse extraDeviceInfo if it exists and is not null/undefined
  const extraDeviceInfo = (() => {
    try {
      return userData.extraDeviceInfo &&
        userData.extraDeviceInfo !== "undefined" &&
        userData.extraDeviceInfo.trim() !== ""
        ? JSON.parse(userData.extraDeviceInfo)
        : {};
    } catch (error) {
      console.warn("Failed to parse extraDeviceInfo:", error);
      return {};
    }
  })();

  // Parse envVariables if it exists and is not null/undefined
  const envVariables = (() => {
    try {
      return userData.envVariables &&
        userData.envVariables !== "undefined" &&
        userData.envVariables.trim() !== ""
        ? JSON.parse(userData.envVariables)
        : {};
    } catch (error) {
      console.warn("Failed to parse envVariables:", error);
      return {};
    }
  })();

  return (
    <div className="relative isolate w-full">
      <TargetGlowEffect isTargeted={isTargeted} />

      <div
        className={`relative bg-[#1A1A1C] transition-all duration-500 ease-out
          ${
            expanded
              ? "scale-[1.01] shadow-[0_0.75rem_2.5rem_rgba(0,0,0,0.25)]"
              : "scale-100 cursor-pointer shadow-[0_0.5rem_1.5rem_rgba(0,0,0,0.15)]"
          }
          border border-[#2D2D2F]/70 ${
            isTargeted ? "border-opacity-0" : "border-opacity-70"
          }
          rounded-2xl hover:shadow-[0_1rem_3rem_rgba(0,0,0,0.3)]`}
      >
        <UserCardHeader
          userData={userData}
          isTargeted={isTargeted}
          expanded={expanded}
          onToggleExpanded={() => setExpanded(!expanded)}
        />

        {expanded && (
          <UserCardDetails
            userData={userData}
            isTargeted={isTargeted}
            envVariables={envVariables}
            extraDeviceInfo={extraDeviceInfo}
          />
        )}
      </div>

      <div
        className={`absolute inset-0 -z-10 bg-gradient-to-b from-[#1A1A1C]/30 to-transparent rounded-2xl transition-opacity duration-500 ease-out
          ${expanded ? "opacity-100" : "opacity-0"}`}
        aria-hidden="true"
      />
    </div>
  );
};
