/**
 * Created by Abhinav Dogra (23ucs507) and Abhinav Thulal (23ucs508)
 */

"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { Package, Plus, Search } from "lucide-react"

interface Lab { id: number; name: string; location: string }
interface ComponentItem { id: number; name: string; category: string | null; model: string | null; condition_status: 'working'|'dead'|'consumable'; quantity_total: number; quantity_available: number }

export default function LabStaffInventoryPage() {
	const { toast } = useToast()
	const [labs, setLabs] = useState<Lab[]>([])
	const [selectedLab, setSelectedLab] = useState<string>("")
	const [components, setComponents] = useState<ComponentItem[]>([])
	const [searchQuery, setSearchQuery] = useState("")
	const [form, setForm] = useState({ name: '', category: '', model: '', condition_status: 'working', quantity_total: 1 })
	const [loading, setLoading] = useState(false)

		useEffect(() => { loadLabs() }, [])
	useEffect(() => { if (selectedLab) loadComponents(Number(selectedLab)) }, [selectedLab])

		const loadLabs = async () => {
			try {
				const res = await fetch('/api/lab-staff/my-labs')
				const text = await res.text()
				if (res.ok && text.trim().startsWith('{')) {
					const data = JSON.parse(text)
					setLabs(data.labs || [])
				} else {
					setLabs([])
				}
			} catch { setLabs([]) }
		}
	const loadComponents = async (labId: number) => {
			try {
				const res = await fetch(`/api/lab-staff/components?lab_id=${labId}`)
				const text = await res.text()
				if (res.ok && text.trim().startsWith('{')) {
					const data = JSON.parse(text)
					setComponents(data.components || [])
				} else {
					setComponents([])
				}
			} catch { setComponents([]) }
	}

	const handleAdd = async () => {
		if (!selectedLab || !form.name.trim() || !Number.isFinite(Number(form.quantity_total))) {
			toast({ title: 'Missing info', description: 'Select lab, enter name and quantity', variant: 'destructive' }); return
		}
		setLoading(true)
		try {
			const res = await fetch('/api/lab-staff/components', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lab_id: Number(selectedLab), name: form.name.trim(), category: form.category || null, model: form.model || null, condition_status: form.condition_status, quantity_total: Number(form.quantity_total) }) })
			const text = await res.text()
			if (!res.ok) throw new Error((() => { try { return JSON.parse(text)?.error } catch { return text } })() || 'Failed')
			toast({ title: 'Component added', description: 'Component created successfully' })
			setForm({ name: '', category: '', model: '', condition_status: 'working', quantity_total: 1 })
			loadComponents(Number(selectedLab))
		} catch (e: any) {
			toast({ title: 'Add failed', description: e?.message || 'Failed to add component', variant: 'destructive' })
		} finally { setLoading(false) }
	}

	const filteredComponents = useMemo(() => {
		if (!searchQuery.trim()) return components
		const q = searchQuery.toLowerCase()
		return components.filter(c => 
			c.name.toLowerCase().includes(q) ||
			c.model?.toLowerCase().includes(q) ||
			c.category?.toLowerCase().includes(q)
		)
	}, [components, searchQuery])

	return (
		<div className="p-6 space-y-4">
			<div>
				<h1 className="text-xl font-semibold">Inventory (Components)</h1>
				<p className="text-sm text-muted-foreground">Manage lab components. Only Head Lab Staff can add items when a head is set for a lab.</p>
			</div>

					<Card>
				<CardHeader>
					<CardTitle>Select Lab</CardTitle>
				</CardHeader>
				<CardContent className="grid md:grid-cols-2 gap-4">
					<div>
						<Label>Lab</Label>
						<Select value={selectedLab} onValueChange={setSelectedLab}>
							<SelectTrigger><SelectValue placeholder="Choose a lab" /></SelectTrigger>
							<SelectContent>
										{labs.length === 0 ? (
											<div className="px-2 py-1 text-sm text-muted-foreground">No labs assigned to you.</div>
										) : (
											labs.map(l => (<SelectItem key={l.id} value={l.id.toString()}>{l.name} - {l.location}</SelectItem>))
										)}
							</SelectContent>
						</Select>
					</div>
				</CardContent>
			</Card>

			{selectedLab && (
				<div className="grid lg:grid-cols-2 gap-4">
					<Card>
						<CardHeader>
							<CardTitle>Components in Lab</CardTitle>
						</CardHeader>
						<CardContent className="space-y-3">
							{components.length === 0 ? (
								<div className="text-sm text-muted-foreground">No components yet.</div>
							) : (
								<>
									<div>
										<Label htmlFor="search" className="flex items-center gap-2">
											<Search className="h-4 w-4" /> Search Components
										</Label>
										<Input
											id="search"
											type="text"
											placeholder="Search by name, model, or category..."
											value={searchQuery}
											onChange={(e) => setSearchQuery(e.target.value)}
											className="w-full"
										/>
									</div>
									<div className="space-y-2">
										{filteredComponents.length === 0 ? (
											<div className="text-sm text-muted-foreground">No components match your search.</div>
										) : (
											filteredComponents.map(c => (
												<ComponentRow key={c.id} comp={c} onChanged={() => loadComponents(Number(selectedLab))} />
											))
										)}
									</div>
								</>
							)}
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2"><Plus className="h-4 w-4" /> Add Component</CardTitle>
						</CardHeader>
						<CardContent className="space-y-3">
							<div>
								<Label>Name</Label>
								<Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Component name" />
							</div>
							<div className="grid grid-cols-2 gap-3">
								<div>
									<Label>Category</Label>
									<Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="e.g., Electronics" />
								</div>
								<div>
									<Label>Model</Label>
									<Input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} placeholder="Model no." />
								</div>
							</div>
							<div className="grid grid-cols-2 gap-3">
								<div>
									<Label>Condition</Label>
									<Select value={form.condition_status} onValueChange={(v) => setForm({ ...form, condition_status: v as any })}>
										<SelectTrigger><SelectValue /></SelectTrigger>
										<SelectContent>
											<SelectItem value="working">Working</SelectItem>
											<SelectItem value="dead">Dead</SelectItem>
											<SelectItem value="consumable">Consumable</SelectItem>
										</SelectContent>
									</Select>
								</div>
								<div>
									<Label>Quantity</Label>
									<Input type="number" min={1} value={form.quantity_total} onChange={(e) => setForm({ ...form, quantity_total: Number(e.target.value) })} />
								</div>
							</div>
							<div className="pt-1">
								<Button onClick={handleAdd} disabled={loading} className="w-full">
									{loading ? 'Adding...' : 'Add Component'}
								</Button>
							</div>
							<p className="text-xs text-muted-foreground">Note: If this lab has a Head Lab Staff, only the head can add components.</p>
						</CardContent>
					</Card>
				</div>
			)}
		</div>
	)
}

