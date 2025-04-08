import { useAuth } from "../contexts/AuthContext";
import "./main.css";
import { Link } from "react-router-dom";

function Profile() {
    const { user, logout } = useAuth();
    console.log("User in profile:", user); // 👈 Add this

    const date = new Date(user?.createdAt);
    const options = { hour: 'numeric', minute: 'numeric', hour12: true };
    const pretty_date = date.toLocaleTimeString('en-US', options);

    return <>
        <h3>Hello, {user?.name}!</h3>
        <p>You have been with us since {pretty_date}.</p>
        <div className="row">
            <Link to="/events">View Events</Link>
            <Link to="/users">View Users</Link>
            <a href="#" onClick={logout}>Logout</a>
        </div>
    </>;
}

export default Profile;