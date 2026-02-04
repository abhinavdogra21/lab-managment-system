/**
 * Admin utility page to fix multi-lab booking statuses
 */

"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { AlertCircle, CheckCircle, RefreshCw } from "lucide-react"

export default function FixMultiLabStatusPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  const handleFix = async () => {
    if (!confirm("This will update all multi-lab bookings stuck in 'pending_lab_staff' status. Continue?")) {
      return
    }

    setLoading(true)
    setResult(null)

    try {
      const res = await fetch('/api/admin/fix-multilab-status', {
        method: 'POST',
      })

      const data = await res.json()

      if (res.ok) {
        setResult(data)
        toast({
          title: 'Success',
          description: data.message,
        })
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to fix statuses',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fix statuses',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container max-w-4xl py-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Fix Multi-Lab Booking Statuses
          </CardTitle>
          <CardDescription>
            This utility fixes multi-lab bookings that are stuck in "pending_lab_staff" status
            even though all lab staff have made their decisions (approved or rejected).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div className="text-sm text-yellow-800">
                <p className="font-semibold mb-1">What this does:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Finds multi-lab bookings stuck in "pending_lab_staff" status</li>
                  <li>Checks if all lab staff have made their decisions (no pending labs)</li>
                  <li>If at least one lab was approved → moves to "pending_hod"</li>
                  <li>If all labs were rejected → marks as "rejected"</li>
                </ul>
              </div>
            </div>
          </div>

          <Button 
            onClick={handleFix} 
            disabled={loading}
            size="lg"
            className="w-full"
          >
            {loading ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Fixing...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Fix Stuck Bookings
              </>
            )}
          </Button>

          {result && (
            <div className="rounded-lg bg-green-50 border border-green-200 p-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                <div className="text-sm text-green-800">
                  <p className="font-semibold mb-2">{result.message}</p>
                  <div className="space-y-1">
                    <p>• Moved to pending_hod: <strong>{result.details?.movedToHod || 0}</strong></p>
                    <p>• Moved to rejected: <strong>{result.details?.movedToRejected || 0}</strong></p>
                    <p>• Total fixed: <strong>{result.details?.totalFixed || 0}</strong></p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
