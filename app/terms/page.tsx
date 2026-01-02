import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service | rot.rocks',
  description: 'Terms of Service for rot.rocks',
}

export default function TermsPage() {
  return (
    <div className="min-h-[calc(100vh-64px)] bg-darkbg-950">
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <h1 className="text-3xl font-bold text-white mb-8">Terms of Service</h1>

        <div className="prose prose-invert prose-gray max-w-none space-y-6">
          <p className="text-gray-400 text-sm">Last updated: January 2025</p>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-white">1. Acceptance of Terms</h2>
            <p className="text-gray-400">
              By accessing or using rot.rocks, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our service.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-white">2. Description of Service</h2>
            <p className="text-gray-400">
              rot.rocks is a community-driven trading platform for the Roblox game &quot;Steal a Brainrot.&quot; We provide tools for users to post trades, browse listings, and connect with other players. We do not facilitate the actual exchange of in-game items.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-white">3. User Accounts</h2>
            <p className="text-gray-400">
              To use certain features, you must authenticate via Roblox. You are responsible for maintaining the security of your account and for all activities that occur under your account.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-white">4. User Conduct</h2>
            <p className="text-gray-400">You agree not to:</p>
            <ul className="list-disc list-inside text-gray-400 space-y-1">
              <li>Post false, misleading, or fraudulent trade listings</li>
              <li>Attempt to scam or deceive other users</li>
              <li>Use automated systems to access the service</li>
              <li>Harass, abuse, or harm other users</li>
              <li>Violate any applicable laws or regulations</li>
              <li>Attempt to manipulate or exploit the platform</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-white">5. Trading Disclaimer</h2>
            <p className="text-gray-400">
              rot.rocks is a listing platform only. We do not guarantee or verify the completion of any trades. All trades occur at your own risk. We are not responsible for any losses, scams, or disputes arising from trades arranged through our platform.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-white">6. Intellectual Property</h2>
            <p className="text-gray-400">
              All content on rot.rocks, excluding user-generated content and third-party assets, is our property. &quot;Steal a Brainrot&quot; and related game assets are property of their respective owners. Roblox is a trademark of Roblox Corporation.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-white">7. Termination</h2>
            <p className="text-gray-400">
              We reserve the right to suspend or terminate your access to rot.rocks at any time, for any reason, without notice. This includes violations of these terms or conduct we deem harmful to the community.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-white">8. Disclaimer of Warranties</h2>
            <p className="text-gray-400">
              rot.rocks is provided &quot;as is&quot; without warranties of any kind. We do not guarantee the accuracy of trade values, item information, or the reliability of other users.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-white">9. Limitation of Liability</h2>
            <p className="text-gray-400">
              To the maximum extent permitted by law, rot.rocks and its operators shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the service.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-white">10. Changes to Terms</h2>
            <p className="text-gray-400">
              We may update these terms at any time. Continued use of rot.rocks after changes constitutes acceptance of the new terms.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-white">11. Contact</h2>
            <p className="text-gray-400">
              For questions about these terms, please reach out via our Discord server.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
