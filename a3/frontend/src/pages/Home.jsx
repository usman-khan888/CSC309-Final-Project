import "./main.css";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

function Home() {
    
    const { user } = useAuth();
    console.log("Current user in Home:", user);

    return (
        <>
            <h2>Welcome To our Website!</h2>
                <div className="row">
                    <Link to="/login">Login</Link>
                    <Link to="/resets">Forgot Password</Link>
                </div>
            
        </>
    );
}

export default Home;
