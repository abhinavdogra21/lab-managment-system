/**
 * Created by Abhinav Dogra (23ucs507) and Abhinav Thulal (23ucs508)
 */

"use client"

import type * as React from "react"
import { DayPicker } from "react-day-picker"

import { cn } from "@/lib/utils"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({ className, showOutsideDays = true, ...props }: CalendarProps) {
  // Use DayPicker's default styles for a standard calendar look
  return <DayPicker showOutsideDays={showOutsideDays} className={cn(className)} {...props} />
}
Calendar.displayName = "Calendar"

export { Calendar }
