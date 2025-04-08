import './form.css';
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const ResetPassword = () => {
    const { resettoken } = useAuth();
    const navigate = useNavigate();
    const [error, setError] = useState("");
    const [tokenData, setTokenData] = useState({
        token: '',
        expiresAt: ''
    });
    const [formData, setFormData] = useState({
        utorid: '',
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        
        try {
            const result = await resettoken(formData);
            console.log("API Response:", result); // Debug log
            
            if (result.error) {
                setError(result.error);
                setTokenData({ token: '', expiresAt: '' });
            } else {
                setTokenData({
                    token: result.resetToken || result.token, // Handles both cases
                    expiresAt: result.expiresAt
                });
            }
        } catch (err) {
            console.error("Submission error:", err);
            setError("Failed to process request");
        }
    };

    const handleNavigate = () => {
        navigate('/changepassword', {
            state: {
                token: tokenData.token,
                expiresAt: tokenData.expiresAt
            }
        });
    };

    return (
        <div className="reset-password-container">
            <h2>Reset Password</h2>
            <form onSubmit={handleSubmit}>
                <label htmlFor="utorid">UTORid:</label>
                <input
                    type="text"
                    id="utorid"
                    name="utorid"
                    value={formData.utorid}
                    onChange={handleChange}
                    required
                    placeholder="Enter your UTORid"
                />
                
                <button type="submit" className="submit-btn">
                    Get Token
                </button>

                {error && <p className="error-message">{error}</p>}
            </form>

            {tokenData.token && (
                <div className="token-display">
                    <h3>Reset Token Generated</h3>
                    <div className="token-info">
                        <p><strong>Token:</strong> {tokenData.token}</p>
                        <p><strong>Expires:</strong> {new Date(tokenData.expiresAt).toLocaleString()}</p>
                    </div>
                    
                    <button 
                        onClick={handleNavigate}
                        className="proceed-btn"
                    >
                        Proceed to Password Change
                    </button>
                </div>
            )}
        </div>
    );
};

export default ResetPassword;