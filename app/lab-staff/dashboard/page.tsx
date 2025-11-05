"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Package, ClipboardList, Plus } from "lucide-react"
import Link from "next/link"

export default function LabStaffDashboardPage() {
	const [currentUser, setCurrentUser] = useState<any>(null)
	const [stats, setStats] = useState({
		totalEquipment: 0,
		pendingIssues: 0
	})

	const getSalutationPrefix = (salutation?: string) => {
		if (!salutation || salutation === 'none') return ''
		const salutationMap: Record<string, string> = {
			'prof': 'Prof.',
			'dr': 'Dr.',
			'mr': 'Mr.',
			'mrs': 'Mrs.'
		}
		return salutationMap[salutation.toLowerCase()] || ''
	}

	const getDisplayName = () => {
		if (!currentUser) return ''
		const prefix = getSalutationPrefix(currentUser.salutation)
		return prefix ? `${prefix} ${currentUser.name}` : currentUser.name
	}

	useEffect(() => {
		const userData = localStorage.getItem("user")
		if (userData) {
			setCurrentUser(JSON.parse(userData))
		}
		// Load some demo stats
		setStats({
			totalEquipment: 45,
			pendingIssues: 3
		})
	}, [])

	if (!currentUser) return null

	return (
		<div className="space-y-6">
			<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
				<div>
					<h1 className="text-2xl font-bold">Lab Staff Dashboard</h1>
					<p className="text-muted-foreground">Welcome back, {getDisplayName()}</p>
				</div>
				<Button asChild>
					<Link href="/lab-staff/dashboard/inventory">
						<Package className="h-4 w-4 mr-2" />
						Manage Inventory
					</Link>
				</Button>
			</div>

			{/* Stats Cards */}
			<div className="grid grid-cols-2 gap-4">
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
			</div>

			{/* Quick Actions */}
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
				</CardContent>
			</Card>
		</div>
	)
}
