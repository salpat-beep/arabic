import { useState, useEffect, useCallback } from "react";

// ============================================================
// VOCAB DATA — paste more entries here as you go along
// Format: { arabic, transliteration, meaning }
// ============================================================
const VOCAB = [
  { arabic: "أهلاً", transliteration: "ahlan", meaning: "hello" },
  { arabic: "مرحباً", transliteration: "marḥaban", meaning: "hello (formal)" },
  { arabic: "أهلاً وسهلاً", transliteration: "ahlan wa sahlan", meaning: "welcome" },
  { arabic: "أهلاً بك", transliteration: "ahlan bika", meaning: "welcome (to male)" },
  { arabic: "أهلاً بكِ", transliteration: "ahlan biki", meaning: "welcome (to female)" },
  { arabic: "صباح الخير", transliteration: "ṣabāḥ al-khayr", meaning: "good morning" },
  { arabic: "صباح النور", transliteration: "ṣabāḥ an-nūr", meaning: "response to good morning" },
  { arabic: "مساء الخير", transliteration: "masā al-khayr", meaning: "good evening" },
  { arabic: "مساء النور", transliteration: "masā an-nūr", meaning: "response to good evening" },
  { arabic: "مع السلامة", transliteration: "maʿa as-salāma", meaning: "goodbye" },
  { arabic: "أنا", transliteration: "anā", meaning: "I" },
  { arabic: "أنتَ", transliteration: "anta", meaning: "you (male)" },
  { arabic: "أنتِ", transliteration: "anti", meaning: "you (female)" },
  { arabic: "هو", transliteration: "huwa", meaning: "he" },
  { arabic: "هي", transliteration: "hiya", meaning: "she" },
  { arabic: "و", transliteration: "wa", meaning: "and" },
  { arabic: "أنا اسمي", transliteration: "anā ismī", meaning: "my name is" },
  { arabic: "تشرفنا", transliteration: "tasharrafnā", meaning: "pleased to meet you" },
  { arabic: "كيف الحال", transliteration: "kayfa al-ḥāl", meaning: "how are you" },
  { arabic: "الحمد لله", transliteration: "al-ḥamdu lillāh", meaning: "I'm well (praise be to God)" },
  { arabic: "أم", transliteration: "umm", meaning: "mother" },
  { arabic: "أب", transliteration: "ab", meaning: "father" },
  { arabic: "ابن", transliteration: "ibn", meaning: "son" },
  { arabic: "بنت", transliteration: "bint", meaning: "daughter" },
  { arabic: "ابنة", transliteration: "ibna", meaning: "daughter (formal)" },
  { arabic: "أخ", transliteration: "akh", meaning: "brother" },
  { arabic: "أخت", transliteration: "ukht", meaning: "sister" },
  { arabic: "زوج", transliteration: "zawj", meaning: "husband" },
  { arabic: "زوجة", transliteration: "zawja", meaning: "wife" },
  { arabic: "هذا", transliteration: "hādhā", meaning: "this (masc)" },
  { arabic: "هذه", transliteration: "hādhihi", meaning: "this (fem)" },
  { arabic: "بيت", transliteration: "bayt", meaning: "house" },
  { arabic: "تبن", transliteration: "tibn", meaning: "hay" },
  { arabic: "بن", transliteration: "bunn", meaning: "coffee beans" },
  { arabic: "تين", transliteration: "tīn", meaning: "figs" },
  { arabic: "زجاجة", transliteration: "zujāja", meaning: "bottle" },
  { arabic: "جريدة", transliteration: "jarīda", meaning: "newspaper" },
  { arabic: "خيمة", transliteration: "khayma", meaning: "tent" },
  { arabic: "نهر", transliteration: "nahr", meaning: "river" },
  { arabic: "حمار", transliteration: "ḥimār", meaning: "donkey" },
  { arabic: "دجاجة", transliteration: "dajāja", meaning: "chicken" },
  { arabic: "مدينة", transliteration: "madīna", meaning: "city" },
  { arabic: "من", transliteration: "man", meaning: "who" },
  { arabic: "مع", transliteration: "maʿa", meaning: "with" },
  { arabic: "أسكن في", transliteration: "askun fī", meaning: "I live in" },
];

