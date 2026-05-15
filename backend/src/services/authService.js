const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const ApiError = require('../utils/apiError');
const { query } = require('../database/pool');

function createToken(user) {
  return jwt.sign(user, env.jwtSecret, { expiresIn: '7d' });
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
  const existing = await query('SELECT id FROM students WHERE student_id = ? OR email = ?', [input.studentId, input.email]);
  if (existing.length) {
    throw new ApiError(409, 'Student account already exists');
  }

  const passwordHash = await bcrypt.hash(input.password, 10);
  const result = await query(
    `INSERT INTO students (student_id, name, email, password_hash, college, year_level, sex, consent_flag)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
    [input.studentId, input.name, input.email, passwordHash, input.college, input.yearLevel, input.sex]
  );

  const rows = await query('SELECT * FROM students WHERE id = ?', [result.insertId]);
  const student = buildStudentPayload(rows[0]);
  return {
    user: student,
    token: createToken(student)
  };
}

async function loginStudent(studentId, password) {
  const rows = await query('SELECT * FROM students WHERE student_id = ?', [studentId]);
  if (!rows.length) {
    throw new ApiError(401, 'Invalid student ID or password');
  }

  const student = rows[0];
  const valid = await bcrypt.compare(password, student.password_hash);
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
  const rows = await query('SELECT * FROM facilitators WHERE email = ?', [email]);
  if (!rows.length) {
    throw new ApiError(401, 'Invalid email or password');
  }

  const facilitator = rows[0];
  const valid = await bcrypt.compare(password, facilitator.password_hash);
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
  const existing = await query('SELECT id FROM facilitators WHERE email = ?', [input.email]);
  if (existing.length) {
    throw new ApiError(409, 'OGC account already exists');
  }

  const passwordHash = await bcrypt.hash(input.password, 10);
  const result = await query(
    `INSERT INTO facilitators (name, email, password_hash, assigned_college, role)
     VALUES (?, ?, ?, ?, 'ogc')`,
    [input.name, input.email, passwordHash, input.assignedCollege]
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