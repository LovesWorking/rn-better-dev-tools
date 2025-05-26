import type {
  DefaultError,
  MutationOptions,
  QueryOptions,
  Query,
  QueryClient,
  Mutation,
} from "@tanstack/react-query";
import { QueryObserver } from "@tanstack/react-query";

import { DehydratedState, ObserverState } from "./types";
import { shouldFilterStorageQuery } from "../utils/storageQueryKeys";
import { useStorageStore } from "../utils/storageStore";

type TransformerFn = (data: any) => any;
function defaultTransformerFn(data: any): any {
  return data;
}

const mockQueryFn = () => {
  return Promise.resolve(null);
};

export function Hydrate(
  client: QueryClient,
  dehydratedState: DehydratedState,
  options?: HydrateOptions
): void {
  if (typeof dehydratedState !== "object" || dehydratedState === null) {
    console.log("dehydratedState is not an object or null");
    return;
  }
  const queryCache = client.getQueryCache();
  const mutationCache = client.getMutationCache();
  const deserializeData =
    options?.defaultOptions?.deserializeData ?? defaultTransformerFn;

  const dehydratedMutations = dehydratedState.mutations || [];
  const dehydratedQueries = dehydratedState.queries || [];

  // Get current storage preferences
  const enabledStorageTypes = useStorageStore.getState().enabledStorageTypes;

  // Sync mutations
  dehydratedMutations.forEach(({ state, ...mutationOptions }) => {
    const existingMutation = mutationCache.getAll().find(
      // @ts-expect-error -  mutation.options.mutationId does exist we add it in the dehydrated state
      (mutation) => mutation.options.mutationId === mutationOptions.mutationId
    );

    if (existingMutation) {
      existingMutation.state = state;
    } else {
      mutationCache.build(
        client,
        {
          ...client.getDefaultOptions().hydrate?.mutations,
          ...options?.defaultOptions?.mutations,
          ...mutationOptions,
        },
        state
      );
    }
  });

  // Hydrate queries - filter out disabled storage queries
  dehydratedQueries.forEach(
    ({ queryKey, state, queryHash, meta, promise, observers, gcTime }) => {
      // Filter out storage queries that are disabled
      if (shouldFilterStorageQuery(queryKey, enabledStorageTypes)) {
        console.log(`Filtering out disabled storage query:`, queryKey);
        return;
      }

      let query = queryCache.get(queryHash);
      const data =
        state.data === undefined ? state.data : deserializeData(state.data);
      // Do not hydrate if an existing query exists with newer data
      if (query) {
        if (
          query.state.dataUpdatedAt < state.dataUpdatedAt ||
          query.state.fetchStatus !== state.fetchStatus
        ) {
          query.setState({
            ...state,
            data,
          });
          query.setOptions({
            ...query.options,
            queryFn: mockQueryFn,
            retry: 0,
            gcTime: gcTime ?? 0,
          });
        }
      } else {
        // Restore query
        query = queryCache.build(
          client,
          {
            ...client.getDefaultOptions().hydrate?.queries,
            ...options?.defaultOptions?.queries,
            queryKey,
            queryHash,
            meta,
            queryFn: mockQueryFn,
            gcTime: gcTime ?? 0,
          },
          {
            ...state,
            data,
          }
        );
      }
      cleanUpObservers(query);
      recreateObserver(client, observers, query);

      if (promise) {
        // Note: `Promise.resolve` required cause
        // RSC transformed promises are not thenable
        const initialPromise = Promise.resolve(promise).then(deserializeData);

        // this doesn't actually fetch - it just creates a retryer
        // which will re-use the passed `initialPromise`
        void query.fetch(undefined, { initialPromise });
      }
    }
  );
  // @ts-expect-error - Refresh mutation state
  mutationCache.notify({ type: "observerResultsUpdated" });
}
// Clean up existing observers
function cleanUpObservers(query: Query) {
  const observers = query.observers;
  observers.forEach((observer) => {
    query.removeObserver(observer);
  });
}

function recreateObserver(
  queryClient: QueryClient,
  observers: ObserverState[],
  query: Query
) {
  observers.forEach((observerState) => {
    // Create a new options object without the unwanted properties
    const cleanedOptions = { ...observerState.options };
    // @ts-expect-error - This prevents infinite queries from being refetched in dev tools
    delete cleanedOptions?.initialPageParam;
    delete cleanedOptions?.behavior;
    // Replace the queryFn with a mock function to prevent errors when restoring error
    cleanedOptions.queryFn = mockQueryFn;
    const observer = new QueryObserver(queryClient, cleanedOptions);
    query.addObserver(observer);
  });
}

export interface DehydrateOptions {
  serializeData?: TransformerFn;
  shouldDehydrateMutation?: (mutation: Mutation) => boolean;
  shouldDehydrateQuery?: (query: Query) => boolean;
  shouldRedactErrors?: (error: unknown) => boolean;
}

export interface HydrateOptions {
  defaultOptions?: {
    deserializeData?: TransformerFn;
    queries?: QueryOptions;
    mutations?: MutationOptions<unknown, DefaultError, unknown, unknown>;
  };
}
