// components/shared/FilterDropdown.tsx
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface FilterOption {
  value: string;
  label: string;
}

interface FilterDropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: FilterOption[];
  placeholder?: string;
  className?: string;
}

export function FilterDropdown({ 
  value, 
  onChange, 
  options, 
  placeholder = "Select...",
  className = ""
}: FilterDropdownProps) {
  return (
    <Select value={value || 'value'} onValueChange={onChange}>
      <SelectTrigger className={`min-w-[120px] ${className}`}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value || 'value'}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}