import { useAuth } from '../contexts/AuthContext';
import './form.css';
import React, { useState } from "react";

function Login() {
    const [utorid, setUtorid] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const { login } = useAuth();

    const handle_submit = (e) => {
        e.preventDefault();
        login(utorid, password)
        .then(message => setError(message));
    };

    return <>
        <h2>Login</h2>
        <form onSubmit={handle_submit}>
            <label htmlFor="utorid">Utorid:</label>
            <input
                type="text"
                id="utorid"
                name="utorid"
                placeholder='Utorid'
                value={utorid}
                onChange={(e) => setUtorid(e.target.value)}
                required
            />
            <label htmlFor="password">Password:</label>
            <input
                type="password"
                id="password"
                name="password"
                placeholder='Password'
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
            />
            <div className="btn-container">
                <button type="submit">Login</button>
            </div>
            <p className="error">{error}</p>
        </form>
    </>;
}

export default Login;
