import { useState, useEffect } from 'react';

const PromotionForm = ({ promotion, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'automatic',
    startTime: '',
    endTime: '',
    minSpending: '',
    rate: '',
    points: ''
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (promotion) {
      setFormData({
        name: promotion.name,
        description: promotion.description || '',
        type: promotion.type,
        startTime: promotion.startTime.slice(0, 16), // Convert to datetime-local format
        endTime: promotion.endTime.slice(0, 16),
        minSpending: promotion.minSpending || '',
        rate: promotion.rate || '',
        points: promotion.points || ''
      });
    }
  }, [promotion]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const validate = () => {
    const newErrors = {};
    const now = new Date();
    const startTime = new Date(formData.startTime);
    const endTime = new Date(formData.endTime);

    if (!formData.name) newErrors.name = 'Name is required';
    if (!formData.description.trim()) newErrors.description = 'Description is required';
    if (!formData.startTime) newErrors.startTime = 'Start time is required';
    if (!formData.endTime) newErrors.endTime = 'End time is required';
    
    if (formData.startTime && startTime <= now) {
      newErrors.startTime = 'Start time must be in the future';
    }
    
    if (formData.endTime && endTime <= startTime) {
      newErrors.endTime = 'End time must be after start time';
    }

    if (formData.type === 'automatic') {
      if (!formData.minSpending && !formData.rate) {
        newErrors.minSpending = 'For automatic promotions, either min spending or rate is required';
        newErrors.rate = 'For automatic promotions, either min spending or rate is required';
      }
    } else if (formData.type === 'one-time') {
      if (!formData.points) {
        newErrors.points = 'Points are required for one-time promotions';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      const submissionData = {
        ...formData,
        startTime: new Date(formData.startTime).toISOString(),
        endTime: new Date(formData.endTime).toISOString(),
        minSpending: formData.minSpending ? parseFloat(formData.minSpending) : undefined,
        rate: formData.rate ? parseFloat(formData.rate) : undefined,
        points: formData.points ? parseInt(formData.points) : undefined
      };
      onSubmit(submissionData);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md mb-6">
      <h2 className="text-xl font-semibold mb-4">
        {promotion ? 'Edit Promotion' : 'Create New Promotion'}
      </h2>
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium mb-1">Name*</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className={`w-full p-2 border rounded ${errors.name ? 'border-red-500' : ''}`}
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
          </div>

          {/* Description */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">Description*</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              className={`w-full p-2 border rounded ${errors.description ? 'border-red-500' : ''}`}
              rows={3}
            />
            {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description}</p>}
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-medium mb-1">Type*</label>
            <select
              name="type"
              value={formData.type}
              onChange={handleChange}
              className="w-full p-2 border rounded"
            >
              <option value="automatic">Automatic</option>
              <option value="one-time">One-time</option>
            </select>
          </div>

          {/* Start Time */}
          <div>
            <label className="block text-sm font-medium mb-1">Start Time*</label>
            <input
              type="datetime-local"
              name="startTime"
              value={formData.startTime}
              onChange={handleChange}
              className={`w-full p-2 border rounded ${errors.startTime ? 'border-red-500' : ''}`}
            />
            {errors.startTime && <p className="text-red-500 text-xs mt-1">{errors.startTime}</p>}
          </div>

          {/* End Time */}
          <div>
            <label className="block text-sm font-medium mb-1">End Time*</label>
            <input
              type="datetime-local"
              name="endTime"
              value={formData.endTime}
              onChange={handleChange}
              className={`w-full p-2 border rounded ${errors.endTime ? 'border-red-500' : ''}`}
            />
            {errors.endTime && <p className="text-red-500 text-xs mt-1">{errors.endTime}</p>}
          </div>

          {/* Conditional Fields */}
          {formData.type === 'automatic' ? (
            <>
              <div>
                <label className="block text-sm font-medium mb-1">Minimum Spending</label>
                <input
                  type="number"
                  name="minSpending"
                  value={formData.minSpending}
                  onChange={handleChange}
                  step="0.01"
                  min="0"
                  className={`w-full p-2 border rounded ${errors.minSpending ? 'border-red-500' : ''}`}
                  placeholder="0.00"
                />
                {errors.minSpending && <p className="text-red-500 text-xs mt-1">{errors.minSpending}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Rate (points per $)</label>
                <input
                  type="number"
                  name="rate"
                  value={formData.rate}
                  onChange={handleChange}
                  step="0.01"
                  min="0"
                  className={`w-full p-2 border rounded ${errors.rate ? 'border-red-500' : ''}`}
                  placeholder="0.00"
                />
                {errors.rate && <p className="text-red-500 text-xs mt-1">{errors.rate}</p>}
              </div>
            </>
          ) : (
            <div>
              <label className="block text-sm font-medium mb-1">Points*</label>
              <input
                type="number"
                name="points"
                value={formData.points}
                onChange={handleChange}
                min="1"
                className={`w-full p-2 border rounded ${errors.points ? 'border-red-500' : ''}`}
              />
              {errors.points && <p className="text-red-500 text-xs mt-1">{errors.points}</p>}
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end space-x-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border rounded text-gray-700 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            {promotion ? 'Update Promotion' : 'Create Promotion'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PromotionForm;