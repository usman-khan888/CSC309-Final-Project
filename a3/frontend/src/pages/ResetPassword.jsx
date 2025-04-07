import './form.css';
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

const ResetPassword = () => {
    const { resettoken } = useAuth();
    const [error, setError] = useState("");
    const [data, setData] = useState({
        utorid: '',
        name: '',
        email: '',
    });

    const handle_change = (e) => {
        const { name, value } = e.target;
        setData({ ...data, [name]: value });
    };

    const handle_submit = (e) => {
        e.preventDefault();
        resettoken(data)
        .then(message => setError(message));
    };

    return <>
        <h2>Reset Password</h2>
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
            <div className="btn-container">
                <button type="submit">Send Token</button>
            </div>
            <p className="error">{error}</p>
        </form>
    </>;
};

export default ResetPassword;