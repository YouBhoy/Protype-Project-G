import React, { useMemo, useState } from 'react';

export function AssessmentForm({ definition, onSubmit, submitting }) {
  const [responses, setResponses] = useState(() => {
    if (definition?.key === 'esm') {
      return { mood: 3, energy: 3, stress: 3, sleep: 3 };
    }
    return Array(definition?.questions?.length || 0).fill('');
  });

  const answeredCount = useMemo(() => {
    if (definition?.key === 'esm') {
      return Object.values(responses).filter((value) => String(value) !== '').length;
    }
    return responses.filter((value) => String(value) !== '').length;
  }, [definition, responses]);

  function updateArray(index, value) {
    setResponses((current) => {
      const next = [...current];
      next[index] = Number(value);
      return next;
    });
  }

  function updateField(field, value) {
    setResponses((current) => ({ ...current, [field]: Number(value) }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    console.log('AssessmentForm handleSubmit called — responses:', responses, 'definition:', definition);
    if (typeof onSubmit !== 'function') {
      // Defensive: surface the problem immediately in dev
      console.error('onSubmit prop is missing or not a function');
      alert('Submit handler not available — please refresh or contact support.');
      return;
    }

    const total = definition.key === 'esm' ? definition.fields.length : definition.questions.length;
    const answered = answeredCount;
    if (answered < total) {
      alert(`Please answer all ${total} questions before submitting. (${answered}/${total} answered)`);
      return;
    }

    onSubmit(responses);
  }

  if (!definition) {
    return null;
  }

  return (
    <form className="assessment-form" onSubmit={handleSubmit}>
      <div className="form-progress">
        <span>Answered {answeredCount} of {definition.key === 'esm' ? definition.fields.length : definition.questions.length}</span>
        <div className="progress-bar"><span style={{ width: `${(answeredCount / (definition.key === 'esm' ? definition.fields.length : definition.questions.length)) * 100}%` }} /></div>
      </div>

      {definition.key === 'esm' ? (
        <div className="field-grid">
          {definition.fields.map((field) => (
            <label key={field.key} className="input-block">
              <span>{field.label}</span>
              <select value={responses[field.key]} onChange={(event) => updateField(field.key, event.target.value)}>
                {[1, 2, 3, 4, 5].map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
            </label>
          ))}
        </div>
      ) : (
        <div className="question-list">
          {definition.questions.map((question, index) => (
            <div key={question} className="question-card">
              <p className="question-title">{index + 1}. {question}</p>
              <div className="choice-row">
                {definition.options.map((option) => (
                  <label key={option.value} className="choice-pill">
                    <input
                      type="radio"
                      name={`q-${index}`}
                      value={option.value}
                      checked={String(responses[index]) === String(option.value)}
                      onChange={(event) => updateArray(index, event.target.value)}
                    />
                    <span>{option.value}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <button className="btn btn-primary" type="submit" disabled={submitting}>
        {submitting ? 'Submitting...' : 'Submit assessment'}
      </button>
    </form>
  );
}