import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';

function Home() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [notes, setNotes] = useState([]);

  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
      
      // Create floating notes occasionally
      if (Math.random() > 0.95) {
        const note = {
          id: Date.now(),
          x: e.clientX,
          y: e.clientY,
          emoji: ['♪', '♫', '🎵', '🎶'][Math.floor(Math.random() * 4)]
        };
        setNotes(prev => [...prev, note]);
        setTimeout(() => {
          setNotes(prev => prev.filter(n => n.id !== note.id));
        }, 2000);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <>
      {/* Floating Music Notes */}
      <div className="cursor-notes">
        {notes.map(note => (
          <span 
            key={note.id} 
            className="cursor-note"
            style={{ left: note.x, top: note.y }}
          >
            {note.emoji}
          </span>
        ))}
      </div>

      {/* Landing Page Hero Section */}
      <div className="hero-section">
        <h1 className="hero-title">🎵 SoundCheck</h1>
        <p className="hero-subtitle">Your ultimate destination for music discovery, games, and puzzles</p>
        <p className="hero-tagline">Identify songs, test your knowledge, and challenge yourself daily</p>
      </div>

      {/* Feature Cards - Organized by Category */}
      <div className="features-container">
        {/* Discovery Section */}
        <div className="feature-section" style={{ animationDelay: '0.1s' }}>
          <h2 className="section-title">🔍 Music Discovery</h2>
          <div className="features-grid">
            <Link 
              to="/sample-detector"
              className="feature-card featured"
              style={{ '--delay': '0.2s' }}
            >
              <div className="feature-icon">🎤</div>
              <h3 className="feature-title">Sample Detector</h3>
              <p className="feature-badge">✨ First-ever</p>
              <p className="feature-description">
                Identify any song instantly! Record from your mic, upload an audio file, or paste a YouTube link. 
                Discover what samples it uses and what tracks sampled it - powered by WhoSampled.
              </p>
              <div className="feature-highlight">
                <span>🎙️ Live Recording</span>
                <span>📁 File Upload</span>
                <span>🔗 YouTube Support</span>
                <span>🎼 Sample Info</span>
              </div>
            </Link>
          </div>
        </div>

        {/* Daily Puzzles Section */}
        <div className="feature-section" style={{ animationDelay: '0.3s' }}>
          <h2 className="section-title">🧩 Daily Puzzles</h2>
          <div className="features-grid">
            <Link 
              to="/crossword"
              className="feature-card"
              style={{ '--delay': '0.4s' }}
            >
              <div className="feature-icon">📝</div>
              <h3 className="feature-title">Music Crossword</h3>
              <p className="feature-badge">🤖 AI Generated</p>
              <p className="feature-description">
                Fresh music crosswords every day! Each puzzle focuses on a different artist, era, or genre. 
                Get instant feedback on your answers with letter-by-letter checking.
              </p>
              <div className="feature-highlight">
                <span>📅 Daily Puzzles</span>
                <span>🎨 Unique Themes</span>
                <span>✅ Instant Feedback</span>
                <span>🧠 AI Powered</span>
              </div>
            </Link>

            <Link 
              to="/connections"
              className="feature-card"
              style={{ '--delay': '0.5s' }}
            >
              <div className="feature-icon">🔗</div>
              <h3 className="feature-title">Connections</h3>
              <p className="feature-badge">🎯 Music Edition</p>
              <p className="feature-description">
                Group 16 music-related items into 4 categories of 4. Test your music knowledge 
                and find the hidden connections between songs, artists, and albums.
              </p>
              <div className="feature-highlight">
                <span>🎵 Music Focused</span>
                <span>🧩 4 Categories</span>
                <span>💡 Smart Hints</span>
                <span>📅 Daily Challenge</span>
              </div>
            </Link>
          </div>
        </div>

        {/* Heardle Games Section */}
        <div className="feature-section" style={{ animationDelay: '0.6s' }}>
          <h2 className="section-title">🎮 Heardle Games</h2>
          <div className="features-grid">
            <Link 
              to="/heardle"
              className="feature-card"
              style={{ '--delay': '0.7s' }}
            >
              <div className="feature-icon">🎵</div>
              <h3 className="feature-title">Classic Heardle</h3>
              <p className="feature-badge">🎯 Original</p>
              <p className="feature-description">
                The classic music guessing game! Listen to a song snippet and guess the track. 
                You get more time with each wrong guess. How many can you get right?
              </p>
              <div className="feature-highlight">
                <span>⏱️ Progressive Reveals</span>
                <span>🎧 Audio Clips</span>
                <span>🏆 Score Tracking</span>
              </div>
            </Link>

            <Link 
              to="/decade-game"
              className="feature-card"
              style={{ '--delay': '0.8s' }}
            >
              <div className="feature-icon">📅</div>
              <h3 className="feature-title">Decade Game</h3>
              <p className="feature-badge">🕰️ Time Challenge</p>
              <p className="feature-description">
                Listen to a song and guess which decade it's from. Test your knowledge of music history 
                from the 1960s to the 2020s!
              </p>
              <div className="feature-highlight">
                <span>📆 7 Decades</span>
                <span>🎵 Random Songs</span>
                <span>⏯️ 3 Plays</span>
              </div>
            </Link>

            <Link 
              to="/country-game"
              className="feature-card"
              style={{ '--delay': '0.9s' }}
            >
              <div className="feature-icon">🌍</div>
              <h3 className="feature-title">Country Game</h3>
              <p className="feature-badge">🗺️ Geography</p>
              <p className="feature-description">
                Guess which country a song is from! Challenge yourself with music from around the world 
                and expand your global music knowledge.
              </p>
              <div className="feature-highlight">
                <span>🌎 Global Music</span>
                <span>🎯 Country Guessing</span>
                <span>📊 Score Tracking</span>
              </div>
            </Link>

            <Link 
              to="/higher-lower"
              className="feature-card"
              style={{ '--delay': '1s' }}
            >
              <div className="feature-icon">📊</div>
              <h3 className="feature-title">Higher or Lower</h3>
              <p className="feature-badge">📈 YouTube Views</p>
              <p className="feature-description">
                Guess which song has more YouTube views! Compare two tracks and see how long you can 
                keep your streak going. Test your knowledge of viral hits!
              </p>
              <div className="feature-highlight">
                <span>📺 YouTube Stats</span>
                <span>🔥 Streak Mode</span>
                <span>📊 Live Data</span>
              </div>
            </Link>

            <Link 
              to="/create-heardle"
              className="feature-card"
              style={{ '--delay': '1.1s' }}
            >
              <div className="feature-icon">🎨</div>
              <h3 className="feature-title">Create Heardle</h3>
              <p className="feature-badge">✨ Custom</p>
              <p className="feature-description">
                Create your own custom Heardle challenge! Choose any song, set the start time, 
                configure game modes, and share it with friends. Make your own music quiz!
              </p>
              <div className="feature-highlight">
                <span>🎵 Any Song</span>
                <span>⚙️ Custom Settings</span>
                <span>🔗 Shareable Links</span>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

export default Home;

