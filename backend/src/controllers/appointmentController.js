const asyncHandler = require('../utils/asyncHandler');
const { emitAppointmentUpdate } = require('../sockets/chat.socket');
const {
  getStudentAvailableSlots,
  requestAppointment,
  cancelAppointment,
  getStudentAppointments,
  createAvailabilitySlot,
  getFacilitatorAvailability,
  getFacilitatorAppointments,
  updateAppointmentStatus
} = require('../services/appointmentService');
const { query } = require('../database/pool');

const availableSlots = asyncHandler(async (req, res) => {
  const rows = await query('SELECT college FROM students WHERE id = ?', [req.user.id]);
  const studentCollege = rows[0]?.college;
  const items = await getStudentAvailableSlots(studentCollege);
  res.json({ items });
});

const studentAppointments = asyncHandler(async (req, res) => {
  const items = await getStudentAppointments(req.user.id);
  res.json({ items });
});

const request = asyncHandler(async (req, res) => {
  const result = await requestAppointment(req.user.id, req.body.slotId, req.body.purpose);
  emitAppointmentUpdate({ type: 'appointment_created', studentId: req.user.id });
  res.status(201).json(result);
});

const cancel = asyncHandler(async (req, res) => {
  const result = await cancelAppointment(req.user.id, req.params.id);
  emitAppointmentUpdate({ type: 'appointment_cancelled', studentId: req.user.id, appointmentId: req.params.id });
  res.json(result);
});

const facilitatorAvailability = asyncHandler(async (req, res) => {
  const items = await getFacilitatorAvailability(req.user.id);
  res.json({ items });
});

const createSlot = asyncHandler(async (req, res) => {
  const result = await createAvailabilitySlot(req.user.id, req.body.slotDate, req.body.startTime, req.body.endTime);
  emitAppointmentUpdate({ type: 'availability_created', facilitatorId: req.user.id });
  res.status(201).json(result);
});

const facilitatorAppointments = asyncHandler(async (req, res) => {
  const items = await getFacilitatorAppointments(req.user.id);
  res.json({ items });
});

const updateStatus = asyncHandler(async (req, res) => {
  const result = await updateAppointmentStatus(req.user.id, req.params.id, req.body.status, req.body.notes);
  emitAppointmentUpdate({
    type: 'appointment_status_updated',
    facilitatorId: req.user.id,
    appointmentId: req.params.id,
    status: result.status
  });
  res.json(result);
});

module.exports = {
  availableSlots,
  studentAppointments,
  request,
  cancel,
  facilitatorAvailability,
  createSlot,
  facilitatorAppointments,
  updateStatus
};