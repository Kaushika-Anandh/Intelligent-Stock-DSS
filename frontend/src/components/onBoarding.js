import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';

const Onboarding = () => {
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Fetch questions from backend API on mount
  useEffect(() => {
    axios.get('http://localhost:5000/api/v1/folio_questions')
      .then(response => {
        setQuestions(response.data);
        setLoading(false);
      })
      .catch(err => {
        setError('Error fetching questions');
        setLoading(false);
      });
  }, []);

  // Handler for when an option is selected
  const handleOptionChange = (questionId, selectedOption) => {
    setAnswers({ ...answers, [questionId]: selectedOption });
  };

  // Navigate to the next question
  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  // Navigate to the previous question
  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  // Submit the onboarding answers to the backend
  const handleSubmit = () => {
     // Retrieve the JWT from localStorage
  const token = localStorage.getItem('jwt_token');
  if (!token) {
    setError('JWT token not found.');
    return;
  }
  
  let decoded;
  try {
    decoded = jwtDecode(token);
  } catch (err) {
    setError('Invalid token.');
    return;
  }

  // Extract the email from the decoded token (assuming it's nested under user)
  const email = decoded.user?.email;
    if (!email) {
      setError('User email not found.');
      return;
    }

    axios.post('http://localhost:5000/api/v1/user/onboarding', {
      email: email,
      answers: answers
    })
    .then(response => {
        // After successful submission, get a refreshed token from the backend.
        axios.get(`http://localhost:5000/api/v1/refresh_token?email=${encodeURIComponent(email)}`)
          .then(tokenResponse => {
            const newToken = tokenResponse.data.token;
            localStorage.setItem('jwt_token', newToken);
            navigate('/home');
          })
          .catch(err => {
            setError('Error refreshing token');
          });
      })
    .catch(err => {
      setError('Error submitting answers');
    });
  };

  if (loading) {
    return <div>Loading questions...</div>;
  }

  if (error) {
    return <div>{error}</div>;
  }

  if (questions.length === 0) {
    return <div>No questions found.</div>;
  }

  // Get the current question based on index
  const currentQuestion = questions[currentIndex];

  return (
    <div className="onboarding-container">
      <h2>Onboarding Process</h2>
      <div className="question-section">
        <p><strong>Question {currentIndex + 1} of {questions.length}:</strong></p>
        <p>{currentQuestion.question_text}</p>
        <div className="options">
          {currentQuestion.options.map((option, idx) => (
            <div key={idx}>
              <label>
                <input
                  type="radio"
                  name={`question_${currentQuestion.id}`}
                  value={option}
                  checked={answers[currentQuestion.id] === option}
                  onChange={() => handleOptionChange(currentQuestion.id, option)}
                />
                {option}
              </label>
            </div>
          ))}
        </div>
      </div>
      <div className="navigation-buttons">
        <button onClick={handlePrev} disabled={currentIndex === 0}>Prev</button>
        {currentIndex < questions.length - 1 ? (
          <button onClick={handleNext}>Next</button>
        ) : (
          <button onClick={handleSubmit}>Submit</button>
        )}
      </div>
    </div>
  );
};

export default Onboarding;