import React from 'react';
import './css/ProgessBar.css';

function ProgressBar({ current, total }) {
  const progress = (current / total) * 100;
  
  return (
    <div className="progress-container">
      <div className="progress-bar">
        <div 
          className="progress-fill" 
          style={{ width: `${progress}%` }}
        ></div>
      </div>
      <div className="progress-text">
        Question {current} of {total}
      </div>
    </div>
  );
}

export default ProgressBar;
