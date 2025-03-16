import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import ProgressBar from './ProgressBar';
import Question from './questions';
import FollowupQuestions from './FollowupQuestions';
import './css/Questionnaire.css';

const API_BASE_URL = 'http://localhost:5000/api/v1';

function Questionnaire() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // Questions and categories data
    const [questionsData, setQuestionsData] = useState({
      questions_by_category: {},
      category_order: []
    });
    
    // Current position tracking
    const [currentCategoryIndex, setCurrentCategoryIndex] = useState(0);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    
    // Response tracking
    const [responseHistory, setResponseHistory] = useState([]);
    const [userResponses, setUserResponses] = useState({});
    const [categoryScores, setCategoryScores] = useState({});
    const [extremeAnswerCount, setExtremeAnswerCount] = useState(0);
    
    // Follow-up question states
    const [awaitingFollowup, setAwaitingFollowup] = useState(false);
    const [followupQuestions, setFollowupQuestions] = useState(null);
    const [followupResponses, setFollowupResponses] = useState({});
    const [followupScores, setFollowupScores] = useState([]);
    const [followupConfidence, setFollowupConfidence] = useState(0);
    
    // Progress tracking
    const [totalQuestions, setTotalQuestions] = useState(0);
    const [currentQuestionNumber, setCurrentQuestionNumber] = useState(1);
    
    // Fetch questions on component mount
    useEffect(() => {
      const fetchQuestions = async () => {
        try {
          setLoading(true);
          const response = await axios.get(`${API_BASE_URL}/questions`);
          setQuestionsData(response.data);
          
          // Calculate total questions
          let total = 0;
          for (const category of response.data.category_order) {
            total += response.data.questions_by_category[category].length;
          }
          setTotalQuestions(total);
          
          setLoading(false);
        } catch (err) {
          setError('Failed to load questions. Please try again.');
          setLoading(false);
        }
      };
      
      fetchQuestions();
    }, []);
    
    // Update current question number when indices change
    useEffect(() => {
      if (questionsData.category_order.length === 0) return;
      
      let questionNumber = 1;
      for (let i = 0; i < currentCategoryIndex; i++) {
        const category = questionsData.category_order[i];
        questionNumber += questionsData.questions_by_category[category].length;
      }
      
      questionNumber += currentQuestionIndex;
      setCurrentQuestionNumber(questionNumber);
    }, [currentCategoryIndex, currentQuestionIndex, questionsData]);
    
    const handleAnswerSubmit = async (question, answer, score) => {
      try {
        // Prepare data for API
        const categoryKey = questionsData.category_order[currentCategoryIndex];
        const responseData = {
          category: categoryKey,
          question_index: currentQuestionIndex,
          question: question,
          response: answer,
          score: score,
          response_history: [...responseHistory],
          extreme_answer_count: extremeAnswerCount,
          category_scores: categoryScores
        };
        
        // Track if answer is extreme
        const currentQuestions = questionsData.questions_by_category[categoryKey];
        const currentQuestion = currentQuestions[currentQuestionIndex];
        const minScore = Math.min(...currentQuestion.options.map(opt => opt.score));
        const maxScore = Math.max(...currentQuestion.options.map(opt => opt.score));
        
        const isExtreme = (score === minScore || score === maxScore);
        const newExtremeCount = isExtreme ? extremeAnswerCount + 1 : 0;
        setExtremeAnswerCount(newExtremeCount);
        
        // Save response locally
        const newResponseHistory = [...responseHistory, {
          question: question,
          answer: answer,
          score: score,
          category: categoryKey,
          question_index: currentQuestionIndex
        }];
        setResponseHistory(newResponseHistory);
        
        const newUserResponses = {
          ...userResponses,
          [`q_${categoryKey}_${currentQuestionIndex}`]: {
            question: question,
            answer: answer,
            score: score,
            category: categoryKey,
            question_index: currentQuestionIndex
          }
        };
        setUserResponses(newUserResponses);
        
        // Submit answer to API
        const response = await axios.post(`${API_BASE_URL}/submit_answer`, {
          ...responseData,
          extreme_answer_count: newExtremeCount,
          response_history: newResponseHistory
        });
        
        // Update state with API response
        setCategoryScores(response.data.category_scores);
        
        // Check if follow-up is needed
        if (response.data.is_last_question) {
          if (response.data.needs_followup) {
            setFollowupQuestions(response.data.followup_questions);
            setAwaitingFollowup(true);
          } else {
            // Move to next category
            moveToNextCategory();
          }
        } else {
          // Move to next question in current category
          setCurrentQuestionIndex(currentQuestionIndex + 1);
        }
      } catch (err) {
        setError('Error submitting answer. Please try again.');
      }
    };
    
    const handleFollowupSubmit = async () => {
      try {
        const categoryKey = questionsData.category_order[currentCategoryIndex];
        
        // Submit followup data to API
        const response = await axios.post(`${API_BASE_URL}/submit_followup`, {
          category: categoryKey,
          followup_responses: followupResponses,
          followup_scores: followupScores,
          category_scores: categoryScores
        });
        
        // Update state with API response
        setCategoryScores(response.data.category_scores);
        setFollowupConfidence(response.data.followup_confidence);
        
        // Reset followup state
        setAwaitingFollowup(false);
        setFollowupQuestions(null);
        setFollowupResponses({});
        setFollowupScores([]);
        
        // Move to next category
        moveToNextCategory();
      } catch (err) {
        setError('Error submitting follow-up answers. Please try again.');
      }
    };
    
    const handleFollowupChange = (questionIndex, answer, score) => {
      setFollowupResponses({
        ...followupResponses,
        [`followup_${questionIndex}`]: {
          answer: answer,
          score: score
        }
      });
      
      // Update the score at the correct index
      const newScores = [...followupScores];
      newScores[questionIndex] = score;
      setFollowupScores(newScores);
    };
    
    const moveToNextCategory = () => {
      // Check if we've completed all categories
      if (currentCategoryIndex + 1 >= questionsData.category_order.length) {
        // Calculate final profile
        calculateFinalProfile();
      } else {
        // Move to next category
        setCurrentCategoryIndex(currentCategoryIndex + 1);
        setCurrentQuestionIndex(0);
      }
    };
    
    const goToPreviousQuestion = () => {
      // If not the first question in category
      if (currentQuestionIndex > 0) {
        setCurrentQuestionIndex(currentQuestionIndex - 1);
      } 
      // If first question but not first category
      else if (currentCategoryIndex > 0) {
        const prevCategoryIndex = currentCategoryIndex - 1;
        const prevCategory = questionsData.category_order[prevCategoryIndex];
        const prevCategoryQuestions = questionsData.questions_by_category[prevCategory];
        
        setCurrentCategoryIndex(prevCategoryIndex);
        setCurrentQuestionIndex(prevCategoryQuestions.length - 1);
      }
      
      // Remove the last response from history
      if (responseHistory.length > 0) {
        const newHistory = [...responseHistory];
        newHistory.pop();
        setResponseHistory(newHistory);
        
        // Update user responses
        const lastResponseKey = Object.keys(userResponses).pop();
        const newResponses = {...userResponses};
        delete newResponses[lastResponseKey];
        setUserResponses(newResponses);
      }
    };
    
    const calculateFinalProfile = async () => {
      try {
        const response = await axios.post(`${API_BASE_URL}/calculate_profile`, {
          category_scores: categoryScores,
          followup_confidence: followupConfidence,
          user_responses: userResponses
        });
        
        // Navigate to results page with profile ID
        navigate(`/results/${response.data.profile_id}`);
      } catch (err) {
        setError('Error calculating your profile. Please try again.');
      }
    };
    
    if (loading) {
      return <div className="loading">Loading questions...</div>;
    }
    
    if (error) {
      return <div className="error">{error}</div>;
    }
    
    // Render current category and question
    const categoryKey = questionsData.category_order[currentCategoryIndex];
    const currentQuestions = questionsData.questions_by_category[categoryKey] || [];
    const showQuestion = !awaitingFollowup && currentQuestionIndex < currentQuestions.length;
    
    return (
      <div className="questionnaire-container">
        <ProgressBar 
          current={currentQuestionNumber} 
          total={totalQuestions} 
        />
        
        {showQuestion && (
          <Question 
            question={currentQuestions[currentQuestionIndex]}
            category={categoryKey}
            onSubmit={handleAnswerSubmit}
            onBack={currentQuestionIndex > 0 || currentCategoryIndex > 0 ? goToPreviousQuestion : null}
          />
        )}
        
        {awaitingFollowup && followupQuestions && (
          <FollowupQuestions 
            followupData={followupQuestions}
            category={categoryKey}
            onChange={handleFollowupChange}
            onSubmit={handleFollowupSubmit}
            onBack={() => setAwaitingFollowup(false)}
          />
        )}
      </div>
    );
  }
  
  export default Questionnaire;