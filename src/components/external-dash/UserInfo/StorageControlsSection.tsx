import React, { useCallback, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useStorageStore } from "../utils/storageStore";
import {
  StorageType,
  isStorageQuery,
  getStorageType,
} from "../utils/storageQueryKeys";

interface StorageControlsSectionProps {
  deviceId?: string; // Made optional for global usage
}

export const StorageControlsSection: React.FC<StorageControlsSectionProps> =
  React.memo(({ deviceId }) => {
    const queryClient = useQueryClient();
    const [isExpanded, setIsExpanded] = useState(false);

    // Get the entire store state to ensure reactivity
    const { enabledStorageTypes, setStorageTypeEnabled } = useStorageStore();

    const handleStorageToggle = useCallback(
      (storageType: StorageType) => {
        const isCurrentlyEnabled = enabledStorageTypes.has(storageType);
        const newEnabledState = !isCurrentlyEnabled;

        setStorageTypeEnabled(storageType, newEnabledState);

        if (!newEnabledState) {
          // Use requestAnimationFrame to defer heavy query operations
          // This prevents blocking the UI during transitions
          requestAnimationFrame(() => {
            const queryCache = queryClient.getQueryCache();
            const allQueries = queryCache.getAll();

            allQueries.forEach((query) => {
              if (
                isStorageQuery(query.queryKey) &&
                getStorageType(query.queryKey) === storageType
              ) {
                queryClient.removeQueries({ queryKey: query.queryKey });
              }
            });
          });
        }
      },
      [enabledStorageTypes, setStorageTypeEnabled, queryClient]
    );

    const storageTypes = useMemo(
      () => [
        {
          type: "mmkv" as StorageType,
          label: "MMKV",
          description: "High-performance key-value storage",
          icon: "⚡",
        },
        {
          type: "async" as StorageType,
          label: "AsyncStorage",
          description: "React Native async storage",
          icon: "📱",
        },
        {
          type: "secure" as StorageType,
          label: "SecureStorage",
          description: "Encrypted secure storage",
          icon: "🔒",
        },
      ],
      []
    );

    const enabledCount = enabledStorageTypes.size;
    const totalCount = storageTypes.length;

    // If deviceId is provided, render the old card-style layout for user info
    if (deviceId) {
      return (
        <>
          <div className="col-span-2 border-t border-[#2D2D2F]/70 my-3" />
          <div className="col-span-2 mb-2">
            <div
              className="flex items-center gap-1.5 text-[#F5F5F7] font-medium cursor-pointer hover:text-white transition-colors duration-200"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              <svg
                className="w-4 h-4 text-blue-400"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z" />
              </svg>
              <span>Storage Query Controls</span>
              <span className="text-xs text-[#86868B] ml-2 font-mono bg-[#2D2D2F]/50 px-2 py-0.5 rounded">
                {enabledCount}/{totalCount} enabled
              </span>
              <svg
                className={`w-4 h-4 ml-auto transition-transform duration-200 ${
                  isExpanded ? "rotate-180" : ""
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
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

          {isExpanded && (
            <div className="col-span-2">
              <div className="space-y-2">
                {storageTypes.map(({ type, label, description, icon }) => {
                  const isEnabled = enabledStorageTypes.has(type);

                  return (
                    <button
                      key={type}
                      onClick={() => handleStorageToggle(type)}
                      className={`w-full p-4 rounded-xl border transition-all duration-300 ease-out ${
                        isEnabled
                          ? "bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/15 hover:border-blue-500/40"
                          : "bg-red-500/10 border-red-500/30 hover:bg-red-500/15 hover:border-red-500/40"
                      }`}
                      aria-pressed={isEnabled}
                      role="switch"
                      type="button"
                      title={isEnabled ? `Disable ${label}` : `Enable ${label}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex items-center justify-center w-10 h-10 rounded-xl transition-colors duration-300 ${
                              isEnabled
                                ? "bg-blue-500/20 text-blue-300"
                                : "bg-red-500/20 text-red-300"
                            }`}
                          >
                            <span className="text-xl">{icon}</span>
                          </div>
                          <div className="text-left">
                            <div
                              className={`font-medium transition-colors duration-300 ${
                                isEnabled ? "text-blue-200" : "text-red-200"
                              }`}
                            >
                              {label}
                            </div>
                            <div className="text-xs text-[#A1A1A6] leading-relaxed">
                              {description}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center">
                          <div
                            className={`w-12 h-6 rounded-full flex items-center px-1 transition-all duration-300 ease-out ${
                              isEnabled ? "bg-blue-500" : "bg-red-500"
                            }`}
                          >
                            <div
                              className={`w-4 h-4 rounded-full bg-white shadow-md transform transition-transform duration-300 ease-out ${
                                isEnabled ? "translate-x-6" : "translate-x-0"
                              }`}
                            />
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 pt-4 border-t border-[#2D2D2F]/50">
                <div className="text-xs text-[#86868B] leading-relaxed">
                  <div className="flex items-start gap-2">
                    <svg
                      className="w-3 h-3 mt-0.5 text-blue-400 flex-shrink-0"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
                    </svg>
                    <span>
                      Disabling a storage type will clear its queries from React
                      Query DevTools and filter out new queries. Re-enabling
                      will show new queries but won't restore previously cleared
                      ones.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      );
    }

    // Global header layout - compact dropdown style
    return (
      <div className="relative">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="group flex items-center gap-2 px-3 py-1.5 rounded-full transition-all duration-500 ease-out hover:bg-[#1D1D1F]/40 border border-transparent hover:border-[#2D2D2F]/70"
        >
          <svg
            className="w-3 h-3 text-blue-400"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z" />
          </svg>
          <span className="text-xs font-medium text-[#A1A1A6] group-hover:text-[#F5F5F7] transition-colors duration-300">
            #storage
          </span>
          <span className="text-xs text-[#86868B] font-mono bg-[#2D2D2F]/50 px-1.5 py-0.5 rounded text-[10px]">
            {enabledCount}/{totalCount}
          </span>
          <svg
            className={`w-3 h-3 transition-transform duration-300 ${
              isExpanded ? "rotate-180" : ""
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>

        {isExpanded && (
          <div className="absolute top-full right-0 mt-2 w-80 bg-[#1A1A1C] border border-[#2D2D2F]/60 rounded-xl shadow-[0_0.5rem_1.5rem_rgba(0,0,0,0.25)] z-50">
            <div className="p-4">
              <div className="space-y-3">
                {storageTypes.map(({ type, label, description, icon }) => {
                  const isEnabled = enabledStorageTypes.has(type);

                  return (
                    <button
                      key={type}
                      onClick={() => handleStorageToggle(type)}
                      className={`w-full p-4 rounded-lg border transition-all duration-300 ease-out ${
                        isEnabled
                          ? "bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/15 hover:border-blue-500/40"
                          : "bg-red-500/10 border-red-500/30 hover:bg-red-500/15 hover:border-red-500/40"
                      }`}
                      aria-pressed={isEnabled}
                      role="switch"
                      type="button"
                      title={isEnabled ? `Disable ${label}` : `Enable ${label}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex items-center justify-center w-10 h-10 rounded-lg transition-colors duration-300 ${
                              isEnabled
                                ? "bg-blue-500/20 text-blue-300"
                                : "bg-red-500/20 text-red-300"
                            }`}
                          >
                            <span className="text-xl">{icon}</span>
                          </div>
                          <div className="text-left">
                            <div
                              className={`text-sm font-medium transition-colors duration-300 ${
                                isEnabled ? "text-blue-200" : "text-red-200"
                              }`}
                            >
                              {label}
                            </div>
                            <div className="text-xs text-[#A1A1A6] leading-relaxed">
                              {description}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center">
                          <div
                            className={`w-12 h-6 rounded-full flex items-center px-1 transition-all duration-300 ease-out ${
                              isEnabled ? "bg-blue-500" : "bg-red-500"
                            }`}
                          >
                            <div
                              className={`w-4 h-4 rounded-full bg-white shadow-md transform transition-transform duration-300 ease-out ${
                                isEnabled ? "translate-x-6" : "translate-x-0"
                              }`}
                            />
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 pt-4 border-t border-[#2D2D2F]/50">
                <div className="text-xs text-[#86868B] leading-relaxed">
                  <div className="flex items-start gap-2">
                    <svg
                      className="w-3 h-3 mt-0.5 text-blue-400 flex-shrink-0"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
                    </svg>
                    <span>
                      Global setting that affects storage queries in React Query
                      DevTools for all devices.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  });
