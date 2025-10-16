import Link from 'next/link'

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow-lg rounded-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Terms of Service</h1>
          
          <div className="prose prose-lg max-w-none">
            <p className="text-gray-600 mb-6">
              <strong>Last Updated:</strong> {new Date().toLocaleDateString()}
            </p>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Agreement to Terms</h2>
              <p className="text-gray-700 mb-4">
                By accessing and using Appointments Calendar (&ldquo;Service&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;), you accept and agree to be bound by the terms and provision of this agreement.
              </p>
              <p className="text-gray-700">
                If you do not agree to abide by the above, please do not use this Service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Description of Service</h2>
              <p className="text-gray-700 mb-4">
                Appointments Calendar is a web-based appointment management and calendar synchronization service that allows users to:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li>Connect and synchronize multiple calendar platforms (Google, Outlook, Apple, Teams)</li>
                <li>Manage appointment scheduling and availability</li>
                <li>Track and organize calendar events across platforms</li>
                <li>Receive notifications and reminders for appointments</li>
                <li>Export and manage calendar data</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. User Accounts and Registration</h2>
              
              <h3 className="text-lg font-medium text-gray-900 mb-2">Account Creation</h3>
              <p className="text-gray-700 mb-4">
                To use our Service, you must create an account by providing accurate and complete information. You are responsible for:
              </p>
              <ul className="list-disc list-inside text-gray-700 mb-4 space-y-1">
                <li>Maintaining the confidentiality of your account credentials</li>
                <li>All activities that occur under your account</li>
                <li>Immediately notifying us of any unauthorized use of your account</li>
                <li>Ensuring your account information remains current and accurate</li>
              </ul>

              <h3 className="text-lg font-medium text-gray-900 mb-2">Eligibility</h3>
              <p className="text-gray-700 mb-4">
                You must be at least 18 years old and legally capable of entering into binding contracts to use this Service. By using the Service, you represent and warrant that you meet these requirements.
              </p>

              <h3 className="text-lg font-medium text-gray-900 mb-2">Intended Use</h3>
              <p className="text-gray-700">
                This Service is designed for individuals and businesses who need to manage appointments and synchronize calendars across multiple platforms. You agree to use the Service only for legitimate purposes.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Acceptable Use Policy</h2>
              
              <h3 className="text-lg font-medium text-gray-900 mb-2">Permitted Uses</h3>
              <p className="text-gray-700 mb-4">You may use the Service to:</p>
              <ul className="list-disc list-inside text-gray-700 mb-4 space-y-1">
                <li>Manage your appointment calendars</li>
                <li>Synchronize calendar data across authorized platforms</li>
                <li>Schedule and track appointments with clients</li>
                <li>Export your calendar data for backup purposes</li>
              </ul>

              <h3 className="text-lg font-medium text-gray-900 mb-2">Prohibited Uses</h3>
              <p className="text-gray-700 mb-4">You agree not to:</p>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li>Use the Service for any unlawful purpose or illegal activity</li>
                <li>Violate any local, state, national, or international law or regulation</li>
                <li>Transmit or procure the sending of any advertising or promotional material not authorized by us</li>
                <li>Impersonate or attempt to impersonate another person or entity</li>
                <li>Engage in any conduct that restricts or inhibits anyone&apos;s use or enjoyment of the Service</li>
                <li>Use any robot, spider, or automated device to access the Service</li>
                <li>Attempt to gain unauthorized access to any portion of the Service</li>
                <li>Upload or transmit viruses or any type of malicious code</li>
                <li>Collect or track personal information of other users without consent</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Calendar Integration and Data</h2>
              
              <h3 className="text-lg font-medium text-gray-900 mb-2">Third-Party Calendar Services</h3>
              <p className="text-gray-700 mb-4">
                Our Service integrates with third-party calendar platforms. By connecting these services, you:
              </p>
              <ul className="list-disc list-inside text-gray-700 mb-4 space-y-1">
                <li>Grant us permission to access and synchronize your calendar data</li>
                <li>Acknowledge that you have proper authorization to connect these accounts</li>
                <li>Agree to comply with the terms of service of each connected platform</li>
                <li>Understand that we rely on these platforms for data accuracy and availability</li>
              </ul>

              <h3 className="text-lg font-medium text-gray-900 mb-2">Data Accuracy and Responsibility</h3>
              <p className="text-gray-700 mb-4">
                You are responsible for:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-1">
                <li>The accuracy and completeness of your calendar data</li>
                <li>Ensuring proper permissions for data you upload or synchronize</li>
                <li>Maintaining appropriate backups of critical appointment information</li>
                <li>Compliance with applicable privacy laws and regulations</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Privacy and Data Protection</h2>
              <p className="text-gray-700 mb-4">
                Your privacy is important to us. Please review our Privacy Policy, which also governs your use of the Service, to understand our practices regarding the collection and use of your information.
              </p>
              <p className="text-gray-700">
                <Link href="/privacy" className="text-blue-600 hover:text-blue-800">
                  View our Privacy Policy →
                </Link>
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Service Availability and Modifications</h2>
              
              <h3 className="text-lg font-medium text-gray-900 mb-2">Service Availability</h3>
              <p className="text-gray-700 mb-4">
                We strive to maintain high service availability, but we do not guarantee that the Service will be uninterrupted or error-free. We reserve the right to:
              </p>
              <ul className="list-disc list-inside text-gray-700 mb-4 space-y-1">
                <li>Modify or discontinue any aspect of the Service at any time</li>
                <li>Suspend the Service for maintenance or updates</li>
                <li>Limit access to certain features or functionality</li>
              </ul>

              <h3 className="text-lg font-medium text-gray-900 mb-2">Updates and Changes</h3>
              <p className="text-gray-700">
                We may update the Service and these Terms from time to time. Material changes will be communicated to users through the Service or email notification.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Intellectual Property Rights</h2>
              <p className="text-gray-700 mb-4">
                The Service and its original content, features, and functionality are and will remain the exclusive property of Devyn Johnson Digital Solutions, LLC and its licensors. The Service is protected by copyright, trademark, and other laws.
              </p>
              
              <h3 className="text-lg font-medium text-gray-900 mb-2">Your Content</h3>
              <p className="text-gray-700 mb-4">
                You retain all rights to the calendar data and content you provide to the Service. By using the Service, you grant us a limited license to:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-1">
                <li>Process and synchronize your calendar data as requested</li>
                <li>Store your data securely on our servers</li>
                <li>Display your information within the Service interface</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Limitation of Liability</h2>
              <p className="text-gray-700 mb-4">
                TO THE FULLEST EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL DEVYN JOHNSON DIGITAL SOLUTIONS, LLC BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING WITHOUT LIMITATION, LOSS OF PROFITS, DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES.
              </p>
              
              <h3 className="text-lg font-medium text-gray-900 mb-2">Service Limitations</h3>
              <p className="text-gray-700 mb-4">
                We are not liable for:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li>Missed appointments due to synchronization delays or failures</li>
                <li>Data loss resulting from third-party calendar platform issues</li>
                <li>Business losses resulting from service interruptions</li>
                <li>Damages resulting from unauthorized access to your account</li>
                <li>Issues arising from your failure to maintain account security</li>
              </ul>

              <h3 className="text-lg font-medium text-gray-900 mb-2">Maximum Liability</h3>
              <p className="text-gray-700">
                Our total liability to you for any claim arising out of or relating to these Terms or the Service shall not exceed the amount you paid to us for the Service in the twelve months prior to the claim.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Indemnification</h2>
              <p className="text-gray-700">
                You agree to defend, indemnify, and hold harmless Devyn Johnson Digital Solutions, LLC from and against any and all claims, damages, obligations, losses, liabilities, costs, or debt, and expenses (including attorney&apos;s fees) arising from your use of the Service or violation of these Terms.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. Termination</h2>
              
              <h3 className="text-lg font-medium text-gray-900 mb-2">Termination by You</h3>
              <p className="text-gray-700 mb-4">
                You may terminate your account at any time by contacting us or using the account deletion feature in the Service.
              </p>

              <h3 className="text-lg font-medium text-gray-900 mb-2">Termination by Us</h3>
              <p className="text-gray-700 mb-4">
                We may terminate or suspend your account immediately, without prior notice, for conduct that we believe violates these Terms or is harmful to other users, us, or third parties.
              </p>

              <h3 className="text-lg font-medium text-gray-900 mb-2">Effect of Termination</h3>
              <p className="text-gray-700">
                Upon termination, your right to use the Service will cease immediately. We will delete your account data within 30 days of termination, subject to applicable law and our Privacy Policy.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">12. Governing Law and Jurisdiction</h2>
              <p className="text-gray-700 mb-4">
                These Terms shall be governed and construed in accordance with the laws of the United States of America, without regard to its conflict of law provisions.
              </p>
              <p className="text-gray-700">
                Any legal action or proceeding arising under these Terms will be brought exclusively in the courts located in the state and federal courts located in the state of Minnesota.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">13. Dispute Resolution</h2>
              <p className="text-gray-700 mb-4">
                Before filing a claim against us, you agree to try to resolve the dispute informally by contacting us. We&apos;ll try to resolve the dispute informally by contacting you via email.
              </p>
              <p className="text-gray-700">
                If we can&apos;t resolve the dispute within 30 days, either party may pursue formal legal action.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">14. Severability</h2>
              <p className="text-gray-700">
                If any provision of these Terms is held to be invalid or unenforceable, the remaining provisions will remain in full force and effect.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">15. Contact Information</h2>
              <p className="text-gray-700 mb-4">
                If you have any questions about these Terms of Service, please contact us:
              </p>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-700">
                  <strong>Email:</strong> dljohnson1313@gmail.com
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">16. Acknowledgment</h2>
              <p className="text-gray-700">
                By using our Service, you acknowledge that you have read these Terms of Service and agree to be bound by them.
              </p>
            </section>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <Link 
              href="/"
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}