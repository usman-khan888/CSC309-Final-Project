import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { fetchPromotions } from '../services/PromotionsService';
import Layout from '../components/Layout';

const Promotions = () => {
  const { user } = useAuth();
  const [promotionsData, setPromotionsData] = useState({ count: 0, results: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    name: '',
    type: '', 
    page: 1, 
    limit: 10 
  });

  useEffect(() => {
    const loadPromotions = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        if (!token) throw new Error('Authentication required');


        
        const data = await fetchPromotions(token, filters);
        setPromotionsData(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadPromotions();
  }, [filters]);

  const handleFilterChange = (newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters, page: 1 })); // Reset to page 1 when filters change
  };

  //if (loading) return <div>Loading promotions...</div>;
  if (error) return <div className="text-red-500">Error: {error}</div>;

  return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Promotions ({promotionsData.count})</h1>
        
        {/* Filter Controls */}
        <div className="bg-white p-4 rounded-lg shadow mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Promotion Name</label>
            <input
              type="text"
              className="w-full p-2 border rounded"
              onChange={(e) => handleFilterChange({ name: e.target.value })}
              placeholder="Search promotions..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Type</label>
            <input
              type="text"
              className="w-full p-2 border rounded"
              onChange={(e) => handleFilterChange({ type: e.target.value })}
              placeholder="Filter by location"
            />
          </div>
        </div>

        {/* promotions List */}
        {promotionsData.results.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No promotions found matching your criteria</p>
          </div>
        ) : (
          <>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {promotionsData.results.map(promotion => (
                <div key={promotion.id} className="border rounded-lg p-4 shadow hover:shadow-md transition-shadow">
                  <h2 className="text-xl font-semibold mb-2">{promotion.name}</h2>
                  <p className="text-gray-600 mb-2">{promotion.location}</p>
                  <div className="text-sm text-gray-500 space-y-1">
                    <p>Type: {promotion.type}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {promotionsData.count > filters.limit && (
              <div className="flex justify-center mt-8 space-x-2">
                <button
                  onClick={() => setFilters(prev => ({ ...prev, page: prev.page - 1 }))}
                  disabled={filters.page === 1}
                  className="px-4 py-2 border rounded disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="px-4 py-2">
                  Page {filters.page} of {Math.ceil(promotionsData.count / filters.limit)}
                </span>
                <button
                  onClick={() => setFilters(prev => ({ ...prev, page: prev.page + 1 }))}
                  disabled={filters.page >= Math.ceil(promotionsData.count / filters.limit)}
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

export default Promotions;