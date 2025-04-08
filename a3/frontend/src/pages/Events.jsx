import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { fetchEvents } from '../services/EventsService';
import Layout from '../components/Layout';
import EventForm from './EventForm';
import AddOrganizerModal from './AddOrganizerModal';

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
  const [currentEvent, setCurrentEvent] = useState(null);

  useEffect(() => {
    const loadEvents = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        if (!token) throw new Error('Authentication required');
        
        const data = await fetchEvents(token, filters);
        setEventsData(data);
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
        // Refresh events list
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

  const isManager = user?.role === 'manager' || user?.role === 'superuser';

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
      
      {/* Filter Controls */}
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

      {/* Events List */}
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
                
                {/* Action buttons for managers/organizers */}
                <div className="mt-4 flex space-x-2">
                  {(isManager || event.organizers.some(org => org.utorid === user?.utorid)) && (
                    <button
                      onClick={() => handleEditEvent(event)}
                      className="text-sm bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded"
                    >
                      Edit
                    </button>
                  )}
                  
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
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
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

      {/* Modals */}
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
    </div>
  );
};

export default Events;