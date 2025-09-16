import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface FilterChip {
  key: string;
  label: string;
  value: string;
  onRemove: () => void;
}

interface FilterChipsProps {
  chips: FilterChip[];
  onClearAll?: () => void;
  className?: string;
}

export function FilterChips({ chips, onClearAll, className = "" }: FilterChipsProps) {
  if (chips.length === 0) return null;

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <span className="text-sm text-muted-foreground">Active filters:</span>
      {chips.map((chip) => (
        <Badge key={chip.key} variant="secondary" className="flex items-center gap-1">
          <span className="text-xs font-medium">{chip.label}:</span>
          <span className="text-xs">{chip.value}</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-3 w-3 p-0 hover:bg-transparent"
            onClick={chip.onRemove}
          >
            <X className="h-2 w-2" />
          </Button>
        </Badge>
      ))}
      {chips.length > 1 && onClearAll && (
        <Button variant="outline" size="sm" onClick={onClearAll}>
          Clear all
        </Button>
      )}
    </div>
  );
}