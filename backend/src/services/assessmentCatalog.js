const assessmentCatalog = {
  dass21: {
    key: 'dass21',
    label: 'DASS-21',
    description: 'Measures depression, anxiety, and stress symptoms.',
    questions: [
      'I found it hard to wind down.',
      'I was aware of dryness of my mouth.',
      'I couldn\'t seem to experience any positive feeling at all.',
      'I experienced breathing difficulty.',
      'I found it difficult to work up the initiative to do things.',
      'I tended to over-react to situations.',
      'I experienced trembling.',
      'I felt that I was using a lot of nervous energy.',
      'I was worried about situations in which I might panic.',
      'I felt that I had nothing to look forward to.',
      'I found myself getting agitated.',
      'I found it difficult to relax.',
      'I felt down-hearted and blue.',
      'I was intolerant of anything that kept me from getting on with what I was doing.',
      'I felt I was close to panic.',
      'I was unable to become enthusiastic about anything.',
      'I felt I wasn\'t worth much as a person.',
      'I felt that I was rather touchy.',
      'I was aware of the action of my heart in the absence of physical exertion.',
      'I felt scared without any good reason.',
      'I felt that life was meaningless.'
    ],
    options: [
      { label: 'Did not apply to me at all', value: 0 },
      { label: 'Applied to me to some degree', value: 1 },
      { label: 'Applied to me to a considerable degree', value: 2 },
      { label: 'Applied to me very much', value: 3 }
    ]
  },
  phq9: {
    key: 'phq9',
    label: 'PHQ-9',
    description: 'Screens for depression severity.',
    questions: [
      'Little interest or pleasure in doing things',
      'Feeling down, depressed, or hopeless',
      'Trouble falling or staying asleep, or sleeping too much',
      'Feeling tired or having little energy',
      'Poor appetite or overeating',
      'Feeling bad about yourself, or that you are a failure',
      'Trouble concentrating on things',
      'Moving or speaking slowly, or being fidgety/restless',
      'Thoughts that you would be better off dead or hurting yourself'
    ],
    options: [
      { label: 'Not at all', value: 0 },
      { label: 'Several days', value: 1 },
      { label: 'More than half the days', value: 2 },
      { label: 'Nearly every day', value: 3 }
    ]
  },
  gad7: {
    key: 'gad7',
    label: 'GAD-7',
    description: 'Screens for generalized anxiety severity.',
    questions: [
      'Feeling nervous, anxious, or on edge',
      'Not being able to stop or control worrying',
      'Worrying too much about different things',
      'Trouble relaxing',
      'Being so restless that it is hard to sit still',
      'Becoming easily annoyed or irritable',
      'Feeling afraid as if something awful might happen'
    ],
    options: [
      { label: 'Not at all', value: 0 },
      { label: 'Several days', value: 1 },
      { label: 'More than half the days', value: 2 },
      { label: 'Nearly every day', value: 3 }
    ]
  },
  esm: {
    key: 'esm',
    label: 'ESM Check-in',
    description: 'Quick wellness check-in for daily monitoring.',
    fields: [
      { key: 'mood', label: 'Mood', min: 1, max: 5 },
      { key: 'energy', label: 'Energy', min: 1, max: 5 },
      { key: 'stress', label: 'Stress', min: 1, max: 5 },
      { key: 'sleep', label: 'Sleep quality', min: 1, max: 5 }
    ]
  }
};

function listAssessmentCatalog() {
  return Object.values(assessmentCatalog);
}

function getAssessmentDefinition(type) {
  return assessmentCatalog[String(type || '').toLowerCase()] || null;
}

module.exports = { assessmentCatalog, listAssessmentCatalog, getAssessmentDefinition };