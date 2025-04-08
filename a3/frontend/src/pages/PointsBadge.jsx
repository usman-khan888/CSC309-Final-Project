import { useAuth } from "../contexts/AuthContext";

const PointsBadge = () => {
    const { user } = useAuth();
    
    if (!user || user.role !== 'regular') {
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