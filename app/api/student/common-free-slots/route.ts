/**
 * Created by Abhinav Dogra (23ucs507) and Abhinav Thulal (23ucs508)
 */

import { NextRequest, NextResponse } from "next/server"
import { Database } from "@/lib/database"

const db = Database.getInstance()

// GET /api/student/common-free-slots?lab_ids=1,2,3&date=2025-11-15
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const labIdsParam = searchParams.get('lab_ids')
    const date = searchParams.get('date')

    if (!labIdsParam || !date) {
      return NextResponse.json(
        { error: "Missing lab_ids or date parameter" },
        { status: 400 }
      )
    }

    const labIds = labIdsParam.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id))

    if (labIds.length === 0) {
      return NextResponse.json(
        { error: "Invalid lab_ids parameter" },
        { status: 400 }
      )
    }

    console.log(`Finding common free slots for labs [${labIds.join(', ')}] on ${date}`)

    // Define full day hours (00:00 - 23:59) - no restrictions
    const businessStart = '00:00:00'
    const businessEnd = '23:59:00'

    // Convert time string to minutes since midnight
    const timeToMinutes = (time: string): number => {
      const [hours, minutes] = time.split(':').map(Number)
      return hours * 60 + minutes
    }

    // Convert minutes to time string
    const minutesToTime = (minutes: number): string => {
      const hours = Math.floor(minutes / 60)
      const mins = minutes % 60
      return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:00`
    }

    // For each lab, get all occupied time ranges (bookings + timetable)
    const labOccupiedSlots = await Promise.all(
      labIds.map(async (labId) => {
        // Get bookings for this lab on this date
        const bookingsResult = await db.query(`
          SELECT start_time, end_time 
          FROM booking_requests 
          WHERE lab_id = ? 
            AND booking_date = ? 
            AND status IN ('approved', 'pending_faculty', 'pending_lab_staff', 'pending_hod')
        `, [labId, date])
        const bookings = bookingsResult.rows || []

        // Get timetable entries for this lab on this date
        // day_of_week: 0=Sunday, 1=Monday, 2=Tuesday, ..., 6=Saturday
        const dayOfWeek = new Date(date).getDay()
        const timetableResult = await db.query(`
          SELECT time_slot_start as start_time, time_slot_end as end_time 
          FROM timetable_entries 
          WHERE lab_id = ? 
            AND day_of_week = ?
            AND is_active = 1
        `, [labId, dayOfWeek])
        const timetable = timetableResult.rows || []

        return {
          labId,
          occupied: [...bookings, ...timetable].map((slot: any) => ({
            start: slot.start_time,
            end: slot.end_time
          }))
        }
      })
    )

    // Merge overlapping occupied slots
    const mergeOccupiedSlots = (occupied: { start: string; end: string }[]): { start: number; end: number }[] => {
      if (occupied.length === 0) return []
      
      const slots = occupied
        .map(slot => ({
          start: timeToMinutes(slot.start),
          end: timeToMinutes(slot.end)
        }))
        .sort((a, b) => a.start - b.start)

      const merged: { start: number; end: number }[] = [slots[0]]
      
      for (let i = 1; i < slots.length; i++) {
        const current = slots[i]
        const last = merged[merged.length - 1]
        
        if (current.start <= last.end) {
          // Overlapping or adjacent - merge them
          last.end = Math.max(last.end, current.end)
        } else {
          // No overlap - add as new slot
          merged.push(current)
        }
      }
      
      return merged
    }

    // Collect ALL occupied times from ALL labs
    const allOccupiedTimes: { start: string; end: string }[] = []
    labOccupiedSlots.forEach(lab => {
      allOccupiedTimes.push(...lab.occupied)
    })

    // Merge all occupied times
    const mergedAllOccupied = mergeOccupiedSlots(allOccupiedTimes)

    // Find free slots by finding gaps between occupied slots
    const businessStartMinutes = timeToMinutes(businessStart)
    const businessEndMinutes = timeToMinutes(businessEnd)
    
    const freeSlots: { start: number; end: number }[] = []
    
    if (mergedAllOccupied.length === 0) {
      // No occupied slots - entire day is free
      freeSlots.push({ start: businessStartMinutes, end: businessEndMinutes })
    } else {
      // Check for free slot before first occupied slot
      if (mergedAllOccupied[0].start > businessStartMinutes) {
        freeSlots.push({ 
          start: businessStartMinutes, 
          end: mergedAllOccupied[0].start 
        })
      }
      
      // Check for free slots between occupied slots
      for (let i = 0; i < mergedAllOccupied.length - 1; i++) {
        const currentEnd = mergedAllOccupied[i].end
        const nextStart = mergedAllOccupied[i + 1].start
        
        if (nextStart > currentEnd) {
          freeSlots.push({ start: currentEnd, end: nextStart })
        }
      }
      
      // Check for free slot after last occupied slot
      const lastOccupied = mergedAllOccupied[mergedAllOccupied.length - 1]
      if (lastOccupied.end < businessEndMinutes) {
        freeSlots.push({ 
          start: lastOccupied.end, 
          end: businessEndMinutes 
        })
      }
    }

    // Format the response with continuous time blocks
    const formattedSlots = freeSlots.map(slot => {
      const durationMinutes = slot.end - slot.start
      const hours = Math.floor(durationMinutes / 60)
      const minutes = durationMinutes % 60
      const durationText = minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`
      
      return {
        start_time: minutesToTime(slot.start),
        end_time: minutesToTime(slot.end),
        is_available: true,
        duration_minutes: durationMinutes,
        display: `${minutesToTime(slot.start).substring(0, 5)} - ${minutesToTime(slot.end).substring(0, 5)} (${durationText} available)`
      }
    })

    console.log(`Found ${formattedSlots.length} continuous free time blocks`)

    return NextResponse.json({
      commonSlots: formattedSlots,
      labIds,
      date
    })

  } catch (error) {
    console.error("Error finding common free slots:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
