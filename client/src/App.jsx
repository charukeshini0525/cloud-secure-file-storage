import { useEffect, useState } from "react";
import "./App.css";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";

function App() {
  const getPage = () => {
    const hash = window.location.hash;

    if (hash === "#login") {
      return "login";
    }

    if (hash === "#signup") {
      return "signup";
    }

    if (hash === "#dashboard") {
      return "dashboard";
    }

    return "home";
  };

  const [page, setPage] = useState(getPage);

  useEffect(() => {
    const handleHashChange = () => {
      setPage(getPage());
    };

    window.addEventListener("hashchange", handleHashChange);

    return () => {
      window.removeEventListener("hashchange", handleHashChange);
    };
  }, []);

  if (page === "login") {
    return <Login />;
  }

  if (page === "signup") {
    return <Signup />;
  }

  if (page === "dashboard") {
    return <Dashboard />;
  }

  return (
    <div className="app">
      <header className="navbar">
        <h2>🔐 SecureCloud</h2>

        <div className="nav-buttons">
          <button onClick={() => (window.location.hash = "login")}>
            Login
          </button>

          <button
            className="signup-btn"
            onClick={() => (window.location.hash = "signup")}
          >
            Sign Up
          </button>
        </div>
      </header>

      <main className="hero">
        <div className="hero-content">
          <h1>
            Secure File Storage
            <br />
            <span>Made Simple.</span>
          </h1>

          <p>
            Store your files securely in the cloud with encryption
            and protected access.
          </p>

          <div className="hero-buttons">
            <button
              className="primary-btn"
              onClick={() => (window.location.hash = "login")}
            >
              Get Started
            </button>

            <button className="secondary-btn">
              Learn More
            </button>
          </div>
        </div>

        <div className="security-card">
          <div className="lock-icon">🔒</div>

          <h3>Your Files. Your Security.</h3>

          <p>
            Your files are protected using secure encryption
            before being stored in the cloud.
          </p>

          <div className="security-item">
            <span>✓</span> Encrypted Storage
          </div>

          <div className="security-item">
            <span>✓</span> Secure Authentication
          </div>

          <div className="security-item">
            <span>✓</span> Private File Access
          </div>
        </div>
      </main>

      <footer>
        <p>
          © 2026 SecureCloud | Cloud-Based Secure File Storage
        </p>
      </footer>
    </div>
  );
}

export default App;