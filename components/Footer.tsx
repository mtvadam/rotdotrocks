'use client'

import Link from 'next/link'
import { ArrowRightLeft, Calculator, Sparkles, ExternalLink, HelpCircle } from 'lucide-react'

function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z"/>
    </svg>
  )
}

function TwitterIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  )
}

export function Footer() {
  return (
    <footer className="bg-darkbg-900 border-t border-darkbg-800">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-2">
            <Link href="/" className="inline-block mb-4">
              <span className="text-2xl font-bold text-white">
                rot<span className="text-green-500">.rocks</span>
              </span>
            </Link>
            <p className="text-gray-500 text-sm max-w-sm mb-4">
              The community trading hub for Steal a Brainrot. Fair trades, no scams, just vibes.
            </p>
            <div className="flex gap-3">
              <a
                href="https://discord.gg/rotrocks"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-darkbg-800 hover:bg-indigo-500/20 hover:border-indigo-500/50 border border-darkbg-700 rounded-xl flex items-center justify-center text-gray-400 hover:text-indigo-400 transition-all"
              >
                <DiscordIcon className="w-5 h-5" />
              </a>
              <a
                href="https://x.com/rotdotrocks"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-darkbg-800 hover:bg-gray-500/20 hover:border-gray-500/50 border border-darkbg-700 rounded-xl flex items-center justify-center text-gray-400 hover:text-white transition-all"
              >
                <TwitterIcon className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/trading" className="text-gray-500 hover:text-green-400 text-sm flex items-center gap-2 transition-colors">
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                  Trading
                </Link>
              </li>
              <li>
                <Link href="/brainrots" className="text-gray-500 hover:text-green-400 text-sm flex items-center gap-2 transition-colors">
                  <Sparkles className="w-3.5 h-3.5" />
                  Brainrot Index
                </Link>
              </li>
              <li>
                <Link href="/trading/calculator" className="text-gray-500 hover:text-green-400 text-sm flex items-center gap-2 transition-colors">
                  <Calculator className="w-3.5 h-3.5" />
                  Calculator
                </Link>
              </li>
              <li>
                <Link href="/faq" className="text-gray-500 hover:text-green-400 text-sm flex items-center gap-2 transition-colors">
                  <HelpCircle className="w-3.5 h-3.5" />
                  FAQ
                </Link>
              </li>
            </ul>
          </div>

          {/* Game */}
          <div>
            <h4 className="text-white font-semibold mb-4">Game</h4>
            <ul className="space-y-2">
              <li>
                <a
                  href="https://www.roblox.com/games/109983668079237/Steal-a-Brainrot"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-500 hover:text-green-400 text-sm flex items-center gap-2 transition-colors"
                >
                  Play on Roblox
                  <ExternalLink className="w-3 h-3" />
                </a>
              </li>
              <li>
                <a
                  href="https://discord.gg/rotrocks"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-500 hover:text-green-400 text-sm flex items-center gap-2 transition-colors"
                >
                  Join Community
                  <ExternalLink className="w-3 h-3" />
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 pt-6 border-t border-darkbg-800 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-gray-600 text-xs">
            made for the community, by someone who got scammed one too many times
          </p>
          <div className="flex items-center gap-4">
            <Link href="/terms" className="text-gray-600 hover:text-gray-400 text-xs transition-colors">
              Terms
            </Link>
            <Link href="/privacy" className="text-gray-600 hover:text-gray-400 text-xs transition-colors">
              Privacy
            </Link>
            <p className="text-gray-600 text-xs">
              not affiliated with roblox or sab.
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
