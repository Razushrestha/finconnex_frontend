"use client";

import * as React from "react";
import {
  DayPicker,
  getDefaultClassNames,
  type DayButton,
  type Locale,
} from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDownIcon,
} from "lucide-react";

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = "dropdown",
  buttonVariant = "ghost",
  locale,
  formatters,
  components,
  ...props
}: React.ComponentProps<typeof DayPicker> & {
  buttonVariant?: React.ComponentProps<typeof Button>["variant"];
}) {
  const defaultClassNames = getDefaultClassNames();

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn(
        "group/calendar bg-white p-4 [--cell-radius:0.75rem] [--cell-size:2.25rem] w-[320px] rounded-2xl border border-gray-100 shadow-xl",
        String.raw`rtl:**:[.rdp-button\_next>svg]:rotate-180`,
        String.raw`rtl:**:[.rdp-button\_previous>svg]:rotate-180`,
        className,
      )}
      captionLayout={captionLayout}
      locale={locale}
      formatters={{
        formatMonthDropdown: (date) =>
          date.toLocaleString(locale?.code, { month: "long" }),
        ...formatters,
      }}
      classNames={{
        root: cn("w-full", defaultClassNames.root),
        months: cn("relative flex flex-col gap-4", defaultClassNames.months),
        month: cn("flex w-full flex-col gap-3", defaultClassNames.month),
        nav: cn(
          "absolute right-1 top-0 flex items-center gap-0.5 z-20 text-violet-600 h-9",
          defaultClassNames.nav,
        ),
        button_previous: cn(
          buttonVariants({ variant: buttonVariant }),
          "h-7 w-7 p-0 select-none rounded-lg hover:bg-gray-100 text-violet-600 aria-disabled:opacity-50",
          defaultClassNames.button_previous,
        ),
        button_next: cn(
          buttonVariants({ variant: buttonVariant }),
          "h-7 w-7 p-0 select-none rounded-lg hover:bg-gray-100 text-violet-600 aria-disabled:opacity-50",
          defaultClassNames.button_next,
        ),
        month_caption: cn(
          "flex h-9 w-full items-center justify-between px-0 gap-2",
          defaultClassNames.month_caption,
        ),
        dropdowns: cn(
          "flex h-9 items-center justify-start gap-2 text-sm font-medium w-full",
          defaultClassNames.dropdowns,
        ),
        dropdown_root: cn(
          "relative rounded-xl border border-gray-200 bg-white hover:border-gray-300 transition-colors shadow-xs flex-1",
          defaultClassNames.dropdown_root,
        ),
        dropdown: cn(
          "absolute inset-0 opacity-0 cursor-pointer w-full h-full",
          defaultClassNames.dropdown,
        ),
        caption_label: cn(
          "flex items-center justify-between px-3 py-2 text-[13px] font-medium text-gray-800 w-full select-none [&>svg]:size-4 [&>svg]:text-violet-600",
          defaultClassNames.caption_label,
        ),
        month_grid: cn(
          "w-full border-collapse mt-1",
          defaultClassNames.month_grid,
        ),
        weekdays: cn(
          "grid grid-cols-7 mb-2 text-center text-xs font-medium text-gray-800 px-0",
          defaultClassNames.weekdays,
        ),
        weekday: cn(
          "h-7 flex items-center justify-center text-xs font-medium text-gray-800 select-none",
          defaultClassNames.weekday,
        ),
        week: cn("grid grid-cols-7 w-full mb-1.5", defaultClassNames.week),
        week_number_header: cn(
          "w-(--cell-size) select-none",
          defaultClassNames.week_number_header,
        ),
        week_number: cn(
          "text-[0.8rem] text-muted-foreground select-none",
          defaultClassNames.week_number,
        ),
        day: cn(
          "relative h-7 w-7 p-0 text-center select-none flex items-center justify-center mx-auto",
          defaultClassNames.day,
        ),
        range_start: cn(
          "rounded-l-lg bg-violet-600 text-white",
          defaultClassNames.range_start,
        ),
        range_middle: cn(
          "rounded-none bg-muted text-foreground",
          defaultClassNames.range_middle,
        ),
        range_end: cn(
          "rounded-r-lg bg-violet-600 text-white",
          defaultClassNames.range_end,
        ),
        today: cn(
          "bg-transparent text-gray-900 font-semibold",
          defaultClassNames.today,
        ),
        outside: cn(
          "text-gray-300 hover:bg-gray-50",
          defaultClassNames.outside,
        ),
        disabled: cn(
          "text-muted-foreground opacity-50",
          defaultClassNames.disabled,
        ),
        hidden: cn("invisible", defaultClassNames.hidden),
        ...classNames,
      }}
      components={{
        Root: ({ className, rootRef, ...props }) => {
          return (
            <div
              data-slot="calendar"
              ref={rootRef}
              className={cn(className)}
              {...props}
            />
          );
        },
        Chevron: ({ className, orientation, ...props }) => {
          if (orientation === "left") {
            return (
              <ChevronLeftIcon
                className={cn("size-4 text-violet-600", className)}
                {...props}
              />
            );
          }

          if (orientation === "right") {
            return (
              <ChevronRightIcon
                className={cn("size-4 text-violet-600", className)}
                {...props}
              />
            );
          }

          return (
            <ChevronDownIcon
              className={cn("size-4 text-violet-600", className)}
              {...props}
            />
          );
        },
        DayButton: ({ ...props }) => (
          <CalendarDayButton locale={locale} {...props} />
        ),
        WeekNumber: ({ children, ...props }) => {
          return (
            <td {...props}>
              <div className="flex size-7 items-center justify-center text-center">
                {children}
              </div>
            </td>
          );
        },
        ...components,
      }}
      {...props}
    />
  );
}

function CalendarDayButton({
  className,
  day,
  modifiers,
  locale,
  ...props
}: React.ComponentProps<typeof DayButton> & { locale?: Partial<Locale> }) {
  const defaultClassNames = getDefaultClassNames();

  const ref = React.useRef<HTMLButtonElement>(null);
  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus();
  }, [modifiers.focused]);

  return (
    <Button
      ref={ref}
      variant="ghost"
      size="icon"
      data-day={day.date.toLocaleDateString(locale?.code)}
      data-selected-single={
        modifiers.selected &&
        !modifiers.range_start &&
        !modifiers.range_end &&
        !modifiers.range_middle
      }
      data-range-start={modifiers.range_start}
      data-range-end={modifiers.range_end}
      data-range-middle={modifiers.range_middle}
      className={cn(
        "h-7 w-7 rounded-lg font-medium text-xs text-gray-700 transition-colors p-0 hover:bg-gray-100",
        modifiers.outside && "text-gray-300 hover:bg-gray-50",
        modifiers.selected &&
          "bg-violet-600 text-white font-semibold shadow-sm hover:bg-violet-700 hover:text-white focus:bg-violet-700 focus:text-white",
        defaultClassNames.day,
        className,
      )}
      {...props}
    />
  );
}

export { Calendar, CalendarDayButton };
