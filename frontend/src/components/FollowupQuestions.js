import React, { useState } from 'react';
import './css/FollowupQuestions.css';

function FollowupQuestions({ followupData, category, onChange, onSubmit, onBack }) {
  const [selections, setSelections] = useState({});
  
  if (!followupData || !followupData.follow_up_questions) {
    return (
      <div className="followup-error">
        <h3>Error loading follow-up questions</h3>
        <button onClick={onBack}>Go Back</button>
      </div>
    );
  }
  
  const handleOptionSelect = (questionIndex, option, score) => {
    const newSelections = {
      ...selections,
      [questionIndex]: { option, score }
    };
    setSelections(newSelections);
    onChange(questionIndex, option, score);
  };
  
  const handleSubmit = () => {
    // Check if all questions have been answered
    const allAnswered = followupData.follow_up_questions.every(
      (_, index) => selections[index]
    );
    
    if (allAnswered) {
      onSubmit();
    }
  };
  
  return (
    <div className="followup-container">
      <h3>Follow-Up Questions</h3>
      <p>We need a bit more information to understand your preferences:</p>
      
      {followupData.follow_up_questions.map((fq, qIndex) => (
        <div key={qIndex} className="followup-question">
          <h4>{fq.question}</h4>
          <div className="options-container">
            {fq.options.map((option, oIndex) => (
              <div 
                key={oIndex} 
                className={`option ${selections[qIndex]?.option === option.option ? 'selected' : ''}`}
                onClick={() => handleOptionSelect(qIndex, option.option, option.score)}
              >
                {option.option}
              </div>
            ))}
          </div>
        </div>
      ))}
      
      <div className="button-group">
        <button className="back-button" onClick={onBack}>
          ← Back
        </button>
        <button 
          className="next-button" 
          onClick={handleSubmit}
          disabled={followupData.follow_up_questions.length !== Object.keys(selections).length}
        >
          Next →
        </button>
      </div>
    </div>
  );
}

export default FollowupQuestions;
