import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import SampleDetector from './pages/SampleDetector';
import Heardle from './components/Heardle';
import Crossword from './components/Crossword';
import DecadeGame from './components/Heardles/DecadeGame';
import CountryGame from './components/Heardles/CountryGame';
import HigherLowerViews from './components/HigherLower/HigherLowerViews';
import Connections from './components/Connections/Connections';
import HeardleCreator from './components/HeardleCreator/HeardleCreator';
import PlayHeardle from './pages/PlayHeardle';

function App() {
  return (
    <Routes>
      {/* Play Heardle route (no layout) */}
      <Route path="/heardle/:id" element={<PlayHeardle />} />
      
      {/* All other routes with Layout */}
      <Route path="/" element={<Layout><Home /></Layout>} />
      <Route path="/sample-detector" element={<Layout><SampleDetector /></Layout>} />
      <Route path="/heardle" element={<Layout><Heardle /></Layout>} />
      <Route path="/decade-game" element={<Layout><DecadeGame /></Layout>} />
      <Route path="/country-game" element={<Layout><CountryGame /></Layout>} />
      <Route path="/higher-lower" element={<Layout><HigherLowerViews /></Layout>} />
      <Route path="/crossword" element={<Layout><Crossword /></Layout>} />
      <Route path="/connections" element={<Layout><Connections /></Layout>} />
      <Route path="/create-heardle" element={<Layout><HeardleCreator /></Layout>} />
    </Routes>
  );
}

export default App;
