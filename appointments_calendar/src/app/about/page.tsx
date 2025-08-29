import Nav from "@/components/Nav";

export default function About() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Nav type="public" />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">About AppointmentCal</h1>
          
          <div className="prose prose-lg max-w-none">
            <p className="text-gray-600 mb-6">
              AppointmentCal is a professional appointment booking system designed for businesses 
              operating across multiple locations. Our platform allows service providers to 
              seamlessly sync their calendars and enable customers to book appointments based 
              on real location and availability.
            </p>

            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Key Features</h2>
            
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <div className="bg-blue-50 p-6 rounded-lg">
                <h3 className="font-semibold text-lg mb-2 text-blue-900">📍 Location-Based Booking</h3>
                <p className="text-blue-800">
                  Customers can find and book appointments with providers based on their 
                  current location and the provider&apos;s schedule.
                </p>
              </div>
              
              <div className="bg-green-50 p-6 rounded-lg">
                <h3 className="font-semibold text-lg mb-2 text-green-900">📅 Multi-Calendar Sync</h3>
                <p className="text-green-800">
                  Supports Outlook, Google Calendar, Microsoft Teams, and Apple iCloud 
                  for comprehensive calendar integration.
                </p>
              </div>
              
              <div className="bg-purple-50 p-6 rounded-lg">
                <h3 className="font-semibold text-lg mb-2 text-purple-900">⚡ Real-Time Updates</h3>
                <p className="text-purple-800">
                  Webhook-based notifications ensure availability updates happen instantly 
                  when provider schedules change.
                </p>
              </div>
              
              <div className="bg-orange-50 p-6 rounded-lg">
                <h3 className="font-semibold text-lg mb-2 text-orange-900">🔒 Secure & Reliable</h3>
                <p className="text-orange-800">
                  Enterprise-grade security with JWT authentication and secure API 
                  integrations with all calendar platforms.
                </p>
              </div>
            </div>

            <h2 className="text-2xl font-semibold text-gray-900 mb-4">How It Works</h2>
            
            <div className="space-y-4 mb-8">
              <div className="flex items-start space-x-4">
                <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-semibold">1</div>
                <div>
                  <h4 className="font-semibold">Provider Registration</h4>
                  <p className="text-gray-600">Service providers register and connect their calendars (Outlook, Google, Teams, Apple).</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-semibold">2</div>
                <div>
                  <h4 className="font-semibold">Calendar Synchronization</h4>
                  <p className="text-gray-600">System automatically syncs calendar events and extracts location information.</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-semibold">3</div>
                <div>
                  <h4 className="font-semibold">Customer Booking</h4>
                  <p className="text-gray-600">Customers search for providers by location and book available appointment slots.</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-semibold">4</div>
                <div>
                  <h4 className="font-semibold">Real-Time Updates</h4>
                  <p className="text-gray-600">Any calendar changes automatically update availability in real-time.</p>
                </div>
              </div>
            </div>

            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Supported Platforms</h2>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl mb-2">📧</div>
                <div className="font-medium">Outlook</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl mb-2">👥</div>
                <div className="font-medium">Teams</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl mb-2">📅</div>
                <div className="font-medium">Google</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl mb-2">🍎</div>
                <div className="font-medium">Apple</div>
              </div>
            </div>

            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="font-semibold text-lg mb-2">Ready to Get Started?</h3>
              <p className="text-gray-600 mb-4">
                Join hundreds of providers who trust AppointmentCal for their booking needs.
              </p>
              <div className="space-x-4">
                <a
                  href="/provider/register"
                  className="inline-block bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
                >
                  Register as Provider
                </a>
                <a
                  href="/book"
                  className="inline-block border border-blue-600 text-blue-600 px-6 py-2 rounded-md hover:bg-blue-50 transition-colors"
                >
                  Book Appointment
                </a>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
