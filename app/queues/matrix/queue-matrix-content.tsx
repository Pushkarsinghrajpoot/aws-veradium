"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/dashboard-layout"
import { AuthGuard } from "@/components/auth-guard"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Search, Calendar, RefreshCw } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { format, subDays } from "date-fns"
import { cn } from "@/lib/utils"

interface QueueData {
  queue_id: string
  channel: string
  initiation_method: string
  received: string
  answered: string
  unanswered: string
  abandoned: string
  transferred: string
  avg_wait_s: string
  avg_talk: string
  max_callers: string
  "%_answered": string
  "%_unanswered": string
  sla: string
}

interface APIResponse<T> {
  queryExecutionId: string
  status: string
  executionTime: number
  data: T[]
  columns: string[]
  rowCount: number
}

const API_ENDPOINT = "https://i2831zjef8.execute-api.us-east-1.amazonaws.com/prod/query"

export default function QueueMatrixContent() {
  const router = useRouter()
  const [queueData, setQueueData] = useState<QueueData[]>([])
  const [isLoadingQueues, setIsLoadingQueues] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const { toast } = useToast()

  // Date filter state
  const [startDate, setStartDate] = useState<Date | undefined>(subDays(new Date(), 30))
  const [endDate, setEndDate] = useState<Date | undefined>(new Date())
  const [isStartDateOpen, setIsStartDateOpen] = useState(false)
  const [isEndDateOpen, setIsEndDateOpen] = useState(false)

  // Load queue summary data
  const fetchQueueData = async () => {
    setIsLoadingQueues(true)
    try {
      // Prepare request body
      const requestBody: any = {
        preparedStatement: "prep_distbyqueue",
        waitForResults: true,
        maxWaitTime: 60,
      }

      // Add date parameters if they exist
      if (startDate) {
        requestBody.startDate = format(startDate, "yyyy-MM-dd")
      }
      if (endDate) {
        requestBody.endDate = format(endDate, "yyyy-MM-dd")
      }

      const response = await fetch(API_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`)
      }

      const result: APIResponse<QueueData> = await response.json()
      setQueueData(result.data)
      
      toast({
        title: "Data loaded successfully",
        description: `Showing ${result.rowCount} queue${result.rowCount !== 1 ? 's' : ''}`,
      })
    } catch (error) {
      console.error("[v0] Queue data fetch error:", error)
      toast({
        variant: "destructive",
        title: "Failed to load queue data",
        description: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setIsLoadingQueues(false)
    }
  }

  // Initial load
  useEffect(() => {
    fetchQueueData()
  }, [])

  const filteredQueues = queueData.filter((queue) => 
    queue.queue_id.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleViewDetails = (queueId: string) => {
    // Pass date range as query parameters
    const params = new URLSearchParams()
    if (startDate) {
      params.set('startDate', format(startDate, "yyyy-MM-dd"))
    }
    if (endDate) {
      params.set('endDate', format(endDate, "yyyy-MM-dd"))
    }
    
    router.push(`/queues/matrix/${encodeURIComponent(queueId)}?${params.toString()}`)
  }

  const handleApplyFilter = () => {
    fetchQueueData()
  }

  const handleResetFilter = () => {
    setStartDate(subDays(new Date(), 30))
    setEndDate(new Date())
    setTimeout(() => fetchQueueData(), 0)
  }

  const setQuickRange = (days: number) => {
    setStartDate(subDays(new Date(), days))
    setEndDate(new Date())
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
                    disabled={isLoadingQueues}
                  >
                    {isLoadingQueues ? (
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
                    disabled={isLoadingQueues}
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
                  <CardTitle>Queue Distribution</CardTitle>
                  <CardDescription>
                    Summary statistics by queue
                    {startDate && endDate && (
                      <span className="block mt-1 text-xs">
                        Showing data from {format(startDate, "MMM dd, yyyy")} to {format(endDate, "MMM dd, yyyy")}
                      </span>
                    )}
                  </CardDescription>
                </div>
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search queue ID..."
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingQueues ? (
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
                        <TableHead>Queue ID</TableHead>
                        <TableHead>Channel</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Received</TableHead>
                        <TableHead>Answered</TableHead>
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
                            className="font-mono text-sm cursor-pointer text-primary hover:underline"
                            onClick={() => handleViewDetails(queue.queue_id)}
                          >
                            {queue.queue_id}
                          </TableCell>
                          <TableCell>{queue.channel}</TableCell>
                          <TableCell>{queue.initiation_method}</TableCell>
                          <TableCell>{queue.received}</TableCell>
                          <TableCell>{queue.answered}</TableCell>
                          <TableCell>{queue.abandoned}</TableCell>
                          <TableCell>{queue.avg_wait_s}</TableCell>
                          <TableCell>{queue.avg_talk || "-"}</TableCell>
                          <TableCell>{queue["%_answered"]}</TableCell>
                          <TableCell className="font-medium">{queue.sla}</TableCell>
                          <TableCell className="text-right">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => handleViewDetails(queue.queue_id)}
                            >
                              View Details
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {filteredQueues.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={11} className="h-24 text-center text-muted-foreground">
                            No queues found.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </AuthGuard>
  )
}