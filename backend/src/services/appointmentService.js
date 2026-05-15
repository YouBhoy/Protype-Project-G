const { query, transaction } = require('../database/pool');
const ApiError = require('../utils/apiError');
const { pseudonymizeStudentId } = require('../utils/pseudonymize');

async function getStudentAvailableSlots(studentCollege) {
  return query(
    `SELECT s.id, s.slot_date AS slotDate, s.start_time AS startTime, s.end_time AS endTime,
            f.name AS facilitatorName, f.assigned_college AS assignedCollege
     FROM availability_slots s
     JOIN facilitators f ON f.id = s.facilitator_id
     WHERE s.status = 'open' AND f.assigned_college = ?
     ORDER BY s.slot_date ASC, s.start_time ASC`,
    [studentCollege]
  );
}

async function requestAppointment(studentId, slotId, purpose) {
  return transaction(async (connection) => {
    const slotRows = await connection.execute(
      `SELECT s.id, s.facilitator_id AS facilitatorId, s.slot_date AS slotDate, s.start_time AS startTime, s.end_time AS endTime, s.status,
              f.assigned_college AS assignedCollege
       FROM availability_slots s
       JOIN facilitators f ON f.id = s.facilitator_id
       JOIN students st ON st.id = ?
       WHERE s.id = ? AND s.status = 'open' AND f.assigned_college = st.college`,
      [studentId, slotId]
    );

    if (!slotRows[0].length) {
      throw new ApiError(404, 'Selected slot is unavailable');
    }

    const slot = slotRows[0][0];
    const appointmentResult = await connection.execute(
      `INSERT INTO appointments (student_id, facilitator_id, availability_slot_id, purpose, scheduled_at, status)
       VALUES (?, ?, ?, ?, CONCAT(?, ' ', ?), 'pending')`,
      [studentId, slot.facilitatorId, slotId, purpose, slot.slotDate, slot.startTime]
    );

    await connection.execute('UPDATE availability_slots SET status = ? WHERE id = ?', ['reserved', slotId]);

    return { appointmentId: appointmentResult[0].insertId };
  });
}

async function cancelAppointment(studentId, appointmentId) {
  const rows = await query('SELECT id, availability_slot_id AS availabilitySlotId, status FROM appointments WHERE id = ? AND student_id = ?', [appointmentId, studentId]);
  if (!rows.length) {
    throw new ApiError(404, 'Appointment not found');
  }

  await transaction(async (connection) => {
    await connection.execute('UPDATE appointments SET status = ? WHERE id = ?', ['cancelled', appointmentId]);
    if (rows[0].availabilitySlotId) {
      await connection.execute('UPDATE availability_slots SET status = ? WHERE id = ?', ['open', rows[0].availabilitySlotId]);
    }
  });

  return { cancelled: true };
}

async function getStudentAppointments(studentId) {
  return query(
    `SELECT a.id, a.purpose, a.scheduled_at AS scheduledAt, a.status, f.name AS facilitatorName,
            f.assigned_college AS assignedCollege
     FROM appointments a
     JOIN facilitators f ON f.id = a.facilitator_id
     WHERE a.student_id = ?
     ORDER BY a.scheduled_at DESC`,
    [studentId]
  );
}

async function createAvailabilitySlot(facilitatorId, slotDate, startTime, endTime) {
  const result = await query(
    `INSERT INTO availability_slots (facilitator_id, slot_date, start_time, end_time, status)
     VALUES (?, ?, ?, ?, 'open')`,
    [facilitatorId, slotDate, startTime, endTime]
  );
  return { slotId: result.insertId };
}

async function getFacilitatorAvailability(facilitatorId) {
  return query(
    `SELECT id, slot_date AS slotDate, start_time AS startTime, end_time AS endTime, status
     FROM availability_slots
     WHERE facilitator_id = ?
     ORDER BY slot_date DESC, start_time DESC`,
    [facilitatorId]
  );
}

async function getFacilitatorAppointments(facilitatorId, assignedCollege) {
  return query(
    `SELECT a.id, a.purpose, a.scheduled_at AS scheduledAt, a.status,
            s.student_id AS studentId, s.name AS studentName, s.email AS studentEmail,
            s.college, s.consent_flag AS consentFlag
     FROM appointments a
     JOIN students s ON s.id = a.student_id
     WHERE a.facilitator_id = ? AND s.college = ?
     ORDER BY a.scheduled_at DESC`,
    [facilitatorId, assignedCollege]
  ).then((rows) => rows.map((row) => ({
    ...row,
    studentId: pseudonymizeStudentId(row.studentId),
    studentName: row.consentFlag ? row.studentName : 'Private Student',
    studentEmail: row.consentFlag ? row.studentEmail : null
  })));
}

async function updateAppointmentStatus(facilitatorId, appointmentId, status, notes) {
  const rows = await query('SELECT * FROM appointments WHERE id = ? AND facilitator_id = ?', [appointmentId, facilitatorId]);
  if (!rows.length) {
    throw new ApiError(404, 'Appointment not found');
  }

  await transaction(async (connection) => {
    await connection.execute('UPDATE appointments SET status = ?, notes = ? WHERE id = ?', [status, notes || null, appointmentId]);
    if (status === 'rejected' || status === 'cancelled') {
      if (rows[0].availability_slot_id) {
        await connection.execute('UPDATE availability_slots SET status = ? WHERE id = ?', ['open', rows[0].availability_slot_id]);
      }
    }
  });

  return { status };
}

module.exports = {
  getStudentAvailableSlots,
  requestAppointment,
  cancelAppointment,
  getStudentAppointments,
  createAvailabilitySlot,
  getFacilitatorAvailability,
  getFacilitatorAppointments,
  updateAppointmentStatus
};