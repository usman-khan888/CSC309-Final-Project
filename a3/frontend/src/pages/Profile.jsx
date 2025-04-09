import { useAuth } from "../contexts/AuthContext";
import "./main.css";
import { Link } from "react-router-dom";

function Profile() {
    const { user, logout } = useAuth();
    console.log("User in profile:", user);

    const date = new Date(user?.createdAt);
    const options = { hour: 'numeric', minute: 'numeric', hour12: true };
    const pretty_date = date.toLocaleTimeString('en-US', options);

    return <>
        <h3>Hello, {user?.name}!</h3>
        <p>You have been with us since {pretty_date}.</p>
        <div className="row">
            {(user?.role === 'manager' || user?.role === 'superuser') ? (
                <>
                <Link to="/events">View Events</Link>
                <Link to="/users">View Users</Link>
                <Link to="/promotions">View Promotions</Link>
                <Link to="/transactions">View Transactions</Link>
                </>
            ) : null}
            {(user?.role === 'regular') ? (
                <>
                <Link to="/events">View Events</Link>
                <Link to="/promotions">View Promotions</Link>
                <Link to="/transactions">View Transactions</Link>
                </>
            ) : null}
            {(user?.role === 'cashier') ? (
                <>
                <Link to="/events">View Events</Link>
                <Link to="/promotions">View Promotions</Link>
                </>
            ) : null}
            <a href="#" onClick={logout}>Logout</a>
        </div>
    </>;
}

export default Profile;