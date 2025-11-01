"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
	Calendar, 
	Clock, 
	CheckCircle, 
	XCircle, 
	ArrowRight,
	PlusCircle,
	ListChecks,
	BarChart3
} from "lucide-react"

interface BookingStat {
	total: number
	pending: number
	approved: number
	rejected: number
}

export default function TNPDashboardPage() {
	const router = useRouter()
	const [stats, setStats] = useState<BookingStat>({
		total: 0,
		pending: 0,
		approved: 0,
		rejected: 0
	})
	const [recentBookings, setRecentBookings] = useState<any[]>([])
	const [loading, setLoading] = useState(true)

	useEffect(() => {
		loadDashboardData()
	}, [])

	const loadDashboardData = async () => {
		try {
			const res = await fetch('/api/tnp/my-bookings')
			if (res.ok) {
				const data = await res.json()
				const bookings = data.bookings || []
				
				// Calculate stats
				setStats({
					total: bookings.length,
					pending: bookings.filter((b: any) => b.status.includes('pending')).length,
					approved: bookings.filter((b: any) => b.status === 'approved').length,
					rejected: bookings.filter((b: any) => b.status === 'rejected').length
				})

				// Get recent 3 bookings
				setRecentBookings(bookings.slice(0, 3))
			}
		} catch (error) {
			console.error('Failed to load dashboard data:', error)
		} finally {
			setLoading(false)
		}
	}

	const getStatusBadge = (status: string) => {
		if (status === 'approved') {
			return <Badge variant="default" className="flex items-center gap-1 w-fit">
				<CheckCircle className="h-3 w-3" />
				Approved
			</Badge>
		} else if (status === 'rejected') {
			return <Badge variant="destructive" className="flex items-center gap-1 w-fit">
				<XCircle className="h-3 w-3" />
				Rejected
			</Badge>
		} else {
			return <Badge variant="secondary" className="flex items-center gap-1 w-fit">
				<Clock className="h-3 w-3" />
				Pending
			</Badge>
		}
	}

	return (
		<div className="p-4 sm:p-6 space-y-6">
			{/* Header */}
			<div>
				<h1 className="text-3xl font-bold">Training & Placement Dashboard</h1>
				<p className="text-muted-foreground">Manage lab bookings for placement drives and training sessions</p>
			</div>

			{/* Quick Actions */}
			<Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<PlusCircle className="h-5 w-5" />
						Quick Actions
					</CardTitle>
					<CardDescription>Common tasks and shortcuts</CardDescription>
				</CardHeader>
				<CardContent className="grid gap-3 sm:grid-cols-2">
					<Button 
						onClick={() => router.push('/tnp/dashboard/book-labs')}
						className="justify-start h-auto py-4 px-4"
						size="lg"
					>
						<div className="flex items-center gap-3 w-full">
							<Calendar className="h-5 w-5" />
							<div className="text-left flex-1">
								<div className="font-semibold">Book a Lab</div>
								<div className="text-xs opacity-90">Schedule a new lab booking</div>
							</div>
							<ArrowRight className="h-4 w-4" />
						</div>
					</Button>

					<Button 
						onClick={() => router.push('/tnp/dashboard/my-bookings')}
						variant="outline"
						className="justify-start h-auto py-4 px-4"
						size="lg"
					>
						<div className="flex items-center gap-3 w-full">
							<ListChecks className="h-5 w-5" />
							<div className="text-left flex-1">
								<div className="font-semibold">View My Bookings</div>
								<div className="text-xs opacity-70">Track all your requests</div>
							</div>
							<ArrowRight className="h-4 w-4" />
						</div>
					</Button>
				</CardContent>
			</Card>

			{/* Stats */}
			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
						<BarChart3 className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{stats.total}</div>
						<p className="text-xs text-muted-foreground">All time requests</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Pending</CardTitle>
						<Clock className="h-4 w-4 text-orange-500" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{stats.pending}</div>
						<p className="text-xs text-muted-foreground">Awaiting approval</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Approved</CardTitle>
						<CheckCircle className="h-4 w-4 text-green-500" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{stats.approved}</div>
						<p className="text-xs text-muted-foreground">Successfully booked</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Rejected</CardTitle>
						<XCircle className="h-4 w-4 text-red-500" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{stats.rejected}</div>
						<p className="text-xs text-muted-foreground">Not approved</p>
					</CardContent>
				</Card>
			</div>

			{/* Recent Bookings */}
			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<div>
							<CardTitle>Recent Bookings</CardTitle>
							<CardDescription>Your latest lab booking requests</CardDescription>
						</div>
						<Button 
							variant="ghost" 
							size="sm"
							onClick={() => router.push('/tnp/dashboard/my-bookings')}
						>
							View All
							<ArrowRight className="h-4 w-4 ml-2" />
						</Button>
					</div>
				</CardHeader>
				<CardContent>
					{loading ? (
						<p className="text-sm text-muted-foreground text-center py-8">Loading...</p>
					) : recentBookings.length === 0 ? (
						<div className="text-center py-8">
							<Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
							<p className="text-sm text-muted-foreground mb-4">No bookings yet</p>
							<Button onClick={() => router.push('/tnp/dashboard/book-labs')}>
								<PlusCircle className="h-4 w-4 mr-2" />
								Create Your First Booking
							</Button>
						</div>
					) : (
						<div className="space-y-4">
							{recentBookings.map((booking) => (
								<div 
									key={booking.id} 
									className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
								>
									<div className="space-y-1 flex-1">
										<div className="flex items-center gap-2">
											<p className="font-medium">{booking.lab_name}</p>
											{getStatusBadge(booking.status)}
										</div>
										<div className="flex items-center gap-4 text-sm text-muted-foreground">
											<span className="flex items-center gap-1">
												<Calendar className="h-3 w-3" />
												{new Date(booking.date).toLocaleDateString()}
											</span>
											<span className="flex items-center gap-1">
												<Clock className="h-3 w-3" />
												{booking.start_time} - {booking.end_time}
											</span>
										</div>
										<p className="text-sm text-muted-foreground line-clamp-1">
											{booking.purpose}
										</p>
									</div>
								</div>
							))}
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	)
}
