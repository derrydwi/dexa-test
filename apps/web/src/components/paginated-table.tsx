import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { Pagination } from "./ui/pagination";

export function PaginatedTable({
  children,
  total,
  page,
  pageSize = 20,
  onPage,
}: {
  children: ReactNode;
  total: number;
  page: number;
  pageSize?: number;
  onPage: (page: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <>
      <div
        className="table-scroll"
        tabIndex={0}
        aria-label="Scrollable data table"
      >
        {children}
      </div>
      <Pagination className="pagination">
        <span>
          {total
            ? `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} of ${total}`
            : "0 records"}
        </span>
        <div>
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label="Previous page"
            disabled={page <= 1}
            onClick={() => onPage(page - 1)}
          >
            <ChevronLeft size={18} />
          </Button>
          <span>
            Page {page} of {pages}
          </span>
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label="Next page"
            disabled={page >= pages}
            onClick={() => onPage(page + 1)}
          >
            <ChevronRight size={18} />
          </Button>
        </div>
      </Pagination>
    </>
  );
}
