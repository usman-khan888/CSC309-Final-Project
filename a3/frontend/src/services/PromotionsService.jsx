const VITE_BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

export const fetchPromotions = async (token, { 
  name = '',
  type = '', 
  page = 1, 
  limit = 10 
} = {}) => {
  try {
    const params = new URLSearchParams({
      ...(name && { name }),
      ...(type && { type }),
      page,
      limit
    });

    const response = await fetch(`${VITE_BACKEND_URL}/promotions?${params}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch promotions');
    }

    return await response.json();
  } catch (error) {
    console.error('PromotionsService error:', error);
    throw error;
  }
};