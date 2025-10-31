"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Package, ClipboardList, UserCheck, BarChart3, Plus, Eye } from "lucide-react"
import Link from "next/link"

export default function LabStaffDashboardPage() {
	const [currentUser, setCurrentUser] = useState<any>(null)
	const [stats, setStats] = useState({
		totalEquipment: 0,
		pendingIssues: 0,
		todayAttendance: 0,
		recentActivities: 0
	})

	useEffect(() => {
		const userData = localStorage.getItem("user")
		if (userData) {
			setCurrentUser(JSON.parse(userData))
		}
		// Load some demo stats
		setStats({
			totalEquipment: 45,
			pendingIssues: 3,
			todayAttendance: 12,
			recentActivities: 8
		})
	}, [])

	if (!currentUser) return null

	return (
		<div className="space-y-6">
			<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
				<div>
					<h1 className="text-2xl font-bold">Lab Staff Dashboard</h1>
					<p className="text-muted-foreground">Welcome back, {currentUser.name}</p>
				</div>
				<Button asChild>
					<Link href="/lab-staff/dashboard/inventory">
						<Package className="h-4 w-4 mr-2" />
						Manage Inventory
					</Link>
				</Button>
			</div>

			{/* Stats Cards */}
			<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
							<ClipboardList className="h-5 w-5 text-orange-600" />
							<div>
								<p className="text-2xl font-bold">{stats.pendingIssues}</p>
								<p className="text-sm text-muted-foreground">Pending Issues</p>
							</div>
						</div>
					</CardContent>
				</Card>
				
				<Card>
					<CardContent className="p-4">
						<div className="flex items-center space-x-2">
							<UserCheck className="h-5 w-5 text-green-600" />
							<div>
								<p className="text-2xl font-bold">{stats.todayAttendance}</p>
								<p className="text-sm text-muted-foreground">Today's Attendance</p>
							</div>
						</div>
					</CardContent>
				</Card>
				
				<Card>
					<CardContent className="p-4">
						<div className="flex items-center space-x-2">
							<BarChart3 className="h-5 w-5 text-purple-600" />
							<div>
								<p className="text-2xl font-bold">{stats.recentActivities}</p>
								<p className="text-sm text-muted-foreground">Recent Activities</p>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Quick Actions */}
			<div className="grid md:grid-cols-2 gap-4">
				<Card>
					<CardHeader>
						<CardTitle>Quick Actions</CardTitle>
					</CardHeader>
					<CardContent className="space-y-3">
						<Button asChild className="w-full justify-start">
							<Link href="/lab-staff/dashboard/inventory">
								<Package className="h-4 w-4 mr-2" />
								Manage Inventory
							</Link>
					</Button>
					<Button asChild variant="outline" className="w-full justify-start">
						<Link href="/lab-staff/dashboard/component-requests">
							<ClipboardList className="h-4 w-4 mr-2" />
							Review Component Requests
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
									<p className="text-sm font-medium">Equipment Check-out</p>
									<p className="text-xs text-muted-foreground">Laptop - LP001 issued to student</p>
								</div>
								<Badge variant="outline">2 hrs ago</Badge>
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
