const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const ApiError = require('../utils/apiError');
const { query } = require('../database/pool');

function createToken(user) {
  return jwt.sign(user, env.jwtSecret, { expiresIn: '7d' });
}

function normalizeInput(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function buildValidationError(details) {
  return new ApiError(400, 'Validation failed', details);
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validateStudentSignup(input) {
  const studentId = normalizeInput(input.studentId);
  const name = normalizeInput(input.name || input.fullName);
  const email = normalizeInput(input.email).toLowerCase();
  const password = typeof input.password === 'string' ? input.password : '';
  const college = normalizeInput(input.college);
  const yearLevel = normalizeInput(input.yearLevel);
  const sex = normalizeInput(input.sex);
  const details = [];

  if (!studentId) {
    details.push('Student ID is required');
  }

  if (!name) {
    details.push('Full name is required');
  }

  if (!email) {
    details.push('Email is required');
  } else if (!validateEmail(email)) {
    details.push('Email must be a valid email address');
  }

  if (!password) {
    details.push('Password is required');
  } else if (password.length < 8) {
    details.push('Password must be at least 8 characters long');
  }

  if (!college) {
    details.push('College is required');
  }

  if (!yearLevel) {
    details.push('Year level is required');
  }

  if (!sex) {
    details.push('Sex is required');
  }

  if (details.length) {
    throw buildValidationError(details);
  }

  return { studentId, name, email, password, college, yearLevel, sex };
}

function validateStudentLogin(studentId, password) {
  const details = [];

  if (!normalizeInput(studentId)) {
    details.push('Student ID is required');
  }

  if (!normalizeInput(password)) {
    details.push('Password is required');
  }

  if (details.length) {
    throw buildValidationError(details);
  }

  return { studentId: normalizeInput(studentId), password };
}

function validateFacilitatorSignup(input) {
  const name = normalizeInput(input.name || input.fullName);
  const email = normalizeInput(input.email).toLowerCase();
  const password = typeof input.password === 'string' ? input.password : '';
  const assignedCollege = normalizeInput(input.assignedCollege);
  const details = [];

  if (!name) {
    details.push('Full name is required');
  }

  if (!email) {
    details.push('Email is required');
  } else if (!validateEmail(email)) {
    details.push('Email must be a valid email address');
  }

  if (!password) {
    details.push('Password is required');
  } else if (password.length < 8) {
    details.push('Password must be at least 8 characters long');
  }

  if (!assignedCollege) {
    details.push('Assigned college is required');
  }

  if (details.length) {
    throw buildValidationError(details);
  }

  return { name, email, password, assignedCollege };
}

function validateFacilitatorLogin(email, password) {
  const details = [];

  if (!normalizeInput(email)) {
    details.push('Email is required');
  }

  if (!normalizeInput(password)) {
    details.push('Password is required');
  }

  if (details.length) {
    throw buildValidationError(details);
  }

  return { email: normalizeInput(email).toLowerCase(), password };
}

function buildStudentPayload(row) {
  return {
    id: row.id,
    role: 'student',
    studentId: row.student_id,
    name: row.name,
    email: row.email,
    college: row.college,
    yearLevel: row.year_level,
    sex: row.sex,
    consentFlag: Boolean(row.consent_flag)
  };
}

function buildFacilitatorPayload(row) {
  return {
    id: row.id,
    role: 'ogc',
    name: row.name,
    email: row.email,
    assignedCollege: row.assigned_college
  };
}

async function signupStudent(input) {
  const studentInput = validateStudentSignup(input);

  const existing = await query('SELECT id FROM students WHERE student_id = ? OR email = ?', [studentInput.studentId, studentInput.email]);
  if (existing.length) {
    throw new ApiError(409, 'Student account already exists');
  }

  const passwordHash = await bcrypt.hash(studentInput.password, 10);
  const result = await query(
    `INSERT INTO students (student_id, name, email, password_hash, college, year_level, sex, consent_flag)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
    [studentInput.studentId, studentInput.name, studentInput.email, passwordHash, studentInput.college, studentInput.yearLevel, studentInput.sex]
  );

  const rows = await query('SELECT * FROM students WHERE id = ?', [result.insertId]);
  const student = buildStudentPayload(rows[0]);
  return {
    user: student,
    token: createToken(student)
  };
}

async function loginStudent(studentId, password) {
  const credentials = validateStudentLogin(studentId, password);
  const rows = await query('SELECT * FROM students WHERE student_id = ?', [credentials.studentId]);
  if (!rows.length) {
    throw new ApiError(401, 'Invalid student ID or password');
  }

  const student = rows[0];
  const valid = await bcrypt.compare(credentials.password, student.password_hash);
  if (!valid) {
    throw new ApiError(401, 'Invalid student ID or password');
  }

  const payload = buildStudentPayload(student);
  return {
    user: payload,
    token: createToken(payload)
  };
}

async function loginFacilitator(email, password) {
  const credentials = validateFacilitatorLogin(email, password);
  const rows = await query('SELECT * FROM facilitators WHERE email = ?', [credentials.email]);
  if (!rows.length) {
    throw new ApiError(401, 'Invalid email or password');
  }

  const facilitator = rows[0];
  const valid = await bcrypt.compare(credentials.password, facilitator.password_hash);
  if (!valid) {
    throw new ApiError(401, 'Invalid email or password');
  }

  const payload = buildFacilitatorPayload(facilitator);
  return {
    user: payload,
    token: createToken(payload)
  };
}

async function signupFacilitator(input) {
  const facilitatorInput = validateFacilitatorSignup(input);

  const existing = await query('SELECT id FROM facilitators WHERE email = ?', [facilitatorInput.email]);
  if (existing.length) {
    throw new ApiError(409, 'OGC account already exists');
  }

  const passwordHash = await bcrypt.hash(facilitatorInput.password, 10);
  const result = await query(
    `INSERT INTO facilitators (name, email, password_hash, assigned_college, role)
     VALUES (?, ?, ?, ?, 'ogc')`,
    [facilitatorInput.name, facilitatorInput.email, passwordHash, facilitatorInput.assignedCollege]
  );

  const rows = await query('SELECT * FROM facilitators WHERE id = ?', [result.insertId]);
  const facilitator = buildFacilitatorPayload(rows[0]);
  return {
    user: facilitator,
    token: createToken(facilitator)
  };
}

async function getMe(user) {
  if (user.role === 'student') {
    const rows = await query('SELECT * FROM students WHERE id = ?', [user.id]);
    if (!rows.length) {
      throw new ApiError(404, 'Student account not found');
    }

    return buildStudentPayload(rows[0]);
  }

  const rows = await query('SELECT * FROM facilitators WHERE id = ?', [user.id]);
  if (!rows.length) {
    throw new ApiError(404, 'Facilitator account not found');
  }

  return buildFacilitatorPayload(rows[0]);
}

module.exports = { signupStudent, signupFacilitator, loginStudent, loginFacilitator, getMe, buildStudentPayload, buildFacilitatorPayload };