const ROUND_SIZE = 20;
const shuffle = arr => [...arr].sort(() => Math.random() - 0.5);

// Generate 4 MC options: 1 correct + 3 random wrong
function getMCOptions(correct, allCards, direction) {
  const pool = allCards.filter(c => c.arabic !== correct.arabic);
  const wrongs = shuffle(pool).slice(0, 3).map(c => direction === "en2ar" ? c.arabic : c.meaning);
  const correctAns = direction === "en2ar" ? correct.arabic : correct.meaning;
  return shuffle([correctAns, ...wrongs]);
}

function getPrompt(card, direction) {
  return direction === "en2ar" ? card.meaning : card.arabic;
}
function getAnswer(card, direction) {
  return direction === "en2ar" ? card.arabic : card.meaning;
}

// ── SCREENS ──────────────────────────────────────────────────
const SCREEN = { HOME: "home", LEARN: "learn", TEST: "test", RESULTS: "results", TEST_RESULTS: "test_results" };

export default function App() {
  const [screen, setScreen] = useState(SCREEN.HOME);
  const [direction, setDirection] = useState("en2ar"); // en2ar | ar2en
  const [learnState, setLearnState] = useState(null);
  const [testState, setTestState] = useState(null);
  const [testResults, setTestResults] = useState(null);

  // Load mastery from localStorage
  const [mastery, setMastery] = useState(() => {
    try { return JSON.parse(localStorage.getItem("arabic_mastery") || "{}"); }
    catch { return {}; }
  });

  const saveMastery = useCallback(m => {
    setMastery(m);
    localStorage.setItem("arabic_mastery", JSON.stringify(m));
  }, []);

  const masteredCount = Object.values(mastery).filter(Boolean).length;

  // ── START LEARN ──────────────────────────────────────────
  function startLearn() {
    // Unmastered first, then mastered, all shuffled
    const unmastered = shuffle(VOCAB.filter(c => !mastery[c.arabic]));
    const masteredd = shuffle(VOCAB.filter(c => mastery[c.arabic]));
    const queue = [...unmastered, ...masteredd];
    const round = queue.slice(0, ROUND_SIZE);
    setLearnState({
      queue,
      roundCards: round,
      roundIndex: 0,
      wrongCards: [],
      phase: "mc", // mc | written | wrong_repeat
      mcOptions: getMCOptions(round[0], VOCAB, direction),
      input: "",
      feedback: null, // null | "correct" | "wrong"
      showAnswer: false,
      totalCorrect: 0,
      totalSeen: 0,
      sessionMastery: { ...mastery },
    });
    setScreen(SCREEN.LEARN);
  }

  // ── START TEST ───────────────────────────────────────────
  function startTest() {
    const cards = shuffle(VOCAB);
    setTestState({
      cards,
      index: 0,
      answers: {},
      input: "",
      mcOptions: getMCOptions(cards[0], VOCAB, direction),
      phase: "mc", // alternate mc / written by index
      submitted: false,
    });
    setScreen(SCREEN.TEST);
  }

  function resetProgress() {
    if (confirm("Reset all mastery progress?")) saveMastery({});
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0f1117", color: "#e8e8f0", fontFamily: "'Segoe UI', sans-serif" }}>
      {screen === SCREEN.HOME && <HomeScreen masteredCount={masteredCount} total={VOCAB.length} direction={direction} setDirection={setDirection} onLearn={startLearn} onTest={startTest} onReset={resetProgress} mastery={mastery} />}
      {screen === SCREEN.LEARN && <LearnScreen state={learnState} setState={setLearnState} direction={direction} saveMastery={saveMastery} onHome={() => setScreen(SCREEN.HOME)} />}
      {screen === SCREEN.TEST && <TestScreen state={testState} setState={setTestState} direction={direction} onDone={results => { setTestResults(results); setScreen(SCREEN.TEST_RESULTS); }} onHome={() => setScreen(SCREEN.HOME)} />}
      {screen === SCREEN.TEST_RESULTS && <TestResultsScreen results={testResults} direction={direction} onHome={() => setScreen(SCREEN.HOME)} />}
    </div>
  );
}

