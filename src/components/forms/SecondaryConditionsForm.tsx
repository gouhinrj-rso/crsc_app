import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { secondaryConditionSchema, type SecondaryConditionFormData } from '@/lib/validation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useEffect, useCallback } from 'react'
import type { SecondaryCondition } from '@/types/database'

interface SecondaryConditionsFormProps {
  claimId: string
  claimTitle: string
}

export default function SecondaryConditionsForm({ claimId, claimTitle }: SecondaryConditionsFormProps) {
  const [conditions, setConditions] = useState<SecondaryCondition[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const form = useForm<SecondaryConditionFormData>({
    resolver: zodResolver(secondaryConditionSchema),
    defaultValues: {
      disabilityCode: '',
      description: '',
      percentage: 0,
      dateAwarded: '',
    },
  })

  const loadConditions = useCallback(async () => {
    setLoading(true)
    try {
      const data = await window.electronAPI.formData.getSecondaryConditions(claimId)
      setConditions(data || [])
    } catch (err) {
      console.error('Failed to load secondary conditions:', err)
    }
    setLoading(false)
  }, [claimId])

  useEffect(() => {
    loadConditions()
  }, [loadConditions])

  const handleAdd = async (data: SecondaryConditionFormData) => {
    setAdding(true)
    try {
      const result = await window.electronAPI.formData.createSecondaryCondition({
        primary_claim_id: claimId,
        disability_code: data.disabilityCode || null,
        description: data.description,
        percentage: data.percentage,
        date_awarded: data.dateAwarded || null,
      })
      setConditions((prev) => [...prev, result])
      form.reset()
      setShowAddForm(false)
      toast.success('Secondary condition added')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add condition')
    }
    setAdding(false)
  }

  const handleDelete = async (conditionId: string) => {
    setDeletingId(conditionId)
    try {
      await window.electronAPI.formData.deleteSecondaryCondition(conditionId)
      setConditions((prev) => prev.filter((c) => c.id !== conditionId))
      toast.success('Secondary condition removed')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove condition')
    }
    setDeletingId(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Secondary Conditions</CardTitle>
        <CardDescription>
          Secondary conditions related to: {claimTitle}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {conditions.length > 0 && (
          <div className="space-y-2">
            {conditions.map((condition) => (
              <div
                key={condition.id}
                className="flex items-start justify-between p-3 rounded-lg border bg-muted/30"
              >
                <div className="space-y-1 flex-1">
                  <p className="text-sm font-medium">{condition.description}</p>
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    {condition.disability_code && (
                      <span>Code: {condition.disability_code}</span>
                    )}
                    <span>Rating: {condition.percentage}%</span>
                    {condition.date_awarded && (
                      <span>Awarded: {condition.date_awarded}</span>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(condition.id)}
                  disabled={deletingId === condition.id}
                >
                  {deletingId === condition.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </div>
            ))}
          </div>
        )}

        {showAddForm ? (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleAdd)} className="space-y-3 border rounded-lg p-4">
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description *</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Describe the secondary condition..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-3 gap-3">
                <FormField
                  control={form.control}
                  name="disabilityCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Disability Code</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., 5237" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="percentage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rating (%)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="dateAwarded"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date Awarded</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowAddForm(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={adding}>
                  {adding ? (
                    <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                  ) : null}
                  Add Condition
                </Button>
              </div>
            </form>
          </Form>
        ) : (
          <Button variant="outline" size="sm" onClick={() => setShowAddForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Secondary Condition
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
