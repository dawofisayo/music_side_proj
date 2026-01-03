import React from 'react';
import { Music, Github, ListMusic, Sparkles } from 'lucide-react';
import '../App.css';

export default function About() {
  return (
    <div className="about-page">
      <div className="about-container">
        
        {/* Section Header */}
        <div className="about-header">
          <div className="about-header-icon">
            <Music className="about-music-icon" strokeWidth={1.5} />
          </div>
          <h2 className="about-title">
            Tiny Desk Concert
          </h2>
          <p className="about-subtitle">Why I built this and what's next</p>
        </div>

        {/* Genius Lyrics - Origin Story */}
        <div className="about-section about-origin">
          <div className="about-section-header">
            <div className="about-section-icon">
              <span className="about-emoji">🎸</span>
            </div>
            <div>
              <h3 className="about-section-title">Genius Lyrics</h3>
              <p className="about-section-label">Origin Story</p>
            </div>
          </div>
          <p className="about-section-text">
          Inspired by my friends who love music - we'd play guess the sample games in the car or during study breaks. 
          I started with a sample detector, then realized I wanted to build something more. 
          Existing music games felt disconnected, boring, not personal enough, missing that spark. 
          So I decided to build something different - a space where discovering music feels like hanging out with friends who just get your taste.
            SoundCheck is my love letter to music discovery, wrapped in games that I'd get lost in playing.
          </p>
        </div>

        {/* Liner Notes - GitHub & Playlist */}
        <div className="about-liner-notes">
          <div className="about-section-header">
            <div className="about-section-icon">
              <span className="about-emoji">📝</span>
            </div>
            <div>
              <h3 className="about-section-title">Liner Notes</h3>
              <p className="about-section-label">The Credits & Sessions</p>
            </div>
          </div>

          <div className="about-cards-grid">
            {/* GitHub */}
            <div className="about-card about-card-github">
              <div className="about-card-header">
                <div className="about-card-icon">
                  <Github className="about-card-icon-svg" />
                </div>
                <div>
                  <h4 className="about-card-title">Open Source Code</h4>
                  <p className="about-card-label">See How It's Built</p>
                </div>
              </div>
              <p className="about-card-text">
              Built with React and Python - Claude was my pair programmer for the frontend, but the backend logic is all mine. 
              Honestly? This is the trickiest AI project I've ever built by myself. 
              Sometimes the puzzles are a bit off (shoutout crosswords). 
              Still learning! Feel free to peek at the code and see what's happening under the hood.
              </p>
              <a 
                href="https://github.com/dawofisayo/music_side_proj" 
                target="_blank"
                rel="noopener noreferrer"
                className="about-card-button about-button-github"
              >
                <Github className="about-button-icon" />
                <span>View on GitHub</span>
              </a>
            </div>

            {/* Playlist */}
            <div className="about-card about-card-playlist">
              <div className="about-card-header">
                <div className="about-card-icon">
                  <ListMusic className="about-card-icon-svg" />
                </div>
                <div>
                  <h4 className="about-card-title">Documentation</h4>
                  <p className="about-card-label">Development Playlist</p>
                </div>
              </div>
              <p className="about-card-text">
              My 'documentation🤓' playlist - every song I used to test the app while building it. 
              Super allover the place but basically the soundtrack to this whole journey.
              </p>
              <a 
                href="https://open.spotify.com/playlist/1M8l4HNq8g8ABdyFgBSyMI?si=f31ba6bf5dde4891" 
                target="_blank"
                rel="noopener noreferrer"
                className="about-card-button about-button-playlist"
              >
                <ListMusic className="about-button-icon" />
                <span>Listen on Spotify</span>
              </a>
            </div>
          </div>
        </div>

        {/* The Remix - What's Next */}
        <div className="about-section about-remix">
          <div className="about-section-header">
            <div className="about-section-icon">
              <Sparkles className="about-sparkles-icon" />
            </div>
            <div>
              <h3 className="about-section-title">The Remix</h3>
              <p className="about-section-label">Coming Soon (if school doesn't kill me first)</p>
            </div>
          </div>
          
          <div className="about-features-list">
            {/* Feature 1 */}
            <div className="about-feature">
              <div className="about-feature-icon">
                <span className="about-emoji">🎵</span>
              </div>
              <div>
                <h4 className="about-feature-title">Connect Your Spotify</h4>
                <p className="about-feature-text">
                Honestly, this is what I wanted to build from day one - personalized games using your actual Spotify data. Your songs, your genres, your era. 
                But the Anna's Archive scandal happened (hackers got 86 million music files from Spotify a few weeks ago), and now the API is locked down for new apps. 
                Hopefully temporarily.
                </p>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="about-feature">
              <div className="about-feature-icon">
                <span className="about-emoji">👥</span>
              </div>
              <div>
                <h4 className="about-feature-title">Community Features</h4>
                <p className="about-feature-text">
                Social features are next on the list. I want you to be able to challenge friends, compare scores, and make Heardle leaderboards for the most played user-created games. Create Your Own Heardle was just a random idea I threw in, but now I think it's one of the most exciting features to expand on. Maybe even something like FaceMash but for music; except ethical. Submit your favorite songs or artists and let people rank them head-to-head.
                </p>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="about-feature">
              <div className="about-feature-icon">
                <span className="about-emoji">✨</span>
              </div>
              <div>
                <h4 className="about-feature-title">Democratizing Music Research</h4>
                <p className="about-feature-text">
                One of my most ambitious ideas: there's a huge amount of research coming out about using tech to discover and analyze music. 
                Right now tools like this require technical expertise, musical training or orchestration theory to use, and also are pretty unheard of. 
                Making technology like this available to everyday listeners would be SO COOL. 
                My first step is experimenting with <a href="http://www.orch-idea.org/" target="_blank" rel="noopener noreferrer" className="about-link">Orchidea</a> - it's a computer-assisted orchestration framework that can generate musical scores from target sounds (like drops of water, car sounds, or even a person's laugh). 
                Basically, you give it a sound and it figures out what combination of instruments can recreate it. 
                Right now it's used by composers and researchers, but imagine if anyone could play with tools like this. 
                Still figuring out where this goes (or if I'll even have the time), but I'm excited about the possibilities.
                </p>
              </div>
            </div>
          </div>

          {/* CTA
          <div className="about-cta">
            <p className="about-cta-quote">
              "The best way to predict the future is to build it together"
            </p>
            <div className="about-cta-buttons">
              <button className="about-cta-button about-cta-button-primary">
                Request a Feature
              </button>
              <button className="about-cta-button about-cta-button-secondary">
                Join the Discord
              </button>
            </div>
          </div> */}
        </div>

        {/* Footer Note */}
        <div className="about-footer">
          <p className="about-footer-text">
            Built with 💜 Dami
          </p>
        </div>

      </div>
    </div>
  );
}

