import "./Layout.css";
import { Link, Outlet } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import PointsBadge from "../pages/PointsBadge";
import { useEffect, useState } from "react";
import { transferPoints } from "../services/TransactionsService";

const roleHierarchy = ["regular", "cashier", "manager", "superuser"];

const Layout = () => {
    const { user, logout } = useAuth();
    const [showTransferForm, setShowTransferForm] = useState(false);
    const [recipientUtorid, setRecipientUtorid] = useState("");
    const [amount, setAmount] = useState("");
    const [remark, setRemark] = useState("");
    const [transferError, setTransferError] = useState("");
    const [transferSuccess, setTransferSuccess] = useState("");

    const [roleView, setRoleView] = useState(null); // NEW

    useEffect(() => {
        if (user && user.role === undefined) {
            logout();
        }
        setRoleView(user?.role); // Set default view to actual role
    }, [user, logout]);

    const handleTransfer = async (e) => {
        e.preventDefault();
        setTransferError("");
        setTransferSuccess("");

        const token = localStorage.getItem('token');
        if (!token) {
            setTransferError("No authentication token found. Please log in again.");
            return;
        }

        try {
            const amountNum = parseInt(amount);
            if (isNaN(amountNum) || amountNum <= 0) {
                throw new Error("Amount must be a positive number");
            }

            const response = await transferPoints(token, recipientUtorid, amountNum, remark);
            setTransferSuccess(`Successfully transferred ${amountNum} points to ${recipientUtorid}`);
            setRecipientUtorid("");
            setAmount("");
            setRemark("");
            setShowTransferForm(false);
        } catch (error) {
            if (error.message.includes('not found')) {
                setTransferError(`Recipient ${recipientUtorid} not found`);
            } else if (error.message.includes('expired') || error.message.includes('Invalid')) {
                setTransferError(`${error.message} Please log in again.`);
                logout();
            } else {
                setTransferError(error.message);
            }
        }
    };

    const getViewableRoles = (currentRole) => {
        const currentIndex = roleHierarchy.indexOf(currentRole);
        return roleHierarchy.slice(0, currentIndex + 1); // roles below or equal to current
    };

    return <>
        <header>
            <Link to="/">Home</Link>
            {user && user.role !== undefined ? (
                <>
                    {(user.role === 'cashier' || user.role === 'manager' || user.role === 'superuser') && (
                        <Link to="/register" className="register-btn">Register New User</Link>
                    )}
                    {roleView === 'regular' && (
                        <>
                            <PointsBadge roleView={roleView}/>
                            <button 
                                onClick={() => setShowTransferForm(!showTransferForm)} 
                                className="transfer-btn"
                            >
                                Transfer Points
                            </button>
                        </>
                    )}
                    <Link to="/edit-profile" className="edit-btn">Edit Profile</Link>
                    <Link to="/profile" className="user">{user.utorid}</Link>
                    
                    {/* --- ROLE DROPDOWN BUTTON (visible for cashier and up) --- */}
                    {(user.role !== "regular") && (
                        <div className="role-switcher">
                            <label htmlFor="role-select">View As: </label>
                            <select
                                id="role-select"
                                value={roleView}
                                onChange={(e) => setRoleView(e.target.value)}
                            >
                                {getViewableRoles(user.role).map((r) => (
                                    <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <a href="#" onClick={logout}>Logout</a>
                </>
            ) : (
                <Link to="/login">Login</Link>
            )}
        </header>

        {showTransferForm && (
            <div className="transfer-form-container">
                <form onSubmit={handleTransfer} className="transfer-form">
                    <h3>Transfer Points</h3>
                    {transferError && <div className="transfer-error">{transferError}</div>}
                    {transferSuccess && <div className="transfer-success">{transferSuccess}</div>}
                    <div className="form-group">
                        <label htmlFor="recipient">Recipient UTORid:</label>
                        <input
                            type="text"
                            id="recipient"
                            value={recipientUtorid}
                            onChange={(e) => setRecipientUtorid(e.target.value)}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="amount">Amount:</label>
                        <input
                            type="number"
                            id="amount"
                            min="1"
                            step="1"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="remark">Remark (optional):</label>
                        <input
                            type="text"
                            id="remark"
                            value={remark}
                            onChange={(e) => setRemark(e.target.value)}
                        />
                    </div>
                    <div className="form-actions">
                        <button type="submit" className="submit-btn">Transfer</button>
                        <button 
                            type="button" 
                            className="cancel-btn"
                            onClick={() => {
                                setShowTransferForm(false);
                                setTransferError("");
                                setTransferSuccess("");
                            }}
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        )}

        <main>
            {/* You can pass roleView instead of user.role to children via context if needed */}
            <Outlet />
        </main>
        <footer>
            &copy; CSC309, Winter 2025, Final Project
        </footer>
    </>;
};

export default Layout;
