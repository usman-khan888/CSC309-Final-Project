//This file was generated by ChatGPT
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import PromotionForm from '../pages/PromotionForm';

const Promotions = () => {
  const { user, backendUrl } = useAuth();
  const [promotionsData, setPromotionsData] = useState({ count: 0, results: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    name: '',
    type: '', 
    page: 1, 
    limit: 10 
  });
  const [isCreating, setIsCreating] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  const isManagerOrAbove = user?.role === 'manager' || user?.role === 'superuser';

  const fetchPromotions = async (token, filters) => {
    const queryParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) queryParams.append(key, value);
    });

    const response = await fetch(`${backendUrl}/promotions?${queryParams}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch promotions');
    }

    return await response.json();
  };

  const createPromotion = async (token, promotionData) => {
    const response = await fetch(`${backendUrl}/promotions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(promotionData)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create promotion');
    }

    return await response.json();
  };

  const updatePromotion = async (token, promotionId, updatedData) => {
    const response = await fetch(`${backendUrl}/promotions/${promotionId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updatedData)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update promotion');
    }

    return await response.json();
  };

  const deletePromotion = async (token, promotionId) => {
    const response = await fetch(`${backendUrl}/promotions/${promotionId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete promotion');
    }
  };

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
  }, [filters, backendUrl]);

  const handleFilterChange = (newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters, page: 1 }));
  };

  const handleCreatePromotion = async (promotionData) => {
    try {
      const token = localStorage.getItem('token');
      const newPromotion = await createPromotion(token, promotionData);
      
      setPromotionsData(prev => ({
        ...prev,
        results: [newPromotion, ...prev.results],
        count: prev.count + 1
      }));
      
      setIsCreating(false);
      setSuccessMessage('Promotion created successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleUpdatePromotion = async (promotionId, updatedData) => {
    try {
      const token = localStorage.getItem('token');
      const updatedPromotion = await updatePromotion(token, promotionId, updatedData);
      
      setPromotionsData(prev => ({
        ...prev,
        results: prev.results.map(p => 
          p.id === updatedPromotion.id ? updatedPromotion : p
        )
      }));
      
      setEditingPromotion(null);
      setSuccessMessage('Promotion updated successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeletePromotion = async (promotionId) => {
    try {
      const token = localStorage.getItem('token');
      await deletePromotion(token, promotionId);
      
      setPromotionsData(prev => ({
        ...prev,
        results: prev.results.filter(p => p.id !== promotionId),
        count: prev.count - 1
      }));
      
      setSuccessMessage('Promotion deleted successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEditClick = (promotion) => {
    setEditingPromotion(promotion);
  };

  if (error) return <div className="text-red-500">Error: {error}</div>;

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Promotions ({promotionsData.count})</h1>
      
      {successMessage && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          {successMessage}
        </div>
      )}

      {isManagerOrAbove && (
        <div className="mb-6 flex space-x-4">
          {!isCreating && !editingPromotion && (
            <button
              onClick={() => setIsCreating(true)}
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            >
              Create New Promotion
            </button>
          )}
        </div>
      )}

      {(isCreating || editingPromotion) && (
        <PromotionForm
          promotion={editingPromotion}
          onSubmit={editingPromotion ? 
            (data) => handleUpdatePromotion(editingPromotion.id, data) : 
            handleCreatePromotion
          }
          onCancel={() => {
            setIsCreating(false);
            setEditingPromotion(null);
          }}
        />
      )}

      {!isCreating && !editingPromotion && (
        <>
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
                placeholder="Filter by type"
              />
            </div>
          </div>

          {promotionsData.results.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No promotions found matching your criteria</p>
            </div>
          ) : (
            <>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {promotionsData.results.map(promotion => (
                  <div key={promotion.id} className="border rounded-lg p-4 shadow hover:shadow-md transition-shadow relative">
                    <h2 className="text-xl font-semibold mb-2">{promotion.name}</h2>
                    <p className="text-gray-600 mb-2">{promotion.description}</p>
                    <div className="text-sm text-gray-500 space-y-1">
                      <p>Type: {promotion.type}</p>
                      <p>Start: {new Date(promotion.startTime).toLocaleString()}</p>
                      <p>End: {new Date(promotion.endTime).toLocaleString()}</p>
                      {promotion.minSpending && <p>Min Spending: ${promotion.minSpending}</p>}
                      {promotion.rate && <p>Rate: {promotion.rate} points per $</p>}
                      {promotion.points && <p>Points: {promotion.points}</p>}
                    </div>
                    
                    {isManagerOrAbove && (
                      <div className="mt-4 flex space-x-2">
                        <button
                          onClick={() => handleEditClick(promotion)}
                          className="text-blue-500 hover:text-blue-700 text-sm font-medium"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeletePromotion(promotion.id)}
                          className="text-red-500 hover:text-red-700 text-sm font-medium"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

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
        </>
      )}
    </div>
  );
};

export default Promotions;