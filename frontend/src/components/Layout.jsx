import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import '../App.css';
import './Layout.css';

function Layout({ children }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const location = useLocation();

  const isActive = (path) => {
    // Don't highlight /heardle when on /heardle/:id
    if (path === '/heardle' && location.pathname.startsWith('/heardle/')) {
      return false;
    }
    return location.pathname === path;
  };

  return (
    <div className="App">
      {/* Floating musical notes background effect */}
      <div className="floating-notes" aria-hidden="true">
        <span>♪</span>
        <span>♫</span>
        <span>♪</span>
        <span>♫</span>
        <span>♪</span>
        <span>♫</span>
      </div>
      
      {/* Sidebar Navigation */}
      <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <Link to="/" className="sidebar-logo-link">
            <h1 className="sidebar-logo">🎵 SoundCheck</h1>
          </Link>
          <button 
            className="sidebar-toggle"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? '→' : '←'}
          </button>
        </div>
        
        <nav className="sidebar-nav">
          {/* Discovery Section */}
          <div className="nav-section">
            <h3 className="nav-section-title">Discovery</h3>
            <Link 
              to="/sample-detector"
              className={`nav-item ${isActive('/sample-detector') ? 'active' : ''}`}
            >
              <span className="nav-icon">🎤</span>
              <span className="nav-label">Sample Detector</span>
            </Link>
          </div>
          
          {/* Heardle Section */}
          <div className="nav-section">
            <h3 className="nav-section-title">Heardle</h3>
            <Link 
              to="/heardle"
              className={`nav-item ${isActive('/heardle') ? 'active' : ''}`}
            >
              <span className="nav-icon">🎮</span>
              <span className="nav-label">Classic Heardle</span>
            </Link>
            <Link 
              to="/decade-game"
              className={`nav-item ${isActive('/decade-game') ? 'active' : ''}`}
            >
              <span className="nav-icon">📅</span>
              <span className="nav-label">Decade Game</span>
            </Link>
            <Link 
              to="/country-game"
              className={`nav-item ${isActive('/country-game') ? 'active' : ''}`}
            >
              <span className="nav-icon">🌍</span>
              <span className="nav-label">Country Game</span>
            </Link>
            <Link 
              to="/higher-lower"
              className={`nav-item ${isActive('/higher-lower') ? 'active' : ''}`}
            >
              <span className="nav-icon">📊</span>
              <span className="nav-label">Higher or Lower</span>
            </Link>
            <Link 
              to="/create-heardle"
              className={`nav-item ${isActive('/create-heardle') ? 'active' : ''}`}
            >
              <span className="nav-icon">🎨</span>
              <span className="nav-label">Create Heardle</span>
            </Link>
          </div>
          
          {/* Crossword/Trivia Section */}
          <div className="nav-section">
            <h3 className="nav-section-title">Crossword & Trivia</h3>
            <Link 
              to="/crossword"
              className={`nav-item ${isActive('/crossword') ? 'active' : ''}`}
            >
              <span className="nav-icon">📝</span>
              <span className="nav-label">Music Crossword</span>
            </Link>
            <Link 
              to="/connections"
              className={`nav-item ${isActive('/connections') ? 'active' : ''}`}
            >
              <span className="nav-icon">🔗</span>
              <span className="nav-label">Connections</span>
            </Link>
          </div>
        </nav>
      </aside>
      
      {/* Main Content Area */}
      <main className={`main-content ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <div className="container">
          {children}
        </div>
      </main>
    </div>
  );
}

export default Layout;

