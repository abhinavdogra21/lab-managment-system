"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function OthersDashboardPage() {
	const [userName, setUserName] = useState<string>("")
	const [loading, setLoading] = useState(true)

	useEffect(() => {
		loadUserData()
	}, [])

	const loadUserData = async () => {
		try {
			const res = await fetch('/api/auth/me')
			if (res.ok) {
				const data = await res.json()
				setUserName(data.user?.name || "User")
			}
		} catch (error) {
			console.error('Failed to load user data:', error)
			setUserName("User")
		} finally {
			setLoading(false)
		}
	}

	return (
		<div className="flex items-center justify-center min-h-[calc(100vh-200px)] p-4">
			<Card className="w-full max-w-2xl border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
				<CardHeader className="text-center pb-8 pt-12">
					<CardTitle className="text-4xl font-bold">
						{loading ? (
							"Loading..."
						) : (
							`Welcome ${userName}`
						)}
					</CardTitle>
				</CardHeader>
				<CardContent className="text-center pb-12">
					<p className="text-muted-foreground text-lg">
						Use the navigation menu to access lab booking features
					</p>
				</CardContent>
			</Card>
		</div>
	)
}
