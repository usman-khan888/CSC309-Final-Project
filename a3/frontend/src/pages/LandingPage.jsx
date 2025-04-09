import "./main.css";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

function Home() {
    
    const { user } = useAuth();
    console.log("Current user in Home:", user);

    return (
        <>
            <h2>Welcome{user ? `, ${user.name}` : "!"}</h2>

            {user ? (
                <p>You are logged in as <strong>{user.utorid}</strong>.</p>
            ) : (
                <div className="row">
                    <Link to="/login">Login</Link>
                    <Link to="/register">Register</Link>
                    <Link to="/resets">Forgot Password</Link>
                </div>
            )}
        </>
    );
}

export default Home;
