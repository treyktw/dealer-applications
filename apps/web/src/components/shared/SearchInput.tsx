// components/shared/SearchInput.tsx
import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Search, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  isSearching?: boolean;
  className?: string;
}

export function SearchInput({ 
  value, 
  onChange, 
  placeholder = "Search...", 
  isSearching = false,
  className = "" 
}: SearchInputProps) {
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    onChange(newValue);
  };

  const handleClear = () => {
    setLocalValue('');
    onChange('');
  };

  return (
    <div className={`relative ${className}`}>
      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
      <Input
        placeholder={placeholder}
        value={localValue}
        onChange={handleChange}
        className="pl-8 pr-8"
      />
      <div className="absolute right-2.5 top-2.5 flex items-center">
        {isSearching && (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mr-1" />
        )}
        {localValue && (
          <Button
            variant="ghost"
            size="sm"
            className="h-4 w-4 p-0 hover:bg-transparent"
            onClick={handleClear}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );
}