// ── HOME ─────────────────────────────────────────────────────
function HomeScreen({ masteredCount, total, direction, setDirection, onLearn, onTest, onReset, mastery }) {
  const pct = Math.round((masteredCount / total) * 100);
  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "60px 24px" }}>
      <h1 style={{ fontSize: 36, fontWeight: 800, color: "#fff", marginBottom: 4 }}>🌙 Arabic Vocab</h1>
      <p style={{ color: "#8888aa", marginBottom: 32 }}>{total} words loaded</p>

      {/* Progress bar */}
      <div style={{ background: "#1e2030", borderRadius: 12, padding: "20px 24px", marginBottom: 28 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, fontSize: 14, color: "#aaa" }}>
          <span>Overall Mastery</span>
          <span style={{ color: "#7c6fff" }}>{masteredCount} / {total} words</span>
        </div>
        <div style={{ background: "#2a2d40", borderRadius: 99, height: 10 }}>
          <div style={{ width: `${pct}%`, background: "linear-gradient(90deg,#7c6fff,#a78bfa)", borderRadius: 99, height: 10, transition: "width .4s" }} />
        </div>
        <div style={{ textAlign: "right", fontSize: 12, color: "#666", marginTop: 6 }}>{pct}%</div>
      </div>

      {/* Direction toggle */}
      <div style={{ background: "#1e2030", borderRadius: 12, padding: "16px 24px", marginBottom: 28 }}>
        <div style={{ fontSize: 13, color: "#888", marginBottom: 12 }}>Study Direction</div>
        <div style={{ display: "flex", gap: 10 }}>
          {[["en2ar", "English → Arabic"], ["ar2en", "Arabic → English"]].map(([val, label]) => (
            <button key={val} onClick={() => setDirection(val)} style={{ flex: 1, padding: "10px 0", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 600, fontSize: 14, background: direction === val ? "#7c6fff" : "#2a2d40", color: direction === val ? "#fff" : "#888", transition: "all .2s" }}>{label}</button>
          ))}
        </div>
      </div>

      {/* Buttons */}
      <div style={{ display: "flex", gap: 14, marginBottom: 16 }}>
        <BigBtn onClick={onLearn} color="#7c6fff" icon="📚">Learn Mode</BigBtn>
        <BigBtn onClick={onTest} color="#22c55e" icon="📝">Test Mode</BigBtn>
      </div>
      <button onClick={onReset} style={{ background: "none", border: "1px solid #333", color: "#666", padding: "8px 16px", borderRadius: 8, cursor: "pointer", fontSize: 13 }}>Reset Progress</button>
    </div>
  );
}

function BigBtn({ onClick, color, icon, children }) {
  const [hov, setHov] = useState(false);
  return (
    <button onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ flex: 1, padding: "18px 0", borderRadius: 14, border: "none", cursor: "pointer", background: hov ? color : "#1e2030", color: hov ? "#fff" : color, fontSize: 16, fontWeight: 700, transition: "all .2s", border: `2px solid ${color}` }}>
      {icon} {children}
    </button>
  );
}