function ComponentRow({ comp, onChanged }: { comp: ComponentItem; onChanged: () => void }) {
	const { toast } = useToast()
	const [editing, setEditing] = useState(false)
	const [saving, setSaving] = useState(false)
	const [local, setLocal] = useState({
		name: comp.name,
		category: comp.category || '',
		model: comp.model || '',
		condition_status: comp.condition_status,
		quantity_total: comp.quantity_total,
		quantity_available: comp.quantity_available,
	})

	const save = async () => {
		setSaving(true)
		try {
			const res = await fetch(`/api/lab-staff/components/${comp.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: local.name,
					category: local.category || null,
					model: local.model || null,
					condition_status: local.condition_status,
					quantity_total: Number(local.quantity_total),
					quantity_available: Number(local.quantity_available),
				}),
			})
			const text = await res.text()
			if (!res.ok) throw new Error((() => { try { return JSON.parse(text)?.error } catch { return text } })() || 'Failed')
			toast({ title: 'Saved', description: 'Component updated' })
			setEditing(false)
			onChanged()
		} catch (e: any) {
			toast({ title: 'Update failed', description: e?.message || 'Could not update', variant: 'destructive' })
		} finally { setSaving(false) }
	}

	const remove = async () => {
		if (!confirm('Delete this component?')) return
		try {
			const res = await fetch(`/api/lab-staff/components/${comp.id}`, { method: 'DELETE' })
			const text = await res.text()
			if (!res.ok) throw new Error((() => { try { return JSON.parse(text)?.error } catch { return text } })() || 'Failed')
			toast({ title: 'Deleted', description: 'Component removed' })
			onChanged()
		} catch (e: any) {
			toast({ title: 'Delete failed', description: e?.message || 'Could not delete', variant: 'destructive' })
		}
	}

	return (
		<div className="p-3 border rounded space-y-2 bg-white">
			{!editing ? (
				<>
					<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
						<div className="flex-1">
							<div className="font-medium text-sm">{comp.name} {comp.model ? `(${comp.model})` : ''}</div>
							<div className="text-xs text-muted-foreground">{comp.category || 'Uncategorized'} • {comp.condition_status} • Available: {comp.quantity_available}/{comp.quantity_total}</div>
						</div>
						<div className="flex gap-2 flex-shrink-0">
							<Button variant="outline" size="sm" onClick={() => setEditing(true)}>Edit</Button>
							<Button variant="destructive" size="sm" onClick={remove}>Delete</Button>
						</div>
					</div>
				</>
			) : (
				<div className="space-y-2">
					<div className="grid grid-cols-2 gap-2">
						<div>
							<Label>Name</Label>
							<Input value={local.name} onChange={(e) => setLocal({ ...local, name: e.target.value })} />
						</div>
						<div>
							<Label>Model</Label>
							<Input value={local.model} onChange={(e) => setLocal({ ...local, model: e.target.value })} />
						</div>
					</div>
					<div className="grid grid-cols-3 gap-2">
						<div>
							<Label>Category</Label>
							<Input value={local.category} onChange={(e) => setLocal({ ...local, category: e.target.value })} />
						</div>
						<div>
							<Label>Condition</Label>
							<Select value={local.condition_status} onValueChange={(v) => setLocal({ ...local, condition_status: v as any })}>
								<SelectTrigger><SelectValue /></SelectTrigger>
								<SelectContent>
									<SelectItem value="working">Working</SelectItem>
									<SelectItem value="dead">Dead</SelectItem>
									<SelectItem value="consumable">Consumable</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div>
							<Label>Total</Label>
							<Input type="number" min={0} value={local.quantity_total} onChange={(e) => setLocal({ ...local, quantity_total: Number(e.target.value) })} />
						</div>
					</div>
					<div className="grid grid-cols-3 gap-2">
						<div>
							<Label>Available</Label>
							<Input type="number" min={0} value={local.quantity_available} onChange={(e) => setLocal({ ...local, quantity_available: Number(e.target.value) })} />
						</div>
					</div>
					<div className="flex gap-2">
						<Button size="sm" onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
						<Button variant="outline" size="sm" onClick={() => { setEditing(false); setLocal({
							name: comp.name,
							category: comp.category || '',
							model: comp.model || '',
							condition_status: comp.condition_status,
							quantity_total: comp.quantity_total,
							quantity_available: comp.quantity_available,
						})}}>Cancel</Button>
					</div>
				</div>
			)}
		</div>
	)
}

