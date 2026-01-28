"use client"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { AuthGuard } from "@/components/auth-guard"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast"
import { Loader2, TrendingUp, Phone, PhoneOff, Target } from "lucide-react"
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
  _answered: string
  _unanswered: string
  sla: string
}

interface HourData {
  hour: string
  received: string
  answered: string
}

export default function DashboardOverview() {
  const [queueStats, setQueueStats] = useState<QueueData[]>([])
  const [hourlyData, setHourlyData] = useState<HourData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [kpis, setKpis] = useState({
    totalCalls: 0,
    answeredCalls: 0,
    missedCalls: 0,
    avgSLA: 0
  })
  const { toast } = useToast()

  useEffect(() => {
    loadDashboardData()
    const interval = setInterval(loadDashboardData, 5 * 60 * 1000) // Refresh every 5 minutes
    return () => clearInterval(interval)
  }, [])

  const loadDashboardData = async () => {
    setIsLoading(true)
    try {
      const dateRange = DateHelper.getLastNDays(30)
      
      // Get queue stats for KPIs and table
      const queueResult = await athenaAPI.getDistributionByQueue(dateRange.start, dateRange.end)
      
      if (queueResult.status === 'SUCCEEDED') {
        setQueueStats(queueResult.data)
        
        // Calculate KPIs
        const totalReceived = queueResult.data.reduce((sum, q) => sum + parseInt(q.received || '0'), 0)
        const totalAnswered = queueResult.data.reduce((sum, q) => sum + parseInt(q.answered || '0'), 0)
        const totalUnanswered = queueResult.data.reduce((sum, q) => sum + parseInt(q.unanswered || '0'), 0)
        const avgSLA = queueResult.data.length > 0
          ? queueResult.data.reduce((sum, q) => sum + parseFloat(q.sla || '0'), 0) / queueResult.data.length
          : 0

        setKpis({
          totalCalls: totalReceived,
          answeredCalls: totalAnswered,
          missedCalls: totalUnanswered,
          avgSLA: Math.round(avgSLA)
        })
      }

      // Get today's hourly traffic
      const today = DateHelper.getToday()
      const hourlyResult = await athenaAPI.getDistributionByHour(today.start, today.end)
      
      if (hourlyResult.status === 'SUCCEEDED') {
        setHourlyData(hourlyResult.data)
      }

    } catch (error) {
      console.error("Dashboard data error:", error)
      toast({
        variant: "destructive",
        title: "Failed to load dashboard data",
        description: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard Overview</h1>
            <p className="text-muted-foreground">Last 30 days performance metrics</p>
          </div>

          {/* KPI Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Calls</CardTitle>
                <Phone className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : kpis.totalCalls.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">Last 30 days</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Answered Calls</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : kpis.answeredCalls.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  {kpis.totalCalls > 0 ? `${Math.round((kpis.answeredCalls / kpis.totalCalls) * 100)}% of total` : '0%'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Missed Calls</CardTitle>
                <PhoneOff className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : kpis.missedCalls.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  {kpis.totalCalls > 0 ? `${Math.round((kpis.missedCalls / kpis.totalCalls) * 100)}% of total` : '0%'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Average SLA</CardTitle>
                <Target className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : `${kpis.avgSLA}%`}
                </div>
                <p className="text-xs text-muted-foreground">Across all queues</p>
              </CardContent>
            </Card>
          </div>

          {/* Queue Performance Table */}
          <Card>
            <CardHeader>
              <CardTitle>Queue Performance (Top 10)</CardTitle>
              <CardDescription>Summary metrics for all queues</CardDescription>
            </CardHeader>
            <CardContent>
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
                        <TableHead className="text-right">Method</TableHead>
                        <TableHead className="text-right">Received</TableHead>
                        <TableHead className="text-right">Answered</TableHead>
                        <TableHead className="text-right">Unanswered</TableHead>
                        <TableHead className="text-right">Abandoned</TableHead>
                        <TableHead className="text-right">Transferred</TableHead>
                        <TableHead className="text-right">Avg Wait</TableHead>
                        <TableHead className="text-right">Avg Talk</TableHead>
                        <TableHead className="text-right">Max Callers</TableHead>
                        <TableHead className="text-right">SLA %</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {queueStats.slice(0, 10).map((queue, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{queue.queue_name || queue.queue_id}</TableCell>
                          <TableCell className="text-right">{queue.channel || '-'}</TableCell>
                          <TableCell className="text-right">{queue.initiation_method || '-'}</TableCell>
                          <TableCell className="text-right">{queue.received}</TableCell>
                          <TableCell className="text-right text-green-600">{queue.answered}</TableCell>
                          <TableCell className="text-right text-red-600">{queue.unanswered}</TableCell>
                          <TableCell className="text-right text-orange-600">{queue.abandoned || '0'}</TableCell>
                          <TableCell className="text-right text-blue-600">{queue.transferred || '0'}</TableCell>
                          <TableCell className="text-right">{queue.avg_wait || '-'}</TableCell>
                          <TableCell className="text-right">{queue.avg_talk || '-'}</TableCell>
                          <TableCell className="text-right">{queue.max_callers || '-'}</TableCell>
                          <TableCell className="text-right">{queue.sla}%</TableCell>
                        </TableRow>
                      ))}
                      {queueStats.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={12} className="text-center text-muted-foreground">
                            No queue data available
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Hourly Traffic Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Today's Hourly Traffic</CardTitle>
              <CardDescription>Calls received by hour</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : hourlyData.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Hour</TableHead>
                        <TableHead className="text-right">Received</TableHead>
                        <TableHead className="text-right">Answered</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {hourlyData.map((hour, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{hour.hour}</TableCell>
                          <TableCell className="text-right">{hour.received}</TableCell>
                          <TableCell className="text-right">{hour.answered}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">No hourly data available for today</p>
              )}
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </AuthGuard>
  )
}
