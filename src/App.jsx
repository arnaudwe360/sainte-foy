import { useEffect, useState } from "react";
import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { auth, googleProvider } from "./firebase";
import TombolaModule from "./modules/tombola/TombolaModule";

function GoogleIcon() {
  return (
    <svg className="google-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285f4" d="M21.8 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.6c-.2 1-.8 2.2-1.9 3v2.4h3c1.8-1.7 3.1-4.3 3.1-7.2Z" />
      <path fill="#34a853" d="M12 22c2.5 0 4.6-.8 6.1-2.2l-3-2.4c-.8.5-1.8.8-3.1.8-2.4 0-4.5-1.6-5.2-3.8H3.6v2.4C5.1 19.9 8.3 22 12 22Z" />
      <path fill="#fbbc05" d="M6.8 14.4c-.2-.7-.4-1.5-.4-2.4s.2-1.7.4-2.4V7.2H3.6C2.9 8.6 2.5 10.2 2.5 12s.4 3.4 1.1 4.8l3.2-2.4Z" />
      <path fill="#ea4335" d="M12 5.3c1.4 0 2.6.5 3.6 1.3l2.7-2.7C16.5 2.5 14.5 1.8 12 1.8 8.3 1.8 5.1 3.9 3.6 7.2l3.2 2.4C7.5 6.9 9.6 5.3 12 5.3Z" />
    </svg>
  );
}

const modules = [
  {
    id: "tombola",
    title: "Tombola",
    description: "Designer, numéroter et imprimer des tickets en série.",
    status: "Disponible",
  },
  {
    id: "dossards",
    title: "Dossards",
    description: "Préparer des dossards numérotés pour les événements sportifs.",
    status: "À venir",
  },
  {
    id: "soirees",
    title: "Soirées",
    description: "Gérer invitations, billets et listes de participants.",
    status: "À venir",
  },
];

function LoginScreen({ onLogin, status }) {
  return (
    <main className="login-screen">
      <div className="login-shell">
        <section className="login-card login-left-panel">
          <img className="brand-logo" src="/sainte-foy-logo.jpg" alt="Institution Sainte Foy" />

          <div className="login-content">
            <p className="eyebrow">Institution Sainte Foy</p>
            <h1>
              <span>Portail</span>
              <strong>Sainte-Foy</strong>
            </h1>
            <p>
              Un espace unique pour les services internes de l'école, les
              événements et les opérations de l'établissement.
            </p>

            <button className="primary-button login-button" onClick={onLogin}>
              <GoogleIcon />
              <span>Se connecter avec Google</span>
            </button>

            {status.message ? (
              <p className={`status ${status.type}`} role="alert">
                {status.message}
              </p>
            ) : null}
          </div>
        </section>

        <section className="login-card login-right-panel" aria-label="Aperçu du portail">
          <div className="portal-preview">
            <div className="preview-logo-orbit">
              <img src="/sainte-foy-logo.jpg" alt="" aria-hidden="true" />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function ModuleMenu({ activeModule, onOpenModule }) {
  return (
    <aside className="module-menu" aria-label="Catégories du portail">
      <div className="module-brand">
        <img src="/sainte-foy-logo.jpg" alt="" aria-hidden="true" />
        <div>
          <strong>SAINTE-FOY</strong>
          <span>PORTAIL SERVICES</span>
        </div>
      </div>

      <nav className="module-menu-nav">
        <button className={activeModule === "home" ? "module-menu-item active" : "module-menu-item"} onClick={() => onOpenModule("home")}>
          <div>
            <strong>Dashboard</strong>
          </div>
        </button>

        <div className="menu-section-title">Services</div>
        {modules.map((module) => (
          <button
            className={activeModule === module.id ? "module-menu-item active" : "module-menu-item"}
            disabled={module.id !== "tombola"}
            key={module.id}
            onClick={() => onOpenModule(module.id)}
          >
            <div>
              <strong>{module.title}</strong>
            </div>
          </button>
        ))}
      </nav>

    </aside>
  );
}

function PortalHome({ onOpenModule }) {
  return (
    <section className="portal-home">
      <section className="work-panel">
        <div className="work-panel-head">
          <div>
            <span>Applications</span>
            <h1>Services internes</h1>
          </div>
          <button className="primary-button" onClick={() => onOpenModule("tombola")}>
            Ouvrir Tombola
          </button>
        </div>

        <div className="service-list">
          {modules.map((module) => (
            <button
              className={module.id === "tombola" ? "service-row active" : "service-row disabled"}
              disabled={module.id !== "tombola"}
              key={module.id}
              onClick={() => onOpenModule(module.id)}
            >
              <div>
                <strong>{module.title}</strong>
                <small>{module.description}</small>
              </div>
              <span>{module.status}</span>
            </button>
          ))}
        </div>
      </section>
    </section>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeModule, setActiveModule] = useState("home");
  const [status, setStatus] = useState({ type: "idle", message: "" });

  useEffect(() => {
    return onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
      setActiveModule("home");
    });
  }, []);

  const handleLogin = async () => {
    setStatus({ type: "idle", message: "" });

    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      setStatus({
        type: "error",
        message: `Connexion impossible : ${error.message}`,
      });
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setStatus({ type: "idle", message: "" });
    setActiveModule("home");
  };

  if (authLoading) {
    return (
      <main className="login-screen">
        <section className="loading-card">
          <img src="/sainte-foy-logo.jpg" alt="Institution Sainte Foy" />
          <p>Chargement du portail...</p>
        </section>
      </main>
    );
  }

  if (!user) {
    return <LoginScreen onLogin={handleLogin} status={status} />;
  }

  return (
    <main className="portal-screen">
      <div className="portal-layout">
        <ModuleMenu activeModule={activeModule} onOpenModule={setActiveModule} />

        <div className="portal-main">
          <header className="portal-header">
            <button className="portal-brand portal-brand-button" onClick={() => setActiveModule("home")}>
              <div>
                <span>{activeModule === "tombola" ? "SERVICES / TOMBOLA" : "SERVICES"}</span>
                <strong>{activeModule === "tombola" ? "Tombola" : "Dashboard"}</strong>
              </div>
            </button>

            <div className="user-row">
              <button className="notification-button" aria-label="Notifications">!</button>
              <div>
                <span>Connecté en tant que</span>
                <strong>{user.displayName ?? user.email}</strong>
              </div>
              <button className="ghost-button" onClick={handleLogout}>
                Déconnexion
              </button>
            </div>
          </header>

          {activeModule === "tombola" ? (
            <TombolaModule user={user} onBack={() => setActiveModule("home")} />
          ) : (
            <PortalHome onOpenModule={setActiveModule} />
          )}
        </div>
      </div>
    </main>
  );
}

export default App;
