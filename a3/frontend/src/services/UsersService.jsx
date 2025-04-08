const VITE_BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

export const fetchUsers = async (token, { 
  name = '', 
  role = '', 
  verified = true, 
  activated = true,
  page = 1, 
  limit = 10 
} = {}) => {
  try {

    const params = new URLSearchParams({
      ...(name && { name }),
      ...(role && { role }),
      verified,
      activated,
      page,
      limit
    });

    const response = await fetch(`${VITE_BACKEND_URL}/users?${params}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch users');
    }

    return await response.json();
  } catch (error) {
    console.error('UsersService error:', error);
    throw error;
  }
};

export const updateUser = async (token, userId, updateData) => {
  const response = await fetch(`${VITE_BACKEND_URL}/users/${userId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(updateData)
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to update user');
  }

  return await response.json();
};