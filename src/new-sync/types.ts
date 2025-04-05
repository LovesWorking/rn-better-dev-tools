import {
  DefaultError,
  MutationKey,
  MutationMeta,
  MutationScope,
  MutationState,
  QueryKey,
  QueryMeta,
  QueryObserverOptions,
  QueryState,
} from "@tanstack/react-query";
// Define a simplified version of DehydratedState that both versions can work with
export interface SimpleDehydratedState {
  mutations: unknown[];
  queries: unknown[];
}

export interface SyncMessage {
  type: "dehydrated-state";
  state: DehydratedState;
  extraDeviceInfo?: Record<string, string>; // Additional device information as key-value pairs
  isOnlineManagerOnline: boolean;
  deviceName: string;
  persistentDeviceId: string;
}

export interface DehydratedState {
  mutations: DehydratedMutation[];
  queries: DehydratedQuery[];
}

export interface DehydratedMutation {
  mutationId: number;
  mutationKey?: MutationKey;
  state: MutationState;
  meta?: MutationMeta;
  scope?: MutationScope;
}
export interface DehydratedQuery {
  queryHash: string;
  queryKey: QueryKey;
  state: QueryState;
  promise?: Promise<unknown>;
  meta?: QueryMeta;
  observers: ObserverState[];
}
export interface ObserverState<
  TQueryFnData = unknown,
  TError = DefaultError,
  TData = TQueryFnData,
  TQueryData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey
> {
  queryHash: string;
  options: QueryObserverOptions<
    TQueryFnData,
    TError,
    TData,
    TQueryData,
    TQueryKey
  >;
}

export interface User {
  id: string;
  deviceName: string;
  deviceId: string; // Persisted device ID
  platform?: string; // Device platform (iOS, Android, Web)
  isConnected?: boolean; // Whether the device is currently connected
  extraDeviceInfo?: Record<string, string>; // Additional device information as key-value pairs
}
