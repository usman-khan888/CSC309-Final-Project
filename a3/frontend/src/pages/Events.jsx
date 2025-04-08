import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { fetchEvents } from '../services/EventsService';
import Layout from '../components/Layout';

const Events = () => {
  const { user } = useAuth();
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

  useEffect(() => {
    const loadEvents = async () => {
      try {
        setLoading(true);
        //const token = localStorage.getItem('token');
        //if (!token) throw new Error('Authentication required');
        const token = 'dummy-token'; // override actual token for now


        
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
    setFilters(prev => ({ ...prev, ...newFilters, page: 1 })); // Reset to page 1 when filters change
  };

  //if (loading) return <div>Loading events...</div>;
  if (error) return <div className="text-red-500">Error: {error}</div>;

  return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Events ({eventsData.count})</h1>
        
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
                <div key={event.id} className="border rounded-lg p-4 shadow hover:shadow-md transition-shadow">
                  <h2 className="text-xl font-semibold mb-2">{event.name}</h2>
                  <p className="text-gray-600 mb-2">{event.location}</p>
                  <div className="text-sm text-gray-500 space-y-1">
                    <p>Starts: {new Date(event.startTime).toLocaleString()}</p>
                    <p>Ends: {new Date(event.endTime).toLocaleString()}</p>
                    <p>Attendees: {event.numGuests}/{event.capacity || '∞'}</p>
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
      </div>
  );
};

export default Events;