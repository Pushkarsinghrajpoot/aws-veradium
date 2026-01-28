"use client"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { AuthGuard } from "@/components/auth-guard"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Search, Calendar, RefreshCw, Download } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { format, subDays } from "date-fns"
import { cn } from "@/lib/utils"
import { athenaAPI } from "@/lib/athena-api"
import { DateHelper } from "@/lib/date-helper"

interface UnansweredQueueData {
  queue_id: string
  queue_name: string
  channel: string
  initiation_method: string
  received: string
  answered: string
  unanswered: string
  abandoned: string
  transferred: string
  avg_wait: string
  avg_talk: string
  max_callers: string
  _answered: string
  _unanswered: string
  percentage: string
}

interface UnansweredDIDData {
  did: string
  channel: string
  initiation_method: string
  received: string
  answered: string
  unanswered: string
  abandoned: string
  transferred: string
  avg_wait: string
  avg_talk: string
  max_callers: string
  _answered: string
  _unanswered: string
  percentage: string
}

interface DrilldownData {
  contact_id: string
  contact_date: string
  queue_name: string
  customer_number: string
  did: string
  channel: string
  interation_status: string
  wait_time: string
}

export default function MissedCallsPage() {
  const [queueData, setQueueData] = useState<UnansweredQueueData[]>([])
  const [didData, setDidData] = useState<UnansweredDIDData[]>([])
  const [drilldownData, setDrilldownData] = useState<DrilldownData[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("queue")
  const [isDrilldownOpen, setIsDrilldownOpen] = useState(false)
  const [drilldownTitle, setDrilldownTitle] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const { toast } = useToast()

  const [startDate, setStartDate] = useState<Date | undefined>(subDays(new Date(), 30))
  const [endDate, setEndDate] = useState<Date | undefined>(new Date())
  const [isStartDateOpen, setIsStartDateOpen] = useState(false)
  const [isEndDateOpen, setIsEndDateOpen] = useState(false)

  useEffect(() => {
    fetchQueueData()
  }, [])

  useEffect(() => {
    setIsDrilldownOpen(false)
    
    if (activeTab === 'queue' && queueData.length === 0) {
      fetchQueueData()
    } else if (activeTab === 'did' && didData.length === 0) {
      fetchDIDData()
    }
  }, [activeTab])

  const fetchQueueData = async () => {
    setIsLoading(true)
    try {
      const dateRange = {
        start: DateHelper.formatDateFromDate(startDate),
        end: DateHelper.formatDateFromDate(endDate, true)
      }

      const result = await athenaAPI.getUnansweredByQueue(dateRange.start, dateRange.end)
      
      if (result.status === 'SUCCEEDED') {
        setQueueData(result.data)
        toast({
          title: "Data loaded successfully",
          description: `Showing ${result.rowCount} queue${result.rowCount !== 1 ? 's' : ''}`,
        })
      } else {
        throw new Error(result.error || 'Query failed')
      }
    } catch (error) {
      console.error("Queue data fetch error:", error)
      toast({
        variant: "destructive",
        title: "Failed to load queue data",
        description: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const fetchDIDData = async () => {
    setIsLoading(true)
    try {
      const dateRange = {
        start: DateHelper.formatDateFromDate(startDate),
        end: DateHelper.formatDateFromDate(endDate, true)
      }

      const result = await athenaAPI.getUnansweredByDID(dateRange.start, dateRange.end)
      
      if (result.status === 'SUCCEEDED') {
        setDidData(result.data)
        toast({
          title: "DID data loaded successfully",
          description: `Showing ${result.rowCount} phone number${result.rowCount !== 1 ? 's' : ''}`,
        })
      } else {
        throw new Error(result.error || 'Query failed')
      }
    } catch (error) {
      console.error("DID data fetch error:", error)
      toast({
        variant: "destructive",
        title: "Failed to load DID data",
        description: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const fetchDrilldownData = async (queueId?: string, did?: string) => {
    setIsLoading(true)
    try {
      const dateRange = {
        start: DateHelper.formatDateFromDate(startDate),
        end: DateHelper.formatDateFromDate(endDate, true)
      }

      const filters: { queueId?: string[]; did?: string[] } = {}
      if (queueId) filters.queueId = [queueId]
      if (did) filters.did = [did]

      const result = await athenaAPI.getUnansweredDrilldown(
        dateRange.start,
        dateRange.end,
        filters
      )
      
      if (result.status === 'SUCCEEDED') {
        setDrilldownData(result.data)
        setIsDrilldownOpen(true)
      }
    } catch (error) {
      console.error("Drilldown fetch error:", error)
      toast({
        variant: "destructive",
        title: "Failed to load contact details",
        description: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleViewQueueDetails = (queue: UnansweredQueueData) => {
    setDrilldownTitle(`Missed Calls - ${queue.queue_name}`)
    fetchDrilldownData(queue.queue_id, undefined)
  }

  const handleViewDIDDetails = (didItem: UnansweredDIDData) => {
    setDrilldownTitle(`Missed Calls - ${didItem.did}`)
    fetchDrilldownData(undefined, didItem.did)
  }

  const handleApplyFilter = () => {
    if (activeTab === 'queue') {
      fetchQueueData()
    } else if (activeTab === 'did') {
      fetchDIDData()
    }
  }

  const handleResetFilter = () => {
    setStartDate(subDays(new Date(), 30))
    setEndDate(new Date())
    setTimeout(() => {
      if (activeTab === 'queue') {
        fetchQueueData()
      } else if (activeTab === 'did') {
        fetchDIDData()
      }
    }, 0)
  }

  const exportToCSV = (data: any[], filename: string) => {
    if (data.length === 0) return
    
    const headers = Object.keys(data[0]).join(',')
    const rows = data.map(row => Object.values(row).join(','))
    const csv = [headers, ...rows].join('\n')
    
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
  }

  const filteredQueues = queueData.filter((queue) => 
    queue.queue_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    queue.queue_id?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filteredDIDs = didData.filter((did) => 
    did.did?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Missed Calls Analysis</h1>
              <p className="text-muted-foreground">Track and analyze unanswered calls</p>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={() => activeTab === 'queue' ? fetchQueueData() : fetchDIDData()} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button 
                onClick={() => exportToCSV(activeTab === 'queue' ? filteredQueues : filteredDIDs, `missed-calls-${activeTab}.csv`)} 
                variant="outline" 
                size="sm"
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Date Range Filter</CardTitle>
              <CardDescription>Select a date range to filter missed calls data</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Start Date</label>
                  <Popover open={isStartDateOpen} onOpenChange={setIsStartDateOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !startDate && "text-muted-foreground")}>
                        <Calendar className="mr-2 h-4 w-4" />
                        {startDate ? format(startDate, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <CalendarComponent mode="single" selected={startDate} onSelect={(date) => { setStartDate(date); setIsStartDateOpen(false) }} initialFocus />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">End Date</label>
                  <Popover open={isEndDateOpen} onOpenChange={setIsEndDateOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !endDate && "text-muted-foreground")}>
                        <Calendar className="mr-2 h-4 w-4" />
                        {endDate ? format(endDate, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <CalendarComponent mode="single" selected={endDate} onSelect={(date) => { setEndDate(date); setIsEndDateOpen(false) }} initialFocus />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2 flex items-end gap-2">
                  <Button onClick={handleApplyFilter} className="flex-1" disabled={isLoading}>
                    Apply Filter
                  </Button>
                  <Button onClick={handleResetFilter} variant="outline" disabled={isLoading}>
                    Reset
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Missed Calls Data</CardTitle>
              <CardDescription>View unanswered calls by queue or phone number</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="queue">By Queue</TabsTrigger>
                  <TabsTrigger value="did">By Phone Number (DID)</TabsTrigger>
                </TabsList>

                <TabsContent value="queue" className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search queues..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8"
                    />
                  </div>

                  {isLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                  ) : (
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Queue Name</TableHead>
                            <TableHead className="text-right">Channel</TableHead>
                            <TableHead className="text-right">Received</TableHead>
                            <TableHead className="text-right">Answered</TableHead>
                            <TableHead className="text-right">Unanswered</TableHead>
                            <TableHead className="text-right">Abandoned</TableHead>
                            <TableHead className="text-right">Transferred</TableHead>
                            <TableHead className="text-right">Avg Wait</TableHead>
                            <TableHead className="text-right">Avg Talk</TableHead>
                            <TableHead className="text-right">% of Total</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredQueues.map((queue, index) => (
                            <TableRow key={index}>
                              <TableCell className="font-medium">{queue.queue_name || queue.queue_id}</TableCell>
                              <TableCell className="text-right">{queue.channel || '-'}</TableCell>
                              <TableCell className="text-right">{queue.received}</TableCell>
                              <TableCell className="text-right text-green-600">{queue.answered}</TableCell>
                              <TableCell className="text-right text-red-600">{queue.unanswered}</TableCell>
                              <TableCell className="text-right text-orange-600">{queue.abandoned || '0'}</TableCell>
                              <TableCell className="text-right text-blue-600">{queue.transferred || '0'}</TableCell>
                              <TableCell className="text-right">{queue.avg_wait || '-'}</TableCell>
                              <TableCell className="text-right">{queue.avg_talk || '-'}</TableCell>
                              <TableCell className="text-right">{queue.percentage}%</TableCell>
                              <TableCell className="text-right">
                                <Button variant="ghost" size="sm" onClick={() => handleViewQueueDetails(queue)}>
                                  View Details
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                          {filteredQueues.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={11} className="text-center text-muted-foreground">
                                No missed calls data available
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="did" className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search phone numbers..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8"
                    />
                  </div>

                  {isLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                  ) : (
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Phone Number (DID)</TableHead>
                            <TableHead className="text-right">Channel</TableHead>
                            <TableHead className="text-right">Received</TableHead>
                            <TableHead className="text-right">Answered</TableHead>
                            <TableHead className="text-right">Unanswered</TableHead>
                            <TableHead className="text-right">Abandoned</TableHead>
                            <TableHead className="text-right">Transferred</TableHead>
                            <TableHead className="text-right">Avg Wait</TableHead>
                            <TableHead className="text-right">Avg Talk</TableHead>
                            <TableHead className="text-right">% of Total</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredDIDs.map((did, index) => (
                            <TableRow key={index}>
                              <TableCell className="font-medium">{did.did}</TableCell>
                              <TableCell className="text-right">{did.channel || '-'}</TableCell>
                              <TableCell className="text-right">{did.received}</TableCell>
                              <TableCell className="text-right text-green-600">{did.answered}</TableCell>
                              <TableCell className="text-right text-red-600">{did.unanswered}</TableCell>
                              <TableCell className="text-right text-orange-600">{did.abandoned || '0'}</TableCell>
                              <TableCell className="text-right text-blue-600">{did.transferred || '0'}</TableCell>
                              <TableCell className="text-right">{did.avg_wait || '-'}</TableCell>
                              <TableCell className="text-right">{did.avg_talk || '-'}</TableCell>
                              <TableCell className="text-right">{did.percentage}%</TableCell>
                              <TableCell className="text-right">
                                <Button variant="ghost" size="sm" onClick={() => handleViewDIDDetails(did)}>
                                  View Details
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                          {filteredDIDs.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={11} className="text-center text-muted-foreground">
                                No DID data available
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        <Dialog open={isDrilldownOpen} onOpenChange={setIsDrilldownOpen}>
          <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{drilldownTitle}</DialogTitle>
              <DialogDescription>
                Contact details from {startDate ? format(startDate, "PPP") : ""} to {endDate ? format(endDate, "PPP") : ""}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex justify-end">
                <Button onClick={() => exportToCSV(drilldownData, 'missed-call-contacts.csv')} variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export Contacts
                </Button>
              </div>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Contact ID</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Queue</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>DID</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Wait Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {drilldownData.map((contact, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-mono text-xs">{contact.contact_id}</TableCell>
                        <TableCell>{contact.contact_date}</TableCell>
                        <TableCell>{contact.queue_name}</TableCell>
                        <TableCell>{contact.customer_number}</TableCell>
                        <TableCell>{contact.did}</TableCell>
                        <TableCell>{contact.interation_status}</TableCell>
                        <TableCell className="text-right">{contact.wait_time}</TableCell>
                      </TableRow>
                    ))}
                    {drilldownData.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground">
                          No contact data available
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </DashboardLayout>
    </AuthGuard>
  )
}
