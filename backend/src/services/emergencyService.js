const { query } = require('../database/pool');

async function listEmergencyContacts() {
  return query(
    `SELECT id, title, organization, phone, description, is_critical AS isCritical
     FROM emergency_contacts
     ORDER BY is_critical DESC, id ASC`
  );
}

module.exports = { listEmergencyContacts };