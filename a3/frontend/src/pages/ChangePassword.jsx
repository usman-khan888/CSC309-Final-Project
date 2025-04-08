import './form.css';
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

const ChangePassword = () => {
    const { changePasswordWithToken } = useAuth();
    const [error, setError] = useState("");
    const [data, setData] = useState({
        utorid: '',
        newpassword: '',
        token: ''

    });

    const handle_change = (e) => {
        const { name, value } = e.target;
        setData({ ...data, [name]: value });
    };

    const handle_submit = (e) => {
        e.preventDefault();
    
        const { utorid, newpassword, token } = data;
        changePasswordWithToken(token, { utorid, password: newpassword })
            .then((res) => {
                if (res.error) {
                    setError(res.error);
                } else {
                    setError(res.success); // or show success differently
                }
            });
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
                id="newpassword"
                name="newpassword"
                placeholder='New Password'
                value={data.newpassword}
                onChange={handle_change}
                required
            />

            <label htmlFor="Token">Token:</label>
            <input
                type="text"
                id="token"
                name="token"
                placeholder='token'
                value={data.token}
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