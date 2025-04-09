const VITE_BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

// RSVP to an event
export const rsvpToEvent = async (token, eventId) => {
  try {
    const response = await fetch(`${VITE_BACKEND_URL}/events/${eventId}/guests/me`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to RSVP to event');
    }

    return await response.json();
  } catch (error) {
    console.error('EventAttendanceService error:', error);
    throw error;
  }
};

// Cancel RSVP to an event
export const cancelRsvp = async (token, eventId) => {
  try {
    const response = await fetch(`${VITE_BACKEND_URL}/events/${eventId}/guests/me`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (response.status === 204) {
      return { success: true };
    }

    const error = await response.json();
    throw new Error(error.error || 'Failed to cancel RSVP');
  } catch (error) {
    console.error('EventAttendanceService error:', error);
    throw error;
  }
};

// Add guest to event (for managers/organizers)
export const addGuestToEvent = async (token, eventId, utorid) => {
  try {
    const response = await fetch(`${VITE_BACKEND_URL}/events/${eventId}/guests`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ utorid }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to add guest');
    }

    return await response.json();
  } catch (error) {
    console.error('EventAttendanceService error:', error);
    throw error;
  }
};

// Remove guest from event (for managers/organizers)
export const removeGuestFromEvent = async (token, eventId, userId) => {
  try {
    const response = await fetch(`${VITE_BACKEND_URL}/events/${eventId}/guests/${userId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (response.status === 204) {
      return { success: true };
    }

    const error = await response.json();
    throw new Error(error.error || 'Failed to remove guest');
  } catch (error) {
    console.error('EventAttendanceService error:', error);
    throw error;
  }
};

// Award points to guest(s)
export const awardPoints = async (token, eventId, { utorid, amount, remark }) => {
  try {
    const response = await fetch(`${VITE_BACKEND_URL}/events/${eventId}/transactions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'event',
        utorid,
        amount,
        remark,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to award points');
    }

    return await response.json();
  } catch (error) {
    console.error('EventAttendanceService error:', error);
    throw error;
  }
};