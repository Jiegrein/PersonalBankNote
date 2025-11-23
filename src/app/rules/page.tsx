'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { Plus, Pencil, Trash2, X } from 'lucide-react'

interface Rule {
  id: string
  condition: string
  conditionValue: string
  category: string
  priority: number
}

const CONDITIONS = [
  { value: 'contains', label: 'Contains' },
  { value: 'startsWith', label: 'Starts with' },
  { value: 'endsWith', label: 'Ends with' },
  { value: 'equals', label: 'Equals' },
]

export default function RulesPage() {
  const { data: session } = useSession()
  const [rules, setRules] = useState<Rule[]>([])
  const [loading, setLoading] = useState(true)

  // Form state
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    condition: 'contains',
    conditionValue: '',
    category: '',
    priority: 0,
  })
  const [editingId, setEditingId] = useState<string | null>(null)

  useEffect(() => {
    fetchRules()
  }, [])

  async function fetchRules() {
    try {
      const res = await fetch('/api/rules')
      const data = await res.json()
      if (res.ok && Array.isArray(data)) {
        setRules(data)
      } else {
        console.error('Failed to fetch rules:', data)
        setRules([])
      }
    } catch (error) {
      console.error('Failed to fetch rules:', error)
      setRules([])
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const url = editingId ? `/api/rules/${editingId}` : '/api/rules'
    const method = editingId ? 'PUT' : 'POST'

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (res.ok) {
        fetchRules()
        resetForm()
      }
    } catch (error) {
      console.error('Failed to save rule:', error)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this rule?')) return

    try {
      const res = await fetch(`/api/rules/${id}`, { method: 'DELETE' })
      if (res.ok) fetchRules()
    } catch (error) {
      console.error('Failed to delete rule:', error)
    }
  }

  function handleEdit(rule: Rule) {
    setFormData({
      condition: rule.condition,
      conditionValue: rule.conditionValue,
      category: rule.category,
      priority: rule.priority,
    })
    setEditingId(rule.id)
    setShowForm(true)
  }

  function resetForm() {
    setFormData({ condition: 'contains', conditionValue: '', category: '', priority: 0 })
    setEditingId(null)
    setShowForm(false)
  }

  if (!session) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <p className="text-gray-400 mb-4">Please sign in to manage rules.</p>
          <Link href="/" className="text-blue-400 hover:underline">Go to home</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-xl font-bold">Classification Rules</h1>
          <button
            onClick={() => setShowForm(!showForm)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors
              ${showForm
                ? 'bg-gray-700 hover:bg-gray-600'
                : 'bg-blue-600 hover:bg-blue-700'
              }`}
          >
            {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showForm ? 'Cancel' : 'Add Rule'}
          </button>
        </div>

        {/* Add/Edit Form */}
        {showForm && (
          <form onSubmit={handleSubmit} className="bg-gray-800/50 border border-gray-700/50 p-6 rounded-xl mb-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Condition</label>
              <select
                value={formData.condition}
                onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                className="w-full bg-gray-700 rounded px-3 py-2"
              >
                {CONDITIONS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Value</label>
              <input
                type="text"
                value={formData.conditionValue}
                onChange={(e) => setFormData({ ...formData, conditionValue: e.target.value })}
                className="w-full bg-gray-700 rounded px-3 py-2"
                placeholder="GRAB"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Category</label>
              <input
                type="text"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full bg-gray-700 rounded px-3 py-2"
                placeholder="Transport"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Priority</label>
              <input
                type="number"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                className="w-full bg-gray-700 rounded px-3 py-2"
              />
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            Higher priority rules are checked first.
          </p>
          <div className="mt-4 flex justify-end space-x-2">
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 text-gray-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg"
            >
              {editingId ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      )}

        {/* Rules List */}
        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading...</div>
        ) : rules.length === 0 ? (
          <div className="text-center py-12 bg-gray-800/50 border border-gray-700/50 rounded-xl">
            <p className="text-gray-400">No rules configured. Add one to auto-categorize transactions.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {rules.map((rule) => (
              <div
                key={rule.id}
                className="bg-gray-800/50 border border-gray-700/50 p-4 rounded-xl
                           flex items-center justify-between hover:bg-gray-800 transition-colors"
              >
                <div>
                  <p className="font-medium text-sm">
                    If <span className="text-blue-400">{rule.condition}</span>{' '}
                    "<span className="text-green-400">{rule.conditionValue}</span>" →{' '}
                    <span className="text-yellow-400">{rule.category}</span>
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Priority: {rule.priority}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEdit(rule)}
                    className="p-1.5 hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <Pencil className="w-4 h-4 text-gray-400" />
                  </button>
                  <button
                    onClick={() => handleDelete(rule.id)}
                    className="p-1.5 hover:bg-red-600/20 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
