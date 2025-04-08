import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext(null);

const VITE_BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

export const AuthProvider = ({ children }) => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);

    // Check authentication status on initial load
    useEffect(() => {
        const token = localStorage.getItem('token');
        console.log("useEffect token on load:", token);
        if (token) {
            fetchUserData(token);
        } else {
            setUser('no user found');
        }
    }, []);

    const fetchUserData = async (token) => {
        console.log("Fetching user data with token:", token);
        try {
            const response = await fetch(`${VITE_BACKEND_URL}/users/me`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                
                const userData = await response.json();
                console.log("User data:", userData);
                setUser(userData.user);
            } else {
                
                const errorData = await response.json().catch(() => ({}));
                console.error("Error fetching user:", errorData);
                localStorage.removeItem('token');
                setUser(null);
            }
        } catch (error) {
            console.error('Failed to fetch user data:', error);
            localStorage.removeItem('token');
            setUser(null);
        }
    };

    const login = async (utorid, password) => {
        try {
            const response = await fetch(`${VITE_BACKEND_URL}/auth/tokens`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ utorid, password })
            });

            if (!response.ok) {
                const errorData = await response.json();
                return errorData.message || 'Login failed';
            }

            const { token } = await response.json();
            console.log("Token received:", token);
            localStorage.setItem('token', token);
            console.log("Token in localStorage:", localStorage.getItem('token'));
            await fetchUserData(token);
            navigate("/profile");
            return null;
        } catch (error) {
            console.error('Login error:', error);
            return 'Network error occurred';
        }
    };

    const register = async ({ utorid, name, email}) => {
        try {
            const response = await fetch(`${VITE_BACKEND_URL}/users`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ utorid, name, email })
            });

            if (!response.ok) {
                const errorData = await response.json();
                return errorData.message || 'Registration failed';
            }

            navigate("/changepassword");
            return null;
        } catch (error) {
            console.error('Registration error:', error);
            return 'Network error occurred';
        }
    };

    const resettoken = async ({ utorid }) => {
        try {
            const response = await fetch(`${VITE_BACKEND_URL}/auth/resets`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ utorid })
            });
    
            const data = await response.json();
            console.log("Full response data:", data); // Debug log
    
            if (!response.ok) {
                return { error: data.error || 'Failed to get token' };
            }
            
            // Return both token and expiresAt to use in the UI
            return { 
                token: data.resetToken,  // Map resetToken → token
                expiresAt: data.expiresAt
            };
    
        } catch (error) {
            console.error('Error:', error);
            return { error: 'Network error' };
        }
    };

    const changePasswordWithToken = async (resetToken, { utorid, password }) => {
        console.log("new password set: ", password)
        try {
            const response = await fetch(`${VITE_BACKEND_URL}/auth/resets/${resetToken}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ utorid, password }),
            });
    
            const data = await response.json();
            if (!response.ok) {
                // Handle specific error cases
                if (response.status === 410) {
                    return { error: 'Token expired - please request a new reset link' };
                } else if (response.status === 401 || response.status === 404) {
                    return { error: data.error || 'Invalid token or user' };
                } else if (response.status === 400) {
                    return { error: data.error || 'Invalid input' };
                }
                return { error: data.error || 'Password reset failed' };
            }
    
            return { success: data.message || 'Password reset successfully' };
            
        } catch (error) {
            console.error('Password reset error:', error);
            return { error: 'Network error - please try again' };
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        setUser(null);
        navigate("/");
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, register, resettoken,  changePasswordWithToken}}>
            {children}
        </AuthContext.Provider>
    );
};

export function useAuth() {
    return useContext(AuthContext);
}