// ── LEARN SCREEN ─────────────────────────────────────────────
function LearnScreen({ state: s, setState, direction, saveMastery, onHome }) {
  if (!s) return null;
  const card = s.phase === "wrong_repeat" ? s.wrongCards[s.roundIndex] : s.roundCards[s.roundIndex];
  if (!card) return null;

  const prompt = getPrompt(card, direction);
  const answer = getAnswer(card, direction);
  const isArabicAnswer = direction === "en2ar";
  const totalCards = s.phase === "wrong_repeat" ? s.wrongCards.length : s.roundCards.length;
  const progress = s.roundIndex / totalCards;

  function handleMC(opt) {
    if (s.feedback) return;
    const correct = opt === answer;
    const newWrong = correct ? s.wrongCards : [...s.wrongCards, card];
    const newMastery = { ...s.sessionMastery };
    if (correct) newMastery[card.arabic] = true;
    setState(prev => ({ ...prev, feedback: correct ? "correct" : "wrong", wrongCards: newWrong, sessionMastery: newMastery }));
  }

  function advanceMC() {
    saveMastery(s.sessionMastery);
    const next = s.roundIndex + 1;
    if (next >= totalCards) {
      // Move to written phase or wrong repeat
      if (s.phase === "mc" && s.roundCards.length > 0) {
        const nextCard = s.roundCards[0];
        setState(prev => ({ ...prev, roundIndex: 0, phase: "written", feedback: null, input: "", mcOptions: null }));
      } else if (s.wrongCards.length > 0 && s.phase !== "wrong_repeat") {
        setState(prev => ({ ...prev, roundIndex: 0, phase: "wrong_repeat", feedback: null, input: "", mcOptions: getMCOptions(prev.wrongCards[0], VOCAB, direction) }));
      } else {
        // Next round
        const newQueue = s.queue.slice(ROUND_SIZE);
        if (newQueue.length === 0) { onHome(); return; }
        const nextRound = newQueue.slice(0, ROUND_SIZE);
        setState(prev => ({ ...prev, queue: newQueue, roundCards: nextRound, roundIndex: 0, phase: "mc", wrongCards: [], feedback: null, input: "", mcOptions: getMCOptions(nextRound[0], VOCAB, direction) }));
      }
    } else {
      const nextCard = s.phase === "wrong_repeat" ? s.wrongCards[next] : s.roundCards[next];
      setState(prev => ({ ...prev, roundIndex: next, feedback: null, input: "", mcOptions: getMCOptions(nextCard, VOCAB, direction) }));
    }
  }

  function handleWrittenSubmit() {
    if (s.feedback) { advanceWritten(); return; }
    const userAns = s.input.trim();
    const correct = userAns.toLowerCase() === answer.toLowerCase();
    const newWrong = correct ? s.wrongCards : (s.wrongCards.find(c => c.arabic === card.arabic) ? s.wrongCards : [...s.wrongCards, card]);
    const newMastery = { ...s.sessionMastery };
    if (correct) newMastery[card.arabic] = true;
    setState(prev => ({ ...prev, feedback: correct ? "correct" : "wrong", wrongCards: newWrong, sessionMastery: newMastery }));
  }

  function advanceWritten() {
    saveMastery(s.sessionMastery);
    const next = s.roundIndex + 1;
    if (next >= totalCards) {
      if (s.wrongCards.length > 0 && s.phase !== "wrong_repeat") {
        setState(prev => ({ ...prev, roundIndex: 0, phase: "wrong_repeat", feedback: null, input: "", mcOptions: getMCOptions(prev.wrongCards[0], VOCAB, direction) }));
      } else {
        const newQueue = s.queue.slice(ROUND_SIZE);
        if (newQueue.length === 0) { onHome(); return; }
        const nextRound = newQueue.slice(0, ROUND_SIZE);
        setState(prev => ({ ...prev, queue: newQueue, roundCards: nextRound, roundIndex: 0, phase: "mc", wrongCards: [], feedback: null, input: "", mcOptions: getMCOptions(nextRound[0], VOCAB, direction) }));
      }
    } else {
      const nextCard = s.phase === "wrong_repeat" ? s.wrongCards[next] : s.roundCards[next];
      setState(prev => ({ ...prev, roundIndex: next, feedback: null, input: "", mcOptions: s.phase === "wrong_repeat" || s.phase === "mc" ? getMCOptions(nextCard, VOCAB, direction) : null }));
    }
  }

  const phaseLabel = s.phase === "mc" ? "Multiple Choice" : s.phase === "written" ? "Written" : "⚠️ Retry Wrong Cards";
  const phaseColor = s.phase === "mc" ? "#7c6fff" : s.phase === "written" ? "#f59e0b" : "#ef4444";

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "40px 24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <button onClick={onHome} style={{ background: "none", border: "none", color: "#666", cursor: "pointer", fontSize: 14 }}>← Back</button>
        <span style={{ background: phaseColor + "22", color: phaseColor, padding: "4px 12px", borderRadius: 99, fontSize: 13, fontWeight: 600 }}>{phaseLabel}</span>
        <span style={{ color: "#555", fontSize: 13 }}>{s.roundIndex + 1} / {totalCards}</span>
      </div>

      {/* Progress bar */}
      <div style={{ background: "#1e2030", borderRadius: 99, height: 6, marginBottom: 32 }}>
        <div style={{ width: `${progress * 100}%`, background: phaseColor, borderRadius: 99, height: 6, transition: "width .3s" }} />
      </div>

      {/* Card */}
      <div style={{ background: "#1e2030", borderRadius: 18, padding: "40px 32px", textAlign: "center", marginBottom: 28, minHeight: 160 }}>
        <div style={{ fontSize: 13, color: "#666", marginBottom: 12, textTransform: "uppercase", letterSpacing: 1 }}>
          {direction === "en2ar" ? "English" : "Arabic"}
        </div>
        <div style={{ fontSize: isArabicAnswer ? 24 : 32, fontWeight: 700, color: "#fff", lineHeight: 1.4, direction: direction === "ar2en" ? "rtl" : "ltr" }}>
          {prompt}
        </div>
        {direction === "ar2en" && <div style={{ color: "#555", fontSize: 14, marginTop: 8 }}>{card.transliteration}</div>}
      </div>

      {/* MC Phase */}
      {(s.phase === "mc" || s.phase === "wrong_repeat") && s.mcOptions && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
          {s.mcOptions.map((opt, i) => {
            const isCorrect = opt === answer;
            let bg = "#1e2030", border = "#2a2d40", col = "#ccc";
            if (s.feedback) {
              if (isCorrect) { bg = "#052e16"; border = "#22c55e"; col = "#22c55e"; }
              else if (!isCorrect && s.feedback === "wrong") { bg = "#2d0a0a"; border = "#ef4444"; col = "#ef4444"; }
            }
            return (
              <button key={i} onClick={() => handleMC(opt)} style={{ padding: "16px 12px", borderRadius: 12, border: `2px solid ${border}`, background: bg, color: col, cursor: s.feedback ? "default" : "pointer", fontSize: isArabicAnswer ? 18 : 15, fontWeight: 600, direction: isArabicAnswer ? "rtl" : "ltr", transition: "all .2s" }}>
                {opt}
              </button>
            );
          })}
        </div>
      )}

      {/* Written Phase */}
      {s.phase === "written" && (
        <div style={{ marginBottom: 20 }}>
          <input
            autoFocus
            value={s.input}
            onChange={e => setState(prev => ({ ...prev, input: e.target.value }))}
            onKeyDown={e => e.key === "Enter" && handleWrittenSubmit()}
            placeholder={`Type the ${isArabicAnswer ? "Arabic" : "English"}...`}
            disabled={!!s.feedback}
            style={{ width: "100%", padding: "14px 16px", borderRadius: 12, border: `2px solid ${s.feedback === "correct" ? "#22c55e" : s.feedback === "wrong" ? "#ef4444" : "#2a2d40"}`, background: "#1e2030", color: "#fff", fontSize: 18, outline: "none", direction: isArabicAnswer ? "rtl" : "ltr", boxSizing: "border-box" }}
          />
          {s.feedback === "wrong" && (
            <div style={{ marginTop: 12, padding: "12px 16px", background: "#2d0a0a", borderRadius: 10, color: "#f87171", fontSize: 16, direction: isArabicAnswer ? "rtl" : "ltr" }}>
              Correct answer: <strong>{answer}</strong>
            </div>
          )}
        </div>
      )}

      {/* Feedback & Next */}
      {s.feedback && (
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 24, marginBottom: 12 }}>{s.feedback === "correct" ? "✅ Correct!" : "❌ Incorrect"}</div>
          <button onClick={s.phase === "written" ? advanceWritten : advanceMC}
            style={{ padding: "12px 40px", borderRadius: 10, border: "none", background: "#7c6fff", color: "#fff", fontSize: 16, fontWeight: 700, cursor: "pointer" }}>
            Continue →
          </button>
        </div>
      )}
      {!s.feedback && s.phase === "written" && (
        <div style={{ textAlign: "center" }}>
          <button onClick={handleWrittenSubmit} style={{ padding: "12px 40px", borderRadius: 10, border: "none", background: "#7c6fff", color: "#fff", fontSize: 16, fontWeight: 700, cursor: "pointer" }}>
            Check ↵
          </button>
        </div>
      )}
    </div>
  );
}

