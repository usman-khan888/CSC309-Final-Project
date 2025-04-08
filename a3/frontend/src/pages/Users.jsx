import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { fetchUsers, updateUser } from '../services/UsersService';
import Layout from '../components/Layout';

const Users = () => {
  const { user } = useAuth();
  const [usersData, setUsersData] = useState({ count: 0, results: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [filters, setFilters] = useState({
    name: '', 
    role: '', 
    verified: null,
    activated: true,
    page: 1, 
    limit: 10 
  });

  useEffect(() => {
    const loadUsers = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        if (!token) throw new Error('Authentication required');
        
        const data = await fetchUsers(token, filters);
        setUsersData(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, [filters]);

  const handleFilterChange = (newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters, page: 1 }));
  };

  const handleUpdateUser = async (userId, updateData) => {
    try {
      setError('');
      setSuccess('');
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Authentication required');
      
      await updateUser(token, userId, updateData);
      setSuccess('User updated successfully');
      
      // Refresh the user list
      const data = await fetchUsers(token, filters);
      setUsersData(data);
    } catch (err) {
      setError(err.message);
    }
  };

  if (error) return <div className="text-red-500">Error: {error}</div>;

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Users ({usersData.count})</h1>
      
      {success && <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">{success}</div>}
      
      {/* Enhanced Filter Controls */}
      <div className="bg-white p-4 rounded-lg shadow mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Search Users</label>
          <input
            type="text"
            className="w-full p-2 border rounded"
            value={filters.name}
            onChange={(e) => handleFilterChange({ name: e.target.value })}
            placeholder="Search by name or UTORid..."
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Role</label>
          <select
            className="w-full p-2 border rounded"
            value={filters.role}
            onChange={(e) => handleFilterChange({ role: e.target.value })}
          >
            <option value="">All Roles</option>
            <option value="regular">Regular</option>
            <option value="cashier">Cashier</option>
            <option value="manager">Manager</option>
            <option value="superuser">Superuser</option>
          </select>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="verified"
              className="mr-2"
              checked={filters.verified === true}
              onChange={(e) => handleFilterChange({ verified: e.target.checked || null })}
            />
            <label htmlFor="verified">Verified Only</label>
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="activated"
              className="mr-2"
              checked={filters.activated}
              onChange={(e) => handleFilterChange({ activated: e.target.checked })}
            />
            <label htmlFor="activated">Active Only</label>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Results per page</label>
          <select
            className="w-full p-2 border rounded"
            value={filters.limit}
            onChange={(e) => handleFilterChange({ limit: Number(e.target.value) })}
          >
            <option value="10">10</option>
            <option value="25">25</option>
            <option value="50">50</option>
          </select>
        </div>
      </div>

      {/* Users List */}
      {loading ? (
        <div className="text-center py-8">
          <p>Loading users...</p>
        </div>
      ) : usersData.results.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">No users found matching your criteria</p>
        </div>
      ) : (
        <>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {usersData.results.map(usr => (
              <div key={usr.id} className="border rounded-lg p-4 shadow hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-xl font-semibold mb-1">{usr.name}</h2>
                    <p className="text-gray-600 text-sm mb-2">@{usr.utorid}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    usr.role === 'regular' ? 'bg-gray-200' :
                    usr.role === 'cashier' ? 'bg-blue-200 text-blue-800' :
                    usr.role === 'manager' ? 'bg-purple-200 text-purple-800' :
                    'bg-yellow-200 text-yellow-800'
                  }`}>
                    {usr.role}
                  </span>
                </div>

                <div className="text-sm text-gray-600 space-y-1 mt-2">
                  <p className="truncate">{usr.email}</p>
                  <div className="flex items-center">
                    <span className={`w-2 h-2 rounded-full mr-2 ${
                      usr.verified ? 'bg-green-500' : 'bg-gray-400'
                    }`}></span>
                    {usr.verified ? 'Verified' : 'Unverified'}
                  </div>
                  <div className="flex items-center">
                    <span className={`w-2 h-2 rounded-full mr-2 ${
                      usr.suspicious ? 'bg-red-500' : 'bg-gray-400'
                    }`}></span>
                    {usr.suspicious ? 'Suspicious' : 'Normal status'}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-4 flex flex-wrap gap-2">
                  {/* Verify Button */}
                  {(user?.role === 'manager' || user?.role === 'superuser') && !usr.verified && (
                    <button
                      onClick={() => handleUpdateUser(usr.id, { verified: true })}
                      className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm transition"
                    >
                      Verify User
                    </button>
                  )}

                  {/* Suspicious Dropdown - Only for cashiers */}
                  {(user?.role === 'manager' || user?.role === 'superuser') && usr.role === 'cashier' && (
                    <select
                      value={usr.suspicious ? 'true' : 'false'}
                      onChange={(e) => handleUpdateUser(usr.id, { suspicious: e.target.value === 'true' })}
                      className="border rounded px-2 py-1 text-sm bg-white"
                    >
                      <option value="false">Normal Status</option>
                      <option value="true">Mark as Suspicious</option>
                    </select>
                  )}

                  {/* Role Change Dropdown */}
                  {(user?.role === 'manager' || user?.role === 'superuser') && (
                    <select
                      value={usr.role}
                      onChange={(e) => handleUpdateUser(usr.id, { role: e.target.value })}
                      className="border rounded px-2 py-1 text-sm bg-white"
                    >
                      <option value="regular">Regular</option>
                      <option value="cashier">Cashier</option>
                      {user?.role === 'superuser' && (
                        <>
                          <option value="manager">Manager</option>
                          <option value="superuser">Superuser</option>
                        </>
                      )}
                    </select>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {usersData.count > filters.limit && (
            <div className="flex justify-center mt-8 space-x-2">
              <button
                onClick={() => setFilters(prev => ({ ...prev, page: prev.page - 1 }))}
                disabled={filters.page === 1}
                className="px-4 py-2 border rounded disabled:opacity-50 hover:bg-gray-100 transition"
              >
                Previous
              </button>
              <span className="px-4 py-2">
                Page {filters.page} of {Math.ceil(usersData.count / filters.limit)}
              </span>
              <button
                onClick={() => setFilters(prev => ({ ...prev, page: prev.page + 1 }))}
                disabled={filters.page >= Math.ceil(usersData.count / filters.limit)}
                className="px-4 py-2 border rounded disabled:opacity-50 hover:bg-gray-100 transition"
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

export default Users;