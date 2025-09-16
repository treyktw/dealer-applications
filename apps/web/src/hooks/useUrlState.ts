import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';

export function useUrlState<T>(
  key: string, 
  defaultValue: T,
  serialize: (value: T) => string = String,
  deserialize: (value: string) => T = (value) => value as T
): [T, (value: T) => void] {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const currentValue = searchParams.get(key);
  const value = currentValue ? deserialize(currentValue) : defaultValue;
  
  const setValue = useCallback((newValue: T) => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (newValue === defaultValue || newValue === '' || newValue === null || newValue === undefined) {
      params.delete(key);
    } else {
      params.set(key, serialize(newValue));
    }
    
    const newUrl = params.toString() ? `?${params.toString()}` : '';
    router.push(newUrl, { scroll: false });
  }, [key, defaultValue, serialize, router, searchParams]);
  
  return [value, setValue];
}