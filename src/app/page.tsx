'use client'

import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { SignInButton } from '@/components/SignInButton'
import {
  LayoutDashboard,
  Building2,
  Tags,
  Mail,
  PieChart,
  Shield
} from 'lucide-react'

const features = [
  {
    icon: Mail,
    title: 'Email Sync',
    description: 'Automatically capture transactions from your bank emails'
  },
  {
    icon: PieChart,
    title: 'Visual Analytics',
    description: 'See spending breakdown by category with charts'
  },
  {
    icon: Shield,
    title: 'Secure & Private',
    description: 'Your data stays local, backed by Microsoft OAuth'
  },
]

export default function Home() {
  const { data: session, status } = useSession()

  // Loading state
  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse text-gray-500">Loading...</div>
      </div>
    )
  }

  // Unauthenticated - Landing page
  if (!session) {
    return (
      <div className="container mx-auto px-4 py-16">
        {/* Hero */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent">
            Personal Banking Note
          </h1>
          <p className="text-xl text-gray-400 mb-8">
            Track your credit card transactions automatically from email notifications.
            See where your money goes.
          </p>
          <SignInButton />
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {features.map((feature) => {
            const Icon = feature.icon
            return (
              <div
                key={feature.title}
                className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6 text-center"
              >
                <div className="w-12 h-12 bg-gray-700/50 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Icon className="w-6 h-6 text-green-500" />
                </div>
                <h3 className="font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-gray-400">{feature.description}</p>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // Authenticated - Quick actions
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Welcome */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-2">Welcome back!</h1>
          <p className="text-gray-400">
            What would you like to do today?
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid sm:grid-cols-3 gap-4">
          <Link
            href="/dashboard"
            className="bg-gradient-to-br from-green-600 to-green-700 hover:from-green-500 hover:to-green-600
                       rounded-xl p-6 transition-all duration-200 group"
          >
            <LayoutDashboard className="w-8 h-8 mb-3 group-hover:scale-110 transition-transform" />
            <h3 className="font-semibold mb-1">Dashboard</h3>
            <p className="text-sm text-green-100/70">View your spending analytics</p>
          </Link>

          <Link
            href="/banks"
            className="bg-gray-800/50 border border-gray-700/50 hover:bg-gray-800 hover:border-gray-600
                       rounded-xl p-6 transition-all duration-200 group"
          >
            <Building2 className="w-8 h-8 mb-3 text-blue-500 group-hover:scale-110 transition-transform" />
            <h3 className="font-semibold mb-1">Banks</h3>
            <p className="text-sm text-gray-400">Manage bank connections & sync</p>
          </Link>

          <Link
            href="/rules"
            className="bg-gray-800/50 border border-gray-700/50 hover:bg-gray-800 hover:border-gray-600
                       rounded-xl p-6 transition-all duration-200 group"
          >
            <Tags className="w-8 h-8 mb-3 text-purple-500 group-hover:scale-110 transition-transform" />
            <h3 className="font-semibold mb-1">Rules</h3>
            <p className="text-sm text-gray-400">Auto-categorize transactions</p>
          </Link>
        </div>
      </div>
    </div>
  )
}