// ── TEST SCREEN ───────────────────────────────────────────────
function TestScreen({ state: s, setState, direction, onDone, onHome }) {
  if (!s) return null;
  const card = s.cards[s.index];
  const isLast = s.index === s.cards.length - 1;
  const isArabicAnswer = direction === "en2ar";
  const useWritten = s.index % 2 === 1; // alternate mc/written

  function handleMC(opt) {
    if (s.submitted) return;
    const correct = opt === getAnswer(card, direction);
    const answers = { ...s.answers, [s.index]: { card, chosen: opt, correct } };
    setState(prev => ({ ...prev, answers, submitted: true }));
  }

  function handleWritten() {
    if (s.submitted) return;
    const userAns = s.input.trim();
    const correct = userAns.toLowerCase() === getAnswer(card, direction).toLowerCase();
    const answers = { ...s.answers, [s.index]: { card, chosen: userAns, correct } };
    setState(prev => ({ ...prev, answers, submitted: true }));
  }

  function next() {
    if (isLast) {
      onDone(s.answers);
      return;
    }
    const ni = s.index + 1;
    setState(prev => ({ ...prev, index: ni, submitted: false, input: "", mcOptions: getMCOptions(prev.cards[ni], VOCAB, direction) }));
  }

  const answer = getAnswer(card, direction);
  const progress = (s.index + 1) / s.cards.length;

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "40px 24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <button onClick={onHome} style={{ background: "none", border: "none", color: "#666", cursor: "pointer", fontSize: 14 }}>← Back</button>
        <span style={{ color: "#22c55e", fontWeight: 600, fontSize: 14 }}>📝 Test Mode</span>
        <span style={{ color: "#555", fontSize: 13 }}>{s.index + 1} / {s.cards.length}</span>
      </div>
      <div style={{ background: "#1e2030", borderRadius: 99, height: 6, marginBottom: 32 }}>
        <div style={{ width: `${progress * 100}%`, background: "#22c55e", borderRadius: 99, height: 6, transition: "width .3s" }} />
      </div>

      <div style={{ background: "#1e2030", borderRadius: 18, padding: "40px 32px", textAlign: "center", marginBottom: 28 }}>
        <div style={{ fontSize: 13, color: "#666", marginBottom: 12, textTransform: "uppercase", letterSpacing: 1 }}>{direction === "en2ar" ? "English" : "Arabic"}</div>
        <div style={{ fontSize: isArabicAnswer ? 24 : 32, fontWeight: 700, color: "#fff", direction: direction === "ar2en" ? "rtl" : "ltr" }}>{getPrompt(card, direction)}</div>
        {direction === "ar2en" && <div style={{ color: "#555", fontSize: 14, marginTop: 8 }}>{card.transliteration}</div>}
      </div>

      {!useWritten ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
          {s.mcOptions.map((opt, i) => {
            const isCorrect = opt === answer;
            let bg = "#1e2030", border = "#2a2d40", col = "#ccc";
            if (s.submitted) {
              if (isCorrect) { bg = "#052e16"; border = "#22c55e"; col = "#22c55e"; }
              else { bg = "#2d0a0a"; border = "#ef4444"; col = "#ef4444"; }
            }
            return <button key={i} onClick={() => handleMC(opt)} style={{ padding: "16px 12px", borderRadius: 12, border: `2px solid ${border}`, background: bg, color: col, cursor: s.submitted ? "default" : "pointer", fontSize: isArabicAnswer ? 18 : 15, fontWeight: 600, direction: isArabicAnswer ? "rtl" : "ltr" }}>{opt}</button>;
          })}
        </div>
      ) : (
        <div style={{ marginBottom: 20 }}>
          <input autoFocus value={s.input} onChange={e => setState(prev => ({ ...prev, input: e.target.value }))} onKeyDown={e => e.key === "Enter" && !s.submitted && handleWritten()} disabled={s.submitted}
            placeholder={`Type the ${isArabicAnswer ? "Arabic" : "English"}...`}
            style={{ width: "100%", padding: "14px 16px", borderRadius: 12, border: `2px solid ${s.submitted ? (s.answers[s.index]?.correct ? "#22c55e" : "#ef4444") : "#2a2d40"}`, background: "#1e2030", color: "#fff", fontSize: 18, outline: "none", direction: isArabicAnswer ? "rtl" : "ltr", boxSizing: "border-box" }} />
          {s.submitted && !s.answers[s.index]?.correct && (
            <div style={{ marginTop: 10, padding: "10px 14px", background: "#2d0a0a", borderRadius: 8, color: "#f87171" }}>Correct: <strong>{answer}</strong></div>
          )}
          {!s.submitted && <div style={{ textAlign: "center", marginTop: 14 }}><button onClick={handleWritten} style={{ padding: "12px 40px", borderRadius: 10, border: "none", background: "#22c55e", color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>Check ↵</button></div>}
        </div>
      )}

      {s.submitted && (
        <div style={{ textAlign: "center", marginTop: 16 }}>
          <div style={{ fontSize: 22, marginBottom: 12 }}>{s.answers[s.index]?.correct ? "✅ Correct!" : "❌ Wrong"}</div>
          <button onClick={next} style={{ padding: "12px 40px", borderRadius: 10, border: "none", background: "#22c55e", color: "#fff", fontSize: 16, fontWeight: 700, cursor: "pointer" }}>{isLast ? "See Results" : "Next →"}</button>
        </div>
      )}
    </div>
  );
}

