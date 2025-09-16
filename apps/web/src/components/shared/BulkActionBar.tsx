// components/shared/BulkActionBar.tsx
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, MoreHorizontal } from 'lucide-react';

interface BulkAction {
  key: string;
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: 'default' | 'destructive';
}

interface BulkActionBarProps {
  selectedCount: number;
  totalOnPage: number;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  isAllSelected: boolean;
  actions: BulkAction[];
  className?: string;
}

export function BulkActionBar({
  selectedCount,
  totalOnPage,
  onSelectAll,
  onDeselectAll,
  isAllSelected,
  actions,
  className = ""
}: BulkActionBarProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const handleSelectAllChange = (checked: boolean) => {
    if (checked) {
      onSelectAll();
    } else {
      onDeselectAll();
    }
  };

  if (selectedCount === 0) {
    return (
      <div className={`flex items-center gap-4 p-3 border rounded-lg bg-muted/30 ${className}`}>
        <div className="flex items-center gap-2">
          <Checkbox
            checked={false}
            onCheckedChange={handleSelectAllChange}
            aria-label="Select all items on page"
          />
          <span className="text-sm text-muted-foreground">
            Select all ({totalOnPage} on page)
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-between p-3 border rounded-lg bg-zinc-900 border-blue-200 ${className}`}>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Checkbox
            checked={isAllSelected}
            onCheckedChange={handleSelectAllChange}
            aria-label={isAllSelected ? "Deselect all" : "Select all on page"}
          />
          <span className="text-sm font-medium">
            {selectedCount} selected
          </span>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        {actions.slice(0, 2).map((action) => (
          <Button
            key={action.key}
            variant={action.variant || "outline"}
            size="sm"
            onClick={action.onClick}
          >
            {action.icon}
            {action.label}
          </Button>
        ))}
        
        {actions.length > 2 && (
          <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <MoreHorizontal className="h-4 w-4" />
                <ChevronDown className="ml-1 h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {actions.slice(2).map((action) => (
                <DropdownMenuItem
                  key={action.key}
                  onClick={action.onClick}
                  className={action.variant === 'destructive' ? 'text-destructive' : ''}
                >
                  {action.icon}
                  {action.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}