import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  groups,
  learners,
  QUESTION_PROMPTS,
  QUESTION_RESPONDENT_IDS,
} from './learners.js';
import { ClassroomStage } from './scene/ClassroomStage';
import { soundEngine } from './scene/soundEffects';

const asset = (name) => `/assets/${name}`;
const DEFAULT_SWING_IDS = ['learner-15', 'learner-18'];
const DEFAULT_FIELD_IDS = ['learner-11', 'learner-14', 'learner-17', 'learner-20'];

function Icon({ name, size = 20 }) {
  const paths = {
    home: <><path d="m3 10 9-7 9 7"/><path d="M5 9v11h14V9"/><path d="M9 20v-6h6v6"/></>,
    back: <><path d="m15 18-6-6 6-6"/><path d="M20 12H9"/></>,
    chevron: <path d="m9 18 6-6-6-6"/>,
    speaker: <><path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/></>,
    mute: <><path d="M11 5 6 9H3v6h3l5 4z"/><path d="m22 9-6 6"/><path d="m16 9 6 6"/></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="10" cy="7" r="4"/><path d="M20 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>,
    star: <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9z"/>,
    reset: <><path d="M3 12a9 9 0 1 0 2.6-6.4L3 8"/><path d="M3 3v5h5"/></>,
    check: <path d="m5 12 4 4L19 6"/>,
    lightbulb: <><path d="M9 18h6"/><path d="M10 22h4"/><path d="M8.2 14.5A7 7 0 1 1 15.8 14.5c-.9.7-1.5 1.7-1.7 2.5h-4.2c-.2-.8-.8-1.8-1.7-2.5Z"/></>,
    graduation: <><path d="m2 10 10-5 10 5-10 5z"/><path d="M6 12v5c3.5 2.5 8.5 2.5 12 0v-5"/><path d="M22 10v6"/></>,
    heart: <path d="M20.8 8.6c0 4.2-8.8 10.2-8.8 10.2S3.2 12.8 3.2 8.6A4.6 4.6 0 0 1 12 6.3a4.6 4.6 0 0 1 8.8 2.3Z"/>,
    message: <><path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8z"/></>,
    sparkle: <><path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="m19 16 .9 2.1L22 19l-2.1.9L19 22l-.9-2.1L16 19l2.1-.9z"/></>,
    chevronDown: <path d="m6 9 6 6 6-6"/>,
    chevronUp: <path d="m18 15-6-6-6 6"/>,
    camera: <><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></>,
    edit: <><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></>,
    close: <><path d="M18 6 6 18"/><path d="m6 6 12 12"/></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name] || paths.sparkle}
    </svg>
  );
}

function IconButton({ label, onClick, children, className = '' }) {
  return (
    <button type="button" className={`icon-button ${className}`} aria-label={label} title={label} onClick={onClick}>
      {children}
    </button>
  );
}

