import { Link } from 'react-router-dom';

function Home() {
  return (
    <>
      {/* Landing Page Hero Section */}
      <div className="hero-section">
        <h1 className="hero-title">🎵 SoundCheck</h1>
        <p className="hero-subtitle">Everything I thought I could build for music discovery and games</p>
      </div>

      {/* Feature Cards */}
      <div className="features-grid">
        <Link 
          to="/sample-detector"
          className="feature-card"
        >
          <div className="feature-icon">🎤</div>
          <h3 className="feature-title">Live Sample Detector</h3>
          <p className="feature-badge">✨ First Ever</p>
          <p className="feature-description">
            Figure out what song you're hearing by recording, uploading, or dropping a YouTube link. 
            See what samples it uses and what other tracks sampled it.
          </p>
          <div className="feature-highlight">
            <span>🔴 Live</span>
            <span>🎼 Sample Detection</span>
            <span>🔗 YouTube Support</span>
          </div>
        </Link>

        <Link 
          to="/crossword"
          className="feature-card"
        >
          <div className="feature-icon">📝</div>
          <h3 className="feature-title">Daily Music Crosswords</h3>
          <p className="feature-badge">🤖 AI Generated</p>
          <p className="feature-description">
            Fresh music crosswords every day, made by AI. 
            Each one focuses on a different artist, era, or genre.
          </p>
          <div className="feature-highlight">
            <span>📅 Daily Puzzles</span>
            <span>🎨 Unique Themes</span>
            <span>🧠 AI Powered</span>
          </div>
        </Link>

        <Link 
          to="/heardle"
          className="feature-card"
        >
          <div className="feature-icon">🎮</div>
          <h3 className="feature-title">Heardle Variations</h3>
          <p className="feature-badge">🎯 Multiple Modes</p>
          <p className="feature-description">
            See how well you know your music with different game modes: 
            Classic Heardle, Decade Game, Country Game, and Higher or Lower.
          </p>
          <div className="feature-highlight">
            <span>🎵 Classic Heardle</span>
            <span>📅 Decade Game</span>
            <span>🌍 Country Game</span>
            <span>📊 Higher or Lower</span>
          </div>
        </Link>
      </div>
    </>
  );
}

export default Home;

