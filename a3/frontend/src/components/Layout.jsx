import "./Layout.css";
import { Link, Outlet } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import PointsBadge from "../pages/PointsBadge";

const Layout = () => {
    const { user, logout } = useAuth();
    return <>
        <header>
            <Link to="/">Home</Link>
            { user ? (
                <>
                    {(user.role === 'cashier' ||  user.role === 'manager' || user.role === 'superuser')&& (
                        <Link to="/register" className="register-btn">Register New User</Link>
                    )}
                    {user.role === 'regular' && <PointsBadge />}
                    {console.log(user.role)}
                    <Link to="/edit-profile" className="edit-btn">Edit Profile</Link>
                    <Link to="/profile" className="user">{user.utorid}</Link>
                    <a href="#" onClick={logout}>Logout</a>
                </>
            ) : (
                <Link to="/login">Login</Link>
            )}
        </header>
        <main>
            <Outlet />
        </main>
        <footer>
            &copy; CSC309, Winter 2025, Final Project
        </footer>
    </>;
};

export default Layout;