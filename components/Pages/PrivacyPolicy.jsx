import { ArrowLeft } from "lucide-react";

export function PrivacyPolicy({ onBack }) {
  return (
    <div className="min-h-screen bg-black text-slate-50 p-6 sm:p-8 lg:p-12">
      <div className="max-w-3xl mx-auto">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-400 hover:text-white mb-8 transition-colors"
        >
          <ArrowLeft size={20} />
          Back to App
        </button>

        <h1 className="text-3xl sm:text-4xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-slate-400 mb-8">Last updated: January 16, 2026</p>

        <div className="space-y-6 text-slate-300">
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Overview</h2>
            <p>
              Meme Creator is a meme generation tool that respects your privacy. 
              This policy explains what data we collect and how we use it.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Data We Collect</h2>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>
                <strong>Images you upload:</strong> Processed entirely in your browser. 
                We do not store or transmit your images to any server.
              </li>
              <li>
                <strong>Local storage:</strong> We save your preferences (like welcome modal status) 
                locally on your device.
              </li>
              <li>
                <strong>Analytics:</strong> We use PostHog to collect anonymous usage data 
                to improve the app. This includes page views, feature usage, and device type. 
                No personal information is collected.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Third-Party Services</h2>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>
                <strong>Giphy/Tenor:</strong> If you search for GIFs, your search queries 
                are sent to these services according to their privacy policies.
              </li>
              <li>
                <strong>PostHog:</strong> Used for anonymous analytics. See{" "}
                <a 
                  href="https://posthog.com/privacy" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-purple-400 hover:text-purple-300 underline"
                >
                  PostHog's Privacy Policy
                </a>.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Data Storage</h2>
            <p>
              All image processing happens locally in your browser. Your memes are never 
              uploaded to our servers. Any data stored locally can be cleared by clearing 
              your browser's site data.
            </p>
          </section>

          <section id="delete-data">
            <h2 className="text-xl font-semibold text-white mb-3">Delete Your Data</h2>
            <p className="mb-3">
              To delete all data associated with your use of Meme Creator:
            </p>
            <ol className="list-decimal list-inside space-y-2 ml-2 mb-3">
              <li>
                <strong>Local data:</strong> Clear your browser's site data for this app, 
                or uninstall the app from your device.
              </li>
              <li>
                <strong>Analytics data:</strong> To request deletion of anonymous analytics 
                data, email us at{" "}
                <a 
                  href="mailto:meme.creator.app.privacy@gmail.com?subject=Data%20Deletion%20Request"
                  className="text-purple-400 hover:text-purple-300 underline"
                >
                  meme.creator.app.privacy@gmail.com
                </a>{" "}
                with the subject "Data Deletion Request".
              </li>
            </ol>
            <p>
              We will process your request within 30 days.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Children's Privacy</h2>
            <p>
              This app is not directed at children under 13. We do not knowingly collect 
              personal information from children.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Changes to This Policy</h2>
            <p>
              We may update this privacy policy from time to time. Changes will be posted 
              on this page with an updated revision date.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Contact</h2>
            <p>
              If you have questions about this privacy policy, you can reach us through 
              the project's GitHub repository.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
