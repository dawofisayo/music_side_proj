import { useState } from 'react';
import './ChallengeSetup.css';

function ChallengeSetup({ songTitle, artist, currentChallenge, onComplete, onBack }) {
  // Question templates
  const questionTemplates = [
    "Name this song",
    "Who's the artist?",
    "Name the song and artist",
    "What song is this?",
    "Name this track",
  ];

  const [questionType, setQuestionType] = useState(
    currentChallenge?.question || questionTemplates[0]
  );
  const [customQuestion, setCustomQuestion] = useState('');
  const [useCustomQuestion, setUseCustomQuestion] = useState(false);

  const [answers, setAnswers] = useState(
    currentChallenge?.acceptableAnswers?.length > 0 
      ? currentChallenge.acceptableAnswers 
      : ['']
  );
  const [error, setError] = useState('');

  const updateAnswer = (index, value) => {
    const newAnswers = [...answers];
    newAnswers[index] = value;
    setAnswers(newAnswers);
  };

  const addAnswer = () => {
    setAnswers([...answers, '']);
  };

  const removeAnswer = (index) => {
    if (answers.length > 1) {
      setAnswers(answers.filter((_, i) => i !== index));
    }
  };

  const handleContinue = () => {
    const question = useCustomQuestion ? customQuestion : questionType;
    const validAnswers = answers.filter(a => a.trim().length > 0);

    if (!question.trim()) {
      setError('Pick a question or write your own');
      return;
    }

    if (validAnswers.length === 0) {
      setError('Add at least one acceptable answer');
      return;
    }

    setError('');
    onComplete({
      question: question.trim(),
      acceptableAnswers: validAnswers
    });
  };

  return (
    <div className="challenge-setup-v2">
      <h2>❓ What's the challenge?</h2>

      {/* Question Selection */}
      <div className="question-section">
        <label className="section-label">Pick your question:</label>
        
        <div className="question-options">
          {questionTemplates.map((template, i) => (
            <button
              key={i}
              className={`question-chip ${!useCustomQuestion && questionType === template ? 'selected' : ''}`}
              onClick={() => {
                setQuestionType(template);
                setUseCustomQuestion(false);
              }}
            >
              {template}
            </button>
          ))}
          
          <button
            className={`question-chip ${useCustomQuestion ? 'selected' : ''}`}
            onClick={() => setUseCustomQuestion(true)}
          >
            ✏️ Write your own
          </button>
        </div>

        {useCustomQuestion && (
          <input
            type="text"
            placeholder="Type your custom question..."
            value={customQuestion}
            onChange={(e) => setCustomQuestion(e.target.value)}
            className="custom-question-input"
            autoFocus
          />
        )}
      </div>

      {/* Answer Input */}
      <div className="answers-section">
        <label className="section-label">What answers will you accept?</label>
        <p className="helper">Add all the ways players can correctly answer. They only need to match one.</p>

        <div className="answer-inputs">
          {answers.map((answer, index) => (
            <div key={index} className="answer-row">
              <div className="answer-number">{index + 1}</div>
              <input
                type="text"
                placeholder={
                  index === 0 ? 'e.g., Smooth Criminal' :
                  index === 1 ? 'e.g., Michael Jackson' :
                  'e.g., alternative spelling, nickname...'
                }
                value={answer}
                onChange={(e) => updateAnswer(index, e.target.value)}
                className="answer-input"
              />
              {answers.length > 1 && (
                <button
                  onClick={() => removeAnswer(index)}
                  className="remove-btn"
                  type="button"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>

        <button onClick={addAnswer} className="add-answer-btn">
          + Add Another Answer
        </button>

        <div className="answer-tip">
          💡 <strong>Tip:</strong> Add multiple versions (song title, artist name, both together) so players have flexibility
        </div>
      </div>

      {/* Preview */}
      <div className="preview-section">
        <div className="preview-label">Preview:</div>
        <div className="preview-content">
          <div className="preview-question">
            "{useCustomQuestion ? customQuestion || '...' : questionType}"
          </div>
          <div className="preview-answers">
            {answers.filter(a => a.trim()).length > 0 ? (
              <>
                ✓ Will accept: {answers.filter(a => a.trim()).map(a => `"${a}"`).join(', ')}
              </>
            ) : (
              <span style={{ color: '#999' }}>No answers yet</span>
            )}
          </div>
        </div>
      </div>

      {error && <div className="error-message">⚠️ {error}</div>}

      <div className="actions">
        <button onClick={onBack} className="back-btn">← Back</button>
        <button onClick={handleContinue} className="continue-btn">Continue →</button>
      </div>
    </div>
  );
}

export default ChallengeSetup;