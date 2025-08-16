// Simple location service for displaying calendar locations
export class LocationService {
  /**
   * Clean and format location text from calendar events
   */
  static formatLocationDisplay(locationText: string): string {
    if (!locationText) {
      return 'Location TBD';
    }

    // Clean up common calendar location formatting issues
    return locationText
      .replace(/[,\n\r]+/g, ', ')  // Replace newlines with commas
      .replace(/\s+/g, ' ')        // Normalize whitespace
      .replace(/,\s*,/g, ',')      // Remove duplicate commas
      .trim();
  }

  /**
   * Extract basic location components if needed for search/filtering
   */
  static parseLocation(locationText: string): {
    displayLocation: string;
    searchableText: string;
  } {
    const displayLocation = this.formatLocationDisplay(locationText);
    
    return {
      displayLocation,
      searchableText: displayLocation.toLowerCase()
    };
  }

  /**
   * Check if customer's location query matches an event location
   */
  static isLocationMatch(eventLocation: string, customerQuery: string): boolean {
    if (!eventLocation || !customerQuery) return false;
    
    const eventLocationLower = eventLocation.toLowerCase();
    const queryLower = customerQuery.toLowerCase();
    
    // Simple contains check - customer can search for city, state, etc.
    return eventLocationLower.includes(queryLower);
  }
}
