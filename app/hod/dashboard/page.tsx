/**
 * Created by Abhinav Dogra (23ucs507) and Abhinav Thulal (23ucs508)
 */

"use client"

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { 
  Building, 
  Package, 
  FileText, 
  Clock, 
  CheckCircle, 
  XCircle,
  AlertCircle,
  ArrowRight
} from 'lucide-react'

interface DashboardStats {
  totalLabs: number
  totalComponents: number
  pendingApprovals: number
  approvedRequests: number
  rejectedRequests: number
  lowStockComponents: number
}

export default function HODDashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats>({
    totalLabs: 0,
    totalComponents: 0,
    pendingApprovals: 0,
    approvedRequests: 0,
    rejectedRequests: 0,
    lowStockComponents: 0
  })

  useEffect(() => {
    loadDashboardStats()
  }, [])

  const loadDashboardStats = async () => {
    setLoading(true)
    try {
      // Load labs and components
      const labsRes = await fetch('/api/hod/labs/components', { cache: 'no-store' })
      if (labsRes.ok) {
        const labsData = await labsRes.json()
        const labs = labsData.labs || []
        const components = labsData.components || []
        
        // Count low stock components (less than 30% available)
        const lowStock = components.filter((c: any) => 
          c.quantity_available > 0 && 
          c.quantity_available < c.quantity_total * 0.3
        ).length

        stats.totalLabs = labs.length
        stats.totalComponents = components.length
        stats.lowStockComponents = lowStock
      }

      // Load pending approvals
      const pendingRes = await fetch('/api/hod/requests?status=pending_hod', { cache: 'no-store' })
      if (pendingRes.ok) {
        const pendingData = await pendingRes.json()
        stats.pendingApprovals = pendingData.total || 0
      }

      // Load approved requests
      const approvedRes = await fetch('/api/hod/requests?status=approved', { cache: 'no-store' })
      if (approvedRes.ok) {
        const approvedData = await approvedRes.json()
        stats.approvedRequests = approvedData.total || 0
      }

      // Load rejected requests
      const rejectedRes = await fetch('/api/hod/requests?status=rejected', { cache: 'no-store' })
      if (rejectedRes.ok) {
        const rejectedData = await rejectedRes.json()
        stats.rejectedRequests = rejectedData.total || 0
      }

      setStats({ ...stats })
    } catch (error) {
      console.error('Error loading dashboard stats:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
          <div className="space-y-1">
        <h1 className="text-3xl font-bold">HoD Dashboard</h1>
        <p className="text-muted-foreground">
          Manage your department and track lab activities
        </p>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Labs Card */}
        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/hod/dashboard/labs')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Labs</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '...' : stats.totalLabs}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Department laboratories
            </p>
          </CardContent>
        </Card>

        {/* Components Card */}
        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/hod/dashboard/labs')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Components</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '...' : stats.totalComponents}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Across all labs
            </p>
          </CardContent>
        </Card>

        {/* Pending Approvals Card */}
        <Card className="hover:shadow-lg transition-shadow cursor-pointer border-orange-200 bg-orange-50/50" onClick={() => router.push('/hod/dashboard/approvals')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{loading ? '...' : stats.pendingApprovals}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Requires your action
            </p>
          </CardContent>
        </Card>

        {/* Approved Requests Card */}
        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/hod/dashboard/approvals')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved Requests</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{loading ? '...' : stats.approvedRequests}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Successfully approved
            </p>
          </CardContent>
        </Card>

        {/* Rejected Requests Card */}
        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/hod/dashboard/approvals')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected Requests</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{loading ? '...' : stats.rejectedRequests}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Declined requests
            </p>
          </CardContent>
        </Card>

        {/* Low Stock Warning Card */}
        <Card className="hover:shadow-lg transition-shadow cursor-pointer border-yellow-200 bg-yellow-50/50" onClick={() => router.push('/hod/dashboard/labs')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{loading ? '...' : stats.lowStockComponents}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Components need restocking
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button 
              variant="outline" 
              className="w-full justify-between" 
              onClick={() => router.push('/hod/dashboard/approvals')}
            >
              <span className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Review Pending Approvals
              </span>
              {stats.pendingApprovals > 0 && (
                <Badge variant="destructive">{stats.pendingApprovals}</Badge>
              )}
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-between" 
              onClick={() => router.push('/hod/dashboard/labs')}
            >
              <span className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                Manage Lab Inventory
              </span>
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-between" 
              onClick={() => router.push('/hod/dashboard/reports')}
            >
              <span className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Generate Reports
              </span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        {/* Alerts/Notifications */}
        {(stats.pendingApprovals > 0 || stats.lowStockComponents > 0) && (
          <Card className="border-orange-200 bg-orange-50/50">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-orange-600" />
                Attention Required
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {stats.pendingApprovals > 0 && (
                <div className="flex items-start gap-2 text-sm">
                  <Clock className="h-4 w-4 text-orange-600 mt-0.5" />
                  <div>
                    <p className="font-medium">Pending Approvals</p>
                    <p className="text-muted-foreground">
                      You have {stats.pendingApprovals} request{stats.pendingApprovals !== 1 ? 's' : ''} waiting for approval
                    </p>
                  </div>
                </div>
              )}
              {stats.lowStockComponents > 0 && (
                <div className="flex items-start gap-2 text-sm">
                  <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
                  <div>
                    <p className="font-medium">Low Stock Alert</p>
                    <p className="text-muted-foreground">
                      {stats.lowStockComponents} component{stats.lowStockComponents !== 1 ? 's are' : ' is'} running low on stock
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
