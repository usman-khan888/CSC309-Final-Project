import { useAuth } from "../contexts/AuthContext";

const PointsBadge = ({ roleView }) => {
    const { user } = useAuth();

    const canViewPoints = user &&
        ['cashier', 'manager', 'superuser'].includes(user.role) &&
        roleView === 'regular';

    if (!canViewPoints) {
        return null;
    }

    return (
        <div className="points-badge">
            <span className="points-value">{user.points}</span>
            <span className="points-label">Points</span>
        </div>
    );
};

export default PointsBadge;
