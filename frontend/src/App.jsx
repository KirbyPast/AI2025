import React, { useState } from 'react';
import './App.css';

function Game() {
  // --- STATE PENTRU NAVIGARE ---
  const [currentProblem, setCurrentProblem] = useState(null); // 'nqueens' sau 'nash'

  // --- STATE PENTRU N-QUEENS ---
  const [gamePhase, setGamePhase] = useState('start');
  const [isLoading, setIsLoading] = useState(false);
  const [nValue, setNValue] = useState(null);
  const [results, setResults] = useState([]);
  const [guess, setGuess] = useState('');
  const [finalScore, setFinalScore] = useState(null);

  // --- STATE PENTRU NASH EQUILIBRIUM ---
  const [nashMatrix, setNashMatrix] = useState(null);
  const [nashSolution, setNashSolution] = useState(null); // { has_equilibrium: bool, indices: [] }
  const [nashPhase, setNashPhase] = useState('start'); // 'guessing', 'result'
  const [nashScore, setNashScore] = useState(null);

  // --- HANDLERS N-QUEENS ---
  const handleGenerateQueens = () => {
    setIsLoading(true);
    setGamePhase('guessing');
    setFinalScore(null);
    setResults([]);
    setNValue(null);

    fetch('http://localhost:5000/api/run-benchmark')
      .then(response => response.json())
      .then(data => {
        setNValue(data.n_queens);
        setResults(data.results);
        setIsLoading(false);
      })
      .catch(error => {
        console.error('Eroare API:', error);
        setIsLoading(false);
        setGamePhase('start');
      });
  };

  const handleGuessSubmit = (e) => {
    e.preventDefault();
    if (!results.length) return;

    const userGuess = guess.trim();
    const guessedAlgo = results.find(r => r.name.toLowerCase() === userGuess.toLowerCase());

    if (!guessedAlgo) {
      alert("Numele algoritmului nu a fost găsit. Încercați: DFS, BFS, A*, Greedy, etc.");
      return;
    }
    const validResults = results.filter(r => isFinite(r.duration_sec));
    if (validResults.length === 0) return;
    validResults.sort((a, b) => a.duration_sec - b.duration_sec);

    const bestTime = validResults[0].duration_sec;
    const worstTime = validResults[validResults.length - 1].duration_sec;
    const userTime = guessedAlgo.duration_sec;

    let score = 0;
    const timeRange = worstTime - bestTime;
    const userError = userTime - bestTime;

    if (timeRange === 0) score = (userTime === bestTime) ? 100 : 0;
    else score = 100 * (1 - (userError / timeRange));
    if (score < 0) score = 0;

    setFinalScore(score.toFixed(0));
    setGamePhase('results');
    setGuess('');
  };

  // --- HANDLERS NASH ---
  const handleGenerateNash = () => {
    setIsLoading(true);
    setNashPhase('guessing');
    setNashScore(null);
    setNashMatrix(null);

    fetch('http://localhost:5000/api/generate-nash')
      .then(res => res.json())
      .then(data => {
        setNashMatrix(data.matrix);
        setNashSolution({ 
          has_equilibrium: data.has_equilibrium, 
          indices: data.equilibria_indices 
        });
        setIsLoading(false);
      })
      .catch(err => {
        console.error(err);
        setIsLoading(false);
      });
  };

  const handleNashAnswer = (userSaysYes) => {
    const isCorrect = userSaysYes === nashSolution.has_equilibrium;
    setNashScore(isCorrect ? 100 : 0);
    setNashPhase('result');
  };

  // --- HELPER RENDERING ---
  const renderNashTable = () => {
    if (!nashMatrix) return null;
    return (
      <table className="nash-table">
        <tbody>
          {nashMatrix.map((row, rIndex) => (
            <tr key={rIndex}>
              {row.map((cell, cIndex) => {
                // Verificăm dacă celula curentă este un echilibru pentru evidențiere la final
                const isEq = nashPhase === 'result' && nashSolution.indices.some(pair => pair[0] === rIndex && pair[1] === cIndex);
                return (
                  <td key={cIndex} className={isEq ? 'cell-equilibrium' : ''}>
                    <div className="payoff p1">{cell[0]}</div>
                    <div className="payoff p2">{cell[1]}</div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  return (
    <div className="game-container">
      <h1>Generator Întrebări AI</h1>

      {/* --- MENIU SELECTIE --- */}
      {!currentProblem && (
        <div className="menu">
          <p>Alege un capitol pentru generarea întrebării:</p>
          <button className="menu-btn" onClick={() => setCurrentProblem('nqueens')}>
            Search Problems (N-Queens)
          </button>
          <button className="menu-btn" onClick={() => setCurrentProblem('nash')}>
            Game Theory (Nash Equilibrium)
          </button>
        </div>
      )}

      {/* --- BUTON BACK --- */}
      {currentProblem && (
        <button className="back-btn" onClick={() => {
            setCurrentProblem(null); 
            setGamePhase('start'); 
            setNashPhase('start');
        }}>
          ← Înapoi la Meniu
        </button>
      )}

      {/* --- MODUL N-QUEENS --- */}
      {currentProblem === 'nqueens' && (
        <div className="problem-section">
          <button onClick={handleGenerateQueens} disabled={isLoading} className="generate-button">
            {isLoading ? 'Se generează...' : 'Generează Instanță N-Queens'}
          </button>

          {gamePhase === 'guessing' && nValue && (
            <div className="question-box">
              <h3>Problema: Pentru o tablă de {nValue}x{nValue}, care algoritm este cel mai rapid?</h3>
              <form onSubmit={handleGuessSubmit} className="guessing-form">
                <input
                  type="text"
                  value={guess}
                  onChange={(e) => setGuess(e.target.value)}
                  placeholder="Ex: BFS, DFS, A*..."
                  className="guess-input"
                />
                <button type="submit" className="guess-button">Verifică</button>
              </form>
            </div>
          )}

          {gamePhase === 'results' && (
            <div className="results-container">
              <h2>Scorul tău: {finalScore}%</h2>
              <table className="results-table">
                <thead><tr><th>Algoritm</th><th>Timp</th></tr></thead>
                <tbody>
                  {[...results].sort((a,b)=>a.duration_sec-b.duration_sec).map(res => (
                    <tr key={res.name}><td>{res.name}</td><td>{res.duration_str}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* --- MODUL NASH EQUILIBRIUM --- */}
      {currentProblem === 'nash' && (
        <div className="problem-section">
          <button onClick={handleGenerateNash} disabled={isLoading} className="generate-button">
            {isLoading ? 'Se generează...' : 'Generează Joc (Formă Normală)'}
          </button>

          {nashMatrix && (
            <div className="question-box">
              <h3>Problema: Pentru jocul de mai jos, există vreun Echilibru Nash în strategii pure?</h3>
              <p><small>(Jucător 1: Rânduri, Jucător 2: Coloane)</small></p>
              
              {renderNashTable()}

              {nashPhase === 'guessing' && (
                <div className="nash-buttons">
                  <button className="guess-button" onClick={() => handleNashAnswer(true)}>DA</button>
                  <button className="guess-button" onClick={() => handleNashAnswer(false)}>NU</button>
                </div>
              )}

              {nashPhase === 'result' && (
                <div className="results-container">
                  <h2>Scor: {nashScore}%</h2>
                  <p>
                    Răspuns corect: <strong>{nashSolution.has_equilibrium ? "DA" : "NU"}</strong>.
                    {nashSolution.has_equilibrium 
                      ? " Celulele evidențiate reprezintă echilibrele." 
                      : " Nicio celulă nu satisface condițiile."}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

    </div>
  );
}

export default Game;