// ── TEST RESULTS ──────────────────────────────────────────────
function TestResultsScreen({ results, direction, onHome }) {
  if (!results) return null;
  const all = Object.values(results);
  const correct = all.filter(r => r.correct).length;
  const pct = Math.round((correct / all.length) * 100);
  const wrong = all.filter(r => !r.correct);

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "40px 24px" }}>
      <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>Test Complete!</h2>
      <div style={{ fontSize: 48, fontWeight: 900, color: pct >= 80 ? "#22c55e" : pct >= 50 ? "#f59e0b" : "#ef4444", margin: "16px 0" }}>{pct}%</div>
      <p style={{ color: "#888", marginBottom: 32 }}>{correct} / {all.length} correct</p>

      {wrong.length > 0 && (
        <>
          <h3 style={{ color: "#ef4444", marginBottom: 14 }}>❌ Missed ({wrong.length})</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 32 }}>
            {wrong.map((r, i) => (
              <div key={i} style={{ background: "#1e2030", borderRadius: 10, padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "#aaa" }}>{r.card.meaning}</span>
                <span style={{ color: "#fff", fontSize: 18, direction: "rtl" }}>{r.card.arabic}</span>
              </div>
            ))}
          </div>
        </>
      )}

      <button onClick={onHome} style={{ padding: "12px 32px", borderRadius: 10, border: "none", background: "#7c6fff", color: "#fff", fontSize: 16, fontWeight: 700, cursor: "pointer" }}>← Back to Home</button>
    </div>
  );
}
