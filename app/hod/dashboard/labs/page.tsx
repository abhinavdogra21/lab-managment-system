/**
 * Created by Abhinav Dogra (23ucs507) and Abhinav Thulal (23ucs508)
 */

"use client"

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { Download, Package, Building, FileText, Filter } from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

interface LabComponent {
  id: number
  name: string
  model: string | null
  category: string
  quantity_available: number
  quantity_total: number
  condition_status: string
  lab_name: string
  lab_id: number
}

interface Lab {
  id: number
  name: string
  department_id: number
}

export default function HODLabsPage() {
  const { toast } = useToast()
  
  const [loading, setLoading] = useState(false)
  const [labs, setLabs] = useState<Lab[]>([])
  const [components, setComponents] = useState<LabComponent[]>([])
  const [selectedLab, setSelectedLab] = useState<string>('all')
  
  // Get unique labs for filter
  const uniqueLabs = labs.length > 0 
    ? labs.map(l => l.name).sort()
    : Array.from(new Set(components.map(c => c.lab_name))).sort()

  const loadComponents = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/hod/labs/components', { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        setLabs(data.labs || [])
        setComponents(data.components || [])
      } else {
        toast({ title: 'Error', description: 'Failed to load components', variant: 'destructive' })
      }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to load components', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadComponents()
  }, [])

  const generateLabInventoryPDF = async (lab: Lab, labComponents: LabComponent[], viewOnly: boolean = false) => {
    const doc = new jsPDF()
    
    // Add LNMIIT logo
    try {
      const logoImg = new Image()
      logoImg.src = '/lnmiit-logo.png'
      await new Promise((resolve) => {
        logoImg.onload = resolve
        logoImg.onerror = resolve
      })
      doc.addImage(logoImg, 'PNG', 15, 10, 40, 20)
    } catch (error) {
      console.error('Logo loading failed:', error)
    }

    // Header
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text('LNMIIT', 105, 20, { align: 'center' })
    doc.setFontSize(12)
    doc.text('The LNM Institute of Information Technology', 105, 27, { align: 'center' })
    
    doc.setFontSize(14)
    doc.text('Lab Components Inventory Report', 105, 40, { align: 'center' })
    
    // Horizontal line
    doc.setLineWidth(0.5)
    doc.line(15, 45, 195, 45)
    
    // Lab Information
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text(`Lab: ${lab.name}`, 15, 55)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.text(`Total Components: ${labComponents.length}`, 15, 62)
    doc.text(`Generated on: ${new Date().toLocaleString('en-IN')}`, 15, 68)
    
    // Components Table
    const tableData = labComponents.map(comp => [
      comp.name,
      comp.category || '-',
      comp.model || '-',
      `${comp.quantity_available}/${comp.quantity_total}`,
      comp.condition_status || 'working',
      comp.quantity_available === 0 ? 'Out of Stock' : 
        comp.quantity_available < comp.quantity_total * 0.3 ? 'Low Stock' : 'OK'
    ])

    autoTable(doc, {
      startY: 75,
      head: [['Component', 'Category', 'Model', 'Qty (Avail/Total)', 'Condition', 'Status']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [41, 128, 185], textColor: 255 },
      styles: { fontSize: 9 },
      columnStyles: {
        0: { cellWidth: 45 },
        1: { cellWidth: 30 },
        2: { cellWidth: 30 },
        3: { cellWidth: 30 },
        4: { cellWidth: 25 },
        5: { cellWidth: 25 }
      }
    })

    // Footer
    const finalY = (doc as any).lastAutoTable.finalY || 150
    const pageHeight = doc.internal.pageSize.height
    doc.setFontSize(8)
    doc.setTextColor(100, 100, 100)
    doc.text('This is a computer-generated document.', 105, pageHeight - 10, { align: 'center' })
    
    // Save or view PDF
    if (viewOnly) {
      const pdfBlob = doc.output('blob')
      const pdfUrl = URL.createObjectURL(pdfBlob)
      window.open(pdfUrl, '_blank')
      toast({ title: 'Success', description: 'Inventory PDF opened in new tab!' })
    } else {
      doc.save(`Lab_Inventory_${lab.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`)
      toast({ title: 'Success', description: 'Inventory PDF downloaded successfully!' })
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Department Labs</h1>
        <p className="text-muted-foreground mt-1">View components inventory for your department labs</p>
      </div>

      <div className="flex items-center justify-end gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={selectedLab} onValueChange={setSelectedLab}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by lab" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Labs</SelectItem>
            {uniqueLabs.map((lab) => (
              <SelectItem key={lab} value={lab}>{lab}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Loading components...
          </CardContent>
        </Card>
      ) : labs.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No labs found in your department
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {labs
            .filter(lab => selectedLab === 'all' || lab.name === selectedLab)
            .map(lab => {
              const labComponents = components.filter(c => c.lab_id === lab.id)
              return (
                <Card key={lab.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building className="h-5 w-5" />
                      {lab.name}
                      <Badge variant="secondary" className="ml-auto">
                        {labComponents.length} component{labComponents.length !== 1 ? 's' : ''}
                      </Badge>
                      {labComponents.length > 0 && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => generateLabInventoryPDF(lab, labComponents, true)}
                            className="flex items-center gap-2 ml-2"
                          >
                            <FileText className="h-4 w-4" />
                            View
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => generateLabInventoryPDF(lab, labComponents, false)}
                            className="flex items-center gap-2 ml-1"
                          >
                            <Download className="h-4 w-4" />
                            Download
                          </Button>
                        </>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {labComponents.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No components in this lab yet
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {labComponents.map((comp) => (
                          <div key={comp.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex-1">
                              <div className="font-medium">{comp.name}</div>
                              {comp.model && <div className="text-sm text-muted-foreground">Model: {comp.model}</div>}
                              <div className="text-xs text-muted-foreground mt-1">
                                <Badge variant="outline" className="text-xs">{comp.category}</Badge>
                                {comp.condition_status && comp.condition_status !== 'working' && (
                                  <Badge variant="secondary" className="text-xs ml-1">{comp.condition_status}</Badge>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-bold">
                                {comp.quantity_available}/{comp.quantity_total}
                              </div>
                              <div className="text-xs text-muted-foreground">Available/Total</div>
                              {comp.quantity_available === 0 && (
                                <Badge variant="destructive" className="text-xs mt-1">Out of Stock</Badge>
                              )}
                              {comp.quantity_available > 0 && comp.quantity_available < comp.quantity_total * 0.3 && (
                                <Badge className="text-xs mt-1 bg-yellow-100 text-yellow-800">Low Stock</Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
        </div>
      )}
    </div>
  )
}
