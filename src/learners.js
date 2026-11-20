const IMAGES = {
  amaka: '/src/assets/images/learner_amaka_hd_1795184147089.jpg',
  bayo: '/src/assets/images/learner_bayo_hd_1795184147168.jpg',
  zara: '/src/assets/images/learner_zara_hd_1795184147737.jpg',
  kene: '/src/assets/images/learner_kene_hd_1795184149977.jpg',
  tomi: '/src/assets/images/learner_tomi_hd_1795184148140.jpg',
};

const profiles = [
  ['Amaka Uche', 'High', 'Visual', 'Friendly', 'High', 'Calm and focused', 'Often helps others and stays on task.', IMAGES.amaka],
  ['Bayo Adeyemi', 'Developing', 'Auditory', 'Confident', 'High', 'Enthusiastic', 'Enjoys explaining ideas aloud and inviting others in.', IMAGES.bayo],
  ['Zara Okafor', 'High', 'Reading / writing', 'Thoughtful', 'Developing', 'Quietly focused', 'Likes time to think before sharing her ideas.', IMAGES.zara],
  ['Kene Mensah', 'Support needed', 'Kinesthetic', 'Curious', 'Developing', 'Needs gentle reminders', 'Learns well when tasks include movement and practical materials.', IMAGES.kene],
  ['Tomi Bello', 'Developing', 'Visual', 'Friendly', 'High', 'Calm and focused', 'Notices details and likes diagrams, colour and examples.', IMAGES.tomi],
  ['Adaeze Obi', 'High', 'Auditory', 'Confident', 'High', 'Enthusiastic', 'Enjoys leading discussions and asking thoughtful questions.', IMAGES.amaka],
  ['Chidi Nwosu', 'Support needed', 'Kinesthetic', 'Reserved', 'Developing', 'Quietly focused', 'Builds confidence through practical, low-pressure activities.', IMAGES.kene],
  ['Sade Akinola', 'Developing', 'Reading / writing', 'Thoughtful', 'High', 'Calm and focused', 'Keeps careful notes and is a considerate partner.', IMAGES.zara],
  ['Emeka Eze', 'High', 'Visual', 'Curious', 'Developing', 'Enthusiastic', 'Enjoys patterns, puzzles and visual challenges.', IMAGES.bayo],
  ['Nneka Ibe', 'Developing', 'Auditory', 'Friendly', 'High', 'Calm and focused', 'Learns through conversation and peer explanation.', IMAGES.tomi],
  ['Tunde Balogun', 'Support needed', 'Reading / writing', 'Reserved', 'Developing', 'Needs gentle reminders', 'Benefits from clear steps and extra processing time.', IMAGES.kene],
  ['Amina Yusuf', 'High', 'Kinesthetic', 'Friendly', 'High', 'Enthusiastic', 'Brings energy to hands-on tasks and cooperative work.', IMAGES.amaka],
  ['Kwame Boateng', 'Developing', 'Visual', 'Thoughtful', 'Developing', 'Quietly focused', 'Responds well to models, sketches and visual prompts.', IMAGES.bayo],
  ['Ifeoma Nnamdi', 'High', 'Reading / writing', 'Thoughtful', 'High', 'Calm and focused', 'Enjoys reading independently and supporting classmates.', IMAGES.zara],
  ['Musa Ibrahim', 'Support needed', 'Auditory', 'Friendly', 'Developing', 'Enthusiastic', 'Participates readily when ideas are discussed together.', IMAGES.bayo],
  ['Ngozi Eze', 'Developing', 'Kinesthetic', 'Curious', 'High', 'Needs gentle reminders', 'Likes to experiment and learn by doing.', IMAGES.tomi],
  ['Kofi Mensah', 'High', 'Auditory', 'Confident', 'Developing', 'Calm and focused', 'Can explain a process clearly to a partner.', IMAGES.kene],
  ['Bisola James', 'Developing', 'Reading / writing', 'Friendly', 'High', 'Quietly focused', 'Works steadily and helps keep shared notes organised.', IMAGES.zara],
  ['Olu Fashola', 'Support needed', 'Visual', 'Curious', 'Developing', 'Needs gentle reminders', 'Visual cues and short check-ins help maintain focus.', IMAGES.kene],
  ['Zainab Danjuma', 'High', 'Kinesthetic', 'Confident', 'High', 'Enthusiastic', 'Enjoys practical challenges and encouraging her peers.', IMAGES.amaka],
];

