'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ArrowRightLeft, Calculator, Gem, Sparkles, Zap, Users } from 'lucide-react'
import { motion } from 'framer-motion'

const floatingBrainrots = [
  { src: '/brainrot-images/brainrots/tralalero-tralala.png', className: 'top-20 left-[10%]', delay: 0 },
  { src: '/brainrot-images/brainrots/bombardiro-crocodilo.png', className: 'top-32 right-[15%]', delay: 0.5 },
  { src: '/brainrot-images/brainrots/cappuccino-assassino.png', className: 'top-48 left-[20%]', delay: 1 },
  { src: '/brainrot-images/brainrots/brr-brr-patapim.png', className: 'bottom-32 right-[10%]', delay: 1.5 },
  { src: '/brainrot-images/brainrots/chimpanzini-bananini.png', className: 'bottom-48 left-[8%]', delay: 2 },
]

export default function HomePage() {
  return (
    <div className="min-h-[calc(100vh-64px)] bg-darkbg-950 overflow-hidden">
      {/* Floating Brainrots Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {floatingBrainrots.map((rot, i) => (
          <motion.div
            key={i}
            className={`absolute ${rot.className} opacity-20 blur-[1px]`}
            initial={{ y: 0, rotate: 0 }}
            animate={{
              y: [0, -20, 0],
              rotate: [-5, 5, -5],
            }}
            transition={{
              duration: 4 + i,
              repeat: Infinity,
              delay: rot.delay,
              ease: "easeInOut"
            }}
          >
            <Image
              src={rot.src}
              alt=""
              width={80}
              height={80}
              className="select-none"
            />
          </motion.div>
        ))}
      </div>

      {/* Hero */}
      <div className="relative container mx-auto px-4 py-16 md:py-24">
        <motion.div
          className="text-center max-w-3xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Fun tag */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-full text-green-400 text-sm font-medium mb-6"
          >
            <Sparkles className="w-4 h-4" />
            no more getting scammed fr fr
          </motion.div>

          <h1 className="text-4xl md:text-6xl font-black text-white mb-4 leading-tight">
            where the{' '}
            <span className="relative inline-block">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 via-emerald-400 to-green-500 animate-gradient">
                real ones
              </span>
              <motion.span
                className="absolute -bottom-1 left-0 right-0 h-1 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 0.5, duration: 0.3 }}
              />
            </span>
            {' '}trade
          </h1>

          <p className="text-xl md:text-2xl text-gray-300 mb-2 font-medium">
            Steal a Brainrot trading, but make it not sketchy
          </p>
          <p className="text-gray-500 mb-8 max-w-lg mx-auto">
            Post your W trades, find the deals nobody else knows about,
            and flex on the people who said "nty add" to your fair offer
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Link
                href="/trading"
                className="group inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white font-bold rounded-2xl transition-all shadow-lg shadow-green-500/25 hover:shadow-green-500/40"
              >
                <ArrowRightLeft className="w-5 h-5 group-hover:rotate-180 transition-transform duration-300" />
                start trading
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Link
                href="/trading/calculator"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-darkbg-800 hover:bg-darkbg-700 text-white font-bold rounded-2xl transition-all border border-darkbg-600 hover:border-darkbg-500"
              >
                <Calculator className="w-5 h-5" />
                check values
              </Link>
            </motion.div>
          </div>
        </motion.div>
      </div>

      {/* Stats bar */}
      <motion.div
        className="border-y border-darkbg-800 bg-darkbg-900/50 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-wrap justify-center gap-8 md:gap-16 text-center">
            <div>
              <p className="text-2xl md:text-3xl font-black text-white">100%</p>
              <p className="text-gray-500 text-sm">less sketch than discord dms</p>
            </div>
            <div>
              <p className="text-2xl md:text-3xl font-black text-green-400">FREE</p>
              <p className="text-gray-500 text-sm">counter offers</p>
            </div>
            <div>
              <p className="text-2xl md:text-3xl font-black text-white">24/7</p>
              <p className="text-gray-500 text-sm">trades posted</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Features */}
      <div className="container mx-auto px-4 py-20">
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          <h2 className="text-3xl md:text-4xl font-black text-white mb-2">how it works</h2>
          <p className="text-gray-500">it's actually stupid simple</p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          <motion.div
            className="group bg-gradient-to-b from-darkbg-800 to-darkbg-850 rounded-3xl p-8 border border-darkbg-700 hover:border-green-500/30 transition-all hover:shadow-xl hover:shadow-green-500/5"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            whileHover={{ y: -4 }}
          >
            <div className="w-14 h-14 bg-gradient-to-br from-green-500/20 to-emerald-500/10 rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
              <ArrowRightLeft className="w-7 h-7 text-green-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">post your trade</h3>
            <p className="text-gray-400 leading-relaxed">
              show what you got and what you want. mutations, traits, the whole thing.
              no more typing it all out in chat like a boomer.
            </p>
          </motion.div>

          <motion.div
            className="group bg-gradient-to-b from-darkbg-800 to-darkbg-850 rounded-3xl p-8 border border-darkbg-700 hover:border-amber-500/30 transition-all hover:shadow-xl hover:shadow-amber-500/5"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            whileHover={{ y: -4 }}
          >
            <div className="w-14 h-14 bg-gradient-to-br from-amber-500/20 to-orange-500/10 rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
              <Gem className="w-7 h-7 text-amber-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">gems keep it real</h3>
            <p className="text-gray-400 leading-relaxed">
              you get 20 gems to start. trades cost 5 gems.
              this stops the spam accounts and keeps the feed actually usable.
            </p>
          </motion.div>

          <motion.div
            className="group bg-gradient-to-b from-darkbg-800 to-darkbg-850 rounded-3xl p-8 border border-darkbg-700 hover:border-purple-500/30 transition-all hover:shadow-xl hover:shadow-purple-500/5"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            whileHover={{ y: -4 }}
          >
            <div className="w-14 h-14 bg-gradient-to-br from-purple-500/20 to-pink-500/10 rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
              <Zap className="w-7 h-7 text-purple-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">counter for free</h3>
            <p className="text-gray-400 leading-relaxed">
              see a trade that's almost it? counter offers cost nothing.
              haggle all you want until you get that W.
            </p>
          </motion.div>
        </div>
      </div>

      {/* CTA */}
      <div className="container mx-auto px-4 py-16">
        <motion.div
          className="relative overflow-hidden bg-gradient-to-br from-green-600 via-emerald-600 to-green-700 rounded-3xl p-10 md:p-14"
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
        >
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />

          <div className="relative text-center">
            <motion.div
              initial={{ scale: 0 }}
              whileInView={{ scale: 1 }}
              viewport={{ once: true }}
              transition={{ type: "spring", delay: 0.2 }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full text-white/90 text-sm font-medium mb-6 backdrop-blur-sm"
            >
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">join the traders who aren&apos;t getting finessed</span>
              <span className="sm:hidden">no more L trades</span>
            </motion.div>

            <h2 className="text-3xl md:text-4xl font-black text-white mb-4">
              stop trading blind
            </h2>
            <p className="text-green-100/80 mb-8 max-w-md mx-auto text-lg">
              the calculator knows the values. the community knows the deals.
              you just gotta show up.
            </p>
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-8 py-4 bg-white text-green-600 font-bold rounded-2xl hover:bg-gray-100 transition-colors shadow-xl shadow-black/20"
              >
                let's go
                <ArrowRightLeft className="w-5 h-5" />
              </Link>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
