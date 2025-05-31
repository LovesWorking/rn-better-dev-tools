import {
  DefaultError,
  MutationMeta,
  MutationScope,
  MutationState,
  QueryKey,
  QueryMeta,
  QueryObserverOptions,
  QueryState,
  MutationKey,
} from "@tanstack/react-query";

// SuperJSON result type for serialized states
export interface SuperJSONResult {
  json: Record<string, unknown>;
  meta?: Record<string, unknown>;
}

// Define a simplified version of DehydratedState that both versions can work with
export interface SimpleDehydratedState {
  mutations: unknown[];
  queries: unknown[];
}

export interface SyncMessage {
  type: "dehydrated-state";
  state: SuperJSONResult;
  isOnlineManagerOnline: boolean;
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
  gcTime?: number;
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
