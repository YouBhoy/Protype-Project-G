import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { initializeSocket } from '../socket';

function getAppointmentTone(status) {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'accepted' || normalized === 'approved') return 'primary';
  if (normalized === 'pending') return 'warning';
  if (normalized === 'cancelled' || normalized === 'rejected') return 'danger';
  if (normalized === 'completed') return 'primary';
  return 'primary';
}

export function AppointmentsPage() {
  const [slots, setSlots] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [purpose, setPurpose] = useState('Counseling support');
  const [selectedSlot, setSelectedSlot] = useState('');
  const [message, setMessage] = useState('');

  async function loadData() {
    const [slotData, appointmentData] = await Promise.all([
      api.get('/student/appointments/available'),
      api.get('/student/appointments')
    ]);
    setSlots(slotData.items || []);
    setAppointments(appointmentData.items || []);
  }

  useEffect(() => {
    loadData().catch(() => null);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      loadData().catch(() => null);
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('spartang_student_token')
      || localStorage.getItem('spartang_token')
      || '';

    if (!token) {
      return undefined;
    }

    const socket = initializeSocket(token);
    const handleAppointmentUpdate = () => {
      loadData().catch(() => null);
    };

    socket.on('appointment_updated', handleAppointmentUpdate);

    return () => {
      socket.off('appointment_updated', handleAppointmentUpdate);
    };
  }, []);

  async function handleRequest() {
    if (!selectedSlot) {
      return;
    }
    const data = await api.post('/student/appointments', { slotId: selectedSlot, purpose });
    setMessage(`Appointment requested: ${data.appointmentId}`);
    setSelectedSlot('');
    await loadData();
  }

  async function handleCancel(id) {
    await api.patch(`/student/appointments/${id}/cancel`, {});
    await loadData();
  }

  return (
    <div className="page-stack">
      <header className="page-card-header">
        <div>
          <p className="eyebrow">Appointment scheduling</p>
          <h1>Request counseling support</h1>
        </div>
      </header>

      {message ? <div className="success-banner">{message}</div> : null}

      <section className="panel-grid">
        <article className="data-panel">
          <h3>Available slots</h3>
          <div className="stack">
            {slots.map((slot) => (
              <label key={slot.id} className="slot-card">
                <input type="radio" name="slot" value={slot.id} checked={String(selectedSlot) === String(slot.id)} onChange={() => setSelectedSlot(slot.id)} />
                <span>
                  <strong>{new Date(slot.slotDate).toLocaleDateString()} {slot.startTime}</strong>
                  <p>{slot.facilitatorName} - {slot.assignedCollege}</p>
                </span>
              </label>
            ))}
          </div>
          <label className="input-block">
            <span>Purpose</span>
            <input value={purpose} onChange={(event) => setPurpose(event.target.value)} />
          </label>
          <button className="btn btn-primary" onClick={handleRequest} disabled={!selectedSlot || !purpose.trim()}>Request appointment</button>
        </article>

        <article className="data-panel">
          <h3>Your appointments</h3>
          <div className="stack">
            {appointments.map((appointment) => (
              <div key={appointment.id} className="mini-card">
                <strong>{appointment.purpose}</strong>
                <p>{new Date(appointment.scheduledAt).toLocaleString()}</p>
                  <p>
                    <span className={`status-pill status-${getAppointmentTone(appointment.status)}`}>
                      {String(appointment.status || 'pending').toUpperCase()}
                    </span>
                    <span className="muted" style={{ marginLeft: 8 }}>{appointment.facilitatorName} - {appointment.assignedCollege}</span>
                  </p>
                {appointment.status !== 'cancelled' ? (
                  <button className="btn btn-secondary" onClick={() => handleCancel(appointment.id)}>Cancel</button>
                ) : null}
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}