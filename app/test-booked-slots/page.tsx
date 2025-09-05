'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function BookedSlotsTest() {
  const [labId, setLabId] = useState('1')
  const [date, setDate] = useState('2025-09-08')
  const [bookedSlots, setBookedSlots] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const fetchBookedSlots = async () => {
    setLoading(true)
    setError('')
    try {
      const response = await fetch(`/api/student/booked-slots?lab_id=${labId}&date=${date}`)
      const data = await response.json()
      
      if (data.success) {
        setBookedSlots(data.booked_slots || [])
      } else {
        setError(data.error || 'Failed to fetch booked slots')
      }
    } catch (err) {
      setError('Network error occurred')
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6">
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>Lab Booked Slots Viewer</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="labId">Lab ID</Label>
              <Input
                id="labId"
                type="number"
                value={labId}
                onChange={(e) => setLabId(e.target.value)}
                placeholder="Enter lab ID"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button 
                onClick={fetchBookedSlots} 
                disabled={loading}
                className="w-full"
              >
                {loading ? 'Loading...' : 'Get Booked Slots'}
              </Button>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {bookedSlots.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">
                Booked Slots for Lab {labId} on {date} ({bookedSlots.length} bookings)
              </h3>
              <div className="grid gap-3">
                {bookedSlots.map((slot, index) => (
                  <div 
                    key={index}
                    className={`p-4 rounded-lg border ${
                      slot.type === 'booking' 
                        ? 'bg-blue-50 border-blue-200' 
                        : 'bg-green-50 border-green-200'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-semibold text-lg">
                          {slot.time_range}
                        </div>
                        <div className="text-gray-600">
                          {slot.purpose}
                        </div>
                      </div>
                      <div className={`px-2 py-1 rounded text-xs font-medium ${
                        slot.type === 'booking' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {slot.type === 'booking' ? 'Student Booking' : 'Scheduled Class'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!loading && bookedSlots.length === 0 && !error && (
            <div className="text-center py-8 text-gray-500">
              No booked slots found for the selected lab and date.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
