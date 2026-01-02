'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ArrowRightLeft, Calculator, Gem, Zap, Users, Sparkles } from 'lucide-react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { useRef, useEffect, useState } from 'react'

interface NewBrainrot {
  id: string
  name: string
  slug: string
  localImage: string | null
  rarity: string | null
}

const floatingBrainrots = [
  { src: '/brainrot-images/brainrots/tralalero-tralala.png', className: 'top-20 left-[10%]', delay: 0 },
  { src: '/brainrot-images/brainrots/bombardiro-crocodilo.png', className: 'top-32 right-[15%]', delay: 0.5 },
  { src: '/brainrot-images/brainrots/cappuccino-assassino.png', className: 'top-48 left-[20%]', delay: 1 },
  { src: '/brainrot-images/brainrots/brr-brr-patapim.png', className: 'bottom-32 right-[10%]', delay: 1.5 },
  { src: '/brainrot-images/brainrots/chimpanzini-bananini.png', className: 'bottom-48 left-[8%]', delay: 2 },
]

// Stagger animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  },
}

const scaleInVariants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.5,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  },
}

export default function HomePage() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [newBrainrots, setNewBrainrots] = useState<NewBrainrot[]>([])

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  })

  const backgroundY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"])
  const backgroundOpacity = useTransform(scrollYProgress, [0, 0.5], [0.2, 0])

  useEffect(() => {
    fetch('/api/brainrots/new')
      .then(res => res.json())
      .then(data => setNewBrainrots(data.brainrots || []))
      .catch(() => {})
  }, [])

  return (
    <div ref={containerRef} className="min-h-[calc(100vh-64px)] bg-darkbg-950 overflow-hidden">
      {/* Floating Brainrots Background with parallax */}
      <motion.div
        className="absolute inset-0 pointer-events-none overflow-hidden z-[2]"
        style={{ y: backgroundY, opacity: backgroundOpacity }}
      >
        {floatingBrainrots.map((rot, i) => (
          <motion.div
            key={i}
            className={`absolute ${rot.className}`}
            initial={{ opacity: 0, scale: 0, rotate: -180 }}
            animate={{
              opacity: 0.25,
              scale: 1,
              rotate: 0,
            }}
            transition={{
              duration: 0.8,
              delay: 0.5 + (i * 0.15),
              ease: [0.25, 0.46, 0.45, 0.94],
            }}
          >
            <motion.div
              animate={{
                y: [0, -15, 0],
                rotate: [-3, 3, -3],
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
                className="select-none blur-[1px]"
              />
            </motion.div>
          </motion.div>
        ))}
      </motion.div>

      {/* Hero */}
      <div className="relative z-[10] container mx-auto px-4 py-16 md:py-24">
        <motion.div
          className="text-center max-w-3xl mx-auto"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Community badge */}
          <motion.div
            variants={scaleInVariants}
            className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-full text-green-400 text-sm font-medium mb-6"
          >
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
            >
              <Users className="w-4 h-4" />
            </motion.div>
            community trading hub
          </motion.div>

          <motion.h1
            variants={itemVariants}
            className="text-4xl md:text-6xl font-black text-white mb-4 leading-tight"
          >
            trade{' '}
            <span className="relative inline-block">
              <motion.span
                className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 via-emerald-400 to-green-500"
                initial={{ backgroundPosition: "0% 50%" }}
                animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
                transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
                style={{ backgroundSize: "200% 200%" }}
              >
                brainrots
              </motion.span>
              <motion.span
                className="absolute -bottom-1 left-0 right-0 h-1 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full origin-left"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 0.8, duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
              />
            </span>
            {' '}together
          </motion.h1>

          <motion.p
            variants={itemVariants}
            className="text-xl md:text-2xl text-gray-300 mb-2 font-medium"
          >
            Find trades, check values, and connect with other players
          </motion.p>
          <motion.p
            variants={itemVariants}
            className="text-gray-500 mb-8 max-w-lg mx-auto"
          >
            Browse active trades, use the value calculator,
            or post your own listings for the community
          </motion.p>

          <motion.div
            variants={itemVariants}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <motion.div
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
            >
              <Link
                href="/trading"
                className="group inline-flex items-center justify-center gap-2 px-8 py-4 bg-green-600 hover:bg-green-500 text-white font-semibold rounded-xl transition-colors"
              >
                <ArrowRightLeft className="w-5 h-5 group-hover:rotate-180 transition-transform duration-300" />
                start trading
              </Link>
            </motion.div>
            <motion.div
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
            >
              <Link
                href="/trading/calculator"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-darkbg-800 hover:bg-darkbg-700 text-gray-200 font-semibold rounded-xl transition-colors border border-darkbg-600"
              >
                <Calculator className="w-5 h-5" />
                check values
              </Link>
            </motion.div>
          </motion.div>
        </motion.div>
      </div>

      {/* Stats bar */}
      <motion.div
        className="relative z-[10] border-y border-darkbg-800 bg-darkbg-900/50 backdrop-blur-sm"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
      >
        <div className="container mx-auto px-4 py-8">
          <motion.div
            className="flex flex-wrap justify-center gap-8 md:gap-20 text-center"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <motion.div variants={itemVariants}>
              <motion.p
                className="text-2xl md:text-3xl font-black text-white"
                initial={{ opacity: 0, scale: 0.5 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
              >
                Free
              </motion.p>
              <p className="text-gray-500 text-sm">to use, always</p>
            </motion.div>
            <motion.div variants={itemVariants}>
              <motion.p
                className="text-2xl md:text-3xl font-black text-green-400"
                initial={{ opacity: 0, scale: 0.5 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
              >
                Open
              </motion.p>
              <p className="text-gray-500 text-sm">for everyone</p>
            </motion.div>
            <motion.div variants={itemVariants}>
              <motion.p
                className="text-2xl md:text-3xl font-black text-white"
                initial={{ opacity: 0, scale: 0.5 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ type: "spring", stiffness: 200, delay: 0.3 }}
              >
                Community
              </motion.p>
              <p className="text-gray-500 text-sm">built and run</p>
            </motion.div>
          </motion.div>
        </div>
      </motion.div>

      {/* New Brainrots Section */}
      {newBrainrots.length > 0 && (
        <div className="relative z-[10] container mx-auto px-4 py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center gap-3 mb-8">
              <div className="p-2 bg-amber-500/20 rounded-xl">
                <Sparkles className="w-5 h-5 text-amber-400" />
              </div>
              <h2 className="text-2xl font-bold text-white">new brainrots</h2>
            </div>

            <motion.div
              className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4"
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
            >
              {newBrainrots.map((brainrot) => (
                <motion.div
                  key={brainrot.id}
                  variants={itemVariants}
                  whileHover={{ y: -4, scale: 1.02 }}
                  className="group bg-darkbg-800 rounded-2xl p-3 border border-darkbg-700 hover:border-amber-500/30 transition-all"
                >
                  <div className="aspect-square relative mb-2 rounded-xl overflow-hidden bg-darkbg-700">
                    {brainrot.localImage && (
                      <Image
                        src={brainrot.localImage}
                        alt={brainrot.name}
                        fill
                        className="object-contain p-2 group-hover:scale-110 transition-transform duration-300"
                      />
                    )}
                  </div>
                  <p className="text-white text-sm font-medium text-center truncate">
                    {brainrot.name}
                  </p>
                  {brainrot.rarity && (
                    <p className="text-gray-500 text-xs text-center truncate">
                      {brainrot.rarity}
                    </p>
                  )}
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      )}

      {/* Features */}
      <div className="relative z-[10] container mx-auto px-4 py-20">
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl md:text-4xl font-black text-white mb-2">how it works</h2>
        </motion.div>

        <motion.div
          className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          <motion.div
            className="group bg-gradient-to-b from-darkbg-800 to-darkbg-850 rounded-3xl p-8 border border-darkbg-700 hover:border-green-500/30 transition-all hover:shadow-xl hover:shadow-green-500/5"
            variants={itemVariants}
            whileHover={{ y: -8, transition: { duration: 0.2 } }}
          >
            <motion.div
              className="w-14 h-14 bg-gradient-to-br from-green-500/20 to-emerald-500/10 rounded-2xl flex items-center justify-center mb-5"
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ type: "spring", stiffness: 400 }}
            >
              <ArrowRightLeft className="w-7 h-7 text-green-400" />
            </motion.div>
            <h3 className="text-xl font-bold text-white mb-2">post your trade</h3>
            <p className="text-gray-400 leading-relaxed">
              List what you have and what you're looking for.
              Add mutations, traits, and all the details in one organized listing.
            </p>
          </motion.div>

          <motion.div
            className="group bg-gradient-to-b from-darkbg-800 to-darkbg-850 rounded-3xl p-8 border border-darkbg-700 hover:border-amber-500/30 transition-all hover:shadow-xl hover:shadow-amber-500/5"
            variants={itemVariants}
            whileHover={{ y: -8, transition: { duration: 0.2 } }}
          >
            <motion.div
              className="w-14 h-14 bg-gradient-to-br from-amber-500/20 to-orange-500/10 rounded-2xl flex items-center justify-center mb-5"
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ type: "spring", stiffness: 400 }}
            >
              <Gem className="w-7 h-7 text-amber-400" />
            </motion.div>
            <h3 className="text-xl font-bold text-white mb-2">gems system</h3>
            <p className="text-gray-400 leading-relaxed">
              Start with 20 gems. Posting costs 5 gems.
              This keeps the feed focused and discourages spam.
            </p>
          </motion.div>

          <motion.div
            className="group bg-gradient-to-b from-darkbg-800 to-darkbg-850 rounded-3xl p-8 border border-darkbg-700 hover:border-purple-500/30 transition-all hover:shadow-xl hover:shadow-purple-500/5"
            variants={itemVariants}
            whileHover={{ y: -8, transition: { duration: 0.2 } }}
          >
            <motion.div
              className="w-14 h-14 bg-gradient-to-br from-purple-500/20 to-pink-500/10 rounded-2xl flex items-center justify-center mb-5"
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ type: "spring", stiffness: 400 }}
            >
              <Zap className="w-7 h-7 text-purple-400" />
            </motion.div>
            <h3 className="text-xl font-bold text-white mb-2">counter offers</h3>
            <p className="text-gray-400 leading-relaxed">
              See something close to what you want? Counter offers are free.
              Negotiate until you find a trade that works for both sides.
            </p>
          </motion.div>
        </motion.div>
      </div>

      {/* CTA */}
      <div className="relative z-[10] container mx-auto px-4 py-16">
        <motion.div
          className="relative overflow-hidden bg-darkbg-800 border border-darkbg-700 rounded-2xl p-10 md:p-14"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.5 }}
        >
          <div className="text-center">
            <motion.h2
              className="text-2xl md:text-3xl font-bold text-white mb-3"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
            >
              ready to find your next trade?
            </motion.h2>
            <motion.p
              className="text-gray-400 mb-8 max-w-md mx-auto"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
            >
              Browse what others are offering or post your own listing.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
            >
              <Link
                href="/trading"
                className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-500 text-white font-semibold rounded-xl transition-colors"
              >
                browse trades
                <ArrowRightLeft className="w-4 h-4" />
              </Link>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
