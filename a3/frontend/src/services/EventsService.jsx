const VITE_BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

export const fetchEvents = async (token, { 
  name = '', 
  location = '', 
  started, 
  ended, 
  showFull = false, 
  page = 1, 
  limit = 10 
} = {}) => {
  try {
    // Validate filters
    if (started !== undefined && ended !== undefined) {
      throw new Error("Cannot specify both started and ended filters");
    }

    const params = new URLSearchParams({
      ...(name && { name }),
      ...(location && { location }),
      ...(started !== undefined && { started }),
      ...(ended !== undefined && { ended }),
      showFull,
      page,
      limit
    });

    const response = await fetch(`${VITE_BACKEND_URL}/events?${params}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch events');
    }

    return await response.json();
  } catch (error) {
    console.error('EventsService error:', error);
    throw error;
  }
};