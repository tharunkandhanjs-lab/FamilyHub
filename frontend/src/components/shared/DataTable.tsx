import React, { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowUp, ArrowDown, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DataTableColumn<T> {
  key: string;
  label: string;
  sortable?: boolean;
  filterable?: boolean;
  render?: (row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  className?: string;
  getRowKey?: (row: T, index: number) => string | number;
}

type SortDirection = "asc" | "desc" | null;

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  className,
  getRowKey = (_, index) => index,
}: DataTableProps<T>) {
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  const handleSort = (columnKey: string, sortable?: boolean) => {
    if (!sortable) return;

    if (sortColumn === columnKey) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else if (sortDirection === "desc") {
        setSortColumn(null);
        setSortDirection(null);
      } else {
        setSortDirection("asc");
      }
    } else {
      setSortColumn(columnKey);
      setSortDirection("asc");
    }
  };

  const sortedData = useMemo(() => {
    if (!sortColumn || !sortDirection) return data;

    return [...data].sort((a, b) => {
      const aVal = a[sortColumn];
      const bVal = b[sortColumn];

      if (aVal == null) return 1;
      if (bVal == null) return -1;

      let comparison = 0;
      if (typeof aVal === "string" && typeof bVal === "string") {
        comparison = aVal.localeCompare(bVal);
      } else if (typeof aVal === "number" && typeof bVal === "number") {
        comparison = aVal - bVal;
      } else {
        comparison = String(aVal).localeCompare(String(bVal));
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [data, sortColumn, sortDirection]);

  const getSortIcon = (columnKey: string, sortable?: boolean) => {
    if (!sortable) return null;

    if (sortColumn === columnKey) {
      return sortDirection === "asc" ? (
        <ArrowUp className="h-3 w-3 ml-1" />
      ) : (
        <ArrowDown className="h-3 w-3 ml-1" />
      );
    }

    return <ChevronsUpDown className="h-3 w-3 ml-1 text-muted-foreground" />;
  };

  return (
    <div
      className={cn(
        "w-full overflow-auto rounded-lg border border-border",
        className,
      )}
    >
      <Table>
        <TableHeader>
          <TableRow className="bg-secondary hover:bg-secondary">
            {columns.map((column) => (
              <TableHead
                key={column.key}
                className={cn(
                  "text-muted-foreground",
                  column.sortable &&
                    "cursor-pointer select-none hover:text-foreground",
                )}
                onClick={() => handleSort(column.key, column.sortable)}
              >
                <div className="flex items-center">
                  {column.label}
                  {getSortIcon(column.key, column.sortable)}
                </div>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedData.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={columns.length}
                className="text-center py-8 text-muted-foreground"
              >
                No data available
              </TableCell>
            </TableRow>
          ) : (
            sortedData.map((row, index) => (
              <TableRow
                key={getRowKey(row, index)}
                className="hover:bg-secondary transition-colors"
              >
                {columns.map((column) => (
                  <TableCell key={column.key} className="text-foreground">
                    {column.render ? column.render(row) : row[column.key]}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
