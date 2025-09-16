// components/shared/ItemsPerPageSelector.tsx
import { FilterDropdown } from './FilterDropdown';

interface ItemsPerPageSelectorProps {
  value: number;
  onChange: (value: number) => void;
  options?: number[];
  className?: string;
}

export function ItemsPerPageSelector({ 
  value, 
  onChange, 
  options = [10, 25, 50, 100],
  className = ""
}: ItemsPerPageSelectorProps) {
  const filterOptions = options.map(option => ({
    value: String(option),
    label: `${option} per page`
  }));

  return (
    <FilterDropdown
      value={String(value)}
      onChange={(stringValue) => onChange(Number(stringValue))}
      options={filterOptions}
      placeholder="Items per page"
      className={className}
    />
  );
}
