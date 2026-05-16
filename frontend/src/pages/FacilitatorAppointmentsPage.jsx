import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { initializeSocket } from '../socket';

function formatStatus(status) {
  return String(status || 'pending').toLowerCase();
}

export function FacilitatorAppointmentsPage() {
  const [appointments, setAppointments] = useState([]);
  const [availability, setAvailability] = useState([]);
  const [form, setForm] = useState({ slotDate: '', startTime: '09:00', endTime: '09:30' });

  async function loadData() {
    const [appointmentsData, availabilityData] = await Promise.all([
      api.get('/facilitator/appointments'),
      api.get('/facilitator/availability')
    ]);
    setAppointments(appointmentsData.items || []);
    setAvailability(availabilityData.items || []);
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
    const token = localStorage.getItem('spartang_facilitator_token')
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

  async function handleCreateSlot() {
    if (!form.slotDate || !form.startTime || !form.endTime) {
      return;
    }
    await api.post('/facilitator/availability', form);
    setForm({ slotDate: '', startTime: '09:00', endTime: '09:30' });
    await loadData();
  }

  async function updateStatus(id, status) {
    setAppointments((current) => current.map((appointment) => (
      appointment.id === id ? { ...appointment, status } : appointment
    )));
    await api.patch(`/facilitator/appointments/${id}/status`, { status });
    await loadData();
  }

  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <p className="eyebrow">Scheduling and intervention</p>
          <h1>Manage availability and appointment actions</h1>
        </div>
      </header>

      <section className="panel-grid">
        <article className="data-panel">
          <h3>Create availability slot</h3>
          <div className="grid-form">
            <label className="input-block"><span>Date</span><input type="date" value={form.slotDate} onChange={(event) => setForm({ ...form, slotDate: event.target.value })} /></label>
            <label className="input-block"><span>Start</span><input type="time" value={form.startTime} onChange={(event) => setForm({ ...form, startTime: event.target.value })} /></label>
            <label className="input-block"><span>End</span><input type="time" value={form.endTime} onChange={(event) => setForm({ ...form, endTime: event.target.value })} /></label>
          </div>
          <button className="btn btn-primary" onClick={handleCreateSlot} disabled={!form.slotDate || !form.startTime || !form.endTime}>Publish slot</button>

          <h4 className="subheading">Existing slots</h4>
          <div className="stack">
            {availability.map((slot) => (
              <div key={slot.id} className="mini-card row-between">
                <span>{new Date(slot.slotDate).toLocaleDateString()} {slot.startTime} - {slot.endTime}</span>
                <strong>{slot.status}</strong>
              </div>
            ))}
          </div>
        </article>

        <article className="data-panel">
          <h3>Appointment queue</h3>
          <div className="stack">
            {appointments.map((appointment) => (
              <div key={appointment.id} className="mini-card">
                <div className="row-between">
                  <strong>{appointment.studentName || appointment.studentId}</strong>
                  <span className="status-pill status-primary">{formatStatus(appointment.status)}</span>
                </div>
                <p>{appointment.purpose}</p>
                <p className="muted">{new Date(appointment.scheduledAt).toLocaleString()}</p>
                {formatStatus(appointment.status) === 'pending' ? (
                  <div className="button-row">
                    <button className="btn btn-primary" onClick={() => updateStatus(appointment.id, 'accepted')}>Accept</button>
                    <button className="btn btn-secondary" onClick={() => updateStatus(appointment.id, 'cancelled')}>Cancel</button>
                    <button className="btn btn-secondary" onClick={() => updateStatus(appointment.id, 'completed')}>Complete</button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}