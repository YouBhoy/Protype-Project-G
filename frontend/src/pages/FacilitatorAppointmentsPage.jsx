import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { initializeSocket } from '../socket';

function formatStatus(status) {
  return String(status || 'pending').toLowerCase();
}

function sortAppointmentsByRecentChange(appointmentsList) {
  return [...appointmentsList].sort((left, right) => {
    const leftTime = new Date(left.updatedAt || left.scheduledAt || 0).getTime();
    const rightTime = new Date(right.updatedAt || right.scheduledAt || 0).getTime();
    return rightTime - leftTime;
  });
}

export function FacilitatorAppointmentsPage() {
  const [appointments, setAppointments] = useState([]);
  const [availability, setAvailability] = useState([]);
  const [form, setForm] = useState({ slotDate: '', startTime: '09:00', endTime: '09:30' });
  const [selectedSlotId, setSelectedSlotId] = useState(null);
  const [selectedSlotDetail, setSelectedSlotDetail] = useState(null);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState(null);
  const [selectedAppointmentDetail, setSelectedAppointmentDetail] = useState(null);
  const [appointmentForm, setAppointmentForm] = useState({ purpose: '', notes: '' });

  async function loadData() {
    const [appointmentsData, availabilityData] = await Promise.all([
      api.get('/facilitator/appointments'),
      api.get('/facilitator/availability')
    ]);
    setAppointments(sortAppointmentsByRecentChange(appointmentsData.items || []));
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
    if (selectedSlotId) {
      await api.patch(`/facilitator/availability/${selectedSlotId}`, form);
      setSelectedSlotId(null);
    } else {
      await api.post('/facilitator/availability', form);
    }
    setForm({ slotDate: '', startTime: '09:00', endTime: '09:30' });
    await loadData();
  }

  function beginEditSlot(slot) {
    setSelectedSlotDetail(slot);
    setSelectedSlotId(slot.id);
    setForm({
      slotDate: String(slot.slotDate || '').slice(0, 10),
      startTime: String(slot.startTime || '09:00').slice(0, 5),
      endTime: String(slot.endTime || '09:30').slice(0, 5)
    });
  }

  function beginOrganizeSlot(slot) {
    setSelectedSlotDetail(slot);
    setSelectedSlotId(null);
  }

  async function deleteSlot(slotId) {
    if (!window.confirm('Delete this availability slot?')) {
      return;
    }

    await api.del(`/facilitator/availability/${slotId}`);
    if (selectedSlotId === slotId) {
      setSelectedSlotId(null);
      setForm({ slotDate: '', startTime: '09:00', endTime: '09:30' });
    }
    if (selectedSlotDetail?.id === slotId) {
      setSelectedSlotDetail(null);
    }
    await loadData();
  }

  function beginEditAppointment(appointment) {
    setSelectedAppointmentDetail(appointment);
    setSelectedAppointmentId(appointment.id);
    setAppointmentForm({
      purpose: appointment.purpose || '',
      notes: appointment.notes || ''
    });
  }

  function beginOrganizeAppointment(appointment) {
    setSelectedAppointmentDetail(appointment);
    setSelectedAppointmentId(null);
  }

  async function saveAppointment() {
    if (!selectedAppointmentId || !appointmentForm.purpose.trim()) {
      return;
    }

    await api.patch(`/facilitator/appointments/${selectedAppointmentId}`, appointmentForm);
    setSelectedAppointmentId(null);
    setAppointmentForm({ purpose: '', notes: '' });
    await loadData();
  }

  async function deleteAppointment(appointmentId) {
    if (!window.confirm('Delete this appointment from the queue?')) {
      return;
    }

    await api.del(`/facilitator/appointments/${appointmentId}`);
    if (selectedAppointmentId === appointmentId) {
      setSelectedAppointmentId(null);
      setAppointmentForm({ purpose: '', notes: '' });
    }
    if (selectedAppointmentDetail?.id === appointmentId) {
      setSelectedAppointmentDetail(null);
    }
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
          <h3>{selectedSlotId ? 'Edit availability slot' : 'Create availability slot'}</h3>
          <div className="grid-form">
            <label className="input-block"><span>Date</span><input type="date" value={form.slotDate} onChange={(event) => setForm({ ...form, slotDate: event.target.value })} /></label>
            <label className="input-block"><span>Start</span><input type="time" value={form.startTime} onChange={(event) => setForm({ ...form, startTime: event.target.value })} /></label>
            <label className="input-block"><span>End</span><input type="time" value={form.endTime} onChange={(event) => setForm({ ...form, endTime: event.target.value })} /></label>
          </div>
          <div className="button-row">
            <button className="btn btn-primary" onClick={handleCreateSlot} disabled={!form.slotDate || !form.startTime || !form.endTime}>
              {selectedSlotId ? 'Update slot' : 'Publish slot'}
            </button>
            {selectedSlotId ? (
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setSelectedSlotId(null);
                  setForm({ slotDate: '', startTime: '09:00', endTime: '09:30' });
                }}
              >
                Cancel edit
              </button>
            ) : null}
          </div>

          <h4 className="subheading">Existing slots</h4>
          {selectedSlotDetail ? (
            <div className="mini-card" style={{ marginBottom: '12px' }}>
              <div className="row-between">
                <strong>Organizing slot</strong>
                <span className="status-pill status-primary">{selectedSlotDetail.status}</span>
              </div>
              <p>{new Date(selectedSlotDetail.slotDate).toLocaleDateString()} {selectedSlotDetail.startTime} - {selectedSlotDetail.endTime}</p>
              <p className="muted">Use Edit to load this slot into the form or Delete to remove it.</p>
              <div className="button-row">
                <button className="btn btn-secondary" onClick={() => beginEditSlot(selectedSlotDetail)}>Edit selected</button>
                <button className="btn btn-secondary" onClick={() => setSelectedSlotDetail(null)}>Close</button>
              </div>
            </div>
          ) : null}
          <div className="stack">
            {availability.map((slot) => (
              <div key={slot.id} className="mini-card">
                <div className="row-between">
                  <span>{new Date(slot.slotDate).toLocaleDateString()} {slot.startTime} - {slot.endTime}</span>
                  <strong>{slot.status}</strong>
                </div>
                <div className="button-row" style={{ marginTop: '12px' }}>
                  <button className="btn btn-secondary" onClick={() => beginOrganizeSlot(slot)}>Organize</button>
                  <button className="btn btn-secondary" onClick={() => beginEditSlot(slot)}>Edit</button>
                  <button className="btn btn-secondary" onClick={() => deleteSlot(slot.id)} disabled={slot.status === 'reserved'} title={slot.status === 'reserved' ? 'Reserved slots cannot be deleted' : 'Delete slot'}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="data-panel">
          <h3>Appointment queue</h3>
          {selectedAppointmentDetail ? (
            <section className="mini-card" style={{ marginBottom: '16px' }}>
              <div className="row-between">
                <strong>Organizing appointment</strong>
                <span className="status-pill status-primary">{formatStatus(selectedAppointmentDetail.status)}</span>
              </div>
              <p>{selectedAppointmentDetail.purpose}</p>
              <p className="muted">{selectedAppointmentDetail.studentName || selectedAppointmentDetail.studentId} - {new Date(selectedAppointmentDetail.scheduledAt).toLocaleString()}</p>
              <div className="button-row">
                <button className="btn btn-secondary" onClick={() => beginEditAppointment(selectedAppointmentDetail)}>Edit selected</button>
                <button className="btn btn-secondary" onClick={() => setSelectedAppointmentDetail(null)}>Close</button>
              </div>
            </section>
          ) : null}
          {selectedAppointmentId ? (
            <section className="data-panel" style={{ marginBottom: '16px', boxShadow: 'none' }}>
              <h4 className="subheading">Edit appointment</h4>
              <div className="grid-form">
                <label className="input-block">
                  <span>Purpose</span>
                  <input value={appointmentForm.purpose} onChange={(event) => setAppointmentForm({ ...appointmentForm, purpose: event.target.value })} />
                </label>
                <label className="input-block">
                  <span>Notes</span>
                  <input value={appointmentForm.notes} onChange={(event) => setAppointmentForm({ ...appointmentForm, notes: event.target.value })} />
                </label>
              </div>
              <div className="button-row">
                <button className="btn btn-primary" onClick={saveAppointment} disabled={!appointmentForm.purpose.trim()}>Save changes</button>
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    setSelectedAppointmentId(null);
                    setAppointmentForm({ purpose: '', notes: '' });
                  }}
                >
                  Cancel edit
                </button>
              </div>
            </section>
          ) : null}
          <div className="stack">
            {appointments.map((appointment) => (
              <div key={appointment.id} className="mini-card">
                <div className="row-between">
                  <strong>{appointment.studentName || appointment.studentId}</strong>
                  <span className="status-pill status-primary">{formatStatus(appointment.status)}</span>
                </div>
                <p>{appointment.purpose}</p>
                {appointment.notes ? <p className="muted">Notes: {appointment.notes}</p> : null}
                <p className="muted">{new Date(appointment.scheduledAt).toLocaleString()}</p>
                {formatStatus(appointment.status) === 'pending' ? (
                  <div className="button-row">
                    <button className="btn btn-primary" onClick={() => updateStatus(appointment.id, 'accepted')}>Accept</button>
                    <button className="btn btn-secondary" onClick={() => updateStatus(appointment.id, 'cancelled')}>Cancel</button>
                    <button className="btn btn-secondary" onClick={() => updateStatus(appointment.id, 'completed')}>Complete</button>
                  </div>
                ) : null}
                <div className="button-row" style={{ marginTop: '12px' }}>
                  <button className="btn btn-secondary" onClick={() => beginOrganizeAppointment(appointment)}>Organize</button>
                  <button className="btn btn-secondary" onClick={() => beginEditAppointment(appointment)}>Edit</button>
                  <button className="btn btn-secondary" onClick={() => deleteAppointment(appointment.id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}