import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, Search, Filter } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface InventoryFiltersProps {
  searchQuery: string;
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  makeFilter: string;
  onMakeFilterChange: (value: string) => void;
  makes: string[];
  selectedVehicles: string[];
  onBulkDelete: () => Promise<void>;
  itemsPerPage: number;
  onPageSizeChange: (size: number) => void;
}

export function InventoryFilters({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  makeFilter,
  onMakeFilterChange,
  makes,
  selectedVehicles,
  onBulkDelete,
  itemsPerPage,
  onPageSizeChange
}: InventoryFiltersProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by year, make, model or trim (e.g. '2023 Toyota', 'Camry SE')"
              className="pl-8"
              value={searchQuery}
              onChange={onSearchChange}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Select value={statusFilter} onValueChange={onStatusFilterChange}>
              <SelectTrigger className="w-[140px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="status">All Status</SelectItem>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="sold">Sold</SelectItem>
                <SelectItem value="reserved">Reserved</SelectItem>
              </SelectContent>
            </Select>

            {makes.length > 0 && (
              <Select value={makeFilter} onValueChange={onMakeFilterChange}>
                <SelectTrigger className="w-[140px]">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Make" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="makes">All Makes</SelectItem>
                  {makes.map((make) => (
                    <SelectItem key={make} value={make}>
                      {make}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Select value={itemsPerPage.toString()} onValueChange={(value) => onPageSizeChange(Number(value))}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Items per page" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 per page</SelectItem>
                <SelectItem value="25">25 per page</SelectItem>
                <SelectItem value="50">50 per page</SelectItem>
                <SelectItem value="100">100 per page</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Bulk delete button */}
          {selectedVehicles.length > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={onBulkDelete}
              className="sm:ml-auto"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete ({selectedVehicles.length})
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
