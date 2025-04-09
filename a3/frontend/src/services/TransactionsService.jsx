const VITE_BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

// For managers/superusers - all transactions
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

// In services/TransactionsService.jsx
export const getUserByUtorid = async (token, utorid) => {
  try {
    const response = await fetch(`${VITE_BACKEND_URL}/users/utorid/${utorid}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch user');
    }

    return await response.json();
  } catch (error) {
    console.error('UserService error:', error);
    throw error;
  }
};

export const transferPoints = async (token, recipientUtorid, amount, remark = '') => {
  try {
    // First get the recipient's user ID
    const recipient = await getUserByUtorid(token, recipientUtorid);
    
    // Then make the transfer
    const response = await fetch(`${VITE_BACKEND_URL}/users/${recipient.id}/transactions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        type: 'transfer',
        amount: parseInt(amount),
        remark
      })
    });

    if (!response.ok) {
      if (response.status === 403) {
        localStorage.removeItem('token');
        throw new Error('Session expired. Please log in again.');
      }
      const error = await response.json();
      throw new Error(error.error || 'Failed to transfer points');
    }

    return await response.json();
  } catch (error) {
    console.error('TransferPointsService error:', error);
    throw error;
  }
};

// For cashiers/regular users - only their transactions
export const fetchUserTransactions = async (token, { 
  name = '',
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
      suspicious,
      ...(promotionId && { promotionId }),
      ...(type && { type }),
      ...(relatedId && { relatedId }),
      ...(amount && { amount }),
      ...(operator && { operator }),
      page,
      limit
    });

    const response = await fetch(`${VITE_BACKEND_URL}/users/me/transactions?${params}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch user transactions');
    }

    return await response.json();
  } catch (error) {
    console.error('UserTransactionsService error:', error);
    throw error;
  }
};