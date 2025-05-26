import React, { useEffect, useState } from "react";
import { User } from "./types/User";
import "../../index.css";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools/production";
import { useLogStore } from "./utils/logStore";
import { onDevToolsEvent } from "./utils/devToolsEvents";
import { useDevToolsEventHandler } from "./hooks/useDevToolsEventHandler";

import { DeviceSelection } from "./DeviceSelection";
import { UserInfo } from "./UserInfo";
import { LogConsole } from "./LogConsole";
import { NoDevicesConnected } from "./NoDevicesConnected";
import { StorageControlsSection } from "./UserInfo/StorageControlsSection";

export const PlatformIcon: React.FC<{ platform: string }> = ({ platform }) => {
  const normalizedPlatform = platform?.toLowerCase() || "";

  switch (normalizedPlatform) {
    case "ios":
      return (
        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
        </svg>
      );
    case "android":
      return (
        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
          <path d="M16.61 15.15c-.46 0-.84-.37-.84-.83s.37-.83.84-.83.83.37.83.83-.37.83-.83.83m-9.22 0c-.46 0-.83-.37-.83-.83s.37-.83.83-.83.84.37.84.83-.37.83-.84.83m9.42-5.89l1.67-2.89c.09-.17.03-.38-.13-.47-.17-.09-.38-.03-.47.13l-1.69 2.93A9.973 9.973 0 0012 7.75c-1.89 0-3.63.52-5.19 1.37L5.12 6.19c-.09-.17-.3-.22-.47-.13-.17.09-.22.3-.13.47l1.67 2.89C3.44 11.15 1.62 14.56 1.62 18h20.76c0-3.44-1.82-6.85-4.57-8.74z" />
        </svg>
      );
    case "web":
      return (
        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
          <path d="M16.36 14c.08-.66.14-1.32.14-2 0-.68-.06-1.34-.14-2h3.38c.16.64.26 1.31.26 2s-.1 1.36-.26 2m-5.15 5.56c.6-1.11 1.06-2.31 1.38-3.56h2.95a8.03 8.03 0 01-4.33 3.56M14.34 14H9.66c-.1-.66-.16-1.32-.16-2 0-.68.06-1.35.16-2h4.68c.09.65.16 1.32.16 2 0 .68-.07 1.34-.16 2M12 19.96c-.83-1.2-1.5-2.53-1.91-3.96h3.82c-.41 1.43-1.08 2.76-1.91 3.96M8 8H5.08A7.923 7.923 0 019.4 4.44C8.8 5.55 8.35 6.75 8 8m-2.92 8H8c.35 1.25.8 2.45 1.4 3.56A8.008 8.008 0 015.08 16m-.82-2C4.1 13.36 4 12.69 4 12s.1-1.36.26-2h3.38c-.08.66-.14 1.32-.14 2 0 .68.06 1.34.14 2M12 4.03c.83 1.2 1.5 2.54 1.91 3.97h-3.82c.41-1.43 1.08-2.77 1.91-3.97M18.92 8h-2.95a15.65 15.65 0 00-1.38-3.56c1.84.63 3.37 1.9 4.33 3.56M12 2C6.47 2 2 6.5 2 12a10 10 0 0010 10 10 10 0 0010-10A10 10 0 0012 2z" />
        </svg>
      );
    case "tv":
    case "tvos":
      return (
        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
          <path d="M21 17H3V5h18m0-2H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h5v2h8v-2h5c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z" />
        </svg>
      );
    default:
      return (
        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.25 18H6.75V4h10.5M14 21h-4v-1h4m2-19H8C6.34 1 5 2.34 5 4v16c0 1.66 1.34 3 3 3h8c1.66 0 3-1.34 3-3V4c0-1.66-1.34-3-3-3z" />
        </svg>
      );
  }
};

export const getPlatformColor = (platform: string): string => {
  const normalizedPlatform = platform?.toLowerCase() || "";
  switch (normalizedPlatform) {
    case "ios":
      return "text-gray-100";
    case "android":
      return "text-green-300";
    case "web":
      return "text-blue-300";
    case "tv":
    case "tvos":
      return "text-purple-300";
    default:
      return "text-gray-300";
  }
};

export const getPlatformBgColor = (platform: string): string => {
  const normalizedPlatform = platform?.toLowerCase() || "";
  switch (normalizedPlatform) {
    case "ios":
      return "bg-blue-900/30 text-blue-200";
    case "android":
      return "bg-green-900/30 text-green-200";
    case "web":
      return "bg-cyan-900/30 text-cyan-200";
    case "tv":
    case "tvos":
      return "bg-purple-900/30 text-purple-200";
    default:
      return "bg-gray-800/60 text-gray-300";
  }
};

