const asyncHandler = require('../utils/asyncHandler');
const { signupStudent, signupFacilitator, loginStudent, loginFacilitator, getMe } = require('../services/authService');

const signup = asyncHandler(async (req, res) => {
  const result = await signupStudent(req.body);
  res.status(201).json(result);
});

const facilitatorSignup = asyncHandler(async (req, res) => {
  const result = await signupFacilitator(req.body);
  res.status(201).json(result);
});

const studentLogin = asyncHandler(async (req, res) => {
  const result = await loginStudent(req.body.studentId, req.body.password);
  res.json(result);
});

const facilitatorLogin = asyncHandler(async (req, res) => {
  const result = await loginFacilitator(req.body.email, req.body.password);
  res.json(result);
});

const me = asyncHandler(async (req, res) => {
  const user = await getMe(req.user);
  res.json({ user });
});

module.exports = { signup, facilitatorSignup, studentLogin, facilitatorLogin, me };