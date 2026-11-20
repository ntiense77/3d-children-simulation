import { useCallback, useEffect, useMemo, useState } from 'react';
import { groups, learners } from './learners.js';
import { ClassroomStage } from './scene/ClassroomStage';
import { soundEngine } from './scene/soundEffects';

const asset = (name) => `/assets/${name}`;

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

  const placedCount = Object.keys(assignments).length;
  const seatedCount = learners.length - placedCount;
  const membersFor = useCallback(
    (groupId) => learners.filter((learner) => assignments[learner.id] === groupId),
    [assignments],
  );
  const isComplete = groups.every((group) => membersFor(group.id).length === 5) && placedCount === 20;

  const activeLearner = learners[profileIndex];
  const inspectedLearnerId = hoveredLearnerId || selectedLearnerId;
  const inspectedLearner = learners.find((l) => l.id === inspectedLearnerId) || null;
  const selectedLearner = learners.find((l) => l.id === selectedLearnerId) || null;

  useEffect(() => {
    soundEngine.enabled = soundEnabled;
  }, [soundEnabled]);

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
    const timer = window.setTimeout(() => setNotice(''), 3200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  function speakCurrentScene() {
    if (!('speechSynthesis' in window)) {
      setNotice('Read-aloud is not available in this browser.');
      return;
    }
    const copy = {
      welcome: 'Welcome to the 3D Bloomly classroom. Twenty learners are seated on their chairs. Drag each learner from their chair to stand in one of four groups of five.',
      learners: `${activeLearner.name}. Academic ability: ${activeLearner.ability}. Learning style: ${activeLearner.learningStyle}. Personality: ${activeLearner.personality}. Social skill: ${activeLearner.socialSkill}. Behaviour: ${activeLearner.behaviour}. ${activeLearner.note}`,
      arrange: `3D Classroom Game. ${placedCount} of 20 learners are standing in groups, and ${seatedCount} remain seated on chairs. Drag any seated student onto a group mat to make them stand there.`,
      results: 'Well done. All twenty learners are standing in four balanced groups of five.',
    }[stage];
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(copy);
    utterance.lang = 'en-NG';
    utterance.rate = 0.94;
    window.speechSynthesis.speak(utterance);
    setNotice('Reading scene aloud.');
  }

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
      setSelectedLearnerId(null);

      const learner = learners.find((item) => item.id === learnerId);
      const nextCount = currentMembers.length + 1;
      const totalPlaced = Object.keys(nextAssignments).length;

      if (totalPlaced === 20) {
        soundEngine.playVictory();
        setNotice('All 20 learners are standing in groups! Click Review Arrangement.');
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
    setNotice('Drag any seated student from their chair onto a Group mat to stand!');
  }

  function handleReview() {
    if (!isComplete) {
      soundEngine.playError();
      const open = groups
        .map((g) => `${g.name}: ${membersFor(g.id).length}/5`)
        .filter((item) => !item.endsWith('5/5'));
      setNotice(`Seat all 20 learners into groups of 5 first. ${open.join(' · ')}`);
      return;
    }
    soundEngine.playVictory();
    setSelectedLearnerId(null);
    setHoveredLearnerId(null);
    setCameraPreset('results');
    setStage('results');
  }

  function resetSimulation() {
    soundEngine.playReturnToChair();
    setAssignments({});
    setSelectedLearnerId(null);
    setNotice('All 20 learners are seated back on their chairs.');
  }

  function restart() {
    resetSimulation();
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

  return (
    <main className="app-shell-3d">
      {/* Dedicated Full-Viewport 3D Three.js Canvas */}
      <ClassroomStage
        learners={learners}
        assignments={assignments}
        selectedLearnerId={selectedLearnerId}
        cameraPreset={cameraPreset}
        interactive={stage === 'arrange'}
        onSelectLearner={setSelectedLearnerId}
        onHoverLearner={setHoveredLearnerId}
        onAssignLearner={assignLearner}
        onUnassignLearner={unassignLearner}
      />

      {/* Stage 1: Welcome Overlay */}
      {stage === 'welcome' && (
        <section className="overlay-center" aria-label="Welcome to Bloomly 3D">
          <div className="welcome-card-3d">
            <div className="welcome-brand">
              <span className="brand-flower">
                <Icon name="sparkle" size={17} />
              </span>
              <span>Bloomly 3D</span>
            </div>
            <p className="eyebrow">3D CLASSROOM GAME</p>
            <h1>Drag Seated Learners Into Groups</h1>
            <p className="welcome-copy">
              All 20 students start seated on their chairs. Pick them up in 3D and drop them onto the 4 group mats to stand in teams of 5.
            </p>
            <div className="welcome-meta-line">
              <span>20 seated learners</span>
              <span aria-hidden="true">·</span>
              <span>4 standing groups of 5</span>
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

      {/* Stage 3: 3D Game HUD (Top minimal bar + Hover Inspector + Collapsible Bottom Dock) */}
      {stage === 'arrange' && (
        <>
          <header className="hud-top-bar">
            <div className="hud-brand-zone">
              <span className="brand-flower">
                <Icon name="sparkle" size={15} />
              </span>
              <span className="hud-brand-name">Bloomly</span>
            </div>

            <div className="hud-status-text">
              <span>Seated on chairs: <strong>{seatedCount}</strong></span>
              <span aria-hidden="true">·</span>
              <span>Standing in groups: <strong>{placedCount} / 20</strong></span>
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

          {/* Compact Inspector Card (Appears only while hovering or selecting a 3D student) */}
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
                    {assignments[inspectedLearner.id]
                      ? `Standing in Group ${assignments[inspectedLearner.id]}`
                      : 'Seated on chair · Drag to a group'}
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
                <div className="dock-cam-group" role="group" aria-label="Camera views">
                  <span className="dock-cam-icon"><Icon name="camera" size={14} /></span>
                  {(['overview', 'chairs', 'groups'] ).map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setCameraPreset(preset)}
                      className={`dock-cam-btn ${cameraPreset === preset ? 'active' : ''}`}
                    >
                      {preset === 'overview' ? 'Room' : preset === 'chairs' ? 'Chairs' : 'Groups'}
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
                  className={`primary-button dock-review-btn ${isComplete ? 'ready-pulse' : ''}`}
                  onClick={handleReview}
                >
                  <span>Review</span>
                  <Icon name="chevron" size={16} />
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Stage 4: Results Overlay over the Celebrating 3D Groups */}
      {stage === 'results' && (
        <section className="overlay-center" aria-label="Simulation results">
          <div className="results-modal-card">
            <header className="results-heading">
              <div className="heading-icon trophy"><span>✦</span></div>
              <div>
                <p className="eyebrow">SIMULATION COMPLETE</p>
                <h1>Your 3D classroom groups</h1>
              </div>
              <div className="heading-spacer" />
              <IconButton label="Read your results aloud" onClick={speakCurrentScene}>
                <Icon name="speaker" />
              </IconButton>
            </header>

            <div className="results-content">
              <div className="success-card">
                <div className="success-star"><Icon name="star" size={30} /></div>
                <p className="eyebrow">CLASSROOM ARRANGEMENT</p>
                <h2>Well done!</h2>
                <p className="success-copy">
                  All 20 learners stood up from their chairs and formed four balanced groups of five.
                </p>
                <div className="success-stats">
                  <div><strong>20</strong><span>Learners standing</span></div>
                  <div><strong>4 × 5</strong><span>Group structure</span></div>
                </div>
                <div className="results-btn-stack">
                  <button
                    className="primary-button"
                    type="button"
                    onClick={() => {
                      setStage('arrange');
                      setCameraPreset('groups');
                    }}
                  >
                    Inspect 3D Room
                  </button>
                  <button className="quiet-button" type="button" onClick={restart}>
                    <Icon name="reset" size={15} /> Play Again
                  </button>
                </div>
              </div>

              <div className="takeaways-card">
                <div className="takeaways-title">
                  <span className="takeaway-bulb"><Icon name="lightbulb" size={20} /></span>
                  <h2>Key takeaways</h2>
                </div>
                <div className="takeaway-item">
                  <span className="check-mark"><Icon name="check" size={14} /></span>
                  <p>Consider different learner characteristics, including ability, behaviour and social skills.</p>
                </div>
                <div className="takeaway-item">
                  <span className="check-mark"><Icon name="check" size={14} /></span>
                  <p>Aim for balanced groups, while making room for different strengths and perspectives.</p>
                </div>
                <div className="takeaway-item">
                  <span className="check-mark"><Icon name="check" size={14} /></span>
                  <p>Be flexible. Observe how groups work and adjust when learners’ needs change.</p>
                </div>
                <div className="group-summary-list">
                  {groupInsights.map((group) => (
                    <div className="group-summary" key={group.id}>
                      <span className="summary-dot" />
                      <strong>{group.name}</strong>
                      <span>
                        {group.members.length} standing · {group.abilityMix} ability levels · {group.styleMix} styles
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
                <div className="photo-overlay-caption">Every learner has something to contribute.</div>
              </div>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}

export default App;
