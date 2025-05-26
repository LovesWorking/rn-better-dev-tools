import { create } from "zustand";
import { persist } from "zustand/middleware";
import { StorageType } from "./storageQueryKeys";

interface StorageStore {
  enabledStorageTypes: Set<StorageType>;
  setStorageTypeEnabled: (storageType: StorageType, enabled: boolean) => void;
  isStorageTypeEnabled: (storageType: StorageType) => boolean;
  clearAllStorageTypes: () => void;
  enableAllStorageTypes: () => void;
}

export const useStorageStore = create<StorageStore>()(
  persist(
    (set, get) => ({
      // By default, all storage types are enabled
      enabledStorageTypes: new Set<StorageType>(["mmkv", "async", "secure"]),

      setStorageTypeEnabled: (storageType: StorageType, enabled: boolean) => {
        set((state) => {
          const newEnabledTypes = new Set(state.enabledStorageTypes);
          if (enabled) {
            newEnabledTypes.add(storageType);
          } else {
            newEnabledTypes.delete(storageType);
          }
          return { enabledStorageTypes: newEnabledTypes };
        });
      },

      isStorageTypeEnabled: (storageType: StorageType) => {
        return get().enabledStorageTypes.has(storageType);
      },

      clearAllStorageTypes: () => {
        set({ enabledStorageTypes: new Set() });
      },

      enableAllStorageTypes: () => {
        set({ enabledStorageTypes: new Set(["mmkv", "async", "secure"]) });
      },
    }),
    {
      name: "storage-preferences",
      // Transform Set to Array for storage
      partialize: (state) => ({
        ...state,
        enabledStorageTypes: Array.from(state.enabledStorageTypes),
      }),
      // Transform Array back to Set when loading
      onRehydrateStorage: () => (state) => {
        if (
          state &&
          "enabledStorageTypes" in state &&
          Array.isArray(state.enabledStorageTypes)
        ) {
          state.enabledStorageTypes = new Set(
            state.enabledStorageTypes as StorageType[]
          );
        }
      },
    }
  )
);
