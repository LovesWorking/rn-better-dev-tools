import React, { useEffect, useState, useRef } from "react";
import { User } from "./types/User";
import { PlatformIcon } from "./utils/platformUtils";

interface Props {
  selectedDevice: User;
  setSelectedDevice: (device: User) => void;
  allDevices?: User[];
}

interface DeviceOption {
  value: string;
  label: string;
  isOffline?: boolean;
  platform?: string;
}

export const DeviceSelection: React.FC<Props> = ({
  selectedDevice,
  setSelectedDevice,
  allDevices = [],
}: Props) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Generate options
  const generateOptions = (): DeviceOption[] => {
    if (allDevices.length === 0) {
      return [
        {
          value: "All",
          label: "No Devices",
        },
      ];
    }

    if (allDevices.length === 1) {
      const device = allDevices[0];
      return [
        {
          value: device.deviceId,
          label: device.deviceName,
          isOffline: !device.isConnected,
          platform: device.platform,
        },
      ];
    }

    // Multiple devices - add 'All' option
    return [
      {
        value: "All",
        label: "All Devices",
      },
      ...allDevices.map((device) => ({
        value: device.deviceId,
        label: device.deviceName,
        isOffline: !device.isConnected,
        platform: device.platform,
      })),
    ];
  };

  const deviceOptions = generateOptions();

  // If there are no devices, select "All"
  useEffect(() => {
    if (!selectedDevice || !selectedDevice.deviceId) {
      if (deviceOptions.length > 0) {
        const foundDevice = allDevices.find(
          (device) => device.deviceId === "All"
        );
        if (foundDevice) {
          setSelectedDevice(foundDevice);
        }
      }
    }

    // If the selected device is no longer in the device list, select "All"
    if (
      selectedDevice &&
      selectedDevice.deviceId !== "All" &&
      !allDevices.find((device) => device.deviceId === selectedDevice.deviceId)
    ) {
      const foundDevice = allDevices.find(
        (device) => device.deviceId === "All"
      );
      if (foundDevice) {
        setSelectedDevice(foundDevice);
      }
    }
  }, [allDevices, selectedDevice, setSelectedDevice, deviceOptions]);

  // Handle device selection
  const handleSelect = (deviceId: string) => {
    if (deviceId === "All") {
      setSelectedDevice({
        id: "all-devices",
        deviceId: "All",
        deviceName: "All Devices",
        isConnected: true,
        platform: undefined,
      });
    } else {
      const device = allDevices.find((d) => d.deviceId === deviceId);
      if (device) {
        setSelectedDevice(device);
      }
    }
    setIsOpen(false);
  };

  // Get selected device label
  const getSelectedDeviceLabel = (): string => {
    if (!selectedDevice || !selectedDevice.deviceId) {
      return deviceOptions[0]?.label || "All Devices";
    }

    return selectedDevice.deviceName || "Unknown Device";
  };

  const StatusDot: React.FC<{ isOffline?: boolean }> = ({ isOffline }) => (
    <span
      className={`w-1.5 h-1.5 rounded-full ${
        isOffline ? "bg-red-500" : "bg-green-500"
      }`}
    />
  );

  return (
    <div ref={ref} className="relative w-48 font-sf-pro">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between w-full px-4 py-2.5 text-sm font-medium transition-all duration-300 
        ${
          isOpen
            ? "text-white bg-[#2D2D2F] border-blue-500/40 ring-2 ring-blue-500/10 shadow-[0_0_12px_rgba(59,130,246,0.15)]"
            : "text-white bg-[#1A1A1C] hover:bg-[#2D2D2F] border-[#2D2D2F]"
        } border rounded-xl`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2 truncate">
          {selectedDevice?.platform && selectedDevice.deviceId !== "All" ? (
            <>
              <StatusDot isOffline={!selectedDevice.isConnected} />
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#0A0A0C]">
                <PlatformIcon
                  platform={selectedDevice.platform}
                  className="w-3 h-3"
                />
              </span>
            </>
          ) : (
            <>
              <span className="w-1.5" /> {/* Spacer for alignment */}
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#0A0A0C]">
                <svg
                  className="w-3 h-3 text-blue-400"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </span>
            </>
          )}
          <span className="truncate">{getSelectedDeviceLabel()}</span>
        </div>
        <svg
          className={`w-4 h-4 ml-2 transition-transform duration-300 ${
            isOpen ? "rotate-180 text-blue-400" : "text-[#A1A1A6]"
          }`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-2 animate-scaleIn">
          <div className="py-1 overflow-hidden bg-[#1A1A1C] rounded-xl shadow-lg border border-[#2D2D2F] ring-1 ring-black/5 shadow-[0_0.5rem_1rem_rgba(0,0,0,0.3)]">
            {/* Sticky header for All Devices */}
            {deviceOptions.length > 1 && deviceOptions[0].value === "All" && (
              <div className="sticky top-0 z-10 bg-[#1A1A1C] border-b border-[#2D2D2F]/70">
                <button
                  type="button"
                  className={`flex items-center w-full px-4 py-3 text-sm font-medium border-b border-[#2D2D2F] transition-colors duration-300 ${
                    selectedDevice?.deviceId === "All"
                      ? "bg-blue-900/20 text-blue-300"
                      : "text-white hover:bg-[#2D2D2F]"
                  }`}
                  onClick={() => handleSelect("All")}
                >
                  <span className="w-1.5" /> {/* Spacer for alignment */}
                  <span className="flex items-center justify-center w-5 h-5 mr-2 rounded-full bg-[#0A0A0C]">
                    <svg
                      className="w-3 h-3 text-blue-400"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                      />
                    </svg>
                  </span>
                  All Devices
                  {selectedDevice?.deviceId === "All" && (
                    <svg
                      className="w-4 h-4 ml-auto text-blue-400"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </button>
              </div>
            )}

            {/* Individual devices */}
            <div className="max-h-56 overflow-y-auto p-1">
              {deviceOptions
                .filter((option) => option.value !== "All")
                .map((option, index) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`flex items-center w-full px-3 py-2 text-sm rounded-lg my-0.5 transition-all duration-300 ${
                      selectedDevice?.deviceId === option.value
                        ? "bg-blue-500/10 text-blue-300 ring-1 ring-blue-500/20"
                        : option.isOffline
                        ? "text-gray-400 hover:bg-[#2D2D2F]/50"
                        : "text-white hover:bg-[#2D2D2F]/70"
                    }`}
                    onClick={() => handleSelect(option.value)}
                    style={{ animationDelay: `${index * 30}ms` }}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <StatusDot isOffline={option.isOffline} />
                      {option.platform ? (
                        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#0A0A0C]">
                          <PlatformIcon
                            platform={option.platform}
                            className="w-3 h-3"
                          />
                        </span>
                      ) : (
                        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#0A0A0C]">
                          <svg
                            className="w-3 h-3 text-gray-400"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
                            />
                          </svg>
                        </span>
                      )}
                      <span className="truncate">{option.label}</span>

                      {/* Selected checkmark */}
                      {selectedDevice?.deviceId === option.value && (
                        <svg
                          className="w-4 h-4 ml-auto text-blue-400"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </div>
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
