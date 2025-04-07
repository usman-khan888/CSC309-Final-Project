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

const MyRoutes = () => {
    return <Routes>
        <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/success" element={<Success />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/resets" element={<ResetPassword />} />
            <Route path="/changepassword" element={<ChangePassword />} />
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
