import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy | rot.rocks',
  description: 'Privacy Policy for rot.rocks',
}

export default function PrivacyPage() {
  return (
    <div className="min-h-[calc(100vh-64px)] bg-darkbg-950">
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <h1 className="text-3xl font-bold text-white mb-8">Privacy Policy</h1>

        <div className="prose prose-invert prose-gray max-w-none space-y-6">
          <p className="text-gray-400 text-sm">Last updated: January 2025</p>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-white">1. Information We Collect</h2>
            <p className="text-gray-400">When you use rot.rocks, we collect:</p>
            <ul className="list-disc list-inside text-gray-400 space-y-1">
              <li><strong className="text-gray-300">Roblox Account Information:</strong> Your Roblox username and user ID when you authenticate</li>
              <li><strong className="text-gray-300">Trade Data:</strong> Information about trades you post or interact with</li>
              <li><strong className="text-gray-300">Usage Data:</strong> How you interact with our platform</li>
              <li><strong className="text-gray-300">Device Information:</strong> Browser type, IP address for security purposes</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-white">2. How We Use Your Information</h2>
            <p className="text-gray-400">We use collected information to:</p>
            <ul className="list-disc list-inside text-gray-400 space-y-1">
              <li>Provide and maintain our service</li>
              <li>Display your trades and profile to other users</li>
              <li>Prevent fraud, scams, and abuse</li>
              <li>Improve our platform</li>
              <li>Communicate important updates</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-white">3. Information Sharing</h2>
            <p className="text-gray-400">
              We do not sell your personal information. Your Roblox username and trade listings are visible to other users. We may share information with:
            </p>
            <ul className="list-disc list-inside text-gray-400 space-y-1">
              <li>Other users (public profile and trade information)</li>
              <li>Service providers who help operate our platform</li>
              <li>Law enforcement when required by law</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-white">4. Data Security</h2>
            <p className="text-gray-400">
              We implement security measures to protect your information, including encrypted connections and secure authentication. However, no method of transmission over the internet is 100% secure.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-white">5. Cookies</h2>
            <p className="text-gray-400">
              We use cookies to maintain your session and remember your preferences. These are essential for the platform to function properly.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-white">6. Third-Party Services</h2>
            <p className="text-gray-400">
              We integrate with Roblox for authentication. Their privacy policy governs how they handle your data. We also use hosting and analytics services that may collect anonymized usage data.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-white">7. Data Retention</h2>
            <p className="text-gray-400">
              We retain your data as long as your account is active. Trade history may be retained for platform integrity. You can request deletion of your account by contacting us.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-white">8. Your Rights</h2>
            <p className="text-gray-400">You have the right to:</p>
            <ul className="list-disc list-inside text-gray-400 space-y-1">
              <li>Access your personal data</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your account</li>
              <li>Withdraw consent for data processing</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-white">9. Children&apos;s Privacy</h2>
            <p className="text-gray-400">
              rot.rocks is intended for users who meet Roblox&apos;s age requirements. We do not knowingly collect information from children under 13 without parental consent.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-white">10. Changes to This Policy</h2>
            <p className="text-gray-400">
              We may update this privacy policy periodically. We will notify users of significant changes through our platform.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-white">11. Contact Us</h2>
            <p className="text-gray-400">
              For privacy-related questions or requests, please reach out via our Discord server.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
