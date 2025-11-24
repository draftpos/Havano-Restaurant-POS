import * as React from "react";

import { cn } from "@/lib/utils";

function Table({ className, maxHeight, ...props }) {
  const heightClasses = {
    sm: "max-h-60",
    md: "max-h-80",
    lg: "max-h-96",
  };

  const isTailwindKey = maxHeight && heightClasses[maxHeight];
  const styleHeight = !isTailwindKey && maxHeight ? { maxHeight } : undefined;

  return (
    <div
      data-slot="table-container"
      className={cn(
        "relative w-full overflow-x-auto overflow-y-auto rounded-2xl border border-border bg-background shadow-sm touch-pan-y",
        isTailwindKey && heightClasses[maxHeight]
      )}
      style={styleHeight}
    >
      <table
        data-slot="table"
        className={cn(
          "w-full caption-bottom text-sm sm:text-base border-collapse",
          className
        )}
        {...props}
      />
    </div>
  );
}

function TableHeader({ className, ...props }) {
  return (
    <thead
      data-slot="table-header"
      className={cn(
        "[&_tr]:border-b bg-background sticky top-0 z-10 backdrop-blur-sm",
        className
      )}
      {...props}
    />
  );
}

function TableBody({ className, ...props }) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("[&_tr:last-child]:border-0", className)}
      {...props}
    />
  );
}

function TableFooter({ className, ...props }) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn(
        "border-t font-medium [&>tr]:last:border-b-0 bg-muted/30",
        className
      )}
      {...props}
    />
  );
}

function TableRow({ className, ...props }) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "border-b touch-manipulation rounded-xl",
        // Add vertical spacing between rows visually
        " [&:not(:last-child)]:mb-1 sm:[&:not(:last-child)]:mb-2",
        className
      )}
      {...props}
    />
  );
}

function TableHead({ className, ...props }) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        "text-foreground h-12 px-4 text-left align-middle font-semibold whitespace-nowrap select-none",
        "sm:h-14 sm:px-6",
        className
      )}
      {...props}
    />
  );
}

function TableCell({ className, ...props }) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        "p-4 sm:p-6 align-middle whitespace-nowrap text-sm sm:text-base",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg",
        className
      )}
      {...props}
    />
  );
}

function TableCaption({ className, ...props }) {
  return (
    <caption
      data-slot="table-caption"
      className={cn(
        "text-muted-foreground mt-4 text-sm sm:text-base text-center",
        className
      )}
      {...props}
    />
  );
}

export {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
};
