import "./Layout.css";
import { Link, Outlet } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import PointsBadge from "../pages/PointsBadge";
import { useEffect, useState } from "react";
import { transferPoints } from "../services/TransactionsService";

const Layout = () => {
    const { user, logout } = useAuth();
    const [showTransferForm, setShowTransferForm] = useState(false);
    const [recipientUtorid, setRecipientUtorid] = useState("");
    const [amount, setAmount] = useState("");
    const [remark, setRemark] = useState("");
    const [transferError, setTransferError] = useState("");
    const [transferSuccess, setTransferSuccess] = useState("");
    
    useEffect(() => {
        if (user && user.role === undefined) {
            logout();
        }
    }, [user, logout]);

    const handleTransfer = async (e) => {
        e.preventDefault();
        setTransferError("");
        setTransferSuccess("");
    
        try {
            const response = await transferPoints(
                user.token, // Make sure this is the correct token property
                recipientUtorid, 
                amount, 
                remark
            );
            setTransferSuccess(`Successfully transferred ${amount} points to ${recipientUtorid}`);
            // Reset form
            setRecipientUtorid("");
            setAmount("");
            setRemark("");
            setShowTransferForm(false);
        } catch (error) {
            setTransferError(error.message);
        }
    };

    return <>
        <header>
            <Link to="/">Home</Link>
            { user && user.role !== undefined ? (
                <>
                    {(user.role === 'cashier' || user.role === 'manager' || user.role === 'superuser') && (
                        <Link to="/register" className="register-btn">Register New User</Link>
                    )}
                    {user.role === 'regular' && (
                        <>
                            <PointsBadge />
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
            <Outlet />
        </main>
        <footer>
            &copy; CSC309, Winter 2025, Final Project
        </footer>
    </>;
};

export default Layout;