interface DashProps {
  allDevices: User[];
  isDashboardConnected: boolean;
  targetDevice: User;
  setTargetDevice: (device: User) => void;
}

export const Dash: React.FC<DashProps> = ({
  isDashboardConnected,
  allDevices,
  targetDevice,
  setTargetDevice,
}) => {
  const [showOfflineDevices, setShowOfflineDevices] = useState(true);
  const { isEnabled, setIsEnabled, isVisible, setIsVisible } = useLogStore();

  const filteredDevices = showOfflineDevices
    ? allDevices
    : allDevices.filter((device) => {
        if (typeof device === "string") {
          return false;
        }
        return device.isConnected;
      });

  // Find the target device
  useEffect(() => {
    const foundDevice = filteredDevices?.find((device) => {
      return device.deviceId === targetDevice.deviceId;
    });
    foundDevice && setTargetDevice(foundDevice);
  }, [setTargetDevice, filteredDevices, targetDevice]);

  useDevToolsEventHandler();

  return (
    <div className="font-sf-pro">
      <div className="flex flex-col w-full h-screen overflow-hidden bg-[#0A0A0C] text-white">
        <header className="w-full px-5 py-4 border-b border-[#2D2D2F]/50 flex justify-between items-center flex-shrink-0 bg-[#0A0A0C]/95 sticky top-0 z-20 shadow-[0_0.5rem_1rem_rgba(0,0,0,0.2)]">
          <div className="flex items-center gap-4">
            {/* Connection Status */}
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full  ${
                isDashboardConnected
                  ? "bg-gradient-to-r from-green-500/10 to-green-500/5 border border-green-500/20 shadow-[0_0_10px_rgba(74,222,128,0.1)]"
                  : "bg-gradient-to-r from-red-500/10 to-red-500/5 border border-red-500/20 shadow-[0_0_10px_rgba(248,113,113,0.1)]"
              }`}
            >
              <div className="relative flex items-center justify-center">
                <div
                  className={`w-2 h-2 rounded-full ${
                    isDashboardConnected ? "bg-green-400" : "bg-red-400"
                  }`}
                >
                  {/* Simple dot with no animations */}
                </div>
              </div>
              <span
                className={`text-xs font-medium tracking-wide ${
                  isDashboardConnected ? "text-green-300" : "text-red-300"
                }`}
              >
                {isDashboardConnected ? "Connected" : "Disconnected"}
              </span>
            </div>
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-5">
            {/* Offline Toggle */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowOfflineDevices(!showOfflineDevices)}
                className="group flex items-center gap-3 px-3 py-1.5 rounded-full transition-all duration-500 ease-out hover:bg-[#1D1D1F]/40 border border-transparent hover:border-[#2D2D2F]/70"
                aria-pressed={showOfflineDevices}
                role="switch"
              >
                <div
                  className={`w-8 h-4 rounded-full flex items-center px-0.5 transition-all duration-500 ease-out ${
                    showOfflineDevices ? "bg-blue-500" : "bg-[#3D3D3F]"
                  }`}
                >
                  <div
                    className={`w-3 h-3 rounded-full bg-white shadow-md transform transition-all duration-500 ease-out ${
                      showOfflineDevices ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </div>
                <span className="text-xs font-medium text-[#A1A1A6] group-hover:text-[#F5F5F7] transition-colors duration-300">
                  Show Offline Devices
                </span>
              </button>

              {/* Logs Toggle */}
              <button
                onClick={() => setIsEnabled(!isEnabled)}
                className="group flex items-center gap-3 px-3 py-1.5 rounded-full transition-all duration-500 ease-out hover:bg-[#1D1D1F]/40 border border-transparent hover:border-[#2D2D2F]/70"
                aria-pressed={isEnabled}
                role="switch"
              >
                <div
                  className={`w-8 h-4 rounded-full flex items-center px-0.5 transition-all duration-500 ease-out ${
                    isEnabled ? "bg-blue-500" : "bg-[#3D3D3F]"
                  }`}
                >
                  <div
                    className={`w-3 h-3 rounded-full bg-white shadow-md transform transition-all duration-500 ease-out ${
                      isEnabled ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </div>
                <span className="text-xs font-medium text-[#A1A1A6] group-hover:text-[#F5F5F7] transition-colors duration-300">
                  Logs
                </span>
              </button>

              {/* Storage Controls */}
              <StorageControlsSection />
            </div>

            {/* Separator */}
            <div className="h-5 w-px bg-[#2D2D2F]/70"></div>

            {/* Device Selection */}
            <div className="flex-shrink-0">
              <DeviceSelection
                selectedDevice={targetDevice}
                setSelectedDevice={setTargetDevice}
                allDevices={filteredDevices}
              />
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 pb-72 bg-gradient-to-b from-[#0A0A0C] to-[#121214]">
          <div className="px-2 max-w-3xl mx-auto">
            {/* Device count and stats */}
            {filteredDevices.length > 0 ? (
              <>
                <div className="mb-6 bg-[#1A1A1C] border border-[#2D2D2F]/60 rounded-2xl p-5 shadow-[0_0.5rem_1.5rem_rgba(0,0,0,0.25)] transition-all duration-500 ease-out hover:shadow-[0_0.5rem_2rem_rgba(0,0,0,0.35)]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="text-sm flex items-center gap-2 px-3.5 py-1.5 bg-[#0A0A0C]/80 rounded-full border border-[#2D2D2F]/50 shadow-inner">
                        <span className="text-blue-300 font-mono bg-blue-500/10 px-2 py-0.5 rounded-md border border-blue-500/20 text-xs">
                          {filteredDevices.length}
                        </span>
                        <span className="text-white font-medium">
                          {filteredDevices.length === 1 ? "device" : "devices"}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-sm">
                        <div className="flex items-center gap-2 px-3.5 py-1.5 bg-green-900/20 rounded-full border border-green-900/30 shadow-inner">
                          <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                          <span className="text-green-300 font-medium">
                            {allDevices.filter((d) => d.isConnected).length}{" "}
                            online
                          </span>
                        </div>
                        <div className="flex items-center gap-2 px-3.5 py-1.5 bg-red-900/20 rounded-full border border-red-900/30 shadow-inner">
                          <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                          <span className="text-red-300 font-medium">
                            {allDevices.filter((d) => !d.isConnected).length}{" "}
                            offline
                          </span>
                        </div>
                      </div>
                    </div>

                    {targetDevice && (
                      <div className="flex items-center gap-3 px-4 py-2 bg-[#0A0A0C]/60 rounded-full border border-[#2D2D2F]/50 shadow-sm ">
                        <div className="flex items-center gap-2">
                          <div
                            className={`flex items-center gap-2 ${
                              targetDevice.deviceId === "All"
                                ? "text-blue-300"
                                : targetDevice.isConnected
                                ? "text-green-300"
                                : "text-red-300"
                            }`}
                          >
                            <div className="w-1.5 h-1.5 rounded-full bg-current"></div>
                            <span className="text-xs font-medium uppercase tracking-wider text-[#A1A1A6]">
                              Target
                            </span>
                          </div>
                          <span className="text-sm font-medium text-white">
                            {targetDevice.deviceId === "All"
                              ? "All Devices"
                              : targetDevice.deviceName}
                          </span>
                        </div>
                        {targetDevice.deviceId !== "All" &&
                          targetDevice.platform && (
                            <div
                              className={`flex items-center ${getPlatformColor(
                                targetDevice.platform
                              )}`}
                            >
                              <PlatformIcon platform={targetDevice.platform} />
                            </div>
                          )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Device List */}
                <div className="space-y-5 transition-all duration-300">
                  {filteredDevices.map((device) => (
                    <UserInfo
                      key={device.id}
                      userData={device}
                      isTargeted={
                        targetDevice.deviceId === "All" ||
                        targetDevice.deviceId === device.deviceId
                      }
                    />
                  ))}
                </div>
              </>
            ) : (
              <NoDevicesConnected />
            )}
          </div>
        </main>

        {/* Console Panel */}
        <div className="fixed bottom-4 right-4 z-40">
          {isVisible ? (
            <div className="fixed inset-x-0 bottom-0 z-40 bg-[#0A0A0C] border-t border-[#2D2D2F]/50 shadow-2xl transition-all duration-500 ease-out transform animate-slideUpFade">
              <LogConsole
                onClose={() => setIsVisible(false)}
                allDevices={allDevices}
              />
            </div>
          ) : (
            <button
              onClick={() => setIsVisible(true)}
              className="flex items-center justify-center w-12 h-12 bg-[#1A1A1C] hover:bg-[#2D2D2F] text-[#F5F5F7] rounded-full shadow-[0_0.5rem_1rem_rgba(0,0,0,0.2)] border border-[#2D2D2F]/50 transition-all duration-500 ease-out hover:scale-110 hover:shadow-[0_0.5rem_1.5rem_rgba(59,130,246,0.2)]"
            >
              <svg
                className="w-5 h-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </button>
          )}
        </div>

        <div className="fixed bottom-20 right-4 z-50">
          <ReactQueryDevtools
            initialIsOpen={false}
            position="bottom"
            buttonPosition="relative"
          />
        </div>
      </div>
    </div>
  );
};
