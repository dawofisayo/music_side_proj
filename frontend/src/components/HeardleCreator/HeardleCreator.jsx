import { useState } from 'react';
import SongInput from './SongInput';
import StartTimePicker from './StartTimePicker';
import GameModeSelector from './GameModeSelector';
import ChallengeSetup from './ChallengeSetup';
import PreviewSummary from './PreviewSummary';
import { API_BASE_URL } from '../../config';

// Placeholder components - TODO: implement these
function ProgressBar({ currentStep, totalSteps }) {
  const percentage = (currentStep / totalSteps) * 100;
  return (
    <div style={{ marginBottom: '2rem' }}>
      <div style={{ 
        width: '100%', 
        height: '8px', 
        backgroundColor: 'rgba(255,255,255,0.1)', 
        borderRadius: '4px',
        overflow: 'hidden'
      }}>
        <div style={{
          width: `${percentage}%`,
          height: '100%',
          backgroundColor: '#667eea',
          transition: 'width 0.3s ease'
        }} />
      </div>
      <p style={{ textAlign: 'center', marginTop: '0.5rem', color: 'rgba(255,255,255,0.7)' }}>
        Step {currentStep} of {totalSteps}
      </p>
    </div>
  );
}



function HeardleCreator() {
  // Multi-step form state
  const [step, setStep] = useState(1);
  
  // Heardle configuration state
  const [heardleData, setHeardleData] = useState({
    song: {
      youtubeUrl: '',
      videoId: '',
      title: '',
      artist: '',
      thumbnail: '',
      startTimeSeconds: 0
    },
    gameConfig: {
      mode: 'classic',
      intervals: [1, 2, 4, 7, 11, 16]
    },
    challenge: {
      question: '',
      acceptableAnswers: []
    }
  });

  const updateHeardleData = (updates) => {
    setHeardleData(prev => ({
      ...prev,
      ...updates
    }));
  };

  const nextStep = () => setStep(prev => prev + 1);
  const prevStep = () => setStep(prev => prev - 1);

  return (
    <div className="heardle-creator">
      {/* Progress indicator */}
      <ProgressBar currentStep={step} totalSteps={5} />
      
      {/* Step components */}
      {step === 1 && (
        <SongInput 
          data={heardleData.song}
          onComplete={(songData) => {
            updateHeardleData({ song: songData });
            nextStep();
          }}
        />
      )}
      
      {step === 2 && (
        <StartTimePicker
          videoId={heardleData.song.videoId}
          currentStartTime={heardleData.song.startTimeSeconds}
          onComplete={(startTime) => {
            updateHeardleData({ 
              song: { ...heardleData.song, startTimeSeconds: startTime }
            });
            nextStep();
          }}
          onBack={prevStep}
        />
      )}
      
      {step === 3 && (
  <GameModeSelector
    currentMode={heardleData.gameConfig.mode}
    onComplete={(mode, intervals) => {
      updateHeardleData({
        gameConfig: { mode, intervals }
      });
      nextStep();
    }}
    onBack={prevStep}
  />
)}
      
      {step === 4 && (
        <ChallengeSetup
          songTitle={heardleData.song.title}
          artist={heardleData.song.artist}
          currentChallenge={heardleData.challenge}
          onComplete={(challenge) => {
            updateHeardleData({ challenge });
            nextStep();
          }}
          onBack={prevStep}
        />
      )}
      
      {step === 5 && (
        <PreviewSummary
          heardleData={heardleData}
          onBack={prevStep}
          onCreate={handleCreate}
        />
      )}
    </div>
  );

  async function handleCreate(data) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/heardles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error('Failed to create Heardle');
      }

      const result = await response.json();
      return result; // Returns { id, url }
    } catch (error) {
      throw error;
    }
  }
}

export default HeardleCreator;