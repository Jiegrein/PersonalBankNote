'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { Plus, Pencil, Trash2, X, Tag } from 'lucide-react'

interface Rule {
  id: string
  condition: string
  conditionValue: string
  category: string
  priority: number
  bankType: string | null
}

const CONDITIONS = [
  { value: 'contains', label: 'Contains (all text)' },
  { value: 'startsWith', label: 'Starts with (all text)' },
  { value: 'endsWith', label: 'Ends with (all text)' },
  { value: 'equals', label: 'Equals (all text)' },
  { value: 'merchantContains', label: 'Merchant contains' },
  { value: 'merchantStartsWith', label: 'Merchant starts with' },
  { value: 'merchantEndsWith', label: 'Merchant ends with' },
  { value: 'merchantEquals', label: 'Merchant equals' },
]

const BANK_TYPES = [
  { value: '', label: 'All Banks' },
  { value: 'debit', label: 'Debit Only' },
  { value: 'credit', label: 'Credit Only' },
]

export default function RulesPage() {
  const { data: session } = useSession()
  const [rules, setRules] = useState<Rule[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  // Rule form state
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    condition: 'contains',
    conditionValue: '',
    category: '',
    priority: 0,
    bankType: '', // '' = all banks
  })
  const [editingId, setEditingId] = useState<string | null>(null)

  // Category form state
  const [showCategoryForm, setShowCategoryForm] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')

  // Category autocomplete state
  const [showCategorySuggestions, setShowCategorySuggestions] = useState(false)
  const filteredCategories = categories.filter(cat =>
    cat.toLowerCase().includes(formData.category.toLowerCase())
  )

  useEffect(() => {
    fetchRules()
    fetchCategories()
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

  async function fetchCategories() {
    try {
      const res = await fetch('/api/categories')
      const data = await res.json()
      if (res.ok && Array.isArray(data)) {
        // Extract category names from objects
        const categoryNames = data.map((cat: { name: string }) => cat.name)
        setCategories(categoryNames)
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error)
    }
  }

  async function handleAddCategory(e: React.FormEvent) {
    e.preventDefault()
    if (!newCategoryName.trim()) return

    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCategoryName.trim() }),
      })

      if (res.ok) {
        fetchCategories()
        setNewCategoryName('')
        setShowCategoryForm(false)
      }
    } catch (error) {
      console.error('Failed to add category:', error)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const url = editingId ? `/api/rules/${editingId}` : '/api/rules'
    const method = editingId ? 'PUT' : 'POST'

    // Convert empty string to null for bankType
    const payload = {
      ...formData,
      bankType: formData.bankType || null,
    }

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
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
      bankType: rule.bankType || '',
    })
    setEditingId(rule.id)
    setShowForm(true)
  }

  function resetForm() {
    setFormData({ condition: 'contains', conditionValue: '', category: '', priority: 0, bankType: '' })
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
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Rules Section */}
          <div className="flex-1 lg:flex-[2]">
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
            <div className="relative">
              <label className="block text-sm text-gray-400 mb-1">Category</label>
              <input
                type="text"
                value={formData.category}
                onChange={(e) => {
                  setFormData({ ...formData, category: e.target.value })
                  setShowCategorySuggestions(true)
                }}
                onFocus={() => setShowCategorySuggestions(true)}
                onBlur={() => setTimeout(() => setShowCategorySuggestions(false), 150)}
                className="w-full bg-gray-700 rounded px-3 py-2"
                placeholder="Transport"
                required
              />
              {showCategorySuggestions && filteredCategories.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                  {filteredCategories.map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => {
                        setFormData({ ...formData, category: cat })
                        setShowCategorySuggestions(false)
                      }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-700 text-gray-300"
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              )}
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
            <div>
              <label className="block text-sm text-gray-400 mb-1">Apply To</label>
              <select
                value={formData.bankType}
                onChange={(e) => setFormData({ ...formData, bankType: e.target.value })}
                className="w-full bg-gray-700 rounded px-3 py-2"
              >
                {BANK_TYPES.map((bt) => (
                  <option key={bt.value} value={bt.value}>
                    {bt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            Higher priority rules are checked first. Use "Debit Only" for e-wallet top-ups.
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
                  <p className="text-xs text-gray-500 mt-1">
                    Priority: {rule.priority}
                    {rule.bankType && (
                      <span className={`ml-2 px-1.5 py-0.5 rounded text-xs ${
                        rule.bankType === 'debit'
                          ? 'bg-green-400/10 text-green-400'
                          : 'bg-purple-400/10 text-purple-400'
                      }`}>
                        {rule.bankType === 'debit' ? 'Debit only' : 'Credit only'}
                      </span>
                    )}
                  </p>
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

          {/* Categories Section - Sidebar */}
          <div className="lg:w-80 lg:flex-shrink-0">
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-5">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <Tag className="w-5 h-5" />
                  Categories
                </h2>
                <button
                  onClick={() => setShowCategoryForm(!showCategoryForm)}
                  className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors
                    ${showCategoryForm
                      ? 'bg-gray-700 hover:bg-gray-600'
                      : 'bg-purple-600 hover:bg-purple-700'
                    }`}
                >
                  {showCategoryForm ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                  {showCategoryForm ? 'Cancel' : 'Add'}
                </button>
              </div>

              {/* Add Category Form */}
              {showCategoryForm && (
                <form onSubmit={handleAddCategory} className="mb-4">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      className="flex-1 bg-gray-700 rounded px-3 py-2 text-sm"
                      placeholder="e.g., Food-Dining"
                      required
                    />
                    <button
                      type="submit"
                      className="bg-green-600 hover:bg-green-700 px-3 py-2 rounded-lg text-sm"
                    >
                      Add
                    </button>
                  </div>
                </form>
              )}

              {/* Categories List */}
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <span
                    key={cat}
                    className="bg-gray-700/50 border border-gray-600 px-2.5 py-1 rounded-lg text-xs text-gray-300"
                  >
                    {cat}
                  </span>
                ))}
                {categories.length === 0 && (
                  <p className="text-gray-500 text-sm">No categories yet.</p>
                )}
              </div>

              <p className="text-xs text-gray-500 mt-4">
                Categories without rules for manual assignment.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
