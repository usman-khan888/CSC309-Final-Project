const VITE_BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

export const fetchTransactions = async (token, { 
  name = '',
  createdBy = '',
  suspicious = false,
  promotionId = null,
  type = '',
  relatedId = null,
  amount = null,
  operator = '', 
  page = 1, 
  limit = 10 
} = {}) => {
  try {
    const params = new URLSearchParams({
      ...(name && { name }),
      ...(createdBy && { createdBy }),
      suspicious,
      ...(promotionId && { promotionId }),
      ...(type && { type }),
      ...(relatedId && { relatedId }),
      ...(amount && { amount }),
      ...(operator && { operator }),
      page,
      limit
    });

    const response = await fetch(`${VITE_BACKEND_URL}/transactions?${params}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch transactions');
    }

    return await response.json();
  } catch (error) {
    console.error('TransactionsService error:', error);
    throw error;
  }
};