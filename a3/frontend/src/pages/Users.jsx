import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { fetchUsers } from '../services/UsersService';
import Layout from '../components/Layout';

const Users = () => {
  const { user } = useAuth();
  const [usersData, setUsersData] = useState({ count: 0, results: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    name: '', 
    role: '', 
    verified: true, 
    activated: true,
    page: 1, 
    limit: 10 
  });

  useEffect(() => {
    const loadUsers = async () => {
      try {
        setLoading(true);
        //const token = localStorage.getItem('token');
        //if (!token) throw new Error('Authentication required');
        const token = 'dummy-token'; // override actual token for now


        
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
    setFilters(prev => ({ ...prev, ...newFilters, page: 1 })); // Reset to page 1 when filters change
  };

  //if (loading) return <div>Loading users...</div>;
  if (error) return <div className="text-red-500">Error: {error}</div>;

  return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Users ({usersData.count})</h1>
        
        {/* Filter Controls */}
        <div className="bg-white p-4 rounded-lg shadow mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">User Name</label>
            <input
              type="text"
              className="w-full p-2 border rounded"
              onChange={(u) => handleFilterChange({ name: u.target.value })}
              placeholder="Search Users..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Role</label>
            <input
              type="text"
              className="w-full p-2 border rounded"
              onChange={(u) => handleFilterChange({ role: u.target.value })}
              placeholder="Filter by role"
            />
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="showVerified"
              className="mr-2"
              checked={filters.showVerified}
              onChange={(e) => handleFilterChange({ showVerified: e.target.checked })}
            />
            <label htmlFor="showVerified">Show verified</label>
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="showActivated"
              className="mr-2"
              checked={filters.showActivated}
              onChange={(e) => handleFilterChange({ showActivated: e.target.checked })}
            />
            <label htmlFor="showActivated">Show Activated</label>
          </div>
        </div>

        {/* Users List */}
        {usersData.results.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No users found matching your criteria</p>
          </div>
        ) : (
          <>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {usersData.results.map(usr => (
                <div key={usr.id} className="border rounded-lg p-4 shadow hover:shadow-md transition-shadow">
                  <h2 className="text-xl font-semibold mb-2">{usr.name}</h2>
                  <p className="text-gray-600 mb-2">{usr.location}</p>
                  <div className="text-sm text-gray-500 space-y-1">
                    <p>Name: {usr.name}</p>
                    <p>Role: {usr.role}</p>
                    <p>Verified: {usr.verified}</p>
                    <p>Activated: {usr.activated}</p>
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
                  className="px-4 py-2 border rounded disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="px-4 py-2">
                  Page {filters.page} of {Math.ceil(usersData.count / filters.limit)}
                </span>
                <button
                  onClick={() => setFilters(prev => ({ ...prev, page: prev.page + 1 }))}
                  disabled={filters.page >= Math.ceil(usersData.count / filters.limit)}
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

export default Users;