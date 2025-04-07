import './form.css';
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

const ChangePassword = () => {
    const { register } = useAuth();
    const [error, setError] = useState("");
    const [data, setData] = useState({
        newpassword: '',
    });

    const handle_change = (e) => {
        const { name, value } = e.target;
        setData({ ...data, [name]: value });
    };

    const handle_submit = (e) => {
        e.preventDefault();
        register(data)
        .then(message => setError(message));
    };

    return <>
        <h2>Change Password</h2>
        <form onSubmit={handle_submit}>
            <label htmlFor="utorid">Utorid:</label>
            <input
                type="text"
                id="utorid"
                name="utorid"
                placeholder='utorid'
                value={data.utorid}
                onChange={handle_change}
                required
            />
            <label htmlFor="password">New Password:</label>
            <input
                type="password"
                id="Password"
                name="Password"
                placeholder='New Password'
                value={data.name}
                onChange={handle_change}
                required
            />

            <label htmlFor="Token">Token:</label>
            <input
                type="text"
                id="Token"
                name="Token"
                placeholder='Token'
                value={data.name}
                onChange={handle_change}
                required
            />
            <div className="btn-container">
                <button type="submit">Register</button>
            </div>
            <p className="error">{error}</p>
        </form>
    </>;
};

export default ChangePassword;