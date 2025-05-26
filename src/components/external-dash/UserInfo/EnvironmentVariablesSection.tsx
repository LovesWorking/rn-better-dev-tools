import React, { useState } from "react";
import { InfoRow } from "./InfoRow";

interface Props {
  envVariables: Record<string, any>;
}

const formatValue = (value: any, key?: string): React.ReactElement => {
  // Special handling for NODE_ENV
  if (key === "NODE_ENV" && typeof value === "string") {
    const env = value.toLowerCase();
    let envStyles = "";

    switch (env) {
      case "development":
      case "dev":
        envStyles =
          "bg-green-900/80 text-green-300 shadow-[0_0_8px_rgba(74,222,128,0.1)]";
        break;
      case "production":
      case "prod":
        envStyles =
          "bg-blue-900/80 text-blue-300 shadow-[0_0_8px_rgba(59,130,246,0.1)]";
        break;
      case "staging":
      case "stage":
        envStyles =
          "bg-yellow-900/80 text-yellow-300 shadow-[0_0_8px_rgba(250,204,21,0.1)]";
        break;
      case "test":
      case "testing":
        envStyles =
          "bg-red-900/80 text-red-300 shadow-[0_0_8px_rgba(248,113,113,0.1)]";
        break;
      default:
        envStyles =
          "bg-purple-900/80 text-purple-300 shadow-[0_0_8px_rgba(147,51,234,0.1)]";
    }

    return (
      <span
        className={`inline-block px-3 py-1 text-xs font-medium rounded-full transition-all duration-500 ease-out break-words max-w-full ${envStyles}`}
      >
        {value}
      </span>
    );
  }

  // Check if it's a string boolean first
  if (
    typeof value === "string" &&
    (value.toLowerCase() === "true" || value.toLowerCase() === "false")
  ) {
    const boolValue = value.toLowerCase() === "true";
    return (
      <span
        className={`inline-block px-3 py-1 text-xs font-medium rounded-full transition-all duration-500 ease-out break-words max-w-full ${
          boolValue
            ? "bg-green-900/80 text-green-300 shadow-[0_0_8px_rgba(74,222,128,0.1)]"
            : "bg-red-900/80 text-red-300 shadow-[0_0_8px_rgba(248,113,113,0.1)]"
        }`}
      >
        {boolValue ? "true" : "false"}
      </span>
    );
  }

  if (typeof value === "boolean") {
    return (
      <span
        className={`inline-block px-3 py-1 text-xs font-medium rounded-full transition-all duration-500 ease-out break-words max-w-full ${
          value
            ? "bg-green-900/80 text-green-300 shadow-[0_0_8px_rgba(74,222,128,0.1)]"
            : "bg-red-900/80 text-red-300 shadow-[0_0_8px_rgba(248,113,113,0.1)]"
        }`}
      >
        {value ? "true" : "false"}
      </span>
    );
  }

  if (typeof value === "string") {
    return (
      <span className="inline-block px-2 py-1 text-xs font-medium rounded-md bg-red-900/20 text-red-300 border border-red-900/30 shadow-inner break-words word-break-all max-w-full">
        {value}
      </span>
    );
  }

  if (typeof value === "number") {
    return (
      <span className="inline-block px-2 py-1 text-xs font-medium rounded-md bg-blue-900/20 text-blue-300 border border-blue-900/30 shadow-inner break-words max-w-full">
        {value}
      </span>
    );
  }

  if (value === null) {
    return (
      <span className="inline-block px-2 py-1 text-xs font-medium rounded-md bg-gray-900/20 text-gray-400 border border-gray-900/30 shadow-inner italic break-words max-w-full">
        null
      </span>
    );
  }

  if (value === undefined) {
    return (
      <span className="inline-block px-2 py-1 text-xs font-medium rounded-md bg-gray-900/20 text-gray-400 border border-gray-900/30 shadow-inner italic break-words max-w-full">
        undefined
      </span>
    );
  }

  // For objects, arrays, etc.
  return (
    <span className="inline-block px-2 py-1 text-xs font-medium rounded-md bg-yellow-900/20 text-yellow-300 border border-yellow-900/30 shadow-inner break-words word-break-all max-w-full">
      {JSON.stringify(value)}
    </span>
  );
};

export const EnvironmentVariablesSection: React.FC<Props> = ({
  envVariables,
}) => {
  const hasEnvVariables = Object.keys(envVariables).length > 0;
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <>
      <div className="col-span-2 border-t border-[#2D2D2F]/70 my-3" />
      <div className="col-span-2 mb-2">
        <div
          className="flex items-center gap-1.5 text-[#F5F5F7] font-medium cursor-pointer hover:text-white transition-colors duration-200"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <svg
            className={`w-4 h-4 ${
              hasEnvVariables ? "text-green-400" : "text-amber-400"
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
            />
          </svg>
          <span>Environment Variables</span>
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
        <>
          {hasEnvVariables ? (
            <>
              {Object.entries(envVariables).map(([key, value]) => (
                <div
                  key={key}
                  className="col-span-2 grid grid-cols-2 gap-3 mb-2 min-w-0"
                >
                  <div className="text-[#A1A1A6] text-sm break-words overflow-hidden min-w-0">
                    <span className="font-mono">{key}</span>
                  </div>
                  <div className="text-sm break-words overflow-hidden font-mono min-w-0">
                    {formatValue(value, key)}
                  </div>
                </div>
              ))}
            </>
          ) : (
            <div className="col-span-2 text-xs text-[#A1A1A6]">
              <div className="mb-2">
                No environment variables available. Pass ENV variables via the{" "}
                <code className="px-1.5 py-0.5 bg-[#0A0A0C] rounded text-green-300">
                  envVariables
                </code>{" "}
                prop:
              </div>
              <code className="text-xs bg-[#0A0A0C]/70 rounded-lg p-3 font-mono text-[#F5F5F7] block w-full">
                envVariables: {"{"}
                "NODE_ENV": "development", "API_URL": "https://api.example.com",
                ...
                {"}"}
              </code>
            </div>
          )}
        </>
      )}
    </>
  );
};
