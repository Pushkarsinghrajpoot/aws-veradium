"use client"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { AuthGuard } from "@/components/auth-guard"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Search, Calendar, RefreshCw, Download } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { format, subDays } from "date-fns"
import { cn } from "@/lib/utils"
import { athenaAPI } from "@/lib/athena-api"
import { DateHelper } from "@/lib/date-helper"

interface AgentData {
  agent_id: string
  agent_name: string
  queue_id: string
  queue_name: string
  answered: string
  avg_talk: string
  avg_wait: string
  max_concurrent: string
  total_talk: string
  total_after_call: string
  total_hold: string
  total_contacts: string
  sla: string
  _answered: string
  _unanswered: string
}

interface DrilldownData {
  contact_id: string
  contact_date: string
  agent_name: string
  queue_name: string
  customer_number: string
  did: string
  channel: string
  interation_status: string
  ring_time: string
  wait_time: string
  talk_time: string
}

export default function AgentPerformancePage() {
  const [agentData, setAgentData] = useState<AgentData[]>([])
  const [drilldownData, setDrilldownData] = useState<DrilldownData[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isDrilldownOpen, setIsDrilldownOpen] = useState(false)
  const [drilldownTitle, setDrilldownTitle] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedQueue, setSelectedQueue] = useState<string>("ALL")
  const { toast } = useToast()

  const [startDate, setStartDate] = useState<Date | undefined>(subDays(new Date(), 30))
  const [endDate, setEndDate] = useState<Date | undefined>(new Date())
  const [isStartDateOpen, setIsStartDateOpen] = useState(false)
  const [isEndDateOpen, setIsEndDateOpen] = useState(false)

  useEffect(() => {
    fetchAgentData()
  }, [])

  const fetchAgentData = async (queueFilter: string = "ALL") => {
    setIsLoading(true)
    try {
      const dateRange = {
        start: DateHelper.formatDateFromDate(startDate),
        end: DateHelper.formatDateFromDate(endDate, true)
      }

      const result = await athenaAPI.getAnsweredByAgent(
        dateRange.start,
        dateRange.end,
        queueFilter === "ALL" ? ["ALL"] : [queueFilter]
      )
      
      if (result.status === 'SUCCEEDED') {
        setAgentData(result.data)
        toast({
          title: "Data loaded successfully",
          description: `Showing ${result.rowCount} agent${result.rowCount !== 1 ? 's' : ''}`,
        })
      } else {
        throw new Error(result.error || 'Query failed')
      }
    } catch (error) {
      console.error("Agent data fetch error:", error)
      toast({
        variant: "destructive",
        title: "Failed to load agent data",
        description: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const fetchAgentDrilldown = async (agentId: string, agentName: string) => {
    setIsLoading(true)
    try {
      const dateRange = {
        start: DateHelper.formatDateFromDate(startDate),
        end: DateHelper.formatDateFromDate(endDate, true)
      }

      const result = await athenaAPI.getAnsweredDrilldown(
        dateRange.start,
        dateRange.end,
        { agentId: [agentId] }
      )
      
      if (result.status === 'SUCCEEDED') {
        setDrilldownData(result.data)
        setDrilldownTitle(`${agentName}'s Calls`)
        setIsDrilldownOpen(true)
      }
    } catch (error) {
      console.error("Drilldown fetch error:", error)
      toast({
        variant: "destructive",
        title: "Failed to load agent details",
        description: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleViewAgentDetails = (agent: AgentData) => {
    fetchAgentDrilldown(agent.agent_id, agent.agent_name)
  }

  const handleApplyFilter = () => {
    fetchAgentData(selectedQueue)
  }

  const handleResetFilter = () => {
    setStartDate(subDays(new Date(), 30))
    setEndDate(new Date())
    setSelectedQueue("ALL")
    setTimeout(() => fetchAgentData("ALL"), 0)
  }

  const handleQueueFilterChange = (value: string) => {
    setSelectedQueue(value)
    fetchAgentData(value)
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

  const filteredAgents = agentData.filter((agent) => 
    agent.agent_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    agent.agent_id?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Agent Performance Matrix</h1>
              <p className="text-muted-foreground">View and analyze agent metrics</p>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={() => fetchAgentData(selectedQueue)} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button onClick={() => exportToCSV(filteredAgents, 'agent-performance.csv')} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Date Range Filter</CardTitle>
              <CardDescription>Select a date range to filter agent performance data</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4">
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

                <div className="space-y-2">
                  <label className="text-sm font-medium">Queue Filter</label>
                  <Select value={selectedQueue} onValueChange={handleQueueFilterChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select queue" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Queues</SelectItem>
                    </SelectContent>
                  </Select>
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
              <CardTitle>Agent Performance Table</CardTitle>
              <CardDescription>
                {isLoading ? "Loading agent data..." : `Showing ${filteredAgents.length} agent${filteredAgents.length !== 1 ? 's' : ''}`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by agent name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
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
                        <TableHead>Agent Name</TableHead>
                        <TableHead className="text-right">Queue</TableHead>
                        <TableHead className="text-right">Answered</TableHead>
                        <TableHead className="text-right">Avg Talk</TableHead>
                        <TableHead className="text-right">Avg Wait</TableHead>
                        <TableHead className="text-right">Total Talk</TableHead>
                        <TableHead className="text-right">Total Hold</TableHead>
                        <TableHead className="text-right">Total Contacts</TableHead>
                        <TableHead className="text-right">SLA %</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAgents.map((agent, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{agent.agent_name}</TableCell>
                          <TableCell className="text-right">{agent.queue_name || agent.queue_id || '-'}</TableCell>
                          <TableCell className="text-right text-green-600">{agent.answered}</TableCell>
                          <TableCell className="text-right">{agent.avg_talk || '-'}</TableCell>
                          <TableCell className="text-right">{agent.avg_wait || '-'}</TableCell>
                          <TableCell className="text-right">{agent.total_talk || '-'}</TableCell>
                          <TableCell className="text-right">{agent.total_hold || '-'}</TableCell>
                          <TableCell className="text-right">{agent.total_contacts || '-'}</TableCell>
                          <TableCell className="text-right">{agent.sla}%</TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" onClick={() => handleViewAgentDetails(agent)}>
                              View Calls
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {filteredAgents.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={10} className="text-center text-muted-foreground">
                            No agent data available
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
                <Button onClick={() => exportToCSV(drilldownData, `${drilldownTitle}-contacts.csv`)} variant="outline" size="sm">
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
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Talk Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {drilldownData.map((contact, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-mono text-xs">{contact.contact_id}</TableCell>
                        <TableCell>{contact.contact_date}</TableCell>
                        <TableCell>{contact.queue_name}</TableCell>
                        <TableCell>{contact.customer_number}</TableCell>
                        <TableCell>{contact.interation_status}</TableCell>
                        <TableCell className="text-right">{contact.talk_time}</TableCell>
                      </TableRow>
                    ))}
                    {drilldownData.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground">
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
