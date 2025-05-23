//This file was generated by ChatGPT
import './form.css';
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

const Register = () => {
    const { register } = useAuth();
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
        register(data)
        .then(message => setError(message));
    };

    return <>
        <h2>Registration</h2>
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
            <label htmlFor="name">Name:</label>
            <input
                type="text"
                id="name"
                name="name"
                placeholder='name'
                value={data.name}
                onChange={handle_change}
                required
            />
            <label htmlFor="email">Email:</label>
            <input
                type="text"
                id="email"
                name="email"
                placeholder='email'
                value={data.email}
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

export default Register;