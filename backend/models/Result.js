const { Sequelize, DataTypes } = require('sequelize');
const sequelize = require('../database');

const Result = sequelize.define('Result', {
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'FK to User.username (student who took the test)'
  },
  testId: {
    type: DataTypes.BIGINT,
    allowNull: false,
    comment: 'FK to Test.id'
  },
  testName: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Snapshot of test name at time of submission'
  },
  company: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Snapshot of company name'
  },
  difficulty: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Snapshot of test difficulty: Easy | Medium | Hard'
  },
  score: {
    type: DataTypes.FLOAT,
    allowNull: false,
    comment: 'Percentage score (0-100)'
  },
  correctCount: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Number of correct answers'
  },
  totalQuestions: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Total questions in the test at time of submission'
  },
  status: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Result status: passed | failed'
  },
  answers: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Map of { questionIndex: selectedAnswer }'
  },
  questionTimes: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Map of { questionIndex: { total: ms } } time spent per question'
  },
  questions: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Snapshot of all questions at submission time (for review)'
  },
  details: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Detailed breakdown of MCQ correctness and Coding similarity'
  },
  timeTaken: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Total time taken in seconds'
  },
  date: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    comment: 'Submission timestamp'
  }
}, {
  indexes: [
    { fields: ['username', 'testId'], unique: true },
    { fields: ['username'] },
    { fields: ['testId'] },
    { fields: ['status'] },
    { fields: ['score'] },
    { fields: ['date'] }
  ]
});

module.exports = Result;
