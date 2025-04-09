import { useState } from 'react';

const AwardPointsModal = ({ event, guest, onClose, onSuccess }) => {
  const [amount, setAmount] = useState('');
  const [remark, setRemark] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const maxPoints = guest ? event.pointsRemain : Math.floor(event.pointsRemain / (event.guests?.length || 1));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      if (!amount || isNaN(amount) || amount <= 0) {
        throw new Error('Please enter a valid positive number for points');
      }
      
      if (amount > maxPoints) {
        throw new Error(`Cannot award more than ${maxPoints} points`);
      }
      
      await onSuccess({ amount: parseInt(amount), remark });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">
          Award Points for {event.name}
        </h2>
        {guest && (
          <p className="mb-2">
            Awarding to: {guest.name} ({guest.utorid})
          </p>
        )}
        {!guest && (
          <p className="mb-2">
            Awarding to all {event.guests?.length} guests
          </p>
        )}
        
        {error && <div className="text-red-500 mb-4">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">
              Points Amount (Max: {maxPoints})
            </label>
            <input
              type="number"
              className="w-full p-2 border rounded"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="1"
              max={maxPoints}
              required
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Remark (Optional)</label>
            <input
              type="text"
              className="w-full p-2 border rounded"
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder="Optional note"
            />
          </div>
          
          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-purple-500 text-white rounded"
              disabled={loading}
            >
              {loading ? 'Awarding...' : 'Award Points'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AwardPointsModal;