import * as React from "react";
import { ChevronRight } from "lucide-react";

export const Breadcrumb = React.forwardRef<
  HTMLElement,
  React.ComponentPropsWithoutRef<"nav">
>(({ className = "", ...props }, ref) => (
  <nav
    ref={ref}
    aria-label="Navigasi rekam jejak (breadcrumb)"
    className={`w-full ${className}`}
    {...props}
  />
));
Breadcrumb.displayName = "Breadcrumb";

export const BreadcrumbList = React.forwardRef<
  HTMLOListElement,
  React.ComponentPropsWithoutRef<"ol">
>(({ className = "", ...props }, ref) => (
  <ol
    ref={ref}
    className={`flex flex-wrap items-center gap-1.5 break-words text-sm text-biru-700 ${className}`}
    {...props}
  />
));
BreadcrumbList.displayName = "BreadcrumbList";

export const BreadcrumbItem = React.forwardRef<
  HTMLLIElement,
  React.ComponentPropsWithoutRef<"li">
>(({ className = "", ...props }, ref) => (
  <li
    ref={ref}
    className={`inline-flex items-center gap-1.5 ${className}`}
    {...props}
  />
));
BreadcrumbItem.displayName = "BreadcrumbItem";

export interface BreadcrumbLinkProps extends React.ComponentPropsWithoutRef<"a"> {
  asChild?: boolean;
}

export const BreadcrumbLink = React.forwardRef<
  HTMLAnchorElement,
  BreadcrumbLinkProps
>(({ className = "", asChild, children, ...props }, ref) => {
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<any>, {
      ref,
      className:
        `${(children.props as any).className || ""} ${className}`.trim(),
      ...props,
    });
  }

  return (
    <a
      ref={ref}
      className={`transition-colors hover:text-biru-950 hover:underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-biru-500 rounded ${className}`}
      {...props}
    >
      {children}
    </a>
  );
});
BreadcrumbLink.displayName = "BreadcrumbLink";

export const BreadcrumbPage = React.forwardRef<
  HTMLSpanElement,
  React.ComponentPropsWithoutRef<"span">
>(({ className = "", ...props }, ref) => (
  <span
    ref={ref}
    role="link"
    aria-disabled="true"
    aria-current="page"
    className={`font-semibold text-biru-950 ${className}`}
    {...props}
  />
));
BreadcrumbPage.displayName = "BreadcrumbPage";

export const BreadcrumbSeparator = ({
  children,
  className = "",
  ...props
}: React.ComponentPropsWithoutRef<"li">) => (
  <li
    role="presentation"
    aria-hidden="true"
    className={`text-biru-400 [&>svg]:size-3.5 ${className}`}
    {...props}
  >
    {children ?? <ChevronRight className="h-3.5 w-3.5 text-biru-300" />}
  </li>
);
BreadcrumbSeparator.displayName = "BreadcrumbSeparator";
