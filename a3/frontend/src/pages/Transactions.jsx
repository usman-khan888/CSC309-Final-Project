import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { fetchTransactions, fetchUserTransactions } from '../services/TransactionsService';
import Layout from '../components/Layout';

const Transactions = () => {
  const { user } = useAuth();
  const [transactionsData, setTransactionsData] = useState({ count: 0, results: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    name: '',
    createdBy: '',
    suspicious: false,
    promotionId: null,
    type: '',
    relatedId: null,
    amount: null,
    operator: '', 
    page: 1, 
    limit: 10 
  });

  useEffect(() => {
    const loadTransactions = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        if (!token) throw new Error('Authentication required');

        // Check user role to determine which endpoint to use
        let data;
        if (user.role === 'manager' || user.role === 'superuser') {
          data = await fetchTransactions(token, filters);
        } else {
          data = await fetchUserTransactions(token, filters);
        }
        
        setTransactionsData(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadTransactions();
  }, [filters, user?.role]); // Add user.role to dependency array

  const handleFilterChange = (newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters, page: 1 }));
  };

  if (error) return <div className="text-red-500">Error: {error}</div>;

  return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">
          Transactions ({transactionsData.count})
          {(user.role === 'cashier' || user.role === 'regular') && ' (Your Transactions)'}
        </h1>
        
        {/* Filter Controls */}
        <div className="bg-white p-4 rounded-lg shadow mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input
              type="text"
              className="w-full p-2 border rounded"
              onChange={(e) => handleFilterChange({ name: e.target.value })}
              placeholder="Search transactions..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">createdBy</label>
            <input
              type="text"
              className="w-full p-2 border rounded"
              onChange={(e) => handleFilterChange({ createdBy: e.target.value })}
              placeholder="Filter by createdBy"
            />
          </div>
          <div className="flex items-center">
          <input
            type="checkbox"
            id="suspicious"
            className="mr-2"
            checked={filters.suspicious}
            onChange={(e) => handleFilterChange({ suspicious: e.target.checked })}
          />
          <label htmlFor="showFull">Show suspicious transactions</label>
        </div>
        <div>
            <label className="block text-sm font-medium mb-1">promotionId</label>
            <input
              type="number"
              className="w-full p-2 border rounded"
              onChange={(e) => handleFilterChange({ promotionId: e.target.value })}
              placeholder="Filter by promotionId"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">type</label>
            <input
              type="text"
              className="w-full p-2 border rounded"
              onChange={(e) => handleFilterChange({ type: e.target.value })}
              placeholder="Filter by type"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">relatedId</label>
            <input
              type="number"
              className="w-full p-2 border rounded"
              onChange={(e) => handleFilterChange({ relatedId: e.target.value })}
              placeholder="Filter by relatedId"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">amount</label>
            <input
              type="number"
              className="w-full p-2 border rounded"
              onChange={(e) => handleFilterChange({ amount: e.target.value })}
              placeholder="Filter by amount"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">operator</label>
            <input
              type="text"
              className="w-full p-2 border rounded"
              onChange={(e) => handleFilterChange({ operator: e.target.value })}
              placeholder="Filter by operator"
            />
          </div>
        </div>

        {/* transactions List */}
        {transactionsData.results.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No transactions found matching your criteria</p>
          </div>
        ) : (
          <>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {transactionsData.results.map(transaction => (
                <div key={transaction.id} className="border rounded-lg p-4 shadow hover:shadow-md transition-shadow">
                  <h2 className="text-xl font-semibold mb-2">{transaction.user.name}</h2>
                  <div className="text-sm text-gray-500 space-y-1">
                    <p>Created By: {transaction.createdBy}</p>
                    <p>Suspicious: {transaction.suspicious}</p>
                    <p>Promotion Id: {transaction.promotionId}</p>
                    <p>Type: {transaction.type}</p>
                    <p>Related Id: {transaction.relatedId}</p>
                    <p>Amount: {transaction.amount}</p>
                    <p>Operator: {transaction.operator}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {transactionsData.count > filters.limit && (
              <div className="flex justify-center mt-8 space-x-2">
                <button
                  onClick={() => setFilters(prev => ({ ...prev, page: prev.page - 1 }))}
                  disabled={filters.page === 1}
                  className="px-4 py-2 border rounded disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="px-4 py-2">
                  Page {filters.page} of {Math.ceil(transactionsData.count / filters.limit)}
                </span>
                <button
                  onClick={() => setFilters(prev => ({ ...prev, page: prev.page + 1 }))}
                  disabled={filters.page >= Math.ceil(transactionsData.count / filters.limit)}
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

export default Transactions;