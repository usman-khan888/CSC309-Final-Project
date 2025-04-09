import { Routes, Route, BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import Register from "./pages/Register";
import Login from "./pages/Login";
import Home from "./pages/Home";
import Layout from "./components/Layout";
import Success from "./pages/Success";
import Profile from "./pages/Profile";
import ResetPassword from "./pages/ResetPassword"
import ChangePassword from "./pages/ChangePassword"
import Events from "./pages/Events"
import Users from "./pages/Users"
import EditProfile from "./pages/EditProfile";
import Promotions from "./pages/Promotions";
import Transactions from "./pages/Transactions";

const MyRoutes = () => {
    return <Routes>
        <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/success" element={<Success />} />
            <Route path="/resets" element={<ResetPassword />} />
            <Route path="/changepassword" element={<ChangePassword />} />
            <Route path="/edit-profile" element={<EditProfile />} />
            <Route path="/events" element={<Events />} />
            <Route path="/users" element={<Users />} />
            <Route path="/promotions" element={<Promotions />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/users/me/transactions" element={<Transactions />} />
            
        </Route>
    </Routes>;
}

function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <MyRoutes />
            </AuthProvider>
        </BrowserRouter>
    );
}

export default App;
