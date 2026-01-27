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

interface QueueData {
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
  "%_answered": string
  "%_unanswered": string
  sla: string
}

interface DIDData {
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
  "%_answered": string
  "%_unanswered": string
  sla: string
}

interface HourData {
  hour: string
  channel: string
  received: string
  answered: string
  unanswered: string
  abandoned: string
  avg_wait: string
  avg_talk: string
  "%_answered": string
  sla: string
}

interface DrilldownData {
  row_no: string
  did: string
  contact_id: string
  agent_name: string
  date: string
  queue_name: string
  customer_number: string
  channel: string
  initiation_method: string
  interation_status: string
  agent_connection_attempts: string
  event: string
  ring_time: string
  wait_time: string
  talk_time: string
}

export default function QueueMatrixContent() {
  const [queueData, setQueueData] = useState<QueueData[]>([])
  const [didData, setDidData] = useState<DIDData[]>([])
  const [hourData, setHourData] = useState<HourData[]>([])
  const [drilldownData, setDrilldownData] = useState<DrilldownData[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [activeTab, setActiveTab] = useState("queue")
  const [isDrilldownOpen, setIsDrilldownOpen] = useState(false)
  const [drilldownTitle, setDrilldownTitle] = useState("")
  const { toast } = useToast()

  // Date filter state
  const [startDate, setStartDate] = useState<Date | undefined>(subDays(new Date(), 30))
  const [endDate, setEndDate] = useState<Date | undefined>(new Date())
  const [isStartDateOpen, setIsStartDateOpen] = useState(false)
  const [isEndDateOpen, setIsEndDateOpen] = useState(false)

  // Load queue summary data
  const fetchQueueData = async () => {
    setIsLoading(true)
    try {
      const dateRange = {
        start: DateHelper.formatDateFromDate(startDate),
        end: DateHelper.formatDateFromDate(endDate, true)
      }

      const result = await athenaAPI.getDistributionByQueue(dateRange.start, dateRange.end)
      
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

  // Load DID data
  const fetchDIDData = async () => {
    setIsLoading(true)
    try {
      const dateRange = {
        start: DateHelper.formatDateFromDate(startDate),
        end: DateHelper.formatDateFromDate(endDate, true)
      }

      const result = await athenaAPI.getDistributionByDID(dateRange.start, dateRange.end)
      
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

  // Load hourly data
  const fetchHourData = async () => {
    setIsLoading(true)
    try {
      const dateRange = {
        start: DateHelper.formatDateFromDate(startDate || new Date()),
        end: DateHelper.formatDateFromDate(startDate || new Date(), true)
      }

      const result = await athenaAPI.getDistributionByHour(dateRange.start, dateRange.end)
      
      if (result.status === 'SUCCEEDED') {
        setHourData(result.data)
        toast({
          title: "Hourly data loaded successfully",
          description: `Showing ${result.rowCount} hour${result.rowCount !== 1 ? 's' : ''}`,
        })
      } else {
        throw new Error(result.error || 'Query failed')
      }
    } catch (error) {
      console.error("Hour data fetch error:", error)
      toast({
        variant: "destructive",
        title: "Failed to load hourly data",
        description: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Load drilldown data
  const fetchDrilldownData = async (queueId?: string, did?: string) => {
    try {
      const dateRange = {
        start: DateHelper.formatDateFromDate(startDate),
        end: DateHelper.formatDateFromDate(endDate, true)
      }

      const filters: any = {}
      if (queueId) filters.queueId = [queueId]
      if (did) filters.did = [did]

      const result = await athenaAPI.getDistributionDrilldown(
        dateRange.start,
        dateRange.end,
        filters
      )
      
      if (result.status === 'SUCCEEDED') {
        setDrilldownData(result.data)
        setIsDrilldownOpen(true)
      } else {
        throw new Error(result.error || 'Query failed')
      }
    } catch (error) {
      console.error("Drilldown data fetch error:", error)
      toast({
        variant: "destructive",
        title: "Failed to load contact details",
        description: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  // Initial load
  useEffect(() => {
    fetchQueueData()
  }, [])

  // Load data when tab changes
  useEffect(() => {
    // Close drilldown dialog when switching tabs
    setIsDrilldownOpen(false)
    
    if (activeTab === 'queue' && queueData.length === 0) {
      fetchQueueData()
    } else if (activeTab === 'did' && didData.length === 0) {
      fetchDIDData()
    } else if (activeTab === 'hour' && hourData.length === 0) {
      fetchHourData()
    }
  }, [activeTab])

  const filteredQueues = queueData.filter((queue) => 
    queue.queue_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    queue.queue_name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filteredDIDs = didData.filter((did) => 
    did.did?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filteredHours = hourData.filter((hour) => 
    hour.hour?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleViewQueueDetails = (queue: QueueData) => {
    setDrilldownTitle(`Contact Details - ${queue.queue_name || queue.queue_id}`)
    fetchDrilldownData(queue.queue_id)
  }

  const handleViewDIDDetails = (didItem: DIDData) => {
    setDrilldownTitle(`Contact Details - ${didItem.did}`)
    fetchDrilldownData(undefined, didItem.did)
  }

  const handleApplyFilter = () => {
    if (activeTab === 'queue') {
      fetchQueueData()
    } else if (activeTab === 'did') {
      fetchDIDData()
    } else if (activeTab === 'hour') {
      fetchHourData()
    }
  }

  const handleResetFilter = () => {
    setStartDate(subDays(new Date(), 30))
    setEndDate(new Date())
    setTimeout(() => handleApplyFilter(), 0)
  }

  const setQuickRange = (days: number) => {
    setStartDate(subDays(new Date(), days))
    setEndDate(new Date())
  }

  const exportToCSV = (data: any[], filename: string) => {
    if (data.length === 0) return
    
    const headers = Object.keys(data[0])
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => row[header]).join(','))
    ].join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    window.URL.revokeObjectURL(url)
  }

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex flex-col gap-1">
            <h2 className="text-3xl font-bold tracking-tight">Queue Matrix</h2>
            <p className="text-muted-foreground">
              View real-time queue performance metrics. Click a queue ID to see detailed call records.
            </p>
          </div>

          {/* Date Filter Card */}
          <Card>
            <CardHeader>
              <CardTitle>Date Range Filter</CardTitle>
              <CardDescription>Select a date range to filter queue data</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
                {/* Start Date */}
                <div className="flex flex-col gap-2 w-full sm:w-auto">
                  <label className="text-sm font-medium">Start Date</label>
                  <Popover open={isStartDateOpen} onOpenChange={setIsStartDateOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full sm:w-[240px] justify-start text-left font-normal",
                          !startDate && "text-muted-foreground"
                        )}
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {startDate ? format(startDate, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={startDate}
                        onSelect={(date) => {
                          setStartDate(date)
                          setIsStartDateOpen(false)
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* End Date */}
                <div className="flex flex-col gap-2 w-full sm:w-auto">
                  <label className="text-sm font-medium">End Date</label>
                  <Popover open={isEndDateOpen} onOpenChange={setIsEndDateOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full sm:w-[240px] justify-start text-left font-normal",
                          !endDate && "text-muted-foreground"
                        )}
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {endDate ? format(endDate, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={endDate}
                        onSelect={(date) => {
                          setEndDate(date)
                          setIsEndDateOpen(false)
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Quick Range Buttons */}
                <div className="flex flex-col gap-2 w-full sm:w-auto">
                  <label className="text-sm font-medium">Quick Select</label>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setQuickRange(7)}
                    >
                      Last 7 Days
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setQuickRange(30)}
                    >
                      Last 30 Days
                    </Button>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 ml-auto">
                  <Button 
                    onClick={handleApplyFilter} 
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      <>
                        <Search className="mr-2 h-4 w-4" />
                        Apply Filter
                      </>
                    )}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={handleResetFilter}
                    disabled={isLoading}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Reset
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <CardTitle>Queue Performance Matrix</CardTitle>
                  <CardDescription>
                    {startDate && endDate && (
                      <span className="block mt-1 text-xs">
                        Showing data from {format(startDate, "MMM dd, yyyy")} to {format(endDate, "MMM dd, yyyy")}
                      </span>
                    )}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search..."
                      className="pl-8"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => {
                      if (activeTab === 'queue') exportToCSV(filteredQueues, 'queue-data.csv')
                      else if (activeTab === 'did') exportToCSV(filteredDIDs, 'did-data.csv')
                      else if (activeTab === 'hour') exportToCSV(filteredHours, 'hourly-data.csv')
                    }}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="queue">By Queue</TabsTrigger>
                  <TabsTrigger value="did">By Phone Number (DID)</TabsTrigger>
                  <TabsTrigger value="hour">By Hour</TabsTrigger>
                </TabsList>

                {/* Queue Tab */}
                <TabsContent value="queue" className="mt-4">
                  {isLoading ? (
                    <div className="flex items-center justify-center h-32">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading queue data...
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-md border overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Queue Name</TableHead>
                            <TableHead>Channel</TableHead>
                            <TableHead>Method</TableHead>
                            <TableHead>Received</TableHead>
                            <TableHead>Answered</TableHead>
                            <TableHead>Unanswered</TableHead>
                            <TableHead>Abandoned</TableHead>
                            <TableHead>Avg Wait</TableHead>
                            <TableHead>Avg Talk</TableHead>
                            <TableHead>% Answered</TableHead>
                            <TableHead>SLA</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredQueues.map((queue) => (
                            <TableRow key={queue.queue_id}>
                              <TableCell 
                                className="font-medium cursor-pointer text-primary hover:underline"
                                onClick={() => handleViewQueueDetails(queue)}
                              >
                                {queue.queue_name || queue.queue_id}
                              </TableCell>
                              <TableCell>{queue.channel}</TableCell>
                              <TableCell>{queue.initiation_method}</TableCell>
                              <TableCell>{queue.received}</TableCell>
                              <TableCell>{queue.answered}</TableCell>
                              <TableCell>{queue.unanswered}</TableCell>
                              <TableCell>{queue.abandoned}</TableCell>
                              <TableCell>{queue.avg_wait || "-"}</TableCell>
                              <TableCell>{queue.avg_talk || "-"}</TableCell>
                              <TableCell>{queue["%_answered"]}</TableCell>
                              <TableCell className="font-medium">{queue.sla}</TableCell>
                              <TableCell className="text-right">
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => handleViewQueueDetails(queue)}
                                >
                                  View Details
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                          {filteredQueues.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={12} className="h-24 text-center text-muted-foreground">
                                No queues found.
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </TabsContent>

                {/* DID Tab */}
                <TabsContent value="did" className="mt-4">
                  {isLoading ? (
                    <div className="flex items-center justify-center h-32">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading DID data...
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-md border overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Phone Number (DID)</TableHead>
                            <TableHead>Channel</TableHead>
                            <TableHead>Method</TableHead>
                            <TableHead>Received</TableHead>
                            <TableHead>Answered</TableHead>
                            <TableHead>Unanswered</TableHead>
                            <TableHead>Abandoned</TableHead>
                            <TableHead>Avg Wait</TableHead>
                            <TableHead>Avg Talk</TableHead>
                            <TableHead>% Answered</TableHead>
                            <TableHead>SLA</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredDIDs.map((did, index) => (
                            <TableRow key={did.did + index}>
                              <TableCell 
                                className="font-mono cursor-pointer text-primary hover:underline"
                                onClick={() => handleViewDIDDetails(did)}
                              >
                                {did.did}
                              </TableCell>
                              <TableCell>{did.channel}</TableCell>
                              <TableCell>{did.initiation_method}</TableCell>
                              <TableCell>{did.received}</TableCell>
                              <TableCell>{did.answered}</TableCell>
                              <TableCell>{did.unanswered}</TableCell>
                              <TableCell>{did.abandoned}</TableCell>
                              <TableCell>{did.avg_wait || "-"}</TableCell>
                              <TableCell>{did.avg_talk || "-"}</TableCell>
                              <TableCell>{did["%_answered"]}</TableCell>
                              <TableCell className="font-medium">{did.sla}</TableCell>
                              <TableCell className="text-right">
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => handleViewDIDDetails(did)}
                                >
                                  View Details
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                          {filteredDIDs.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={12} className="h-24 text-center text-muted-foreground">
                                No phone numbers found.
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </TabsContent>

                {/* Hour Tab */}
                <TabsContent value="hour" className="mt-4">
                  <div className="mb-4 p-3 bg-muted rounded-md text-sm text-muted-foreground">
                    Note: Hourly breakdown shows data for the selected start date only.
                  </div>
                  {isLoading ? (
                    <div className="flex items-center justify-center h-32">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading hourly data...
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-md border overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Hour</TableHead>
                            <TableHead>Channel</TableHead>
                            <TableHead>Received</TableHead>
                            <TableHead>Answered</TableHead>
                            <TableHead>Unanswered</TableHead>
                            <TableHead>Abandoned</TableHead>
                            <TableHead>Avg Wait</TableHead>
                            <TableHead>Avg Talk</TableHead>
                            <TableHead>% Answered</TableHead>
                            <TableHead>SLA</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredHours.map((hour, index) => (
                            <TableRow key={hour.hour + index}>
                              <TableCell className="font-medium">{hour.hour}</TableCell>
                              <TableCell>{hour.channel}</TableCell>
                              <TableCell>{hour.received}</TableCell>
                              <TableCell>{hour.answered}</TableCell>
                              <TableCell>{hour.unanswered}</TableCell>
                              <TableCell>{hour.abandoned}</TableCell>
                              <TableCell>{hour.avg_wait || "-"}</TableCell>
                              <TableCell>{hour.avg_talk || "-"}</TableCell>
                              <TableCell>{hour["%_answered"]}</TableCell>
                              <TableCell className="font-medium">{hour.sla}</TableCell>
                            </TableRow>
                          ))}
                          {filteredHours.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={10} className="h-24 text-center text-muted-foreground">
                                No hourly data found.
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

          {/* Drilldown Modal */}
          <Dialog open={isDrilldownOpen} onOpenChange={setIsDrilldownOpen}>
            <DialogContent className="max-w-7xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{drilldownTitle}</DialogTitle>
                <DialogDescription>
                  Contact-level details for the selected item
                  {startDate && endDate && (
                    <span className="block mt-1">
                      From {format(startDate, "MMM dd, yyyy")} to {format(endDate, "MMM dd, yyyy")}
                    </span>
                  )}
                </DialogDescription>
              </DialogHeader>
              <div className="mt-4">
                <div className="flex justify-between items-center mb-4">
                  <p className="text-sm text-muted-foreground">
                    Showing {drilldownData.length} contact{drilldownData.length !== 1 ? 's' : ''}
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => exportToCSV(drilldownData, 'contact-details.csv')}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Export CSV
                  </Button>
                </div>
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Contact ID</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Agent</TableHead>
                        <TableHead>Queue</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>DID</TableHead>
                        <TableHead>Channel</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Ring Time</TableHead>
                        <TableHead>Wait Time</TableHead>
                        <TableHead>Talk Time</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {drilldownData.map((contact, index) => (
                        <TableRow key={contact.contact_id + index}>
                          <TableCell className="font-mono text-xs">{contact.contact_id}</TableCell>
                          <TableCell className="text-sm">{contact.date}</TableCell>
                          <TableCell>{contact.agent_name}</TableCell>
                          <TableCell>{contact.queue_name}</TableCell>
                          <TableCell className="font-mono text-sm">{contact.customer_number}</TableCell>
                          <TableCell className="font-mono text-sm">{contact.did}</TableCell>
                          <TableCell>{contact.channel}</TableCell>
                          <TableCell>{contact.interation_status}</TableCell>
                          <TableCell>{contact.ring_time}</TableCell>
                          <TableCell>{contact.wait_time}</TableCell>
                          <TableCell>{contact.talk_time}</TableCell>
                        </TableRow>
                      ))}
                      {drilldownData.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={11} className="h-24 text-center text-muted-foreground">
                            No contacts found.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </DashboardLayout>
    </AuthGuard>
  )
}