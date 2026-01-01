'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Search, ChevronRight, Ban, Snowflake, Shield, Gem } from 'lucide-react'
import { RobloxAvatar, Select } from '@/components/ui'

interface User {
  id: string
  robloxUsername: string
  robloxUserId: string | null
  robloxAvatarUrl: string | null
  role: 'USER' | 'SELLER' | 'ADMIN'
  isBanned: boolean
  isFrozen: boolean
  gems: number
  createdAt: string
  _count: {
    trades: number
    reports: number
  }
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [roleFilter, setRoleFilter] = useState<string>('')

  const fetchUsers = async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (statusFilter) params.set('status', statusFilter)
    if (roleFilter) params.set('role', roleFilter)

    const res = await fetch(`/api/admin/users?${params}`)
    const data = await res.json()
    if (data.users) {
      setUsers(data.users)
      setTotal(data.total)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchUsers()
  }, [statusFilter, roleFilter])

  useEffect(() => {
    const debounce = setTimeout(() => {
      fetchUsers()
    }, 300)
    return () => clearTimeout(debounce)
  }, [search])

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return (
          <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-xs font-medium">
            Admin
          </span>
        )
      case 'SELLER':
        return (
          <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 text-xs font-medium">
            Seller
          </span>
        )
      default:
        return (
          <span className="px-2 py-0.5 rounded-full bg-gray-500/20 text-gray-400 text-xs font-medium">
            User
          </span>
        )
    }
  }

  return (
    <div className="p-8">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-6"
      >
        <div>
          <h1 className="text-2xl font-bold text-white">Users</h1>
          <p className="text-sm text-gray-500">{total} total users</p>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap gap-4 mb-6"
      >
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search by username..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-darkbg-800 border border-darkbg-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
          />
        </div>

        <Select
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { value: '', label: 'All Status' },
            { value: 'active', label: 'Active' },
            { value: 'banned', label: 'Banned' },
            { value: 'frozen', label: 'Frozen' },
          ]}
        />

        <Select
          value={roleFilter}
          onChange={setRoleFilter}
          options={[
            { value: '', label: 'All Roles' },
            { value: 'USER', label: 'User' },
            { value: 'SELLER', label: 'Seller' },
            { value: 'ADMIN', label: 'Admin' },
          ]}
        />
      </motion.div>

      {/* User Table */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-darkbg-800 rounded-xl border border-darkbg-700 overflow-hidden"
      >
        {loading ? (
          <div className="divide-y divide-darkbg-700">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="px-4 py-3 flex items-center gap-4">
                <div className="w-8 h-8 skeleton rounded-full" />
                <div className="h-4 w-32 skeleton rounded" />
                <div className="h-4 w-16 skeleton rounded" />
                <div className="h-4 w-16 skeleton rounded" />
                <div className="h-4 w-12 skeleton rounded" />
                <div className="h-4 w-12 skeleton rounded" />
                <div className="h-4 w-20 skeleton rounded" />
              </div>
            ))}
          </div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No users found</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-darkbg-700">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  User
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Role
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Gems
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Trades
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Joined
                </th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-darkbg-700">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-darkbg-700/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <RobloxAvatar
                        avatarUrl={user.robloxAvatarUrl}
                        username={user.robloxUsername}
                        size="sm"
                      />
                      <span className="font-medium text-white">{user.robloxUsername}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">{getRoleBadge(user.role)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {user.isBanned && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-xs">
                          <Ban className="w-3 h-3" /> Banned
                        </span>
                      )}
                      {user.isFrozen && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-xs">
                          <Snowflake className="w-3 h-3" /> Frozen
                        </span>
                      )}
                      {!user.isBanned && !user.isFrozen && (
                        <span className="text-green-400 text-xs">Active</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1 text-sm text-white">
                      <Gem className="w-3 h-3 text-emerald-400" />
                      {user.gems}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-400">{user._count.trades}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-500">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/users/${user.id}`}
                      className="p-2 rounded-lg hover:bg-darkbg-600 transition-colors inline-flex"
                    >
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </motion.div>
    </div>
  )
}
