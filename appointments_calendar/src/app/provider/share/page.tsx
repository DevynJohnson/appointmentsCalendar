'use client';

import React, { useState, useEffect } from 'react';

interface Provider {
  id: string;
  name: string;
  company: string | null;
  email: string;
  phone: string;
}

export default function ProviderDashboard() {
  const [provider, setProvider] = useState<Provider | null>(null);
  const [loading, setLoading] = useState(true);

  // For demo purposes, using hardcoded provider ID
  // In production, this would come from authentication
  const providerId = 'cmek2qbli0000zy18bh84zbwm';

  useEffect(() => {
    const fetchProvider = async () => {
      try {
        const response = await fetch(`/api/client/search-providers?q=${providerId}`);
        const data = await response.json();
        
        if (data.success && data.providers.length > 0) {
          const matchedProvider = data.providers.find((p: Provider) => p.id === providerId) || data.providers[0];
          setProvider(matchedProvider);
        }
      } catch (error) {
        console.error('Error fetching provider:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProvider();
  }, [providerId]);

  const generateBookingLinks = () => {
    if (!provider) return { direct: '', landing: '' };
    
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    return {
      direct: `${baseUrl}/client/booking?providerId=${provider.id}`,
      landing: `${baseUrl}/client/provider/${provider.id}`,
    };
  };

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text).then(() => {
      alert(`${type} link copied to clipboard!`);
    }).catch(() => {
      prompt(`Copy this ${type.toLowerCase()} link:`, text);
    });
  };

  const shareViaEmail = (link: string, type: string) => {
    const subject = encodeURIComponent(`Book an appointment with ${provider?.name}`);
    const body = encodeURIComponent(
      `Hello,\n\n` +
      `You can book an appointment with me using this ${type.toLowerCase()} link:\n${link}\n\n` +
      `This link allows you to:\n` +
      `• View my available appointment times\n` +
      `• Book appointments instantly\n` +
      `• Choose from different service types\n\n` +
      `Best regards,\n${provider?.name}${provider?.company ? `\n${provider.company}` : ''}`
    );
    window.open(`mailto:?subject=${subject}&body=${body}`);
  };

  const links = generateBookingLinks();

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Provider Dashboard</h1>
        {provider && (
          <p className="text-gray-800">
            Welcome back, {provider.name}{provider.company && ` from ${provider.company}`}
          </p>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid gap-6 md:grid-cols-2 mb-8">
        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <h2 className="text-xl font-semibold mb-3 text-blue-600">📅 Manage Availability</h2>
          <p className="text-gray-800 mb-4">Configure your calendar and booking settings</p>
          <div className="space-y-2">
            <a 
              href="/admin/provider-settings"
              className="block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-center"
            >
              Business Hours & Auto Availability
            </a>
            <a 
              href="/admin/event-settings"
              className="block bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 text-center"
            >
              Manual Event Settings
            </a>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <h2 className="text-xl font-semibold mb-3 text-green-600">📊 View Bookings</h2>
          <p className="text-gray-800 mb-4">See your upcoming appointments and booking history</p>
          <div className="space-y-2">
            <button className="block w-full bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
              Upcoming Appointments
            </button>
            <button className="block w-full bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700">
              Booking History
            </button>
          </div>
        </div>
      </div>

      {/* Booking Links Section */}
      <div className="bg-white p-6 rounded-lg border shadow-sm">
        <h2 className="text-xl font-semibold mb-4">📋 Share Your Booking Links</h2>
        <p className="text-gray-800 mb-6">
          Share these links with your clients so they can book appointments with you directly. 
          Choose the option that works best for your needs.
        </p>

        <div className="space-y-6">
          {/* Direct Booking Link */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">⚡</span>
              <h3 className="font-semibold">Direct Booking Link</h3>
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">RECOMMENDED</span>
            </div>
            <p className="text-sm text-gray-800 mb-3">
              Takes clients directly to your calendar to book appointments immediately
            </p>
            <div className="bg-gray-50 p-3 rounded mb-3 break-all text-sm font-mono">
              {links.direct}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => copyToClipboard(links.direct, 'Direct booking')}
                className="bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700 text-sm"
              >
                📋 Copy Link
              </button>
              <button
                onClick={() => shareViaEmail(links.direct, 'Direct booking')}
                className="bg-gray-100 text-gray-700 px-3 py-2 rounded hover:bg-gray-200 text-sm"
              >
                📧 Email Link
              </button>
              <a
                href={links.direct}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-green-100 text-green-700 px-3 py-2 rounded hover:bg-green-200 text-sm"
              >
                👀 Preview
              </a>
            </div>
          </div>

          {/* Landing Page Link */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">📄</span>
              <h3 className="font-semibold">Professional Landing Page</h3>
            </div>
            <p className="text-sm text-gray-800 mb-3">
              Shows your profile information first, then leads to booking - great for websites and marketing
            </p>
            <div className="bg-gray-50 p-3 rounded mb-3 break-all text-sm font-mono">
              {links.landing}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => copyToClipboard(links.landing, 'Landing page')}
                className="bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700 text-sm"
              >
                📋 Copy Link
              </button>
              <button
                onClick={() => shareViaEmail(links.landing, 'Landing page')}
                className="bg-gray-100 text-gray-700 px-3 py-2 rounded hover:bg-gray-200 text-sm"
              >
                📧 Email Link
              </button>
              <a
                href={links.landing}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-green-100 text-green-700 px-3 py-2 rounded hover:bg-green-200 text-sm"
              >
                👀 Preview
              </a>
            </div>
          </div>
        </div>

        {/* Usage Tips */}
        <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
          <h4 className="font-semibold text-yellow-800 mb-2">💡 How to Use These Links</h4>
          <ul className="text-sm text-yellow-700 space-y-1">
            <li>• <strong>Email signatures:</strong> Add to your professional email signature</li>
            <li>• <strong>Business cards:</strong> Include as QR codes or short URLs</li>
            <li>• <strong>Website:</strong> Add as a &quot;Book Appointment&quot; button</li>
            <li>• <strong>Social media:</strong> Share in your bio or posts</li>
            <li>• <strong>Text messages:</strong> Send directly to clients</li>
            <li>• <strong>Voicemail:</strong> Include in your voicemail greeting</li>
          </ul>
        </div>
      </div>

      {/* Search Integration */}
      <div className="mt-8 bg-blue-50 p-6 rounded-lg">
        <h3 className="font-semibold text-blue-800 mb-2">📍 Provider Search</h3>
        <p className="text-blue-700 text-sm mb-3">
          Clients can also find you through our provider search page by searching for your name, company, or email.
        </p>
        <a 
          href="/client/search"
          className="inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm"
        >
          View Search Page
        </a>
      </div>
    </div>
  );
}
