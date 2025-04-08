import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import './form.css';

function EditProfile() {
    const { user, updateUser } = useAuth();
    const [formData, setFormData] = useState({
        name: user?.name || '',
        email: user?.email || '',
        birthday: user?.birthday ? user.birthday.split('T')[0] : ''
    });
    const [avatar, setAvatar] = useState(null);
    const [status, setStatus] = useState({});

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleAvatarChange = (e) => {
        setAvatar(e.target.files[0]);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const result = await updateUser(formData, avatar);
        setStatus(result);
    };

    return (
        <div className="form-container">
            <h2>Edit Profile</h2>
            {status.error && <p className="error">{status.error}</p>}
            {status.success && <p className="success">{status.success}</p>}
            
            <form onSubmit={handleSubmit}>
                <label htmlFor="name">Name:</label>
                <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    minLength="1"
                    maxLength="50"
                />
                
                <label htmlFor="email">Email:</label>
                <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    pattern="^[^@]+@mail\.utoronto\.ca$"
                    title="Must be a valid mail.utoronto.ca email"
                />
                
                <label htmlFor="birthday">Birthday:</label>
                <input
                    type="date"
                    id="birthday"
                    name="birthday"
                    value={formData.birthday}
                    onChange={handleChange}
                />
                
                <label htmlFor="avatar">Profile Picture:</label>
                <input
                    type="file"
                    id="avatar"
                    name="avatar"
                    accept="image/*"
                    onChange={handleAvatarChange}
                />
                
                <button type="submit">Save Changes</button>
            </form>
        </div>
    );
}

export default EditProfile;