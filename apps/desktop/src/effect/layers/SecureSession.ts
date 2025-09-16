// src/effect/layers/SecureStorage.ts
import { Effect, Layer, Context } from 'effect'
import { invoke } from '@tauri-apps/api/core'

export class StorageError extends Error {
  readonly _tag = 'StorageError'
}

export interface SecureStorageService {
  readonly store: (key: string, value: string) => Effect.Effect<void, StorageError>
  readonly retrieve: (key: string) => Effect.Effect<string | null, StorageError>
  readonly remove: (key: string) => Effect.Effect<void, StorageError>
}

export const SecureStorageService = Context.GenericTag<SecureStorageService>('SecureStorageService')

export const TauriSecureStorageLayer = Layer.succeed(
  SecureStorageService,
  SecureStorageService.of({
    store: (key, value) =>
      Effect.tryPromise({
        try: () => invoke<void>('store_secure', { key, value }),
        catch: (error) => new StorageError(`Failed to store: ${error}`)
      }),
    
    retrieve: (key) =>
      Effect.tryPromise({
        try: () => invoke<string | null>('retrieve_secure', { key }),
        catch: (error) => new StorageError(`Failed to retrieve: ${error}`)
      }),
    
    remove: (key) =>
      Effect.tryPromise({
        try: () => invoke<void>('remove_secure', { key }),
        catch: (error) => new StorageError(`Failed to remove: ${error}`)
      })
  })
)