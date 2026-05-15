function pseudonymizeStudentId(studentId) {
  if (!studentId) {
    return 'STU***';
  }

  const cleaned = String(studentId).replace(/\s+/g, '');
  if (cleaned.length <= 4) {
    return `STU***${cleaned.slice(-2)}`;
  }

  return `${cleaned.slice(0, 3)}***${cleaned.slice(-2)}`;
}

module.exports = { pseudonymizeStudentId };