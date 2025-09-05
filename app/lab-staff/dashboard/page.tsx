"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
	Package, 
	ClipboardList, 
	UserCheck, 
	BarChart3, 
	Plus, 
	Eye, 
	CheckCircle,
	Clock,
	AlertCircle,
	Calendar,
	Users,
	Building,
	FileText,
	Settings
} from "lucide-react"
import Link from "next/link"

interface PendingRequest {
	id: number
	student_name: string
	student_email: string
	lab_name: string
	booking_date: string
	start_time: string
	end_time: string
	purpose: string
	status: string
	created_at: string
	faculty_name?: string
}

export default function LabStaffDashboardPage() {
	const [currentUser, setCurrentUser] = useState<any>(null)
	const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([])
	const [stats, setStats] = useState({
		totalEquipment: 0,
		pendingApprovals: 0,
		todayAttendance: 0,
		recentActivities: 0,
		pendingFaculty: 0,
		approved: 0,
		rejected: 0,
		total: 0
	})
	const [loading, setLoading] = useState(true)

	useEffect(() => {
		const userData = localStorage.getItem("user")
		if (userData) {
			setCurrentUser(JSON.parse(userData))
		}
		loadPendingRequests()
		loadStats()
	}, [])

	const loadPendingRequests = async () => {
		try {
			const res = await fetch("/api/lab-staff/requests?status=pending_lab_staff")
			if (res.ok) {
				const data = await res.json()
				setPendingRequests(data.requests || [])
			}
		} catch (error) {
			console.error("Failed to load pending requests:", error)
		}
	}

	const loadStats = async () => {
		try {
			// Load demo equipment stats
			setStats({
				totalEquipment: 45,
				pendingApprovals: pendingRequests.length,
				todayAttendance: 12,
				recentActivities: 8,
				pendingFaculty: 0,
				approved: 0,
				rejected: 0,
				total: 0
			})
			
			// Get all requests stats
			const res = await fetch("/api/lab-staff/requests?status=all")
			if (res.ok) {
				const data = await res.json()
				const requests = data.requests || []
				
				setStats(prev => ({
					...prev,
					pendingApprovals: requests.filter((r: any) => r.status === 'pending_lab_staff').length,
					approved: requests.filter((r: any) => r.status === 'pending_hod' || r.status === 'approved').length,
					rejected: requests.filter((r: any) => r.status === 'rejected').length,
					total: requests.length
				}))
			}
		} catch (error) {
			console.error("Failed to load stats:", error)
		} finally {
			setLoading(false)
		}
	}

	if (!currentUser) return null

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
				<div>
					<h1 className="text-2xl font-bold">Lab Staff Dashboard</h1>
					<p className="text-muted-foreground">Welcome back, {currentUser.name}</p>
					<p className="text-sm text-muted-foreground">Department: {currentUser.department}</p>
				</div>
				<Button asChild>
					<Link href="/lab-staff/dashboard/approve">
						<CheckCircle className="h-4 w-4 mr-2" />
						Review Requests
					</Link>
				</Button>
			</div>

			{/* Stats Cards */}
			<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
				<Card>
					<CardContent className="p-4">
						<div className="flex items-center space-x-2">
							<Clock className="h-5 w-5 text-orange-600" />
							<div>
								<p className="text-2xl font-bold">{stats.pendingApprovals}</p>
								<p className="text-sm text-muted-foreground">Pending Approvals</p>
							</div>
						</div>
					</CardContent>
				</Card>
				
				<Card>
					<CardContent className="p-4">
						<div className="flex items-center space-x-2">
							<Package className="h-5 w-5 text-blue-600" />
							<div>
								<p className="text-2xl font-bold">{stats.totalEquipment}</p>
								<p className="text-sm text-muted-foreground">Total Equipment</p>
							</div>
						</div>
					</CardContent>
				</Card>
				
				<Card>
					<CardContent className="p-4">
						<div className="flex items-center space-x-2">
							<CheckCircle className="h-5 w-5 text-green-600" />
							<div>
								<p className="text-2xl font-bold">{stats.approved}</p>
								<p className="text-sm text-muted-foreground">Approved</p>
							</div>
						</div>
					</CardContent>
				</Card>
				
				<Card>
					<CardContent className="p-4">
						<div className="flex items-center space-x-2">
							<UserCheck className="h-5 w-5 text-purple-600" />
							<div>
								<p className="text-2xl font-bold">{stats.todayAttendance}</p>
								<p className="text-sm text-muted-foreground">Today's Attendance</p>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Pending Approval Requests */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center justify-between">
						<span className="flex items-center gap-2">
							<Clock className="h-5 w-5 text-orange-600" />
							Pending Lab Staff Approval ({stats.pendingApprovals})
						</span>
						<Button variant="outline" size="sm" asChild>
							<Link href="/lab-staff/dashboard/approve">
								<Eye className="h-4 w-4 mr-2" />
								View All
							</Link>
						</Button>
					</CardTitle>
				</CardHeader>
				<CardContent>
					{loading ? (
						<div className="text-center py-8 text-muted-foreground">Loading...</div>
					) : pendingRequests.length === 0 ? (
						<div className="text-center py-8 text-muted-foreground">
							<CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-600" />
							<p className="font-medium">No pending requests</p>
							<p className="text-sm">All caught up! No requests waiting for your approval.</p>
						</div>
					) : (
						<div className="space-y-4">
							{pendingRequests.slice(0, 3).map((request) => (
								<div key={request.id} className="flex items-center justify-between p-4 border rounded-lg bg-orange-50 border-orange-200">
									<div className="flex-1">
										<div className="flex items-center gap-2 mb-1">
											<h4 className="font-medium">{request.lab_name}</h4>
											<Badge variant="secondary" className="bg-orange-100 text-orange-700">
												Pending Lab Staff Review
											</Badge>
										</div>
										<p className="text-sm text-muted-foreground">
											Student: {request.student_name}
										</p>
										<p className="text-sm text-muted-foreground">
											Faculty: {request.faculty_name}
										</p>
										<p className="text-sm text-muted-foreground">
											{new Date(request.booking_date).toLocaleDateString()} • {request.start_time} - {request.end_time}
										</p>
										<p className="text-sm mt-1">{request.purpose}</p>
									</div>
									<div className="flex gap-2">
										<Button size="sm" asChild>
											<Link href="/lab-staff/dashboard/approve">
												<Eye className="h-4 w-4" />
											</Link>
										</Button>
									</div>
								</div>
							))}
						</div>
					)}
					
					{pendingRequests.length > 3 && (
						<div className="mt-4 text-center">
							<Button asChild variant="outline">
								<Link href="/lab-staff/dashboard/approve">
									View All Pending Requests ({pendingRequests.length})
								</Link>
							</Button>
						</div>
					)}
				</CardContent>
			</Card>

			{/* Quick Actions & Recent Activities */}
			<div className="grid md:grid-cols-2 gap-4">
				<Card>
					<CardHeader>
						<CardTitle>Quick Actions</CardTitle>
					</CardHeader>
					<CardContent className="space-y-3">
						<Button asChild className="w-full justify-start">
							<Link href="/lab-staff/dashboard/approve">
								<CheckCircle className="h-4 w-4 mr-2" />
								Review Pending Requests
							</Link>
						</Button>
						<Button asChild variant="outline" className="w-full justify-start">
							<Link href="/lab-staff/dashboard/inventory">
								<Package className="h-4 w-4 mr-2" />
								Manage Inventory
							</Link>
						</Button>
						<Button asChild variant="outline" className="w-full justify-start">
							<Link href="/lab-staff/dashboard/issue-return">
								<ClipboardList className="h-4 w-4 mr-2" />
								Issue/Return Equipment
							</Link>
						</Button>
						<Button asChild variant="outline" className="w-full justify-start">
							<Link href="/lab-staff/dashboard/attendance">
								<UserCheck className="h-4 w-4 mr-2" />
								Mark Attendance
							</Link>
						</Button>
						<Button asChild variant="outline" className="w-full justify-start">
							<Link href="/lab-staff/dashboard/reports">
								<BarChart3 className="h-4 w-4 mr-2" />
								Generate Reports
							</Link>
						</Button>
						<Button asChild variant="outline" className="w-full justify-start">
							<Link href="/lab-staff/dashboard/bookings">
								<Calendar className="h-4 w-4 mr-2" />
								View All Bookings
							</Link>
						</Button>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Recent Activities</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-3">
							<div className="flex items-center justify-between p-2 border rounded">
								<div>
									<p className="text-sm font-medium">Request Approved</p>
									<p className="text-xs text-muted-foreground">Lab booking for ECE Lab approved</p>
								</div>
								<Badge variant="outline">2 hrs ago</Badge>
							</div>
							<div className="flex items-center justify-between p-2 border rounded">
								<div>
									<p className="text-sm font-medium">Equipment Check-out</p>
									<p className="text-xs text-muted-foreground">Laptop - LP001 issued to student</p>
								</div>
								<Badge variant="outline">3 hrs ago</Badge>
							</div>
							<div className="flex items-center justify-between p-2 border rounded">
								<div>
									<p className="text-sm font-medium">Inventory Update</p>
									<p className="text-xs text-muted-foreground">Added 5 new keyboards</p>
								</div>
								<Badge variant="outline">5 hrs ago</Badge>
							</div>
							<div className="flex items-center justify-between p-2 border rounded">
								<div>
									<p className="text-sm font-medium">Attendance Marked</p>
									<p className="text-xs text-muted-foreground">12 students marked present</p>
								</div>
								<Badge variant="outline">1 day ago</Badge>
							</div>
						</div>
						<div className="mt-4">
							<Button variant="outline" size="sm" className="w-full">
								<Eye className="h-4 w-4 mr-2" />
								View All Activities
							</Button>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	)
}
