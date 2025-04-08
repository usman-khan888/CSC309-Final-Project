import { useState } from 'react';

const AddOrganizerModal = ({ event, onClose, onSuccess, backendUrl }) => {
  const [utorid, setUtorid] = useState('');
  const [error, setError] = useState(''); // Make sure this line exists
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${backendUrl}/events/${event.id}/organizers`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ utorid }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add organizer');
      }

      setSuccess('Organizer added successfully');
      setTimeout(() => {
        onSuccess();
      }, 1000);
    } catch (err) {
      setError(err.message);
      console.error('Error adding organizer:', err); // Add proper error logging
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Add Organizer to {event.name}</h2>
        
        {error && <div className="text-red-500 mb-4">{error}</div>}
        {success && <div className="text-green-500 mb-4">{success}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">UTORid</label>
            <input
              type="text"
              value={utorid}
              onChange={(e) => setUtorid(e.target.value)}
              className="w-full p-2 border rounded"
              placeholder="Enter UTORid"
              required
            />
          </div>
          
          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded"
            >
              Add Organizer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddOrganizerModal;