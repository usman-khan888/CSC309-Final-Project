//This file was generated by ChatGPT
import { useAuth } from '../contexts/AuthContext';

// Create a function that returns the service functions with the backendUrl
const createPromotionsService = () => {
  const { backendUrl } = useAuth();

  const fetchPromotions = async (token, filters = {}) => {
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

    if (response.status !== 204) {
      return await response.json();
    }
  };

  return {
    fetchPromotions,
    createPromotion,
    updatePromotion,
    deletePromotion
  };
};

export default createPromotionsService;