const { Sequelize, DataTypes } = require('sequelize');
const sequelize = require('../database');

const Test = sequelize.define('Test', {
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Name/title of the test'
  },
  company: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Company name this test is for'
  },
  duration: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'Duration in minutes'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Brief description of the test'
  },
  difficulty: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'Medium',
    comment: 'Difficulty level: Easy | Medium | Hard'
  },
  questions: {
    type: DataTypes.JSON,
    allowNull: false,
    comment: 'Array of {question, options[], answer}'
  },
  syllabusUrl: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'URL/Path to the supporting material (syllabus)'
  },
  createdBy: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Staff username who created this test'
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: 'active',
    comment: 'Test lifecycle: draft | active | published | archived'
  },
  targetAudience: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '{ departments: [], years: [], sections: [], genders: [] }'
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    comment: 'Scheduled date of the test'
  },
  totalMarks: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Auto-calculated total marks (= question count)'
  },
  passingPercentage: {
    type: DataTypes.INTEGER,
    defaultValue: 50,
    comment: 'Minimum score % to pass'
  }
}, {
  indexes: [
    { fields: ['status'] },
    { fields: ['createdBy'] },
    { fields: ['company'] },
    { fields: ['createdAt'] }
  ],
  hooks: {
    beforeCreate: (test) => {
      // Auto-calculate totalMarks from questions count
      if (test.questions) {
        const q = typeof test.questions === 'string' ? JSON.parse(test.questions) : test.questions;
        test.totalMarks = Array.isArray(q) ? q.length : 0;
      }
    }
  }
});

module.exports = Test;