function App() {
  const [stage, setStage] = useState('welcome');
  const [profileIndex, setProfileIndex] = useState(0);
  const [assignments, setAssignments] = useState({});
  const [selectedLearnerId, setSelectedLearnerId] = useState(null);
  const [hoveredLearnerId, setHoveredLearnerId] = useState(null);
  const [cameraPreset, setCameraPreset] = useState('welcome');
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [notice, setNotice] = useState('');

  // Q&A, Teacher-Student interaction & Chalkboard state
  const [promptIndex, setPromptIndex] = useState(0);
  const [qaActive, setQaActive] = useState(false);
  const [answeredInRound, setAnsweredInRound] = useState([]);
  const [answeringStudentId, setAnsweringStudentId] = useState(null);
  const [lastAnsweredId, setLastAnsweredId] = useState(null);
  const [teacherTalking, setTeacherTalking] = useState(false);
  const [dialogue, setDialogue] = useState(null);
  const [boardTask, setBoardTask] = useState(null);
  const [boardHistory, setBoardHistory] = useState([]);
  const [qaAnswersCount, setQaAnswersCount] = useState(0);
  const [goalsScored, setGoalsScored] = useState(0);
  const [lastGoalScorer, setLastGoalScorer] = useState(null);
  const [footballRecallsCount, setFootballRecallsCount] = useState(0);
  const [fieldStudentIds, setFieldStudentIds] = useState(DEFAULT_FIELD_IDS);
  const [swingStudentIds, setSwingStudentIds] = useState(DEFAULT_SWING_IDS);
  const [recallingFromField, setRecallingFromField] = useState(false);
  const [teacherPursuitActive, setTeacherPursuitActive] = useState(false);

  const boardKeyRef = useRef(1);
  const answerTimerRef = useRef(null);
  const teacherTalkTimerRef = useRef(null);
  const fieldIdsRef = useRef(fieldStudentIds);
  const swingIdsRef = useRef(swingStudentIds);
  fieldIdsRef.current = fieldStudentIds;
  swingIdsRef.current = swingStudentIds;

  const placedCount = Object.keys(assignments).length;
  const outsideSet = useMemo(
    () => new Set([...fieldStudentIds, ...swingStudentIds]),
    [fieldStudentIds, swingStudentIds],
  );
  const outsideCount = outsideSet.size;
  const seatedCount = learners.filter(
    (learner) => !assignments[learner.id] && !outsideSet.has(learner.id),
  ).length;
  const membersFor = useCallback(
    (groupId) => learners.filter((learner) => assignments[learner.id] === groupId),
    [assignments],
  );
  const isComplete = groups.every((group) => membersFor(group.id).length === 5) && placedCount === 20;

  const raisedHandIds = useMemo(
    () => (qaActive ? QUESTION_RESPONDENT_IDS.filter((id) => !answeredInRound.includes(id)) : []),
    [qaActive, answeredInRound],
  );

  const qaScore = qaAnswersCount * 10;
  const boardScore = boardHistory.length * 10;
  const footballScore = goalsScored * 15 + footballRecallsCount * 15;
  const groupScore = placedCount * 5 + (isComplete ? 25 : 0);
  const totalScore = qaScore + boardScore + footballScore + groupScore;

  const scoreRank = useMemo(() => {
    if (totalScore >= 160) {
      return {
        grade: 'S',
        label: 'Star Citizen',
        summary: 'Outstanding Civic Education leadership, chalkboard notes, group balance, and sportsmanship on the field!',
      };
    }
    if (totalScore >= 100) {
      return {
        grade: 'A',
        label: 'Civic Leader',
        summary: 'Great classroom participation, active board writing, and prompt team spirit from the football pitch!',
      };
    }
    if (totalScore >= 45) {
      return {
        grade: 'B',
        label: 'Active Learner',
        summary: 'Strong engagement across Civic Education and the Estate Model High School sports field.',
      };
    }
    return {
      grade: 'C',
      label: 'Session Complete',
      summary: 'You explored Estate Model High School! Answer class Q&A, write on the board, group learners, or score a goal to raise your score.',
    };
  }, [totalScore]);

  const activePrompt = QUESTION_PROMPTS[promptIndex % QUESTION_PROMPTS.length];
  const activeLearner = learners[profileIndex];
  const inspectedLearnerId = hoveredLearnerId || selectedLearnerId;
  const inspectedLearner = learners.find((l) => l.id === inspectedLearnerId) || null;
  const selectedLearner = learners.find((l) => l.id === selectedLearnerId) || null;
  const dialogueStudent =
    learners.find((l) => l.id === (dialogue?.studentId || answeringStudentId || lastAnsweredId)) || null;

  useEffect(() => {
    soundEngine.enabled = soundEnabled;
  }, [soundEnabled]);

  useEffect(() => {
    return () => {
      if (answerTimerRef.current) window.clearTimeout(answerTimerRef.current);
      if (teacherTalkTimerRef.current) window.clearTimeout(teacherTalkTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'h' || event.key === 'H') {
        if (stage === 'arrange') {
          setDockCollapsed((prev) => !prev);
        }
      }
      if (event.key === 'Escape') {
        setSelectedLearnerId(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [stage]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(''), 3400);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const pulseTeacherTalking = useCallback((durationMs = 2600) => {
    setTeacherTalking(true);
    if (teacherTalkTimerRef.current) window.clearTimeout(teacherTalkTimerRef.current);
    teacherTalkTimerRef.current = window.setTimeout(() => {
      setTeacherTalking(false);
    }, durationMs);
  }, []);

  function speakCurrentScene() {
    if (!('speechSynthesis' in window)) {
      setNotice('Read-aloud is not available in this browser.');
      return;
    }
    const copy = {
      welcome: 'Welcome to Estate Model High School 3D classroom. Twenty learners are seated facing the Civic Education chalkboard. Drag learners into four groups of five, answer teacher questions, write on the board, or click the windows to explore the play field outside.',
      learners: `${activeLearner.name}. Academic ability: ${activeLearner.ability}. Learning style: ${activeLearner.learningStyle}. Personality: ${activeLearner.personality}. Social skill: ${activeLearner.socialSkill}. Behaviour: ${activeLearner.behaviour}. ${activeLearner.note}`,
      arrange: dialogue
        ? `${dialogue.speaker}. ${dialogue.text} ${dialogue.reply || ''}`
        : `Estate Model High School 3D Classroom. ${placedCount} of 20 learners are standing in groups, and ${seatedCount} remain seated facing the Civic Education board. Click any window to go outside to the play field.`,
      results: `Estate Model High School Score Page. Total score: ${totalScore} points, Rank ${scoreRank.grade} ${scoreRank.label}. Civic Education answers: ${qaAnswersCount}. Chalkboard notes: ${boardHistory.length}. Football goals: ${goalsScored}. Learners grouped: ${placedCount} of 20.`,
    }[stage];
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(copy);
    utterance.lang = 'en-NG';
    utterance.rate = 0.94;
    window.speechSynthesis.speak(utterance);
    setNotice('Reading scene aloud.');
  }

  const handleWindowEscape = useCallback(() => {
    setCameraPreset((curr) => {
      if (curr === 'field' || curr === 'playground') {
        setNotice('Flying back inside Estate Model High School classroom.');
        return 'overview';
      }
      setNotice('Escaped through the window to the Estate Model High School play field & playground!');
      return 'field';
    });
  }, []);

  const handleRecallAllFromField = useCallback(() => {
    setTeacherPursuitActive(true);
    setRecallingFromField(true);
    soundEngine.playWhistle();
    setDialogue({
      speaker: 'Teacher',
      text: 'Whistle! Off the swings and football pitch—everyone come inside through the classroom door right now!',
      reply: 'Teacher and all outdoor learners are walking in through the classroom door ready for Groups 1–4.',
      studentId: null,
    });
    pulseTeacherTalking(3400);
    setNotice('Teacher & students are coming in through the classroom door to join groups!');
  }, [pulseTeacherTalking]);

  const handleDoorClick = useCallback(() => {
    if (fieldIdsRef.current.length > 0 || swingIdsRef.current.length > 0) {
      handleRecallAllFromField();
      setCameraPreset((curr) => (curr === 'field' || curr === 'playground' ? 'overview' : curr));
      return;
    }
    setCameraPreset('overview');
    setNotice('Classroom door ready—drag learners onto Group 1–4 mats or click Ask Class!');
  }, [handleRecallAllFromField]);

  const handleSendToField = useCallback(
    (studentId) => {
      const learner = learners.find((l) => l.id === studentId);
      if (!learner) return;
      setRecallingFromField(false);
      setTeacherPursuitActive(true);
      setSelectedLearnerId(null);
      setSwingStudentIds((prev) => prev.filter((id) => id !== studentId));
      setFieldStudentIds((prev) => (prev.includes(studentId) ? prev : [...prev, studentId]));
      setDialogue({
        speaker: 'Teacher',
        text: `${learner.name.split(' ')[0]} slipped out the window onto the football pitch! I am going right after them!`,
        reply: 'Watch the Teacher hop out the window to pursue them back to Civic Education class.',
        studentId,
      });
      pulseTeacherTalking(3000);
      soundEngine.playWhistle();
      setNotice(`${learner.name} hopped out the window to play football! Teacher is pursuing!`);
    },
    [pulseTeacherTalking],
  );

  const handleSendToSwing = useCallback(
    (studentId) => {
      const learner = learners.find((l) => l.id === studentId);
      if (!learner) return;
      if (swingIdsRef.current.length >= 2 && !swingIdsRef.current.includes(studentId)) {
        soundEngine.playError();
        setNotice('Both swing seats are occupied—click a swinging learner to make room!');
        return;
      }
      setRecallingFromField(false);
      setSelectedLearnerId(null);
      setFieldStudentIds((prev) => prev.filter((id) => id !== studentId));
      setSwingStudentIds((prev) => (prev.includes(studentId) ? prev : [...prev, studentId]));
      setCameraPreset('playground');
      soundEngine.playPickup();
      setNotice(`${learner.name} ran out to play on the swings!`);
    },
    [],
  );

  const handleSwingClick = useCallback(() => {
    if (swingIdsRef.current.length === 0) {
      setSwingStudentIds(DEFAULT_SWING_IDS);
      setFieldStudentIds((prev) => prev.filter((id) => !DEFAULT_SWING_IDS.includes(id)));
      setNotice('Chinonso & Zainab headed out to play on the playground swings!');
    } else {
      setNotice('Viewing learners playing on the playground swings!');
    }
    setCameraPreset('playground');
  }, []);

  const handleStartFieldFootball = useCallback(() => {
    const squad = ['learner-4', 'learner-2', 'learner-9', 'learner-1', 'learner-3', 'learner-6'];
    setRecallingFromField(false);
    setTeacherPursuitActive(true);
    setSelectedLearnerId(null);
    setSwingStudentIds((prev) => prev.filter((id) => !squad.includes(id)));
    setFieldStudentIds((prev) => Array.from(new Set([...prev, ...squad])));
    setCameraPreset('field');
    setDialogue({
      speaker: 'Teacher',
      text: 'Class! Kene, Bayo, Emeka, Amaka, Okafor & Adaeze jumped out the window to play football! Back to class!',
      reply: 'Teacher is chasing them across the pitch with her cane—click "Recall Class" or click the Teacher!',
      studentId: null,
    });
    pulseTeacherTalking(3600);
    soundEngine.playWhistle();
    setNotice('Students are playing on the field while Teacher pursues them!');
  }, [pulseTeacherTalking]);

  const finishOutdoorRecall = useCallback(() => {
    setRecallingFromField(false);
    setTeacherPursuitActive(false);
    setFootballRecallsCount((count) => count + 1);
    setDialogue({
      speaker: 'Teacher',
      text: 'Good! Everyone came back inside through the classroom door to Estate Model High School! (+15 pts)',
      reply: 'Students are ready—place them into Groups 1–4 to simulate class groups or open the Score Page!',
      studentId: null,
      showScoreBtn: true,
    });
    soundEngine.playTeacherPraise();
    setNotice('Everyone is entering through the classroom door (+15 pts)! Place students into Groups 1–4.');
  }, []);

  const handleReturnStudentFromField = useCallback(
    (studentId) => {
      const learner = learners.find((l) => l.id === studentId);
      setFieldStudentIds((prev) => {
        const next = prev.filter((id) => id !== studentId);
        if (next.length === 0 && swingIdsRef.current.length === 0) {
          finishOutdoorRecall();
        } else if (learner) {
          setNotice(`${learner.name.split(' ')[0]} walked in through the classroom door!`);
        }
        return next;
      });
    },
    [finishOutdoorRecall],
  );

  const handleReturnStudentFromSwing = useCallback(
    (studentId) => {
      const learner = learners.find((l) => l.id === studentId);
      setSwingStudentIds((prev) => {
        const next = prev.filter((id) => id !== studentId);
        if (next.length === 0 && fieldIdsRef.current.length === 0) {
          finishOutdoorRecall();
        } else if (learner) {
          setNotice(`${learner.name.split(' ')[0]} left the swing and entered through the classroom door!`);
        }
        return next;
      });
    },
    [finishOutdoorRecall],
  );

  const handleGoalScored = useCallback((scorerName) => {
    setGoalsScored((count) => count + 1);
    setLastGoalScorer(scorerName);
    setNotice(`GOAL! ${scorerName} scored on the Estate Model High School pitch (+15 pts)!`);
  }, []);

  const startQuestionRound = useCallback(
    (advancePrompt = false) => {
      const nextIdx = advancePrompt ? (promptIndex + 1) % QUESTION_PROMPTS.length : promptIndex;
      const nextPrompt = QUESTION_PROMPTS[nextIdx];
      if (advancePrompt) {
        setPromptIndex(nextIdx);
      }
      if (answerTimerRef.current) window.clearTimeout(answerTimerRef.current);
      setQaActive(true);
      setAnsweredInRound([]);
      setAnsweringStudentId(null);
      setLastAnsweredId(null);
      setDialogue({
        speaker: 'Teacher',
        text: nextPrompt.question,
        reply: 'Amaka, Zara Okafor, Bayo, Kene, Adaeze & Emeka stood up with hands raised! Click any raised hand to hear their answer—or drag them to a Group mat anytime.',
        studentId: null,
      });
      pulseTeacherTalking(3000);
      soundEngine.playTeacherPrompt();
      window.setTimeout(() => soundEngine.playHandRaise(), 240);
      setNotice('Amaka, Okafor & 4 classmates stood up! Click a raised hand or drag them to a group.');
    },
    [promptIndex, pulseTeacherTalking],
  );

  const handleAnswerStudent = useCallback(
    (studentId) => {
      const learner = learners.find((l) => l.id === studentId);
      if (!learner) return;
      const prompt = QUESTION_PROMPTS[promptIndex % QUESTION_PROMPTS.length];
      const resp = prompt.responses[studentId] || {
        answer: `${learner.name.split(' ')[0]}: Working together lets everyone share their best strengths!`,
        boardText: `${learner.name.split(' ')[0]}: Teamwork counts!`,
        teacherReply: `Teacher: Great thinking, ${learner.name.split(' ')[0]}!`,
      };

      if (answerTimerRef.current) window.clearTimeout(answerTimerRef.current);
      setAnsweringStudentId(studentId);
      setLastAnsweredId(studentId);
      setSelectedLearnerId(studentId);
      setAnsweredInRound((prev) => (prev.includes(studentId) ? prev : [...prev, studentId]));
      setQaAnswersCount((count) => count + 1);
      setDialogue({
        speaker: learner.name,
        text: resp.answer,
        reply: resp.teacherReply,
        studentId,
      });
      pulseTeacherTalking(3200);
      soundEngine.playTeacherPraise();
      setNotice(`${learner.name} answered (+10 pts)! You can send them to the board or place them in a group.`);

      answerTimerRef.current = window.setTimeout(() => {
        setAnsweringStudentId((curr) => (curr === studentId ? null : curr));
      }, 3600);
    },
    [promptIndex, pulseTeacherTalking],
  );

  const handleTeacherClick = useCallback(() => {
    if (teacherPursuitActive && (fieldStudentIds.length > 0 || swingStudentIds.length > 0)) {
      handleRecallAllFromField();
      return;
    }
    if (!qaActive) {
      startQuestionRound(false);
      return;
    }
    if (raisedHandIds.length > 0) {
      handleAnswerStudent(raisedHandIds[0]);
      return;
    }
    startQuestionRound(true);
  }, [
    teacherPursuitActive,
    fieldStudentIds.length,
    swingStudentIds.length,
    handleRecallAllFromField,
    qaActive,
    raisedHandIds,
    startQuestionRound,
    handleAnswerStudent,
  ]);

  const handleSendToBoard = useCallback(
    (studentId) => {
      const learner = learners.find((l) => l.id === studentId);
      if (!learner) return;
      if (boardTask) {
        setNotice(`${boardTask.author} is currently writing at the board—just a moment!`);
        return;
      }
      const prompt = QUESTION_PROMPTS[promptIndex % QUESTION_PROMPTS.length];
      const customText =
        prompt.responses[studentId]?.boardText ||
        `${learner.name.split(' ')[0]}: ${learner.learningStyle} teamwork!`;

      const nextKey = boardKeyRef.current++;
      setBoardTask({
        studentId,
        author: learner.name.split(' ')[0],
        text: customText,
        key: nextKey,
      });
      setAnsweringStudentId(null);
      setSelectedLearnerId(studentId);
      setDialogue({
        speaker: 'Teacher',
        text: `Please come up to the chalkboard, ${learner.name.split(' ')[0]}, and write your idea for the class.`,
        reply: `Writing: "${customText}"`,
        studentId,
      });
      pulseTeacherTalking(3000);
      soundEngine.playTeacherPrompt();
      setNotice(`${learner.name} is walking to the chalkboard to write!`);
    },
    [boardTask, promptIndex, pulseTeacherTalking],
  );

  const handleBoardComplete = useCallback(
    (studentId) => {
      const learner = learners.find((l) => l.id === studentId);
      const author = learner ? learner.name.split(' ')[0] : 'Learner';
      setBoardTask((current) => {
        if (!current || current.studentId !== studentId) return current;
        setBoardHistory((prev) => {
          const exists = prev.some((e) => e.author === current.author && e.text === current.text);
          if (exists) return prev;
          return [...prev, { author: current.author, text: current.text }].slice(-8);
        });
        return null;
      });
      setDialogue({
        speaker: 'Teacher',
        text: `Well written on the board, ${author}! Everyone can see your notes clearly now.`,
        reply: `${author} returned to ${assignments[studentId] ? `Group ${assignments[studentId]}` : 'their seat'} (+10 pts).`,
        studentId,
      });
      pulseTeacherTalking(2400);
      soundEngine.playTeacherPraise();
      setNotice(`${learner?.name || author} wrote on the chalkboard (+10 pts)!`);
    },
    [assignments, pulseTeacherTalking],
  );

  const assignLearner = useCallback(
    (learnerId, groupId) => {
      const currentGroup = assignments[learnerId];
      if (currentGroup === groupId) {
        setSelectedLearnerId(null);
        setNotice('Already standing in this group.');
        return true;
      }
      const currentMembers = learners.filter((l) => assignments[l.id] === groupId);
      if (currentMembers.length >= 5) {
        soundEngine.playError();
        setNotice(`Group ${groupId} already has 5 standing learners.`);
        return false;
      }

      const nextAssignments = { ...assignments, [learnerId]: groupId };
      setAssignments(nextAssignments);
      setFieldStudentIds((prev) => prev.filter((id) => id !== learnerId));
      setSwingStudentIds((prev) => prev.filter((id) => id !== learnerId));
      setSelectedLearnerId(null);

      const learner = learners.find((item) => item.id === learnerId);
      const nextCount = currentMembers.length + 1;
      const totalPlaced = Object.keys(nextAssignments).length;

      if (totalPlaced === 20) {
        soundEngine.playVictory();
        setNotice('All 20 learners are standing in groups (+25 bonus)! Open Score Page.');
      } else if (nextCount === 5) {
        soundEngine.playGroupComplete();
        setNotice(`Group ${groupId} is complete (5/5)!`);
      } else {
        soundEngine.playStandInGroup(nextCount - 1);
        setNotice(`${learner?.name || 'Learner'} stood up in Group ${groupId}.`);
      }
      return true;
    },
    [assignments],
  );

  const unassignLearner = useCallback((learnerId) => {
    setAssignments((current) => {
      if (!current[learnerId]) return current;
      const next = { ...current };
      delete next[learnerId];
      return next;
    });
    const learner = learners.find((item) => item.id === learnerId);
    setSelectedLearnerId(null);
    setNotice(`${learner?.name || 'Learner'} returned to sit on their chair.`);
  }, []);

  function enterClassroom() {
    setStage('arrange');
    setCameraPreset('overview');
    startQuestionRound(false);
  }

  function handleOpenScorePage() {
    soundEngine.playVictory();
    setSelectedLearnerId(null);
    setHoveredLearnerId(null);
    setCameraPreset('results');
    setStage('results');
  }

  function resetSimulation() {
    soundEngine.playReturnToChair();
    if (answerTimerRef.current) window.clearTimeout(answerTimerRef.current);
    setAssignments({});
    setSelectedLearnerId(null);
    setQaActive(false);
    setAnsweredInRound([]);
    setAnsweringStudentId(null);
    setLastAnsweredId(null);
    setBoardTask(null);
    setBoardHistory([]);
    setQaAnswersCount(0);
    setGoalsScored(0);
    setLastGoalScorer(null);
    setFootballRecallsCount(0);
    setFieldStudentIds([]);
    setSwingStudentIds([]);
    setRecallingFromField(false);
    setTeacherPursuitActive(false);
    setDialogue(null);
    setNotice('All 20 learners are seated back on their chairs.');
  }

  function restart() {
    resetSimulation();
    setFieldStudentIds(DEFAULT_FIELD_IDS);
    setSwingStudentIds(DEFAULT_SWING_IDS);
    setProfileIndex(0);
    setCameraPreset('welcome');
    setStage('welcome');
  }

  const groupInsights = useMemo(
    () =>
      groups.map((group) => {
        const members = learners.filter((l) => assignments[l.id] === group.id);
        const abilityMix = new Set(members.map((l) => l.ability)).size;
        const styleMix = new Set(members.map((l) => l.learningStyle)).size;
        return { ...group, members, abilityMix, styleMix };
      }),
    [assignments],
  );

  const boardCandidateId =
    selectedLearner?.id || answeringStudentId || lastAnsweredId || raisedHandIds[0] || 'learner-1';
  const boardCandidate = learners.find((l) => l.id === boardCandidateId) || learners[0];

  return (
    <main className="app-shell-3d">
      {/* Dedicated Full-Viewport 3D Three.js Canvas */}
      <ClassroomStage
        learners={learners}
        assignments={assignments}
        selectedLearnerId={selectedLearnerId}
        cameraPreset={cameraPreset}
        interactive={stage === 'arrange'}
        raisedHandIds={stage === 'arrange' ? raisedHandIds : []}
        answeringStudentId={stage === 'arrange' ? answeringStudentId : null}
        teacherTalking={teacherTalking}
        boardTask={boardTask}
        boardHistory={boardHistory}
        fieldStudentIds={stage === 'arrange' || stage === 'welcome' ? fieldStudentIds : []}
        swingStudentIds={stage === 'arrange' || stage === 'welcome' ? swingStudentIds : []}
        recallingFromField={recallingFromField}
        teacherPursuitActive={stage === 'arrange' && teacherPursuitActive}
        onSelectLearner={setSelectedLearnerId}
        onHoverLearner={setHoveredLearnerId}
        onAssignLearner={assignLearner}
        onUnassignLearner={unassignLearner}
        onSendToBoard={handleSendToBoard}
        onBoardComplete={handleBoardComplete}
        onAnswerStudent={handleAnswerStudent}
        onTeacherClick={handleTeacherClick}
        onWindowClick={handleWindowEscape}
        onDoorClick={handleDoorClick}
        onSwingClick={handleSwingClick}
        onSendToField={handleSendToField}
        onSendToSwing={handleSendToSwing}
        onReturnStudentFromField={handleReturnStudentFromField}
        onReturnStudentFromSwing={handleReturnStudentFromSwing}
        onGoalScored={handleGoalScored}
      />

      {/* Stage 1: Welcome Overlay */}
      {stage === 'welcome' && (
        <section className="overlay-center" aria-label="Welcome to Estate Model High School 3D">
          <div className="welcome-card-3d">
            <div className="welcome-brand">
              <span className="brand-flower">
                <Icon name="sparkle" size={17} />
              </span>
              <span>Estate Model High School</span>
            </div>
            <p className="eyebrow">CIVIC EDUCATION · 3D CLASSROOM</p>
            <h1>Voting, Teamwork &amp; Electoral Process</h1>
            <p className="welcome-copy">
              All 20 students sit facing the Civic Education chalkboard. Drag learners into 4 groups of 5, hear Amaka, Zara Okafor &amp; classmates answer questions, write on the board, or click the windows to explore the play field outside.
            </p>
            <div className="welcome-meta-line">
              <span>20 seated learners</span>
              <span aria-hidden="true">·</span>
              <span>Civic Education Q&amp;A</span>
              <span aria-hidden="true">·</span>
              <span>Play field &amp; playground</span>
            </div>
            <div className="welcome-btn-row">
              <button className="primary-button" type="button" onClick={enterClassroom}>
                Play 3D Classroom <Icon name="chevron" size={17} />
              </button>
              <button
                className="quiet-button"
                type="button"
                onClick={() => {
                  setStage('learners');
                  setCameraPreset('chairs');
                }}
              >
                Meet learners first
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Stage 2: Meet the Learners Profile Overlay */}
      {stage === 'learners' && (
        <section className="overlay-center" aria-label="Meet the learners">
          <div className="learners-modal-card">
            <header className="scene-heading">
              <IconButton
                label="Back to welcome"
                onClick={() => {
                  setStage('welcome');
                  setCameraPreset('welcome');
                }}
              >
                <Icon name="back" />
              </IconButton>
              <div>
                <p className="eyebrow">GET TO KNOW YOUR CLASS</p>
                <h1>Meet the learners</h1>
              </div>
              <div className="heading-spacer" />
              <span className="count-label">{profileIndex + 1} of 20</span>
            </header>

            <div className="learners-content">
              <div className="learner-photo-wrap">
                <img
                  className="learner-feature-photo"
                  src={activeLearner.avatar}
                  alt={`Portrait representing ${activeLearner.name}`}
                  draggable={false}
                  referrerPolicy="no-referrer"
                />
                <div className="photo-caption">Learner profile</div>
                <div className="profile-progress-dots" aria-label={`Learner ${profileIndex + 1} of 20`}>
                  {learners.slice(0, 10).map((learner, index) => (
                    <button
                      key={learner.id}
                      type="button"
                      className={index === profileIndex % 10 ? 'active' : ''}
                      onClick={() => setProfileIndex(index)}
                      aria-label={`View learner ${index + 1}`}
                    />
                  ))}
                </div>
              </div>

              <article className="profile-detail-card">
                <div className="profile-title-row">
                  <div>
                    <p className="eyebrow">LEARNER PROFILE</p>
                    <h2>{activeLearner.name}</h2>
                  </div>
                  <span className="profile-number">#{String(profileIndex + 1).padStart(2, '0')}</span>
                </div>
                <div className="attribute-list">
                  <div className="attribute">
                    <span className="attribute-icon"><Icon name="star" size={17} /></span>
                    <span><small>Ability</small><strong>{activeLearner.ability}</strong></span>
                  </div>
                  <div className="attribute">
                    <span className="attribute-icon"><Icon name="graduation" size={18} /></span>
                    <span><small>Learning style</small><strong>{activeLearner.learningStyle}</strong></span>
                  </div>
                  <div className="attribute">
                    <span className="attribute-icon"><Icon name="heart" size={17} /></span>
                    <span><small>Personality</small><strong>{activeLearner.personality}</strong></span>
                  </div>
                  <div className="attribute">
                    <span className="attribute-icon"><Icon name="users" size={17} /></span>
                    <span><small>Social skill</small><strong>{activeLearner.socialSkill}</strong></span>
                  </div>
                  <div className="attribute">
                    <span className="attribute-icon"><Icon name="message" size={17} /></span>
                    <span><small>Behaviour</small><strong>{activeLearner.behaviour}</strong></span>
                  </div>
                </div>
                <div className="learner-note">
                  <span className="note-bulb"><Icon name="lightbulb" size={19} /></span>
                  <div>
                    <strong>Teacher note</strong>
                    <p>{activeLearner.note}</p>
                  </div>
                </div>
                <div className="profile-actions">
                  <button
                    className="quiet-button"
                    type="button"
                    disabled={profileIndex === 0}
                    onClick={() => setProfileIndex((value) => Math.max(0, value - 1))}
                  >
                    Previous
                  </button>
                  <button
                    className="primary-button"
                    type="button"
                    onClick={() => setProfileIndex((value) => (value + 1) % learners.length)}
                  >
                    Next learner <Icon name="chevron" size={16} />
                  </button>
                </div>
              </article>

              <aside className="learner-quick-list">
                <div className="quick-list-heading">
                  <strong>Class snapshots</strong>
                  <span>Explore</span>
                </div>
                <div className="quick-list-grid">
                  {learners.slice(0, 4).map((learner) => (
                    <button
                      className={`quick-learner ${activeLearner.id === learner.id ? 'selected' : ''}`}
                      key={learner.id}
                      type="button"
                      onClick={() =>
                        setProfileIndex(learners.findIndex((item) => item.id === learner.id))
                      }
                    >
                      <img
                        src={learner.avatar}
                        alt=""
                        draggable={false}
                        referrerPolicy="no-referrer"
                      />
                      <span>{learner.name.split(' ')[0]}</span>
                    </button>
                  ))}
                </div>
                <div className="quick-list-foot">20 unique learner profiles</div>
              </aside>
            </div>

            <footer className="learners-footer">
              <p>Look beyond ability. Every learner brings different strengths to the classroom.</p>
              <button className="primary-button" type="button" onClick={enterClassroom}>
                Enter 3D Classroom <Icon name="chevron" size={17} />
              </button>
            </footer>
          </div>
        </section>
      )}

      {/* Stage 3: 3D Game HUD (Top minimal bar + Hover Inspector + Teacher Dialogue + Collapsible Dock) */}
      {stage === 'arrange' && (
        <>
          <header className="hud-top-bar">
            <div className="hud-brand-zone">
              <span className="brand-flower">
                <Icon name="sparkle" size={15} />
              </span>
              <span className="hud-brand-name">Estate Model High</span>
            </div>

            <div className="hud-status-text">
              <span>Seated: <strong>{seatedCount}</strong></span>
              <span aria-hidden="true">·</span>
              <span>Groups: <strong>{placedCount} / 20</strong></span>
              <span aria-hidden="true">·</span>
              <span>Outside: <strong>{outsideCount}</strong></span>
              <span aria-hidden="true">·</span>
              <span>Board: <strong>{boardHistory.length}</strong></span>
              <span aria-hidden="true">·</span>
              <span>Goals: <strong>{goalsScored}</strong></span>
              <span aria-hidden="true">·</span>
              <span>Score: <strong>{totalScore}</strong></span>
            </div>

            <div className="hud-actions-zone">
              <button
                type="button"
                className="hud-btn"
                onClick={() => {
                  setStage('learners');
                  setCameraPreset('chairs');
                }}
              >
                <Icon name="users" size={15} />
                <span>Profiles</span>
              </button>
              <button
                type="button"
                className="hud-btn"
                onClick={() => setSoundEnabled((prev) => !prev)}
                aria-label={soundEnabled ? 'Mute sound effects' : 'Enable sound effects'}
              >
                <Icon name={soundEnabled ? 'speaker' : 'mute'} size={15} />
                <span>{soundEnabled ? 'Sound On' : 'Muted'}</span>
              </button>
              <button
                type="button"
                className="hud-btn"
                onClick={speakCurrentScene}
              >
                Read Aloud
              </button>
            </div>
          </header>

          {/* Compact Inspector Card (Appears while hovering or selecting a 3D student) */}
          {inspectedLearner && (
            <aside className="hud-inspector-card" aria-live="polite">
              <div className="inspector-head">
                <img
                  src={inspectedLearner.avatar}
                  alt={inspectedLearner.name}
                  draggable={false}
                  referrerPolicy="no-referrer"
                />
                <div>
                  <strong>{inspectedLearner.name}</strong>
                  <span>
                    {swingStudentIds.includes(inspectedLearner.id)
                      ? 'Swinging on the playground · Click to call inside'
                      : fieldStudentIds.includes(inspectedLearner.id)
                        ? 'Playing football on field · Click to call inside'
                        : raisedHandIds.includes(inspectedLearner.id)
                          ? 'Hand raised · Click to answer or drag to group'
                          : assignments[inspectedLearner.id]
                            ? `Standing in Group ${assignments[inspectedLearner.id]}`
                            : 'Seated on chair · Drag to group, board, or window'}
                  </span>
                </div>
              </div>
              <div className="inspector-traits">
                <div><small>Ability</small><strong>{inspectedLearner.ability}</strong></div>
                <div><small>Style</small><strong>{inspectedLearner.learningStyle}</strong></div>
                <div><small>Social</small><strong>{inspectedLearner.socialSkill}</strong></div>
                <div><small>Personality</small><strong>{inspectedLearner.personality}</strong></div>
              </div>
              <p className="inspector-note">{inspectedLearner.note}</p>
            </aside>
          )}

          {/* Teacher & Student Interaction Dialogue Card (Top-right corner, clear of center 3D view) */}
          {dialogue && (
            <aside className="hud-dialogue-card" aria-label="Teacher and student interaction">
              <div className="dialogue-header">
                <div className="dialogue-speaker-row">
                  {dialogueStudent && dialogue.speaker !== 'Teacher' ? (
                    <img
                      className="dialogue-avatar"
                      src={dialogueStudent.avatar}
                      alt={dialogueStudent.name}
                      draggable={false}
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <span className="dialogue-teacher-badge">
                      <Icon name="graduation" size={15} />
                    </span>
                  )}
                  <div>
                    <p className="eyebrow">TEACHER · STUDENT INTERACTION</p>
                    <strong>{dialogue.speaker}</strong>
                  </div>
                </div>
                <button
                  type="button"
                  className="dialogue-close-btn"
                  aria-label="Close dialogue"
                  onClick={() => setDialogue(null)}
                >
                  <Icon name="close" size={14} />
                </button>
              </div>

              <p className="dialogue-main-text">{dialogue.text}</p>
              {dialogue.reply && <p className="dialogue-reply-text">{dialogue.reply}</p>}

              {qaActive && (
                <div className="dialogue-meta-row">
                  <span>
                    {raisedHandIds.length > 0
                      ? `${raisedHandIds.length} hands raised (${raisedHandIds
                          .map((id) => learners.find((l) => l.id === id)?.name.split(' ')[0])
                          .join(', ')})`
                      : `All 6 students answered "${activePrompt.question.slice(0, 34)}..."`}
                  </span>
                </div>
              )}

              <div className="dialogue-actions">
                {qaActive && raisedHandIds.length > 0 && (
                  <button
                    type="button"
                    className="quiet-button dialogue-btn"
                    onClick={() => handleAnswerStudent(raisedHandIds[0])}
                  >
                    Call {learners.find((l) => l.id === raisedHandIds[0])?.name.split(' ')[0]}
                  </button>
                )}

                {dialogue.studentId && (
                  <button
                    type="button"
                    className="quiet-button dialogue-btn"
                    disabled={Boolean(boardTask)}
                    onClick={() => handleSendToBoard(dialogue.studentId)}
                  >
                    <Icon name="edit" size={13} />
                    <span>Write on Board</span>
                  </button>
                )}

                <button
                  type="button"
                  className="primary-button dialogue-btn"
                  onClick={() => startQuestionRound(true)}
                >
                  Next Question
                </button>

                {dialogue.showScoreBtn && (
                  <button
                    type="button"
                    className="primary-button dialogue-btn"
                    onClick={handleOpenScorePage}
                  >
                    Score Page <Icon name="chevron" size={14} />
                  </button>
                )}
              </div>
            </aside>
          )}

          {/* Outdoor Field & Playground Banner (when viewer escaped out through the window) */}
          {(cameraPreset === 'field' || cameraPreset === 'playground') && (
            <aside className="hud-outdoor-card" aria-label="Outdoor play field controls">
              <div>
                <p className="eyebrow">OUTSIDE ESTATE MODEL HIGH SCHOOL</p>
                <strong>
                  {outsideCount > 0
                    ? `${swingStudentIds.length} on swings · ${fieldStudentIds.length} playing football${teacherPursuitActive ? ' · Teacher pursuing!' : ''}`
                    : cameraPreset === 'field'
                      ? 'School Sports Field & Vegetation'
                      : 'Schoolyard Playground & Swings'}
                </strong>
              </div>
              <div className="outdoor-btn-row">
                <button
                  type="button"
                  className="quiet-button dialogue-btn"
                  onClick={handleSwingClick}
                >
                  {swingStudentIds.length > 0 ? 'View Swings' : 'Play on Swings'}
                </button>
                <button
                  type="button"
                  className="quiet-button dialogue-btn"
                  onClick={handleStartFieldFootball}
                >
                  {teacherPursuitActive ? 'Add Squad & Chase' : 'Teacher Chase'}
                </button>
                {outsideCount > 0 && (
                  <button
                    type="button"
                    className="quiet-button dialogue-btn dock-active-qa"
                    onClick={handleRecallAllFromField}
                  >
                    Bring All to Class ({outsideCount})
                  </button>
                )}
                <button
                  type="button"
                  className={`quiet-button dialogue-btn ${cameraPreset === 'field' ? 'dock-active-qa' : ''}`}
                  onClick={() => setCameraPreset('field')}
                >
                  Sports Field
                </button>
                <button
                  type="button"
                  className={`quiet-button dialogue-btn ${cameraPreset === 'playground' ? 'dock-active-qa' : ''}`}
                  onClick={() => setCameraPreset('playground')}
                >
                  Playground
                </button>
                <button
                  type="button"
                  className="primary-button dialogue-btn"
                  onClick={() => setCameraPreset('overview')}
                >
                  Back Inside Class
                </button>
                <button
                  type="button"
                  className="quiet-button dialogue-btn"
                  onClick={handleOpenScorePage}
                >
                  Score Page
                </button>
              </div>
            </aside>
          )}

          {notice && (
            <div className="hud-toast" role="status">
              {notice}
            </div>
          )}

          {/* Collapsible Bottom Control Dock */}
          <div className={`hud-dock-wrap ${dockCollapsed ? 'collapsed' : ''}`}>
            <button
              type="button"
              className="dock-toggle-btn"
              onClick={() => setDockCollapsed((prev) => !prev)}
              aria-expanded={!dockCollapsed}
            >
              <Icon name={dockCollapsed ? 'chevronUp' : 'chevronDown'} size={15} />
              <span>{dockCollapsed ? 'Show Controls (H)' : 'Hide Controls (H)'}</span>
            </button>

            <div className="hud-dock">
              <div className="dock-row-groups">
                {groups.map((group) => {
                  const count = membersFor(group.id).length;
                  const canAssign = Boolean(selectedLearner) && count < 5;
                  return (
                    <button
                      key={group.id}
                      type="button"
                      disabled={!canAssign}
                      onClick={() => selectedLearner && assignLearner(selectedLearner.id, group.id)}
                      className={`dock-group-btn tone-${group.tone} ${count === 5 ? 'full' : ''} ${canAssign ? 'ready' : ''}`}
                      title={
                        selectedLearner
                          ? `Stand ${selectedLearner.name} in ${group.name}`
                          : `${group.name}: ${count}/5 standing`
                      }
                    >
                      <span className="dock-group-title">{group.name}</span>
                      <span className="dock-group-count">{count}/5</span>
                    </button>
                  );
                })}
              </div>

              <div className="dock-divider" aria-hidden="true" />

              <div className="dock-row-controls">
                <button
                  type="button"
                  className={`quiet-button dock-small-btn ${qaActive ? 'dock-active-qa' : ''}`}
                  onClick={() => startQuestionRound(qaActive && raisedHandIds.length === 0)}
                  title="Have Teacher ask the class a question so Amaka, Zara Okafor & 4 classmates raise hands"
                >
                  <Icon name="message" size={14} />
                  <span>Ask Class (Q&amp;A)</span>
                </button>

                <button
                  type="button"
                  className="quiet-button dock-small-btn"
                  disabled={Boolean(boardTask)}
                  onClick={() => handleSendToBoard(boardCandidate.id)}
                  title={`Send ${boardCandidate.name} to write on the chalkboard`}
                >
                  <Icon name="edit" size={14} />
                  <span>Write: {boardCandidate.name.split(' ')[0]}</span>
                </button>

                <button
                  type="button"
                  className="quiet-button dock-small-btn"
                  onClick={handleStartFieldFootball}
                  title="Send more students out through the window to play football while Teacher pursues them"
                >
                  <span>Football Chase</span>
                </button>

                {outsideCount > 0 && (
                  <button
                    type="button"
                    className="quiet-button dock-small-btn dock-active-qa"
                    onClick={handleRecallAllFromField}
                    title="Have Teacher and all students on the swings & field come inside through the classroom door to join Groups 1–4"
                  >
                    <span>Recall via Door ({outsideCount})</span>
                  </button>
                )}

                <div className="dock-cam-group" role="group" aria-label="Camera views">
                  <span className="dock-cam-icon"><Icon name="camera" size={14} /></span>
                  {(['overview', 'board', 'chairs', 'groups', 'field', 'playground']).map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setCameraPreset(preset)}
                      className={`dock-cam-btn ${cameraPreset === preset ? 'active' : ''}`}
                      title={
                        preset === 'field'
                          ? 'Escape through the window to visualize the play field outside'
                          : preset === 'playground'
                            ? 'Explore the playground outside the classroom window'
                            : undefined
                      }
                    >
                      {preset === 'overview'
                        ? 'Room'
                        : preset === 'board'
                          ? 'Board'
                          : preset === 'chairs'
                            ? 'Chairs'
                            : preset === 'groups'
                              ? 'Groups'
                              : preset === 'field'
                                ? 'Field'
                                : 'Play'}
                    </button>
                  ))}
                </div>

                {selectedLearner && assignments[selectedLearner.id] && (
                  <button
                    type="button"
                    className="quiet-button dock-small-btn"
                    onClick={() => {
                      unassignLearner(selectedLearner.id);
                      soundEngine.playReturnToChair();
                    }}
                  >
                    Seat on Chair
                  </button>
                )}

                <button
                  type="button"
                  className="quiet-button dock-small-btn"
                  onClick={resetSimulation}
                >
                  <Icon name="reset" size={15} />
                  <span>Reset</span>
                </button>

                <button
                  type="button"
                  className="primary-button dock-review-btn"
                  onClick={handleOpenScorePage}
                >
                  <span>Score Page</span>
                  <Icon name="chevron" size={16} />
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Stage 4: Final Score Page (Class + Football Scene) */}
      {stage === 'results' && (
        <section className="overlay-center" aria-label="Estate Model High School score page">
          <div className="results-modal-card">
            <header className="results-heading">
              <div className="heading-icon trophy"><span>✦</span></div>
              <div>
                <p className="eyebrow">ESTATE MODEL HIGH SCHOOL · FINAL SCORE</p>
                <h1>Class &amp; Play Field Scoreboard</h1>
              </div>
              <div className="heading-spacer" />
              <IconButton label="Read your score page aloud" onClick={speakCurrentScene}>
                <Icon name="speaker" />
              </IconButton>
            </header>

            <div className="results-content">
              <div className="success-card">
                <div className="success-star"><Icon name="star" size={28} /></div>
                <span className="score-rank-pill">Rank {scoreRank.grade} · {scoreRank.label}</span>
                <div className="score-total-hero">
                  <strong>{totalScore}</strong>
                  <span>Total Points</span>
                </div>
                <p className="success-copy">{scoreRank.summary}</p>
                <div className="success-stats">
                  <div><strong>{qaAnswersCount + boardHistory.length}</strong><span>Class Tasks</span></div>
                  <div><strong>{goalsScored}</strong><span>Goals Scored</span></div>
                  <div><strong>{placedCount}/20</strong><span>In Groups</span></div>
                </div>
                <div className="results-btn-stack">
                  <button
                    className="primary-button"
                    type="button"
                    onClick={() => {
                      setStage('arrange');
                      setCameraPreset(isComplete ? 'groups' : 'overview');
                    }}
                  >
                    Back to 3D Room
                  </button>
                  <button className="quiet-button" type="button" onClick={restart}>
                    <Icon name="reset" size={15} /> Play Again
                  </button>
                </div>
              </div>

              <div className="takeaways-card">
                <div className="takeaways-title">
                  <span className="takeaway-bulb"><Icon name="lightbulb" size={19} /></span>
                  <h2>Activity Score Breakdown</h2>
                </div>

                <div className="score-breakdown-list">
                  <div className="score-row">
                    <div>
                      <strong>Civic Education Q&amp;A</strong>
                      <small>{qaAnswersCount} {qaAnswersCount === 1 ? 'answer' : 'answers'} · 10 pts each</small>
                    </div>
                    <span className="score-pts">+{qaScore} pts</span>
                  </div>

                  <div className="score-row">
                    <div>
                      <strong>Chalkboard Writing</strong>
                      <small>{boardHistory.length} {boardHistory.length === 1 ? 'note' : 'notes'} written · 10 pts each</small>
                    </div>
                    <span className="score-pts">+{boardScore} pts</span>
                  </div>

                  <div className="score-row">
                    <div>
                      <strong>Play Field Football &amp; Recall</strong>
                      <small>
                        {goalsScored} {goalsScored === 1 ? 'goal' : 'goals'}
                        {lastGoalScorer ? ` (last: ${lastGoalScorer})` : ''} · {footballRecallsCount} {footballRecallsCount === 1 ? 'recall' : 'recalls'}
                      </small>
                    </div>
                    <span className="score-pts">+{footballScore} pts</span>
                  </div>

                  <div className="score-row">
                    <div>
                      <strong>Classroom Grouping</strong>
                      <small>{placedCount}/20 standing{isComplete ? ' · +25 full class bonus' : ''}</small>
                    </div>
                    <span className="score-pts">+{groupScore} pts</span>
                  </div>
                </div>

                <div className="score-takeaway-note">
                  <span className="check-mark"><Icon name="check" size={12} /></span>
                  <p>Civic teamwork shines both when learners share ideas on the board and when they return fairly from the pitch.</p>
                </div>

                <div className="group-summary-list">
                  {groupInsights.map((group) => (
                    <div className="group-summary" key={group.id}>
                      <span className="summary-dot" />
                      <strong>{group.name}</strong>
                      <span>
                        {group.members.length}/5 standing · {group.abilityMix} abilities · {group.styleMix} styles
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="results-photo">
                <img
                  src={asset('results-learner.jpg')}
                  alt="Smiling African learner in a purple school uniform"
                  draggable={false}
                  referrerPolicy="no-referrer"
                />
                <div className="photo-overlay-caption">
                  Estate Model High School · Civic pride in class &amp; fair play on the field.
                </div>
              </div>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}

export default App;
