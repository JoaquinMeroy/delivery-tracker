import { useAuth } from "./context/AuthContext";
import CustomerDashboard from "./components/CustomerDashboard";
import RiderDashboard from "./components/RiderDashboard";
import AuthForm from "./components/AuthFrom";
import "./App.css";

function App() {
  const { user, isLoading, logout } = useAuth();

  if (isLoading) {
    return (
      <p style={{ padding: "1rem", fontFamily: "sans-serif" }}>Loading…</p>
    );
  }

  if (!user) {
    return <AuthForm />;
  }

  return (
    <div style={{ padding: "1rem", fontFamily: "sans-serif" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h1>Delivery Tracker</h1>
        <div>
          <span>
            {user.name} ({user.role})
          </span>{" "}
          <button onClick={logout}>Log out</button>
        </div>
      </div>

      {user.role === "rider" ? <RiderDashboard /> : <CustomerDashboard />}
    </div>
  );
}

export default App;