export const learners = profiles.map((p, index) => ({
  id: `learner-${index + 1}`,
  name: p[0],
  ability: p[1],
  learningStyle: p[2],
  personality: p[3],
  socialSkill: p[4],
  behaviour: p[5],
  note: p[6],
  avatar: p[7],
}));

export const groups = [
  { id: 1, name: 'Group 1', tone: 'lavender' },
  { id: 2, name: 'Group 2', tone: 'peach' },
  { id: 3, name: 'Group 3', tone: 'pink' },
  { id: 4, name: 'Group 4', tone: 'lilac' },
];

// Amaka, Zara Okafor, and 4 additional classmates who stand up to answer Civic Education questions
export const QUESTION_PROMPTS = [
  {
    question: 'Why is voting by secret ballot important in our electoral process?',
    responses: {
      'learner-1': {
        answer: 'Amaka: A secret ballot lets every citizen vote freely without fear or pressure from anyone.',
        boardText: 'Amaka: Secret ballot = free choice',
        teacherReply: 'Teacher: Spot on, Amaka! Protecting voter privacy keeps elections fair.',
      },
      'learner-3': {
        answer: 'Zara Okafor: When votes are private and counted openly, people trust the election results.',
        boardText: 'Okafor: Privacy builds civic trust',
        teacherReply: 'Teacher: Thoughtful answer, Zara Okafor! Trust is the heart of democracy.',
      },
      'learner-2': {
        answer: 'Bayo: Every eligible citizen gets one equal vote, no matter their background.',
        boardText: 'Bayo: One citizen, one equal vote',
        teacherReply: 'Teacher: Exactly right, Bayo! Equality at the ballot box is a key civic right.',
      },
      'learner-4': {
        answer: 'Kene: At the polling unit, voters verify their PVC, mark their ballot, and drop it in the box.',
        boardText: 'Kene: Verify PVC -> Mark -> Ballot Box',
        teacherReply: 'Teacher: Great step-by-step recall, Kene!',
      },
      'learner-6': {
        answer: 'Adaeze: Peaceful voting lets communities choose responsible leaders without conflict.',
        boardText: 'Adaeze: Peaceful voting = strong leaders',
        teacherReply: 'Teacher: Well said, Adaeze! Civic responsibility keeps our school and nation peaceful.',
      },
      'learner-9': {
        answer: 'Emeka: Counting ballots transparently in front of agents stops cheating and errors.',
        boardText: 'Emeka: Open counting = fair results',
        teacherReply: 'Teacher: Sharp observation, Emeka! Transparency protects every single vote.',
      },
    },
  },
  {
    question: 'What are the main stages of the electoral process from start to finish?',
    responses: {
      'learner-1': {
        answer: 'Amaka: First comes voter registration, then peaceful campaigns where candidates share plans.',
        boardText: 'Amaka: Register -> Campaign -> Vote',
        teacherReply: 'Teacher: Excellent start, Amaka! Informed voters listen to ideas first.',
      },
      'learner-3': {
        answer: 'Zara Okafor: Next is polling day, followed by counting ballots and announcing the winner.',
        boardText: 'Okafor: Poll Day -> Count -> Declare',
        teacherReply: 'Teacher: Clear and concise, Zara Okafor!',
      },
      'learner-2': {
        answer: 'Bayo: Civic education teaches citizens how to vote properly so ballots are not voided.',
        boardText: 'Bayo: Civic education stops void votes',
        teacherReply: 'Teacher: Very true, Bayo! Knowing how to thumbprint neatly matters.',
      },
      'learner-4': {
        answer: 'Kene: Electoral officers set up polling booths early and check the voter register.',
        boardText: 'Kene: Check register at polling unit',
        teacherReply: 'Teacher: Practical and accurate, Kene!',
      },
      'learner-6': {
        answer: 'Adaeze: Citizens must obey electoral laws and respect the final result peacefully.',
        boardText: 'Adaeze: Respect law & election results',
        teacherReply: 'Teacher: True civic maturity, Adaeze!',
      },
      'learner-9': {
        answer: 'Emeka: Even here at Estate Model High School, we can practise fair elections for prefects!',
        boardText: 'Emeka: Fair prefect elections at school',
        teacherReply: 'Teacher: What a great connection to Estate Model High School, Emeka!',
      },
    },
  },
];

export const QUESTION_RESPONDENT_IDS = [
  'learner-1', // Amaka Uche
  'learner-3', // Zara Okafor
  'learner-2', // Bayo Adeyemi
  'learner-4', // Kene Mensah
  'learner-6', // Adaeze Obi
  'learner-9', // Emeka Eze
];
