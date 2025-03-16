import React, { useState } from 'react';
import './css/Questions.css';

function Question({ question, category, onSubmit, onBack }) {
  const [selectedOption, setSelectedOption] = useState(null);
  
  const handleOptionSelect = (option) => {
    setSelectedOption(option);
  };
  
  const handleNext = () => {
    if (!selectedOption) return;
    
    // Find the score for the selected option
    const score = question.options.find(opt => opt.option === selectedOption)?.score || 0;
    onSubmit(question.question, selectedOption, score);
    
    // Reset selection for next question
    setSelectedOption(null);
  };
  
  return (
    <div className="question-card">
      <h3 className="category-title">{category.replace('_', ' ').toUpperCase()}</h3>
      <h4 className="question-text">{question.question}</h4>
      
      <div className="options-container">
        {question.options.map((option, index) => (
          <div 
            key={index} 
            className={`option ${selectedOption === option.option ? 'selected' : ''}`}
            onClick={() => handleOptionSelect(option.option)}
          >
            {option.option}
          </div>
        ))}
      </div>
      
      <div className="button-group">
        {onBack && (
          <button className="back-button" onClick={onBack}>
            ← Back
          </button>
        )}
        <button 
          className="next-button" 
          onClick={handleNext}
          disabled={!selectedOption}
        >
          Next →
        </button>
      </div>
    </div>
  );
}

export default Question;