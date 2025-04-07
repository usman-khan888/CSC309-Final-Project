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
        if (token) {
            fetchUserData(token);
        } else {
            setUser(null);
        }
    }, []);

    const fetchUserData = async (token) => {
        try {
            const response = await fetch(`${VITE_BACKEND_URL}/user/me`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                setUser(data.user);
            } else {
                // Token might be invalid/expired
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
            localStorage.setItem('token', token);
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

    const resettoken = async ({ utorid}) => {
        try {
            const response = await fetch(`${VITE_BACKEND_URL}/auth/resets`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ utorid })
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



    const logout = () => {
        localStorage.removeItem('token');
        setUser(null);
        navigate("/");
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, register, resettoken }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    return useContext(AuthContext);
};