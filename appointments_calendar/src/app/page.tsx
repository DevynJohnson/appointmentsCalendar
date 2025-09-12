import Image from "next/image";
import Nav from "@/components/Nav";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Nav type="public" />
      <div className="font-sans grid grid-rows-[1fr_auto] items-center justify-items-center min-h-[calc(100vh-4rem)] p-8 pb-20 gap-16 sm:p-20">
        <main className="flex flex-col gap-[32px] row-start-1 items-center sm:items-start max-w-4xl">
          <div className="text-center sm:text-left">
            <Image
              className="dark:invert mx-auto sm:mx-0"
              src="/next.svg"
              alt="AppointmentCalendar logo"
              width={180}
              height={38}
              priority
            />
            <h1 className="text-4xl font-bold text-gray-900 mt-6 mb-4">
              Location-Based Appointment Booking
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl">
              Book appointments with providers based on their location and availability. 
              Seamlessly sync with Outlook, Google Calendar, Teams, and Apple calendars.
            </p>
          </div>

          <div className="flex gap-4 items-center flex-col sm:flex-row">
            <Link
              className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-blue-600 text-white gap-2 hover:bg-blue-700 font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 sm:w-auto"
              href="/client/booking"
            >
              📅 Book an Appointment
            </Link>
            <Link
              className="rounded-full border border-solid border-gray-300 transition-colors flex items-center justify-center hover:bg-gray-50 font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 w-full sm:w-auto"
              href="/provider/register"
            >
              👔 Join as Provider
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 w-full">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="text-2xl mb-3">📍</div>
              <h3 className="font-semibold text-lg mb-2">Location-Based</h3>
              <p className="text-gray-600">Find providers in your area and book appointments based on their actual location and schedule.</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="text-2xl mb-3">📅</div>
              <h3 className="font-semibold text-lg mb-2">Calendar Sync</h3>
              <p className="text-gray-600">Automatic sync with Outlook, Google Calendar, Teams, and Apple iCloud calendars.</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="text-2xl mb-3">⚡</div>
              <h3 className="font-semibold text-lg mb-2">Real-Time Updates</h3>
              <p className="text-gray-600">Instant availability updates when providers&apos; schedules change.</p>
            </div>
          </div>
        </main>

        <footer className="row-start-2 flex gap-[24px] flex-wrap items-center justify-center text-sm text-gray-500">
          <Link
            className="flex items-center gap-2 hover:underline hover:underline-offset-4"
            href="/about"
          >
            About
          </Link>
          <Link
            className="flex items-center gap-2 hover:underline hover:underline-offset-4"
            href="/privacy"
          >
            Privacy Policy
          </Link>
          <Link
            className="flex items-center gap-2 hover:underline hover:underline-offset-4"
            href="/terms"
          >
            Terms of Service
          </Link>
          <Link
            className="flex items-center gap-2 hover:underline hover:underline-offset-4"
            href="/provider/login"
          >
            Provider Login
          </Link>
        </footer>
      </div>
    </div>
  );
}
