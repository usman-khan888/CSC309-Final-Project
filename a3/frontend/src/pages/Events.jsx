import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { fetchEvents } from '../services/EventsService';
import { 
  rsvpToEvent, 
  cancelRsvp, 
  addGuestToEvent, 
  removeGuestFromEvent, 
  awardPoints 
} from '../services/EventAttendanceService';
import EventForm from '../pages/EventForm';
import AddOrganizerModal from '../pages/AddOrganizerModal';
import AddGuestModal from '../pages/AddGuestModal';
import AwardPointsModal from '../pages/AwardPointsModal';

const Events = () => {
  const { user, backendUrl } = useAuth();
  const [eventsData, setEventsData] = useState({ count: 0, results: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    name: '',
    location: '',
    showFull: false,
    page: 1,
    limit: 10
  });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddOrganizerModal, setShowAddOrganizerModal] = useState(false);
  const [showAddGuestModal, setShowAddGuestModal] = useState(false);
  const [showAwardPointsModal, setShowAwardPointsModal] = useState(false);
  const [currentEvent, setCurrentEvent] = useState(null);
  const [currentGuest, setCurrentGuest] = useState(null);

  useEffect(() => {
    const loadEvents = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        if (!token) throw new Error('Authentication required');
        
        const data = await fetchEvents(token, filters);
        const eventsWithOrganizers = data.results.map(event => ({
          ...event,
          organizers: event.organizers || [],
          guests: event.guests || [],
          numGuests: event.eventAttendances?.length || event.numGuests || 0
        }));
        setEventsData({...data, results: eventsWithOrganizers});
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadEvents();
  }, [filters]);

  const handleFilterChange = (newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters, page: 1 }));
  };

  const handleCreateEvent = () => {
    setShowCreateModal(true);
  };

  const handleEditEvent = (event) => {
    setCurrentEvent(event);
    setShowEditModal(true);
  };

  const handleDeleteEvent = async (eventId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${backendUrl}/events/${eventId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.status === 204) {
        const data = await fetchEvents(token, filters);
        setEventsData(data);
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete event');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAddOrganizer = (event) => {
    setCurrentEvent(event);
    setShowAddOrganizerModal(true);
  };

  const handleRsvp = async (eventId) => {
    try {
      const token = localStorage.getItem('token');
      await rsvpToEvent(token, eventId);
      const data = await fetchEvents(token, filters);
      setEventsData(data);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCancelRsvp = async (eventId) => {
    try {
      const token = localStorage.getItem('token');
      await cancelRsvp(token, eventId);
      const data = await fetchEvents(token, filters);
      setEventsData(data);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAddGuest = (event) => {
    setCurrentEvent(event);
    setShowAddGuestModal(true);
  };

  const handleRemoveGuest = async (eventId, userId) => {
    try {
      const token = localStorage.getItem('token');
      await removeGuestFromEvent(token, eventId, userId);
      const data = await fetchEvents(token, filters);
      setEventsData(data);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAwardPoints = (event, guest = null) => {
    setCurrentEvent(event);
    setCurrentGuest(guest);
    setShowAwardPointsModal(true);
  };

  const isManager = user?.role === 'manager' || user?.role === 'superuser';
  const isOrganizer = (event) => {
    if (!event.organizers) return false;
    return event.organizers.some(org => org.utorid === user?.utorid);
  };

  const isGuest = (event) => {
    if (!event.guests) return false;
    return event.guests.some(guest => guest.utorid === user?.utorid);
  };

  if (error) return <div className="text-red-500">Error: {error}</div>;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Events ({eventsData.count})</h1>
        {isManager && (
          <button
            onClick={handleCreateEvent}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
          >
            Create Event
          </button>
        )}
      </div>
      
      <div className="bg-white p-4 rounded-lg shadow mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Event Name</label>
          <input
            type="text"
            className="w-full p-2 border rounded"
            onChange={(e) => handleFilterChange({ name: e.target.value })}
            placeholder="Search events..."
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Location</label>
          <input
            type="text"
            className="w-full p-2 border rounded"
            onChange={(e) => handleFilterChange({ location: e.target.value })}
            placeholder="Filter by location"
          />
        </div>
        <div className="flex items-center">
          <input
            type="checkbox"
            id="showFull"
            className="mr-2"
            checked={filters.showFull}
            onChange={(e) => handleFilterChange({ showFull: e.target.checked })}
          />
          <label htmlFor="showFull">Show full events</label>
        </div>
      </div>

      {eventsData.results.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">No events found matching your criteria</p>
        </div>
      ) : (
        <>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {eventsData.results.map(event => (
              <div key={event.id} className="border rounded-lg p-4 shadow hover:shadow-md transition-shadow relative">
                <h2 className="text-xl font-semibold mb-2">{event.name}</h2>
                <p className="text-gray-600 mb-2">{event.location}</p>
                <div className="text-sm text-gray-500 space-y-1">
                  <p>Starts: {new Date(event.startTime).toLocaleString()}</p>
                  <p>Ends: {new Date(event.endTime).toLocaleString()}</p>
                  <p>Attendees: {event.numGuests}/{event.capacity || '∞'}</p>
                  <p>Points: {event.points} ({event.pointsRemain} remaining)</p>
                  <p>Status: {event.published ? 'Published' : 'Draft'}</p>
                </div>
                
                {(user?.role === 'regular' || true)&& (
                  <div className="mt-4">
                    {isGuest(event) ? (
                      <button
                        onClick={() => handleCancelRsvp(event.id)}
                        className="w-full bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
                      >
                        Cancel RSVP
                      </button>
                    ) : (
                      <button
                        onClick={() => handleRsvp(event.id)}
                        className="w-full bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
                        disabled={event.capacity && event.numGuests >= event.capacity}
                      >
                        RSVP
                      </button>
                    )}
                  </div>
                )}

                {(isManager || isOrganizer(event)) && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      onClick={() => handleEditEvent(event)}
                      className="text-sm bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded"
                    >
                      Edit
                    </button>
                    
                    {isManager && !event.published && (
                      <button
                        onClick={() => handleDeleteEvent(event.id)}
                        className="text-sm bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded"
                      >
                        Delete
                      </button>
                    )}
                    
                    {isManager && (
                      <button
                        onClick={() => handleAddOrganizer(event)}
                        className="text-sm bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded"
                      >
                        Add Organizer
                      </button>
                    )}

                    <button
                      onClick={() => handleAddGuest(event)}
                      className="text-sm bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded"
                    >
                      Add Guest
                    </button>

                    <button
                      onClick={() => handleAwardPoints(event)}
                      className="text-sm bg-purple-500 hover:bg-purple-600 text-white px-3 py-1 rounded"
                      disabled={event.pointsRemain <= 0}
                    >
                      Award Points
                    </button>
                  </div>
                )}

                {(isManager || isOrganizer(event)) && (
                  <div className="mt-4">
                    <h3 className="font-medium mb-2">
                      Attendees: {event.numGuests}/{event.capacity || '∞'}
                    </h3>
                    {event.guests?.length > 0 ? (
                      <ul className="space-y-1">
                        {event.guests.map(guest => (
                          <li key={guest.id} className="flex justify-between items-center">
                            <span>{guest.name} ({guest.utorid})</span>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleAwardPoints(event, guest)}
                                className="text-xs bg-purple-500 hover:bg-purple-600 text-white px-2 py-1 rounded"
                                disabled={event.pointsRemain <= 0}
                              >
                                Award Points
                              </button>
                              <button
                                onClick={() => handleRemoveGuest(event.id, guest.id)}
                                className="text-xs bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded"
                              >
                                Remove
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-gray-500 text-sm">No attendees yet</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {eventsData.count > filters.limit && (
            <div className="flex justify-center mt-8 space-x-2">
              <button
                onClick={() => setFilters(prev => ({ ...prev, page: prev.page - 1 }))}
                disabled={filters.page === 1}
                className="px-4 py-2 border rounded disabled:opacity-50"
              >
                Previous
              </button>
              <span className="px-4 py-2">
                Page {filters.page} of {Math.ceil(eventsData.count / filters.limit)}
              </span>
              <button
                onClick={() => setFilters(prev => ({ ...prev, page: prev.page + 1 }))}
                disabled={filters.page >= Math.ceil(eventsData.count / filters.limit)}
                className="px-4 py-2 border rounded disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {showCreateModal && (
        <EventForm 
          mode="create"
          backendUrl={backendUrl}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            const token = localStorage.getItem('token');
            fetchEvents(token, filters).then(data => setEventsData(data));
          }}
        />
      )}

      {showEditModal && currentEvent && (
        <EventForm 
          mode="edit"
          event={currentEvent}
          backendUrl={backendUrl}
          onClose={() => setShowEditModal(false)}
          onSuccess={() => {
            setShowEditModal(false);
            const token = localStorage.getItem('token');
            fetchEvents(token, filters).then(data => setEventsData(data));
          }}
        />
      )}

      {showAddOrganizerModal && currentEvent && (
        <AddOrganizerModal
          event={currentEvent}
          backendUrl={backendUrl}
          onClose={() => setShowAddOrganizerModal(false)}
          onSuccess={() => {
            setShowAddOrganizerModal(false);
            const token = localStorage.getItem('token');
            fetchEvents(token, filters).then(data => setEventsData(data));
          }}
        />
      )}

      {showAddGuestModal && currentEvent && (
        <AddGuestModal
          event={currentEvent}
          backendUrl={backendUrl}
          onClose={() => setShowAddGuestModal(false)}
          onSuccess={async (utorid) => {
            try {
              const token = localStorage.getItem('token');
              await addGuestToEvent(token, currentEvent.id, utorid);
              const data = await fetchEvents(token, filters);
              setEventsData(data);
              setShowAddGuestModal(false);
            } catch (err) {
              setError(err.message);
            }
          }}
        />
      )}

      {showAwardPointsModal && currentEvent && (
        <AwardPointsModal
          event={currentEvent}
          guest={currentGuest}
          backendUrl={backendUrl}
          onClose={() => {
            setShowAwardPointsModal(false);
            setCurrentGuest(null);
          }}
          onSuccess={async ({ amount, remark }) => {
            try {
              const token = localStorage.getItem('token');
              await awardPoints(token, currentEvent.id, {
                utorid: currentGuest?.utorid,
                amount,
                remark
              });
              const data = await fetchEvents(token, filters);
              setEventsData(data);
              setShowAwardPointsModal(false);
              setCurrentGuest(null);
            } catch (err) {
              setError(err.message);
            }
          }}
        />
      )}
    </div>
  );
};

export default Events;